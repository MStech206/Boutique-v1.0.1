import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/auth/auth_provider.dart';

class HomePage extends ConsumerWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Sapthala — Home'),
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
      body: Center(child: Column(
        children: [
          const Expanded(child: Center(child: Text('Customer Home — product lists, search, cart'))),
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              children: [
                Expanded(child: ElevatedButton(onPressed: () => Navigator.of(context).pushNamed('/products'), child: const Text('Browse Products'))),
                const SizedBox(width: 12),
                ElevatedButton(onPressed: () => Navigator.of(context).pushNamed('/checkout'), child: const Text('Cart'))
              ],
            ),
          )
        ],
      )),
    );
  }
}
