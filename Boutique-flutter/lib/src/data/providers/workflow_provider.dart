import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../../models/task_model.dart';
import '../../models/notification_model.dart';

// API endpoint
const String API_BASE = 'http://10.0.2.2:3000/api'; // Use emulator host for Android

// Task Provider - Get all tasks for staff member
final tasksProvider = FutureProvider.family<List<WorkflowTask>, String>((ref, staffId) async {
  try {
    final response = await http.get(
      Uri.parse('$API_BASE/staff/$staffId/tasks'),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      // Server returns an array of tasks
      if (data is List) {
        List<WorkflowTask> tasks = (data)
            .map((task) => WorkflowTask.fromJson(task))
            .toList();
        return tasks;
      }
    }
    throw Exception('Failed to fetch tasks');
  } catch (e) {
    throw Exception('Error: $e');
  }
});

// Active Tasks Provider
final activeTasksProvider = FutureProvider.family<List<TaskModel>, String>((ref, staffId) async {
  final tasks = await ref.watch(tasksProvider(staffId).future);
  return tasks
      .where((task) => task.status == 'in-progress' || task.status == 'assigned')
      .toList();
});

// Task Details Provider (fetch by scanning staff tasks since no single-task endpoint exists)
final taskDetailsProvider = FutureProvider.family<WorkflowTask, Map<String, String>>((ref, params) async {
  final staffId = params['staffId'] ?? '';
  final taskId = params['taskId'] ?? '';

  try {
    final response = await http.get(Uri.parse('$API_BASE/staff/$staffId/tasks'));
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      if (data is List) {
        final taskJson = (data).cast<Map<String, dynamic>>().firstWhere(
            (t) => (t['id'] ?? t['_id'] ?? '') == taskId,
            orElse: () => {});
        if (taskJson.isNotEmpty) {
          return WorkflowTask.fromJson(taskJson);
        }
      }
    }
    throw Exception('Failed to fetch task details');
  } catch (e) {
    throw Exception('Error: $e');
  }
});

// Notifications Provider
final notificationsProvider = FutureProvider.family<List<NotificationModel>, String>((ref, staffId) async {
  try {
    final response = await http.get(
      Uri.parse('$API_BASE/workflow/notifications/$staffId'),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      if (data['success'] == true) {
        List<NotificationModel> notifications = (data['notifications'] as List)
            .map((notif) => NotificationModel.fromJson(notif))
            .toList();
        return notifications;
      }
    }
    throw Exception('Failed to fetch notifications');
  } catch (e) {
    throw Exception('Error: $e');
  }
});

// Unread Notifications Count Provider
final unreadNotificationsCountProvider = FutureProvider.family<int, String>((ref, staffId) async {
  final notifications = await ref.watch(notificationsProvider(staffId).future);
  return notifications.where((n) => !n.isRead).length;
});

// Task Status Update Provider
final updateTaskStatusProvider = FutureProvider.family<bool, Map<String, String>>((ref, params) async {
  try {
    final response = await http.put(
      Uri.parse('$API_BASE/workflow/task/${params['taskId']}/status'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'status': params['status'],
        'staffId': params['staffId'],
      }),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['success'] == true;
    }
    return false;
  } catch (e) {
    throw Exception('Error updating task status: $e');
  }
});

// Local task state manager using StateNotifier
class TaskNotifier extends StateNotifier<Map<String, dynamic>> {
  TaskNotifier() : super({
    'selectedTask': null,
    'taskStatus': 'pending',
    'isLoading': false,
  });

  void selectTask(TaskModel task) {
    state = {...state, 'selectedTask': task};
  }

  void updateTaskStatus(String newStatus) {
    state = {...state, 'taskStatus': newStatus};
  }

  void setLoading(bool loading) {
    state = {...state, 'isLoading': loading};
  }
}

final taskNotifierProvider = StateNotifierProvider<TaskNotifier, Map<String, dynamic>>((ref) {
  return TaskNotifier();
});
