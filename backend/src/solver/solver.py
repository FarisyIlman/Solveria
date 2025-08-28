#!/usr/bin/env python3
# backend/src/solver/solver.py

import sys
import json
import traceback
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional, Tuple
import logging

try:
    from ortools.sat.python import cp_model
except ImportError:
    print(json.dumps([{
        'name': 'System Error', 
        'conflict': True, 
        'conflict_reason': 'OR-Tools tidak terinstall. Jalankan: pip install ortools'
    }]))
    sys.exit(1)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='[Solver] %(levelname)s: %(message)s',
    handlers=[logging.StreamHandler(sys.stderr)]
)
logger = logging.getLogger(__name__)

class TaskScheduler:
    """
    Task scheduler using CP-SAT solver dengan improved error handling dan logging
    """
    
    def __init__(self):
        self.MINUTES_PER_HOUR = 60
        self.base_time = datetime.now(timezone.utc)
        logger.info(f"Scheduler diinisialisasi dengan base_time: {self.base_time}")
    
    def validate_task_data(self, task: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Validasi data tugas individual
        """
        try:
            # Check required fields
            required_fields = ['id', 'name', 'duration', 'deadline', 'window_start', 'window_end']
            for field in required_fields:
                if field not in task or task[field] is None:
                    return False, f"Field '{field}' tidak ada atau kosong"
            
            # Validate data types
            if not isinstance(task['name'], str) or not task['name'].strip():
                return False, "Nama tugas harus berupa string dan tidak boleh kosong"
            
            # Validate duration
            try:
                duration = float(task['duration'])
                if duration <= 0:
                    return False, "Durasi harus lebih besar dari 0"
            except (ValueError, TypeError):
                return False, "Durasi harus berupa angka yang valid"
            
            # Validate datetime fields
            datetime_fields = ['deadline', 'window_start', 'window_end']
            parsed_times = {}
            
            for field in datetime_fields:
                try:
                    dt = datetime.fromisoformat(task[field])
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=timezone.utc)
                    parsed_times[field] = dt
                except (ValueError, TypeError) as e:
                    return False, f"Format waktu tidak valid untuk {field}: {e}"
            
            # Validate time logic
            if parsed_times['window_start'] >= parsed_times['window_end']:
                return False, "Window start harus lebih awal dari window end"
            
            if parsed_times['deadline'] < self.base_time:
                return False, "Deadline tidak boleh di masa lalu"
            
            if parsed_times['window_end'] < self.base_time:
                return False, "Window end tidak boleh di masa lalu"
            
            # Check if there's enough time in the window
            window_duration = (parsed_times['window_end'] - parsed_times['window_start']).total_seconds() / 60
            task_duration = duration * self.MINUTES_PER_HOUR
            
            if window_duration < task_duration:
                return False, f"Window waktu ({window_duration:.0f} menit) lebih kecil dari durasi tugas ({task_duration:.0f} menit)"
            
            return True, ""
            
        except Exception as e:
            logger.error(f"Error validating task {task.get('id', 'unknown')}: {e}")
            return False, f"Error validasi: {e}"
    
    def preprocess_task(self, task: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Preprocess task untuk solver
        """
        try:
            # Parse datetime objects
            deadline_dt = datetime.fromisoformat(task['deadline'])
            window_start_dt = datetime.fromisoformat(task['window_start'])
            window_end_dt = datetime.fromisoformat(task['window_end'])
            
            # Ensure timezone awareness
            if deadline_dt.tzinfo is None:
                deadline_dt = deadline_dt.replace(tzinfo=timezone.utc)
            if window_start_dt.tzinfo is None:
                window_start_dt = window_start_dt.replace(tzinfo=timezone.utc)
            if window_end_dt.tzinfo is None:
                window_end_dt = window_end_dt.replace(tzinfo=timezone.utc)
            
            # Convert to minutes from base_time
            duration_minutes = int(float(task['duration']) * self.MINUTES_PER_HOUR)
            deadline_minutes = int((deadline_dt - self.base_time).total_seconds() / 60)
            window_start_minutes = max(0, int((window_start_dt - self.base_time).total_seconds() / 60))
            window_end_minutes = int((window_end_dt - self.base_time).total_seconds() / 60)
            
            # Handle priority
            priority_val = task.get('priority', 1)
            if priority_val is None or priority_val == '':
                priority_val = 1
            try:
                priority_val = int(priority_val)
                priority_val = max(1, min(3, priority_val))  # Clamp to 1-3
            except (ValueError, TypeError):
                priority_val = 1
            
            return {
                'id': task['id'],
                'name': task['name'],
                'duration_minutes': duration_minutes,
                'priority': priority_val,
                'deadline_minutes': deadline_minutes,
                'window_start_minutes': window_start_minutes,
                'window_end_minutes': window_end_minutes,
                'original_task': task
            }
            
        except Exception as e:
            logger.error(f"Error preprocessing task {task.get('id', 'unknown')}: {e}")
            return None
    
    def create_conflict_task(self, original_task: Dict[str, Any], reason: str) -> Dict[str, Any]:
        """
        Membuat task yang ditandai sebagai conflict
        """
        return {
            'id': original_task.get('id', 'unknown'),
            'name': original_task.get('name', 'Unknown Task'),
            'duration': original_task.get('duration'),
            'priority': original_task.get('priority', 1),
            'deadline': original_task.get('deadline'),
            'window_start': original_task.get('window_start'),
            'window_end': original_task.get('window_end'),
            'status': original_task.get('status', 'Not Completed'),
            'start_time': None,
            'end_time': None,
            'conflict': True,
            'conflict_reason': reason
        }
    
    def solve_schedule(self, tasks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Solve scheduling problem dengan improved error handling
        """
        logger.info(f"Memulai penjadwalan untuk {len(tasks)} tugas")
        
        if not tasks:
            logger.info("Tidak ada tugas untuk dijadwalkan")
            return []
        
        model = cp_model.CpModel()
        
        # Separate tasks berdasarkan status dan validasi
        to_be_solved = []
        already_scheduled = []
        
        for i, task in enumerate(tasks):
            try:
                # Skip tasks yang sudah completed
                if task.get('status') == 'Completed':
                    already_scheduled.append(task)
                    continue
                
                # Skip tasks yang bukan 'Not Completed'
                if task.get('status') != 'Not Completed':
                    already_scheduled.append(task)
                    continue
                
                # Validasi task data
                is_valid, error_msg = self.validate_task_data(task)
                if not is_valid:
                    logger.warning(f"Task {task.get('id', i)} tidak valid: {error_msg}")
                    conflict_task = self.create_conflict_task(task, error_msg)
                    already_scheduled.append(conflict_task)
                    continue
                
                # Preprocess task
                processed_task = self.preprocess_task(task)
                if processed_task is None:
                    logger.warning(f"Gagal memproses task {task.get('id', i)}")
                    conflict_task = self.create_conflict_task(task, "Gagal memproses data tugas")
                    already_scheduled.append(conflict_task)
                    continue
                
                to_be_solved.append(processed_task)
                
            except Exception as e:
                logger.error(f"Error processing task {i}: {e}")
                conflict_task = self.create_conflict_task(task, f"Error memproses tugas: {e}")
                already_scheduled.append(conflict_task)
        
        logger.info(f"Tugas untuk dijadwalkan: {len(to_be_solved)}, Sudah dijadwalkan: {len(already_scheduled)}")
        
        # Jika tidak ada tugas yang perlu di-solve, return yang sudah ada
        if not to_be_solved:
            return already_scheduled
        
        # Buat variabel dan constraint untuk CP-SAT
        intervals = []
        task_vars = {}
        
        for p_task in to_be_solved:
            try:
                name = p_task['name']
                duration = p_task['duration_minutes']
                window_start = p_task['window_start_minutes']
                window_end = p_task['window_end_minutes']
                deadline = p_task['deadline_minutes']
                task_id = p_task['id']
                
                # Pastikan window valid untuk solver
                latest_start = min(window_end - duration, deadline - duration)
                if latest_start < window_start:
                    logger.warning(f"Task {name} tidak dapat dijadwalkan - constraint terlalu ketat")
                    conflict_task = self.create_conflict_task(
                        p_task['original_task'], 
                        "Tidak dapat dijadwalkan - deadline terlalu ketat atau window waktu tidak mencukupi"
                    )
                    already_scheduled.append(conflict_task)
                    continue
                
                # Buat CP-SAT variables
                start_var = model.NewIntVar(
                    window_start, 
                    latest_start, 
                    f'start_{task_id}'
                )
                end_var = model.NewIntVar(
                    window_start + duration, 
                    min(window_end, deadline), 
                    f'end_{task_id}'
                )
                interval_var = model.NewIntervalVar(
                    start_var, 
                    duration, 
                    end_var, 
                    f'interval_{task_id}'
                )
                
                # Add constraint: task harus selesai sebelum deadline
                model.Add(end_var <= deadline)
                
                intervals.append(interval_var)
                task_vars[task_id] = {
                    'start': start_var, 
                    'end': end_var,
                    'task_data': p_task
                }
                
                logger.debug(f"Task {name}: window=[{window_start}, {latest_start}], duration={duration}")
                
            except Exception as e:
                logger.error(f"Error creating variables for task {p_task.get('name', 'unknown')}: {e}")
                conflict_task = self.create_conflict_task(
                    p_task['original_task'], 
                    f"Error membuat variabel solver: {e}"
                )
                already_scheduled.append(conflict_task)
        
        # Add no-overlap constraint
        if intervals:
            model.AddNoOverlap(intervals)
            logger.info(f"Menambahkan constraint no-overlap untuk {len(intervals)} tugas")
        
        # Setup objective function - minimize weighted completion times
        objective_terms = []
        for task_id, vars_dict in task_vars.items():
            end_var = vars_dict['end']
            priority = vars_dict['task_data']['priority']
            
            # Higher priority (lower number) gets higher weight
            # Priority 1 = weight 4, Priority 2 = weight 2, Priority 3 = weight 1
            priority_weight = max(1, 5 - priority)
            objective_terms.append(end_var * priority_weight)
        
        if objective_terms:
            model.Minimize(sum(objective_terms))
            logger.info("Objective function berhasil dibuat")
        
        # Solve the model
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = 30  # 30 second timeout
        
        logger.info("Memulai solving...")
        status = solver.Solve(model)
        logger.info(f"Solver status: {solver.StatusName(status)}")
        
        # Process results
        final_result = []
        
        if status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
            logger.info(f"Solusi ditemukan! Objective value: {solver.ObjectiveValue()}")
            
            for task_id, vars_dict in task_vars.items():
                try:
                    start_time_minutes = solver.Value(vars_dict['start'])
                    end_time_minutes = solver.Value(vars_dict['end'])
                    
                    start_dt = self.base_time + timedelta(minutes=start_time_minutes)
                    end_dt = self.base_time + timedelta(minutes=end_time_minutes)
                    
                    original_task = vars_dict['task_data']['original_task']
                    
                    scheduled_task = {
                        'id': original_task['id'],
                        'name': original_task['name'],
                        'duration': original_task['duration'],
                        'priority': original_task.get('priority', 1),
                        'deadline': original_task['deadline'],
                        'window_start': original_task['window_start'],
                        'window_end': original_task['window_end'],
                        'status': original_task['status'],
                        'start_time': start_dt.isoformat(),
                        'end_time': end_dt.isoformat(),
                        'conflict': False,
                        'conflict_reason': None
                    }
                    
                    final_result.append(scheduled_task)
                    logger.debug(f"Task {original_task['name']} dijadwalkan: {start_dt} - {end_dt}")
                    
                except Exception as e:
                    logger.error(f"Error processing solution for task {task_id}: {e}")
                    original_task = vars_dict['task_data']['original_task']
                    conflict_task = self.create_conflict_task(
                        original_task, 
                        f"Error memproses solusi: {e}"
                    )
                    final_result.append(conflict_task)
        
        else:
            # Solver tidak menemukan solusi yang feasible
            logger.warning("Tidak ada solusi yang feasible ditemukan")
            
            for task_id, vars_dict in task_vars.items():
                original_task = vars_dict['task_data']['original_task']
                conflict_reason = "Tidak dapat dijadwalkan - kemungkinan konflik waktu atau deadline terlalu ketat"
                
                if status == cp_model.INFEASIBLE:
                    conflict_reason = "Tidak dapat dijadwalkan - constraint tidak dapat dipenuhi"
                elif status == cp_model.MODEL_INVALID:
                    conflict_reason = "Model tidak valid - terdapat error dalam constraint"
                elif status == cp_model.UNKNOWN:
                    conflict_reason = "Status tidak diketahui - mungkin timeout atau error internal"
                
                conflict_task = self.create_conflict_task(original_task, conflict_reason)
                final_result.append(conflict_task)
        
        # Gabungkan dengan tasks yang sudah dijadwalkan
        final_result.extend(already_scheduled)
        
        logger.info(f"Selesai memproses. Total hasil: {len(final_result)} tugas")
        return final_result


def main():
    """
    Main function dengan comprehensive error handling
    """
    try:
        # Read input from stdin
        input_data = sys.stdin.read().strip()
        
        if not input_data:
            logger.warning("Tidak ada input data")
            print(json.dumps([]))
            return
        
        logger.info(f"Menerima input data ({len(input_data)} karakter)")
        
        # Parse JSON
        try:
            tasks_data = json.loads(input_data)
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing JSON: {e}")
            error_result = [{
                'name': 'JSON Parse Error', 
                'conflict': True, 
                'conflict_reason': f'Format JSON tidak valid: {e}'
            }]
            print(json.dumps(error_result))
            return
        
        # Ensure data is a list
        if not isinstance(tasks_data, list):
            if isinstance(tasks_data, dict):
                tasks_data = [tasks_data]
            else:
                logger.error(f"Input data bukan list atau dict, tipe: {type(tasks_data)}")
                error_result = [{
                    'name': 'Invalid Data Type', 
                    'conflict': True, 
                    'conflict_reason': f'Data harus berupa list atau dict, bukan {type(tasks_data).__name__}'
                }]
                print(json.dumps(error_result))
                return
        
        logger.info(f"Memproses {len(tasks_data)} tugas")
        
        # Initialize scheduler dan solve
        scheduler = TaskScheduler()
        solved_schedule = scheduler.solve_schedule(tasks_data)
        
        # Remove duplicates berdasarkan ID
        unique_tasks = {}
        for task in solved_schedule:
            task_id = task.get('id')
            if task_id is not None:
                unique_tasks[task_id] = task
        
        final_list = list(unique_tasks.values())
        logger.info(f"Output final: {len(final_list)} tugas unik")
        
        # Output JSON
        output = json.dumps(final_list, indent=2, ensure_ascii=False)
        print(output)
        
    except KeyboardInterrupt:
        logger.error("Proses dihentikan oleh user")
        error_result = [{
            'name': 'Process Interrupted', 
            'conflict': True, 
            'conflict_reason': 'Proses dihentikan oleh sistem'
        }]
        print(json.dumps(error_result))
        sys.exit(1)
        
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        
        error_result = [{
            'name': 'System Error', 
            'conflict': True, 
            'conflict_reason': f'Terjadi kesalahan sistem: {str(e)}'
        }]
        print(json.dumps(error_result))
        sys.exit(1)


if __name__ == '__main__':
    main()