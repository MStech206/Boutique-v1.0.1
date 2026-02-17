import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  final http.Client _client = http.Client();

  String get _defaultBase {
    if (Platform.isAndroid) return 'http://10.0.2.2:3000';
    return 'http://localhost:3000';
  }

  String _normalizeUrl(String url) {
    if (url.startsWith('http')) {
      if (Platform.isAndroid && url.contains('localhost')) {
        return url.replaceAll('localhost', '10.0.2.2');
      }
      return url;
    }
    // treat as relative path
    return '$_defaultBase${url.startsWith('/') ? url : '/$url'}';
  }

  Future<String?> _getJwt() async {
    final prefs = await SharedPreferences.getInstance();
    final jsonStr = prefs.getString('sapthala_user');
    if (jsonStr == null) return null;
    final Map<String, dynamic> data = jsonDecode(jsonStr);
    return data['jwt'] as String?;
  }

  Future<http.Response> get(String url) async {
    final jwt = await _getJwt();
    final headers = {
      'Content-Type': 'application/json',
      if (jwt != null) 'Authorization': 'Bearer $jwt'
    };
    final u = Uri.parse(_normalizeUrl(url));
    return _client.get(u, headers: headers);
  }

  Future<http.Response> post(String url, {Map<String, dynamic>? body}) async {
    final jwt = await _getJwt();
    final headers = {
      'Content-Type': 'application/json',
      if (jwt != null) 'Authorization': 'Bearer $jwt'
    };
    final u = Uri.parse(_normalizeUrl(url));
    return _client.post(u, headers: headers, body: jsonEncode(body ?? {}));
  }

  Future<http.Response> postWithAuth(String url, {Map<String, dynamic>? body}) async {
    // Same as post but kept for semantic clarity
    return post(url, body: body);
  }

  Future<http.Response> registerFcmToken(String uid, String token) async {
    final url = _normalizeUrl('/api/users/$uid/fcm-token');
    return post(url, body: {'token': token});
  }
}
