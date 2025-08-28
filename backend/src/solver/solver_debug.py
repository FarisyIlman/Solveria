# backend/src/solver/solver_debug.py
# Versi sederhana untuk debugging (Windows friendly)

import sys
import json
from datetime import datetime, timedelta, timezone

def debug_log(message):
    """Print debug message ke stderr"""
    print(f"[SOLVER DEBUG] {message}", file=sys.stderr)

def simple_solve(tasks):
    """
    Solver sederhana tanpa OR-Tools untuk debugging
    """
    debug_log(f"Processing {len(tasks)} tasks")
    
    result = []
    current_time = datetime.now(timezone.utc)
    
    for i, task in enumerate(tasks):
        debug_log(f"Processing task {i}: {task.get('name', 'unnamed')}")
        
        try:
            # Skip completed tasks
            if task.get('status') == 'Completed':
                result.append(task)
                continue
            
            # Skip non-'Not Completed' tasks
            if task.get('status') != 'Not Completed':
                result.append(task)
                continue
            
            # Basic validation
            required_fields = ['id', 'name', 'duration', 'deadline', 'window_start', 'window_end']
            missing_fields = [field for field in required_fields if not task.get(field)]
            
            if missing_fields:
                debug_log(f"Task {i} missing fields: {missing_fields}")
                task_result = {
                    'id': task.get('id', f'unknown_{i}'),
                    'name': task.get('name', 'Unknown Task'),
                    'conflict': True,
                    'conflict_reason': f'Missing required fields: {", ".join(missing_fields)}'
                }
                result.append(task_result)
                continue
            
            # Parse dates
            try:
                window_start = datetime.fromisoformat(task['window_start'])
                window_end = datetime.fromisoformat(task['window_end'])
                deadline = datetime.fromisoformat(task['deadline'])
                
                # Make timezone-aware if needed
                if window_start.tzinfo is None:
                    window_start = window_start.replace(tzinfo=timezone.utc)
                if window_end.tzinfo is None:
                    window_end = window_end.replace(tzinfo=timezone.utc)
                if deadline.tzinfo is None:
                    deadline = deadline.replace(tzinfo=timezone.utc)
                    
            except ValueError as e:
                debug_log(f"Task {i} date parsing error: {e}")
                task_result = {
                    'id': task['id'],
                    'name': task['name'],
                    'conflict': True,
                    'conflict_reason': f'Invalid date format: {e}'
                }
                result.append(task_result)
                continue
            
            # Simple scheduling - just use window_start as start_time
            duration_hours = float(task['duration'])
            duration_delta = timedelta(hours=duration_hours)
            
            # Use current time if window_start is in the past
            start_time = max(current_time, window_start)
            end_time = start_time + duration_delta
            
            # Check if fits in deadline
            if end_time > deadline:
                debug_log(f"Task {i} doesn't fit in deadline")
                task_result = {
                    'id': task['id'],
                    'name': task['name'],
                    'duration': task['duration'],
                    'priority': task.get('priority', 1),
                    'deadline': task['deadline'],
                    'window_start': task['window_start'],
                    'window_end': task['window_end'],
                    'status': task['status'],
                    'start_time': None,
                    'end_time': None,
                    'conflict': True,
                    'conflict_reason': 'Task duration exceeds deadline'
                }
                result.append(task_result)
                continue
            
            # Success case
            task_result = {
                'id': task['id'],
                'name': task['name'],
                'duration': task['duration'],
                'priority': task.get('priority', 1),
                'deadline': task['deadline'],
                'window_start': task['window_start'],
                'window_end': task['window_end'],
                'status': task['status'],
                'start_time': start_time.isoformat(),
                'end_time': end_time.isoformat(),
                'conflict': False,
                'conflict_reason': None
            }
            result.append(task_result)
            debug_log(f"Task {i} scheduled successfully")
            
        except Exception as e:
            debug_log(f"Task {i} processing error: {e}")
            task_result = {
                'id': task.get('id', f'error_{i}'),
                'name': task.get('name', 'Error Task'),
                'conflict': True,
                'conflict_reason': f'Processing error: {str(e)}'
            }
            result.append(task_result)
    
    debug_log(f"Finished processing, returning {len(result)} results")
    return result

def main():
    debug_log("Starting solver...")
    
    try:
        # Read input
        input_data = sys.stdin.read().strip()
        debug_log(f"Received input: {len(input_data)} characters")
        
        if not input_data:
            debug_log("No input data received")
            print(json.dumps([]))
            return
        
        # Parse JSON
        try:
            tasks = json.loads(input_data)
            debug_log(f"Parsed JSON successfully, type: {type(tasks)}")
        except json.JSONDecodeError as e:
            debug_log(f"JSON decode error: {e}")
            error_result = [{
                'name': 'JSON Error',
                'conflict': True,
                'conflict_reason': f'Invalid JSON: {e}'
            }]
            print(json.dumps(error_result))
            return
        
        # Ensure it's a list
        if not isinstance(tasks, list):
            if isinstance(tasks, dict):
                tasks = [tasks]
                debug_log("Converted single task dict to list")
            else:
                debug_log(f"Invalid data type: {type(tasks)}")
                error_result = [{
                    'name': 'Type Error',
                    'conflict': True,
                    'conflict_reason': f'Expected list or dict, got {type(tasks).__name__}'
                }]
                print(json.dumps(error_result))
                return
        
        # Process tasks
        result = simple_solve(tasks)
        
        # Output result
        output_json = json.dumps(result, indent=2)
        debug_log(f"Outputting {len(output_json)} characters")
        print(output_json)
        
    except Exception as e:
        debug_log(f"Unexpected error: {e}")
        import traceback
        debug_log(f"Traceback: {traceback.format_exc()}")
        
        error_result = [{
            'name': 'System Error',
            'conflict': True,
            'conflict_reason': f'System error: {str(e)}'
        }]
        print(json.dumps(error_result))

if __name__ == '__main__':
    main()
