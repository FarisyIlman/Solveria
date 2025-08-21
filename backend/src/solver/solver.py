# backend/src/solver/solver.py
import sys
import json
from ortools.sat.python import cp_model
from datetime import datetime

def solve_schedule(tasks):
    model = cp_model.CpModel()
    MINUTES_PER_HOUR = 60
    base_time = datetime.now()
    
    preprocessed_tasks = []
    for task in tasks:
        try:
            # Skip tasks that are not to be scheduled
            if task.get('status') != 'Not Completed':
                continue
                
            deadline_dt = datetime.fromisoformat(task['deadline'])
            window_start_dt = datetime.fromisoformat(task['window_start'])
            window_end_dt = datetime.fromisoformat(task['window_end'])
            
            preprocessed_tasks.append({
                'id': task['id'],
                'name': task['name'],
                'duration_minutes': int(float(task['duration']) * MINUTES_PER_HOUR),
                'deadline_minutes': (deadline_dt - base_time).total_seconds() / 60,
                'window_start_minutes': (window_start_dt - base_time).total_seconds() / 60,
                'window_end_minutes': (window_end_dt - base_time).total_seconds() / 60,
            })
        except (ValueError, KeyError) as e:
            return [{'id': task.get('id'), 'name': task.get('name', 'Unknown Task'), 'conflict': True, 'reason': 'Data tugas tidak valid.'}]

    intervals = []
    task_vars = {}

    for p_task in preprocessed_tasks:
        name = p_task['name']
        duration = p_task['duration_minutes']
        window_start = int(p_task['window_start_minutes'])
        window_end = int(p_task['window_end_minutes'])
        deadline = int(p_task['deadline_minutes'])

        if duration <= 0 or window_end <= window_start:
            return [{'id': p_task['id'], 'name': name, 'conflict': True, 'reason': 'Durasi atau window tidak valid.'}]

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
        
        priority_weight = 1.0 / (p_task['deadline_minutes'] + 1)
        
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
            })
        
        sorted_tasks = sorted(solved_tasks, key=lambda x: x['start_time'])
        
        original_tasks_map = {task['id']: task for task in tasks}
        
        final_result = []
        for solved in sorted_tasks:
            original = original_tasks_map[solved['id']]
            final_result.append({
                'id': original['id'],
                'name': original['name'],
                'duration': original['duration'],
                'deadline': original['deadline'],
                'window_start': original['window_start'],
                'window_end': original['window_end'],
                'status': original['status'],
                'start_time': solved['start_time'],
                'end_time': solved['end_time'],
                'conflict': solved['conflict']
            })
            
        # Tambahkan kembali tugas yang tidak dijadwalkan
        unsolved_tasks = [t for t in tasks if t.get('status') != 'Not Completed']
        final_result.extend(unsolved_tasks)
            
        return final_result
    else:
        conflicts = [{'id': t['id'], 'name': t['name'], 'conflict': True, 'reason': 'Tidak bisa dijadwalkan.'} for t in tasks]
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
        print(json.dumps([{'name': 'Unknown Task', 'conflict': True, 'reason': f'Input JSON tidak valid: {e}'}]))
        sys.exit(1)