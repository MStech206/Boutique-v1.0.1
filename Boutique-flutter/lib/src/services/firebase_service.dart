import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'dart:io';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class FirebaseService {
  final FirebaseAuth _auth = FirebaseAuth.instance;

  Future<void> signInWithPhone(String phoneNumber, Function(String verificationId) onCodeSent) async {
    await _auth.verifyPhoneNumber(
      phoneNumber: phoneNumber,
      verificationCompleted: (PhoneAuthCredential credential) async {
        await _auth.signInWithCredential(credential);
      },
      verificationFailed: (e) {
        if (kDebugMode) print('Phone verification failed: $e');
      },
      codeSent: (verificationId, resendToken) {
        onCodeSent(verificationId);
      },
      codeAutoRetrievalTimeout: (verificationId) {},
    );
  }

  Future<String?> getIdToken() async {
    User? user = _auth.currentUser;
    if (user == null) return null;
    return await user.getIdToken();
  }

  // Firebase Messaging token retrieval and registration
  Future<String?> getFcmToken() async {
    try {
      final messaging = FirebaseMessaging.instance;
      await messaging.requestPermission();
      String? token = await messaging.getToken();
      return token;
    } catch (e) {
      if (kDebugMode) print('Failed to get FCM token: $e');
      return null;
    }
  }

  Future<Map<String, dynamic>?> exchangeTokenWithBackend([String? backendUrl]) async {
    String? idToken = await getIdToken();
    if (idToken == null) return null;
    final base = backendUrl ?? (kIsWeb ? 'http://localhost:8080' : (Platform.isAndroid ? 'http://10.0.2.2:8080' : 'http://localhost:8080')) ;
    final resp = await http.post(Uri.parse('$base/auth/exchange'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'idToken': idToken}));

    if (resp.statusCode == 200) {
      return jsonDecode(resp.body);
    }
    return null;
  }

  Future<void> signOut() async {
    await _auth.signOut();
  }
}
