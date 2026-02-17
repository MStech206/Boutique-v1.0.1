import 'dart:convert';
import 'package:http/http.dart' as http;

class WorkflowService {
  // Dynamic API URL - Change based on your setup
  static String get baseUrl {
    // For Android Emulator: http://10.0.2.2:3000/api
    // For iOS Simulator: http://localhost:3000/api
    // For Physical Device: http://YOUR_COMPUTER_IP:3000/api
    // Example: http://192.168.1.100:3000/api
    
    return 'http://10.0.2.2:3000/api'; // Default for Android Emulator
  }

  /// Get tasks assigned to a specific staff member
  static Future<List<Map<String, dynamic>>> getMyTasks(
    String staffId,
    String token,
  ) async {
    try {
      print('🔍 Fetching tasks for staff: $staffId');
      print('📡 API URL: $baseUrl/staff/$staffId/tasks');
      
      final response = await http.get(
        Uri.parse('$baseUrl/staff/$staffId/tasks'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 10));

      print('📥 Response status: ${response.statusCode}');
      
      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        print('✅ Loaded ${data.length} tasks for $staffId');
        
        // Log each task for debugging
        for (var task in data) {
          print('   📋 Task: ${task['stageName']} - Order: ${task['orderId']} - Status: ${task['status']}');
        }
        
        return data.cast<Map<String, dynamic>>();
      } else {
        final error = jsonDecode(response.body);
        print('❌ Failed to load tasks: ${error['error']}');
        throw Exception(error['error'] ?? 'Failed to load tasks');
      }
    } catch (e) {
      print('❌ Error loading tasks: $e');
      if (e.toString().contains('SocketException')) {
        throw Exception('Cannot connect to server. Please check:\n'
            '1. Backend is running on port 3000\n'
            '2. Using correct IP address\n'
            '3. Firewall allows port 3000');
      }
      rethrow;
    }
  }

  /// Get available tasks that staff can accept
  static Future<List<Map<String, dynamic>>> getAvailableTasks(
    String staffId,
    String token,
  ) async {
    try {
      print('🔍 Fetching available tasks for staff: $staffId');
      
      final response = await http.get(
        Uri.parse('$baseUrl/staff/$staffId/available-tasks'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        print('✅ Found ${data.length} available tasks');
        return data.cast<Map<String, dynamic>>();
      } else {
        final error = jsonDecode(response.body);
        throw Exception(error['error'] ?? 'Failed to load available tasks');
      }
    } catch (e) {
      print('❌ Error loading available tasks: $e');
      rethrow;
    }
  }

  /// Accept an available task
  static Future<bool> acceptTask({
    required String staffId,
    required String orderId,
    required String stageId,
    required String token,
  }) async {
    try {
      print('✅ Accepting task: $stageId for order $orderId');
      
      final response = await http.post(
        Uri.parse('$baseUrl/staff/$staffId/accept-task'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'orderId': orderId,
          'stageId': stageId,
        }),
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        print('✅ Task accepted successfully');
        return data['success'] == true;
      } else {
        final error = jsonDecode(response.body);
        throw Exception(error['error'] ?? 'Failed to accept task');
      }
    } catch (e) {
      print('❌ Error accepting task: $e');
      rethrow;
    }
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
    try {
      print('🔄 Updating task status to: $status');
      
      final body = {
        'orderId': orderId,
        'stageId': stageId,
        'status': status,
        if (notes != null) 'notes': notes,
        if (qualityRating != null) 'qualityRating': qualityRating,
      };
      
      final response = await http.post(
        Uri.parse('$baseUrl/staff/$staffId/update-task'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode(body),
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        print('✅ Task status updated to: $status');
        return data['success'] == true;
      } else {
        final error = jsonDecode(response.body);
        throw Exception(error['error'] ?? 'Failed to update task');
      }
    } catch (e) {
      print('❌ Error updating task: $e');
      rethrow;
    }
  }

  /// Get staff notifications
  static Future<List<Map<String, dynamic>>> getNotifications(
    String staffId,
    String token,
  ) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/staff/$staffId/notifications'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        return data.cast<Map<String, dynamic>>();
      } else {
        throw Exception('Failed to load notifications');
      }
    } catch (e) {
      print('❌ Error loading notifications: $e');
      return [];
    }
  }

  /// Mark notification as read
  static Future<bool> markNotificationRead(
    String notificationId,
    String token,
  ) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/notifications/$notificationId/read'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 10));

      return response.statusCode == 200;
    } catch (e) {
      print('❌ Error marking notification as read: $e');
      return false;
    }
  }

  /// Test connection to backend
  static Future<bool> testConnection() async {
    try {
      print('🔌 Testing connection to: $baseUrl');
      
      final response = await http.get(
        Uri.parse('$baseUrl/settings'),
      ).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        print('✅ Connection successful!');
        return true;
      } else {
        print('⚠️ Server responded with status: ${response.statusCode}');
        return false;
      }
    } catch (e) {
      print('❌ Connection failed: $e');
      return false;
    }
  }
}
