import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../../data/auth/auth_provider.dart';
import '../../core/theme/app_theme.dart';

class AdminDashboard extends ConsumerWidget {
  const AdminDashboard({super.key});

  Future<void> _markPaidAndConfirm(String docId) async {
    final ref = FirebaseFirestore.instance.collection('orders').doc(docId);
    await ref.update({
      'status': 'confirmed',
      'paid': true,
      'paidAt': DateTime.now().millisecondsSinceEpoch,
    });
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider);
    if (user == null) return const SizedBox.shrink();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Admin Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await ref.read(authProvider.notifier).signOut();
              Navigator.of(context).pushReplacementNamed('/');
            },
          )
        ],
      ),
      body: StreamBuilder<QuerySnapshot>(
        stream: FirebaseFirestore.instance.collection('orders').orderBy('createdAt', descending: true).snapshots(),
        builder: (context, snapshot) {
          if (snapshot.hasError) return Center(child: Text('Error: ${snapshot.error}'));
          if (snapshot.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());

          final docs = snapshot.data!.docs;
          if (docs.isEmpty) return const Center(child: Text('No orders yet'));

          return ListView.builder(
            padding: const EdgeInsets.all(12),
            itemCount: docs.length,
            itemBuilder: (context, index) {
              final doc = docs[index];
              final order = doc.data() as Map<String, dynamic>;
              final status = order['status'] as String? ?? 'draft';
              final statusColor = AppTheme.orderStatusColors[status] ?? AppTheme.warmGray;

              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Order #${order['orderId'] ?? doc.id}', style: Theme.of(context).textTheme.titleMedium),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            decoration: BoxDecoration(color: statusColor.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
                            child: Text(status.toUpperCase(), style: TextStyle(color: statusColor, fontWeight: FontWeight.w600)),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text('Customer: ${order['customer'] != null ? (order['customer']['name'] ?? '') : ''}'),
                      const SizedBox(height: 8),
                      if (order['items'] != null) Text('Items: ${(order['items'] as List).length}'),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          ElevatedButton(
                            onPressed: (order['paid'] == true || status == 'confirmed')
                                ? null
                                : () async {
                                    await _markPaidAndConfirm(doc.id);
                                  },
                            child: const Text('Mark Paid & Confirm'),
                          ),
                          const SizedBox(width: 8),
                          OutlinedButton(
                            onPressed: () async {
                              // quick view: open order details screen if exists
                              showDialog(
                                context: context,
                                builder: (_) => AlertDialog(
                                  title: const Text('Order Details'),
                                  content: SingleChildScrollView(child: Text(order.toString())),
                                  actions: [TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Close'))],
                                ),
                              );
                            },
                            child: const Text('View'),
                          ),
                        ],
                      )
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
