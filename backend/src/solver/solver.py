# backend/src/solver/solver.py
import sys
import json
from ortools.sat.python import cp_model
from datetime import datetime

def solve_schedule(tasks):
    model = cp_model.CpModel()
    MINUTES_PER_HOUR = 60
    base_time = datetime.now().replace(tzinfo=None)  # Ensure timezone-naive
    
    preprocessed_tasks = []
    for task in tasks:
        try:
            # Skip tasks that are not to be scheduled
            if task.get('status') != 'Not Completed':
                continue
                
            deadline_str = task['deadline']
            window_start_str = task['window_start']
            window_end_str = task['window_end']
            
            if deadline_str.endswith('Z'):
                deadline_str = deadline_str[:-1]
            if window_start_str.endswith('Z'):
                window_start_str = window_start_str[:-1]
            if window_end_str.endswith('Z'):
                window_end_str = window_end_str[:-1]
                
            deadline_dt = datetime.fromisoformat(deadline_str.replace('T', ' ')).replace(tzinfo=None)
            window_start_dt = datetime.fromisoformat(window_start_str.replace('T', ' ')).replace(tzinfo=None)
            window_end_dt = datetime.fromisoformat(window_end_str.replace('T', ' ')).replace(tzinfo=None)
            
            priority_val = task.get('priority')
            if priority_val is None or priority_val == '':
                priority_val = 1
            else:
                try:
                    priority_val = int(priority_val)
                except (ValueError, TypeError):
                    priority_val = 1
            
            preprocessed_tasks.append({
                'id': task['id'],
                'name': task['name'],
                'duration_minutes': int(float(task['duration']) * MINUTES_PER_HOUR),
                'priority': priority_val,
                'deadline_minutes': (deadline_dt - base_time).total_seconds() / 60,
                'window_start_minutes': (window_start_dt - base_time).total_seconds() / 60,
                'window_end_minutes': (window_end_dt - base_time).total_seconds() / 60,
            })
        except (ValueError, KeyError) as e:
            # For debug, love you if delete
            return [{
                'id': task.get('id'), 
                'name': task.get('name', 'Unknown Task'), 
                'duration': task.get('duration', 0),
                'priority': task.get('priority', 1),
                'deadline': task.get('deadline'),
                'window_start': task.get('window_start'),
                'window_end': task.get('window_end'),
                'status': task.get('status', 'Not Completed'),
                'start_time': None,
                'end_time': None,
                'conflict': True, 
                'conflict_reason': f'Data tugas tidak valid: {str(e)}'
            }]

    intervals = []
    task_vars = {}

    for p_task in preprocessed_tasks:
        name = p_task['name']
        duration = p_task['duration_minutes']
        window_start = int(p_task['window_start_minutes'])
        window_end = int(p_task['window_end_minutes'])
        deadline = int(p_task['deadline_minutes'])

        # Validasi konflik dengan pesan yang jelas
        if duration <= 0 or window_end <= window_start:
            # Ambil task original untuk mempertahankan semua field
            original_task = next((t for t in tasks if t['id'] == p_task['id']), {})
            return [{
                'id': p_task['id'], 
                'name': name, 
                'duration': original_task.get('duration', 0),
                'priority': original_task.get('priority', 1),
                'deadline': original_task.get('deadline'),
                'window_start': original_task.get('window_start'),
                'window_end': original_task.get('window_end'),
                'status': original_task.get('status', 'Not Completed'),
                'start_time': None,
                'end_time': None,
                'conflict': True, 
                'conflict_reason': 'Durasi atau window tidak valid.'
            }]
            
        if deadline < window_start:
            deadline_dt = datetime.fromtimestamp((base_time.timestamp() + deadline * 60))
            window_start_dt = datetime.fromtimestamp((base_time.timestamp() + window_start * 60))
            original_task = next((t for t in tasks if t['id'] == p_task['id']), {})
            return [{
                'id': p_task['id'], 
                'name': name, 
                'duration': original_task.get('duration', 0),
                'priority': original_task.get('priority', 1),
                'deadline': original_task.get('deadline'),
                'window_start': original_task.get('window_start'),
                'window_end': original_task.get('window_end'),
                'status': original_task.get('status', 'Not Completed'),
                'start_time': None,
                'end_time': None,
                'conflict': True, 
                'conflict_reason': f'Deadline ({deadline_dt.strftime("%d/%m/%Y %H:%M")}) lebih awal dari waktu mulai yang tersedia ({window_start_dt.strftime("%d/%m/%Y %H:%M")})'
            }]
        
        if window_start + duration > deadline:
            original_task = next((t for t in tasks if t['id'] == p_task['id']), {})
            return [{
                'id': p_task['id'], 
                'name': name, 
                'duration': original_task.get('duration', 0),
                'priority': original_task.get('priority', 1),
                'deadline': original_task.get('deadline'),
                'window_start': original_task.get('window_start'),
                'window_end': original_task.get('window_end'),
                'status': original_task.get('status', 'Not Completed'),
                'start_time': None,
                'end_time': None,
                'conflict': True, 
                'conflict_reason': f'Durasi task ({duration/60:.1f} jam) terlalu panjang untuk diselesaikan sebelum deadline'
            }]
            
        if window_start + duration > window_end:
            available_minutes = window_end - window_start
            available_hours = available_minutes / 60
            duration_hours = duration / 60
            
            tolerance_minutes = 10
            
            if duration > available_minutes + tolerance_minutes:
                original_task = next((t for t in tasks if t['id'] == p_task['id']), {})
                
                window_start_dt = datetime.fromtimestamp((base_time.timestamp() + window_start * 60))
                window_end_dt = datetime.fromtimestamp((base_time.timestamp() + window_end * 60))
                
                conflict_reason = f'Durasi task ({duration_hours:.1f} jam) tidak muat dalam window waktu yang tersedia ({available_hours:.1f} jam). Window: {window_start_dt.strftime("%d/%m %H:%M")} - {window_end_dt.strftime("%d/%m %H:%M")}'
                
                return [{
                    'id': p_task['id'], 
                    'name': name, 
                    'duration': original_task.get('duration', 0),
                    'priority': original_task.get('priority', 1),
                    'deadline': original_task.get('deadline'),
                    'window_start': original_task.get('window_start'),
                    'window_end': original_task.get('window_end'),
                    'status': original_task.get('status', 'Not Completed'),
                    'start_time': None,
                    'end_time': None,
                    'conflict': True, 
                    'conflict_reason': conflict_reason
                }]

        
        if window_start + duration > deadline:
            original_task = next((t for t in tasks if t['id'] == p_task['id']), {})
            deadline_dt = datetime.fromtimestamp((base_time.timestamp() + deadline * 60))
            return [{
                'id': p_task['id'], 
                'name': name, 
                'duration': original_task.get('duration', 0),
                'priority': original_task.get('priority', 1),
                'deadline': original_task.get('deadline'),
                'window_start': original_task.get('window_start'),
                'window_end': original_task.get('window_end'),
                'status': original_task.get('status', 'Not Completed'),
                'start_time': None,
                'end_time': None,
                'conflict': True, 
                'conflict_reason': f'Task tidak bisa selesai sebelum deadline. Minimum waktu selesai: {datetime.fromtimestamp((base_time.timestamp() + (window_start + duration) * 60)).strftime("%d/%m %H:%M")}, Deadline: {deadline_dt.strftime("%d/%m %H:%M")}'
            }]

        start_var = model.NewIntVar(window_start, window_end, f'start_{name}_{p_task["id"]}')
        end_var = model.NewIntVar(window_start, window_end, f'end_{name}_{p_task["id"]}')
        interval_var = model.NewIntervalVar(start_var, duration, end_var, f'interval_{name}_{p_task["id"]}')
        
        model.Add(end_var <= deadline)
        model.Add(start_var >= window_start)
        model.Add(end_var <= window_end)
        
        intervals.append(interval_var)
        task_vars[p_task['id']] = {'start': start_var, 'end': end_var, 'interval': interval_var}

    model.AddNoOverlap(intervals)
    
    objective_terms = []
    for p_task in preprocessed_tasks:
        task_id = p_task['id']
        end_var = task_vars[task_id]['end']
        
        priority_weight = 1.0 / ((4 - p_task['priority']) * (p_task['deadline_minutes'] + 1))
        
        objective_terms.append(end_var * priority_weight)

    model.Minimize(sum(objective_terms))

    solver = cp_model.CpSolver()
    status = solver.Solve(model)

    result = []
    if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
        solved_tasks = []
        for p_task in preprocessed_tasks:
            name = p_task['name']
            task_id = p_task['id']
            start_time_minutes = solver.Value(task_vars[task_id]['start'])
            end_time_minutes = solver.Value(task_vars[task_id]['end'])
            
            start_dt = (base_time.timestamp() + start_time_minutes * 60)
            end_dt = (base_time.timestamp() + end_time_minutes * 60)

            solved_tasks.append({
                'id': task_id,
                'name': name,
                'start_time': datetime.fromtimestamp(start_dt).isoformat(),
                'end_time': datetime.fromtimestamp(end_dt).isoformat(),
                'conflict': False,
                'conflict_reason': None,
            })
        
        sorted_tasks = sorted(solved_tasks, key=lambda x: x['start_time'])
        
        original_tasks_map = {task['id']: task for task in tasks}
        
        final_result = []
        for solved in sorted_tasks:
            original = original_tasks_map[solved['id']]
            # Ensure priority has a valid value
            priority_val = original.get('priority')
            if priority_val is None or priority_val == '':
                priority_val = 1
            
            final_result.append({
                'id': original['id'],
                'name': original['name'],
                'duration': original['duration'],
                'priority': priority_val,
                'deadline': original['deadline'],
                'window_start': original['window_start'],
                'window_end': original['window_end'],
                'status': original['status'],
                'start_time': solved['start_time'],
                'end_time': solved['end_time'],
                'conflict': solved['conflict'],
                'conflict_reason': solved['conflict_reason']
            })
            
        # Tambahkan kembali tugas yang tidak dijadwalkan
        unsolved_tasks = [t for t in tasks if t.get('status') != 'Not Completed']
        final_result.extend(unsolved_tasks)
            
        return final_result
    else:
        conflicts = []
        for t in tasks:
            conflicts.append({
                'id': t['id'], 
                'name': t['name'], 
                'duration': t.get('duration', 0),
                'priority': t.get('priority', 1),
                'deadline': t.get('deadline'),
                'window_start': t.get('window_start'),
                'window_end': t.get('window_end'),
                'status': t.get('status', 'Not Completed'),
                'start_time': None,
                'end_time': None,
                'conflict': True, 
                'conflict_reason': 'Tidak bisa dijadwalkan karena konflik dengan task lain.'
            })
        return conflicts

if __name__ == '__main__':
    tasks_json = sys.stdin.read()
    
    if not tasks_json:
        print(json.dumps([]))
        sys.exit()

    try:
        tasks_data = json.loads(tasks_json)
        solved_schedule = solve_schedule(tasks_data)
        
        print(json.dumps(solved_schedule))

    except json.JSONDecodeError as e:
        print(json.dumps([{
            'name': 'Unknown Task', 
            'conflict': True, 
            'conflict_reason': f'Input JSON tidak valid: {e}',
            'status': 'Not Completed',
            'start_time': None,
            'end_time': None
        }]))
        sys.exit(1)