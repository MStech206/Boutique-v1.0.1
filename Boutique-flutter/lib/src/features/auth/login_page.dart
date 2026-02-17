import 'package:flutter/material.dart';
import 'package:sapthala_boutique/src/services/firebase_service.dart';
import 'otp_page.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _phoneController = TextEditingController();
  final _firebaseService = FirebaseService();

  void _startPhoneSignIn() async {
    final phone = _phoneController.text.trim();
    await _firebaseService.signInWithPhone(phone, (verificationId) {
      Navigator.push(context, MaterialPageRoute(builder: (_) => OTPPage(verificationId: verificationId)));
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Login')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            TextField(controller: _phoneController, decoration: const InputDecoration(labelText: 'Phone (+91...)')),
            const SizedBox(height: 12),
            ElevatedButton(onPressed: _startPhoneSignIn, child: const Text('Send OTP'))
          ],
        ),
      ),
    );
  }
}
