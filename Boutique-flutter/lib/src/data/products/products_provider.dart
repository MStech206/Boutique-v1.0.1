import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/product.dart';
import '../../services/api_service.dart';

final productsProvider = FutureProvider<List<ProductModel>>((ref) async {
  final api = ApiService();
  final resp = await api.get('http://localhost:8080/api/products');
  if (resp.statusCode != 200) throw Exception('Failed to fetch products');
  final List data = jsonDecode(resp.body) as List;
  return data
      .map((e) => ProductModel.fromJson(e as Map<String, dynamic>))
      .toList();
});
