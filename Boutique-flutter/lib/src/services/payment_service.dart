import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;

class PaymentService {
  String get baseUrl => Platform.isAndroid ? 'http://10.0.2.2:8080' : 'http://localhost:8080';

  Future<Map<String, dynamic>?> createPayment({required String orderId, required double amount, required String productInfo, required String firstname, required String email}) async {
    final resp = await http.post(Uri.parse('$baseUrl/api/payments/create'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'orderId': orderId,
          'amount': amount,
          'productInfo': productInfo,
          'firstname': firstname,
          'email': email,
        }));
    if (resp.statusCode == 200) return jsonDecode(resp.body) as Map<String, dynamic>;
    return null;
  }

  Future<Map<String, dynamic>?> verifyPayment(Map<String, dynamic> payload) async {
    final resp = await http.post(Uri.parse('$baseUrl/api/payments/verify'), headers: {'Content-Type': 'application/json'}, body: jsonEncode(payload));
    if (resp.statusCode == 200) return jsonDecode(resp.body) as Map<String, dynamic>;
    return null;
  }
}
