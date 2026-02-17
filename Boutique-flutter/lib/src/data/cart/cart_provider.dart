import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/product.dart';
import 'package:shared_preferences/shared_preferences.dart';

class CartItem {
  final ProductModel product;
  int qty;
  CartItem({required this.product, this.qty = 1});

  Map<String, dynamic> toJson() => {'productId': product.id, 'qty': qty};
}

final cartProvider = StateNotifierProvider<CartNotifier, List<CartItem>>((ref) => CartNotifier());

class CartNotifier extends StateNotifier<List<CartItem>> {
  CartNotifier() : super([]) {
    _load();
  }

  void addItem(ProductModel p) {
    final idx = state.indexWhere((c) => c.product.id == p.id);
    if (idx >= 0) {
      state[idx].qty += 1;
      state = [...state];
    } else {
      state = [...state, CartItem(product: p)];
    }
    _save();
  }

  void removeItem(String productId) {
    state = state.where((c) => c.product.id != productId).toList();
    _save();
  }

  void clear() {
    state = [];
    _save();
  }

  double total() => state.fold(0.0, (p, c) => p + c.product.price * c.qty);

  Future<void> _save() async {
    final prefs = await SharedPreferences.getInstance();
    final data = state.map((c) => c.toJson()).toList();
    await prefs.setString('sapthala_cart', jsonEncode(data));
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final s = prefs.getString('sapthala_cart');
    if (s == null) return;
    try {
      final List d = jsonDecode(s);
      // Load is best-effort; product references won't be restored fully here.
      state = d.map((e) => CartItem(product: ProductModel(id: e['productId'], title: 'Unknown', description: '', price: 0.0, inventoryCount: 0), qty: e['qty'] ?? 1)).toList();
    } catch (_) {}
  }
}
