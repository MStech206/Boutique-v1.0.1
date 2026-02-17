import 'package:flutter/material.dart';
import '../../data/models/product.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/cart/cart_provider.dart';
import '../measurements/measurement_wizard.dart';

class ProductDetailPage extends ConsumerWidget {
  final ProductModel product;
  const ProductDetailPage({super.key, required this.product});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: Text(product.title)),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(product.description),
            const SizedBox(height: 12),
            Text('Price: ₹${product.price.toStringAsFixed(0)}'),
            const SizedBox(height: 12),
            Text('In stock: ${product.inventoryCount}'),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: product.inventoryCount > 0
                  ? () {
                      ref.read(cartProvider.notifier).addItem(product);
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Added to cart')));
                    }
                  : null,
              child: const Text('Add to Cart'),
            ),
            const SizedBox(height: 12),
            ElevatedButton(onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const MeasurementWizard())), child: const Text('Open Measurements Wizard')),
          ],
        ),
      ),
    );
  }
}
