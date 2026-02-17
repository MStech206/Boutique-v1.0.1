import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../../core/theme/app_theme.dart';

class CategoriesPage extends StatelessWidget {
  const CategoriesPage({super.key});

  static const List<Map<String, dynamic>> categories = [
    {
      'name': 'Shirts',
      'icon': Icons.checkroom,
      'color': Color(0xFFE3F2FD),
    },
    {
      'name': 'Pants',
      'icon': Icons.accessibility,
      'color': Color(0xFFF3E5F5),
    },
    {
      'name': 'Suits',
      'icon': Icons.business_center,
      'color': Color(0xFFE8F5E8),
    },
    {
      'name': 'Jackets',
      'icon': Icons.layers,
      'color': Color(0xFFFFF3E0),
    },
    {
      'name': 'Traditional Wear',
      'icon': Icons.brightness_6,
      'color': Color(0xFFFCE4EC),
    },
    {
      'name': 'Accessories',
      'icon': Icons.watch,
      'color': Color(0xFFE0F2F1),
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Categories'),
        backgroundColor: AppTheme.ivoryWhite,
      ),
      body: GridView.builder(
        padding: const EdgeInsets.all(16),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          crossAxisSpacing: 16,
          mainAxisSpacing: 16,
          childAspectRatio: 1.2,
        ),
        itemCount: categories.length,
        itemBuilder: (context, index) {
          final category = categories[index];
          return _CategoryCard(category: category);
        },
      ),
    );
  }
}

class _CategoryCard extends StatelessWidget {
  final Map<String, dynamic> category;

  const _CategoryCard({required this.category});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: InkWell(
        onTap: () => _onCategoryTap(context, category['name']),
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            gradient: LinearGradient(
              colors: [
                category['color'],
                category['color'].withOpacity(0.7),
              ],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                category['icon'],
                size: 48,
                color: AppTheme.charcoal,
              ),
              const SizedBox(height: 12),
              Text(
                category['name'],
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: AppTheme.charcoal,
                  fontWeight: FontWeight.w600,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 4),
              FutureBuilder<QuerySnapshot>(
                future: FirebaseFirestore.instance
                    .collection('products')
                    .where('category', isEqualTo: category['name'])
                    .get(),
                builder: (context, snapshot) {
                  final count = snapshot.data?.docs.length ?? 0;
                  return Text(
                    '$count items',
                    style: const TextStyle(
                      color: AppTheme.warmGray,
                      fontSize: 12,
                    ),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _onCategoryTap(BuildContext context, String categoryName) {
    Navigator.pushNamed(
      context,
      '/products',
      arguments: {'category': categoryName},
    );
  }
}