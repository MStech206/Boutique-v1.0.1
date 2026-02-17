import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user.dart';
import '../../services/firebase_service.dart';
import '../../services/api_service.dart';

final authProvider = StateNotifierProvider<AuthNotifier, AppUser?>(
  (ref) => AuthNotifier(),
);

class AuthNotifier extends StateNotifier<AppUser?> {
  AuthNotifier() : super(null) {
    _loadFromPrefs();
  }

  final FirebaseService _firebaseService = FirebaseService();

  Future<void> _loadFromPrefs() async {
    final prefs = await SharedPreferences.getInstance();
    final jsonStr = prefs.getString('sapthala_user');
    if (jsonStr != null) {
      try {
        final data = jsonDecode(jsonStr) as Map<String, dynamic>;
        final user = AppUser.fromJson(data);
        // Basic expiry check
        if (user.expiresAt == null ||
            user.expiresAt! > DateTime.now().millisecondsSinceEpoch) {
          state = user;
        } else {
          await prefs.remove('sapthala_user');
        }
      } catch (e) {
        // ignore and clear
        await prefs.remove('sapthala_user');
      }
    }
  }

  Future<AppUser?> signInWithBackend([String? backendUrl]) async {
    final resp = await _firebaseService.exchangeTokenWithBackend(backendUrl);
    if (resp == null) return null;

    final jwt = resp['jwt'] as String?;
    final uid = resp['uid'] as String? ?? '';
    final rolesRaw = resp['roles'];
    List<String> roles = [];
    if (rolesRaw is List) {
      roles = rolesRaw.cast<String>();
    } else if (rolesRaw is String) roles = [rolesRaw];

    final expiresAt = resp['expiresAt'] as int?;

    if (jwt != null) {
      final user = AppUser(
        uid: uid,
        roles: roles,
        jwt: jwt,
        expiresAt: expiresAt,
      );
      state = user;
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('sapthala_user', jsonEncode(user.toJson()));

      // Attempt to register FCM token with backend
      try {
        final token = await _firebaseService.getFcmToken();
        if (token != null && user.uid.isNotEmpty) {
          await ApiService().registerFcmToken(user.uid, token);
        }
      } catch (e) {
        // ignore errors to avoid blocking login
      }

      return user;
    }
    return null;
  }

  Future<void> signOut() async {
    state = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('sapthala_user');
    // Also sign out Firebase
    await _firebaseService.signOut();
  }
}
