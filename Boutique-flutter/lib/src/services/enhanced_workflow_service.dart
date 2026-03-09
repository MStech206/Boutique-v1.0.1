import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter/foundation.dart'
    show kIsWeb, defaultTargetPlatform, TargetPlatform;

/// Enhanced Workflow Service for seamless data synchronization
/// Integrates with the new data flow API endpoints for real-time updates
class EnhancedWorkflowService {
  // API URL Configuration
  static String get baseUrl {
    if (kIsWeb) return 'http://localhost:3000/api';
    if (defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:3000/api';
    }
    return 'http://localhost:3000/api';
  }

  /// Get staff tasks with real-time data from enhanced API
  static Future<Map<String, dynamic>> getStaffTasksEnhanced(
      String staffId, String token) async {
    try {
      print('🔄 Fetching enhanced tasks for staff: $staffId');

      final response = await http.get(
        Uri.parse('$baseUrl/staff/$staffId/tasks'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);

        if (data['success'] == true || data['myTasks'] != null) {
          print('✅ Enhanced tasks loaded successfully');
          print('   My Tasks: ${data['myTasks']?.length ?? 0}');
          print('   Available Tasks: ${data['availableTasks']?.length ?? 0}');

          return {
            'myTasks': List<Map<String, dynamic>>.from(data['myTasks'] ?? []),
            'availableTasks':
                List<Map<String, dynamic>>.from(data['availableTasks'] ?? []),
            'staff': data['staff'] ?? {},
          };
        }
      }

      print('⚠️ Enhanced API not available, falling back to legacy endpoints');
      return await _fallbackToLegacyEndpoints(staffId, token);
    } catch (e) {
      print('❌ Enhanced workflow service error: $e');
      return await _fallbackToLegacyEndpoints(staffId, token);
    }
  }

  /// Fallback to legacy endpoints if enhanced API is not available
  static Future<Map<String, dynamic>> _fallbackToLegacyEndpoints(
      String staffId, String token) async {
    try {
      print('🔄 Using legacy endpoints for backward compatibility');

      final myTasksResponse = await http.get(
        Uri.parse('$baseUrl/staff/$staffId/tasks'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 10));

      final availableTasksResponse = await http.get(
        Uri.parse('$baseUrl/staff/$staffId/available-tasks'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 10));

      List<Map<String, dynamic>> myTasks = [];
      List<Map<String, dynamic>> availableTasks = [];

      if (myTasksResponse.statusCode == 200) {
        final myTasksData = jsonDecode(myTasksResponse.body);
        if (myTasksData is List) {
          myTasks = List<Map<String, dynamic>>.from(myTasksData);
        }
      }

      if (availableTasksResponse.statusCode == 200) {
        final availableTasksData = jsonDecode(availableTasksResponse.body);
        if (availableTasksData is List) {
          availableTasks = List<Map<String, dynamic>>.from(availableTasksData);
        }
      }

      print(
          '✅ Legacy endpoints loaded: ${myTasks.length} my tasks, ${availableTasks.length} available');

      return {
        'myTasks': myTasks,
        'availableTasks': availableTasks,
        'staff': {},
      };
    } catch (e) {
      print('❌ Legacy fallback error: $e');
      return {
        'myTasks': <Map<String, dynamic>>[],
        'availableTasks': <Map<String, dynamic>>[],
        'staff': {},
      };
    }
  }

  /// Accept task with enhanced data flow
  static Future<bool> acceptTaskEnhanced({
    required String staffId,
    required String orderId,
    required String stageId,
    required String token,
  }) async {
    try {
      print(
          '🤝 Accepting task with enhanced flow: $staffId -> $orderId -> $stageId');

      final response = await http
          .post(
            Uri.parse('$baseUrl/staff/$staffId/accept-task'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $token',
            },
            body: jsonEncode({
              'orderId': orderId,
              'stageId': stageId,
            }),
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          print('✅ Task accepted successfully with enhanced flow');
          return true;
        }
      }

      print('❌ Enhanced accept failed, status: ${response.statusCode}');
      return false;
    } catch (e) {
      print('❌ Accept task enhanced error: $e');
      return false;
    }
  }

  /// Update task status with enhanced data flow
  static Future<bool> updateTaskStatusEnhanced({
    required String staffId,
    required String orderId,
    required String stageId,
    required String status,
    required String token,
    String? notes,
    int? qualityRating,
  }) async {
    try {
      print(
          '🔄 Updating task status with enhanced flow: $staffId -> $orderId -> $stageId -> $status');

      final body = {
        'orderId': orderId,
        'stageId': stageId,
        'status': status,
      };

      if (notes != null && notes.isNotEmpty) {
        body['notes'] = notes;
      }

      if (qualityRating != null) {
        body['qualityRating'] = qualityRating;
      }

      final response = await http
          .post(
            Uri.parse('$baseUrl/staff/$staffId/update-task'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $token',
            },
            body: jsonEncode(body),
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          print('✅ Task status updated successfully with enhanced flow');
          return true;
        }
      }

      print('❌ Enhanced update failed, status: ${response.statusCode}');
      return false;
    } catch (e) {
      print('❌ Update task status enhanced error: $e');
      return false;
    }
  }

  /// Get real-time notifications for staff
  static Future<List<Map<String, dynamic>>> getNotifications(
      String staffId, String token) async {
    try {
      print('🔔 Fetching notifications for staff: $staffId');

      final response = await http.get(
        Uri.parse('$baseUrl/staff/$staffId/notifications'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true && data['notifications'] is List) {
          final notifications =
              List<Map<String, dynamic>>.from(data['notifications']);
          print('✅ Loaded ${notifications.length} notifications');
          return notifications;
        }
      }

      return [];
    } catch (e) {
      print('❌ Get notifications error: $e');
      return [];
    }
  }

  /// Mark notification as read
  static Future<bool> markNotificationAsRead(
      String notificationId, String token) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/staff/notifications/$notificationId/read'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 5));

      return response.statusCode == 200;
    } catch (e) {
      print('❌ Mark notification read error: $e');
      return false;
    }
  }

  /// Get real-time updates for synchronization
  static Future<List<Map<String, dynamic>>> getSyncUpdates({
    String? since,
    String? staffId,
    String? token,
  }) async {
    try {
      final queryParams = <String, String>{};
      if (since != null) queryParams['since'] = since;
      if (staffId != null) queryParams['staffId'] = staffId;

      final uri = Uri.parse('$baseUrl/sync/updates')
          .replace(queryParameters: queryParams);

      final headers = <String, String>{
        'Content-Type': 'application/json',
      };
      if (token != null) {
        headers['Authorization'] = 'Bearer $token';
      }

      final response = await http
          .get(uri, headers: headers)
          .timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true && data['updates'] is List) {
          return List<Map<String, dynamic>>.from(data['updates']);
        }
      }

      return [];
    } catch (e) {
      print('❌ Get sync updates error: $e');
      return [];
    }
  }

  /// Check system health
  static Future<Map<String, dynamic>?> checkSystemHealth() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/sync/health'),
        headers: {'Content-Type': 'application/json'},
      ).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          return data;
        }
      }

      return null;
    } catch (e) {
      print('❌ System health check error: $e');
      return null;
    }
  }
}

/// Legacy Workflow Service for backward compatibility
/// This maintains the existing API while providing enhanced features
class WorkflowService {
  static String get baseUrl {
    if (kIsWeb) return 'http://localhost:3000/api';
    if (defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:3000/api';
    }
    return 'http://localhost:3000/api';
  }

  /// Get my tasks (assigned to this staff member)
  static Future<List<Map<String, dynamic>>> getMyTasks(
      String staffId, String token) async {
    try {
      // Try enhanced API first
      final enhancedResult =
          await EnhancedWorkflowService.getStaffTasksEnhanced(staffId, token);
      return enhancedResult['myTasks'] ?? [];
    } catch (e) {
      print('❌ Get my tasks error: $e');
      return [];
    }
  }

  /// Get available tasks (unassigned tasks this staff can accept)
  static Future<List<Map<String, dynamic>>> getAvailableTasks(
      String staffId, String token) async {
    try {
      // Try enhanced API first
      final enhancedResult =
          await EnhancedWorkflowService.getStaffTasksEnhanced(staffId, token);
      return enhancedResult['availableTasks'] ?? [];
    } catch (e) {
      print('❌ Get available tasks error: $e');
      return [];
    }
  }

  /// Accept an available task
  static Future<bool> acceptTask({
    required String staffId,
    required String orderId,
    required String stageId,
    required String token,
  }) async {
    // Try enhanced API first
    final enhanced = await EnhancedWorkflowService.acceptTaskEnhanced(
      staffId: staffId,
      orderId: orderId,
      stageId: stageId,
      token: token,
    );

    return enhanced;
  }

  /// Update task status (start, pause, resume, complete)
  static Future<bool> updateTaskStatus({
    required String staffId,
    required String orderId,
    required String stageId,
    required String status,
    required String token,
    String? notes,
    int? qualityRating,
  }) async {
    // Try enhanced API first
    final enhanced = await EnhancedWorkflowService.updateTaskStatusEnhanced(
      staffId: staffId,
      orderId: orderId,
      stageId: stageId,
      status: status,
      token: token,
      notes: notes,
      qualityRating: qualityRating,
    );

    return enhanced;
  }
}
