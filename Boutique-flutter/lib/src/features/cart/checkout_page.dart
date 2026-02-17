import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/cart/cart_provider.dart';
import '../../services/api_service.dart';

class CheckoutPage extends ConsumerWidget {
  const CheckoutPage({super.key});

  Future<void> _placeOrder(BuildContext context, WidgetRef ref, List<CartItem> items) async {
    final api = ApiService();
    // Create a simplified payload
    final payload = {
      'items': items.map((i) => {'sku': i.product.id, 'qty': i.qty}).toList(),
      'customerNote': 'Order placed from Flutter app'
    };
    final resp = await api.post('/api/orders', body: payload);
    if (resp.statusCode == 200) {
      final data = jsonDecode(resp.body);
      final orderId = data['orderId'] as String;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Order confirmed: $orderId')));

      // Payment handled manually by admin. Create order and notify user.
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Order placed. The shop will contact you after payment confirmation.')));

      // Clear cart and close
      ref.read(cartProvider.notifier).clear();
      Navigator.of(context).pop();
    } else if (resp.statusCode == 409) {
      final data = jsonDecode(resp.body);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Order failed: ${data['error']}')));
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Order failed: ${resp.statusCode}')));
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cart = ref.watch(cartProvider);
    final total = ref.read(cartProvider.notifier).total();
    return Scaffold(
      appBar: AppBar(title: const Text('Checkout')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            Expanded(
              child: ListView.builder(
                itemCount: cart.length,
                itemBuilder: (c, i) {
                  final it = cart[i];
                  return ListTile(
                    title: Text(it.product.title),
                    subtitle: Text('Qty: ${it.qty}'),
                    trailing: Text('₹${(it.product.price * it.qty).toStringAsFixed(0)}'),
                  );
                },
              ),
            ),
            const SizedBox(height: 12),
            Text('Total: ₹${total.toStringAsFixed(0)}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            ElevatedButton(onPressed: cart.isEmpty ? null : () => _placeOrder(context, ref, cart), child: const Text('Place Order'))
          ],
        ),
      ),
    );
  }
}
