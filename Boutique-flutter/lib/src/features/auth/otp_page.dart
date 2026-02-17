import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/auth/auth_provider.dart';

class OTPPage extends ConsumerStatefulWidget {
  final String verificationId;
  const OTPPage({super.key, required this.verificationId});

  @override
  ConsumerState<OTPPage> createState() => _OTPPageState();
}

class _OTPPageState extends ConsumerState<OTPPage> {
  final _codeCtrl = TextEditingController();
  bool _loading = false;

  Future<void> _submitCode() async {
    setState(() => _loading = true);
    final code = _codeCtrl.text.trim();
    final credential = PhoneAuthProvider.credential(verificationId: widget.verificationId, smsCode: code);
    try {
      await FirebaseAuth.instance.signInWithCredential(credential);
      final user = await ref.read(authProvider.notifier).signInWithBackend();
      if (user != null) {
        // Route user by role
        if (user.roles.contains('Admin') || user.roles.any((r) => r.toLowerCase() == 'admin')) {
          if (mounted) Navigator.of(context).pushReplacementNamed('/admin');
        } else {
          if (mounted) Navigator.of(context).pushReplacementNamed('/home');
        }
      } else {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Backend sign-in failed')));
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Login failed: $e')));
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Enter OTP')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            TextField(controller: _codeCtrl, decoration: const InputDecoration(labelText: 'OTP')),
            const SizedBox(height: 12),
            ElevatedButton(onPressed: _loading ? null : _submitCode, child: _loading ? const CircularProgressIndicator() : const Text('Verify & Sign In'))
          ],
        ),
      ),
    );
  }
}
