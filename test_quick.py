#!/usr/bin/env python3
"""
Quick test to verify task assignment is working
"""
import json
import urllib.request
from datetime import datetime, timedelta

BASE_URL = 'http://127.0.0.1:3000'

def test_order_creation():
    print("\n" + "="*70)
    print("[TEST] Task Assignment Test")
    print("="*70 + "\n")
    
    # Create test order
    print("[1] Creating test order...")
    order_data = {
        "customer": {
            "name": "Test Customer",
            "phone": "9999999999",
            "address": "Test Address"
        },
        "garmentType": "Saree",
        "measurements": {"length": "5.5", "width": "1.2"},
        "pricing": {"total": 5000, "advance": 2000, "balance": 3000},
        "deliveryDate": (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d'),
        "workflow": ['measurements-design', 'dyeing', 'cutting', 'stitching', 'finishing', 'quality-check', 'ready-to-deliver']
    }
    
    try:
        req = urllib.request.Request(
            f'{BASE_URL}/api/orders',
            data=json.dumps(order_data).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            result = json.loads(response.read().decode('utf-8'))
            order = result.get('order', {})
            orderId = order.get('orderId')
            task_count = len(order.get('workflowTasks', []))
            assigned_to = order.get('workflowTasks', [{}])[0].get('assignedToName')
            
            print(f"[OK] Order created: {orderId}")
            print(f"     Tasks created: {task_count}")
            print(f"     First task assigned to: {assigned_to}")
            
    except Exception as e:
        print(f"[ERROR] Error creating order: {e}")
        return False
    
    # Fetch Rajesh's tasks
    print("\n[2] Fetching Rajesh's tasks...")
    try:
        with urllib.request.urlopen(f'{BASE_URL}/api/staff/staff_001/tasks', timeout=5) as response:
            tasks = json.loads(response.read().decode('utf-8'))
            
            if isinstance(tasks, list):
                print(f"[OK] Found {len(tasks)} task(s) for Rajesh")
                if len(tasks) > 0:
                    print(f"     First task: {tasks[0].get('orderId')} - {tasks[0].get('stageName')}")
                else:
                    print("[FAIL] NO TASKS FOUND!")
                    return False
            else:
                print(f"[ERROR] Unexpected response format: {type(tasks)}")
                return False
            
    except Exception as e:
        print(f"[ERROR] Error fetching tasks: {e}")
        return False
    
    print("\n" + "="*70)
    print("[SUCCESS] Task Assignment Test PASSED!")
    print("="*70 + "\n")
    return True

if __name__ == '__main__':
    import sys
    success = test_order_creation()
    sys.exit(0 if success else 1)
