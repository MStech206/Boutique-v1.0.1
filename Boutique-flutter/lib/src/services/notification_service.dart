import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class NotificationService {
  static const String baseUrl = 'http://10.0.2.2:3000/api';

  static Future<void> initialize() async {
    // Simple initialization - no native notifications needed
    print('✅ Notification service initialized');
  }

  static Future<void> showNotification({
    required int id,
    required String title,
    required String body,
    String? payload,
  }) async {
    // Log notification instead of showing native notification
    print('🔔 Notification: $title - $body');
  }

  static Future<List<Map<String, dynamic>>> getNotifications(
      String staffId, String token) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/staff/$staffId/notifications'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        return List<Map<String, dynamic>>.from(jsonDecode(response.body));
      }
      return [];
    } catch (e) {
      print('Error fetching notifications: $e');
      return [];
    }
  }

  static Future<void> markAsRead(String notificationId) async {
    try {
      await http.post(
        Uri.parse('$baseUrl/notifications/$notificationId/read'),
        headers: {'Content-Type': 'application/json'},
      );
    } catch (e) {
      print('Error marking notification as read: $e');
    }
  }

  static Future<void> startPeriodicCheck(String staffId, String token, {void Function()? onNewTask}) async {
    // Check for new notifications every 30 seconds
    Future.delayed(const Duration(seconds: 30), () async {
      final notificationsData = await getNotifications(staffId, token);
      final prefs = await SharedPreferences.getInstance();
      final lastCheck = prefs.getInt('last_notification_check') ?? 0;

      for (final notification in notificationsData) {
        final sentAt = DateTime.parse(notification['sentAt']).millisecondsSinceEpoch;
        if (sentAt > lastCheck && !notification['isRead']) {
          await showNotification(
            id: notification['_id'].hashCode,
            title: notification['title'],
            body: notification['message'],
            payload: notification['orderId'],
          );
          // Notify caller that a new task/notification arrived
          try { if (onNewTask != null) onNewTask(); } catch (e) { print('onNewTask callback error: $e'); }
        }
      }

      await prefs.setInt(
          'last_notification_check', DateTime.now().millisecondsSinceEpoch);

      // Continue periodic check
      startPeriodicCheck(staffId, token);
    });
  }
}
