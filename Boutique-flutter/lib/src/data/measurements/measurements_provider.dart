import 'dart:io';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';

class MeasurementsNotifier extends StateNotifier<List<Map<String, dynamic>>> {
  MeasurementsNotifier() : super([]);

  Future<void> saveTemplate(Map<String, double> measurements, List<File> photos) async {
    final prefs = await SharedPreferences.getInstance();
    final template = {
      'id': DateTime.now().millisecondsSinceEpoch.toString(),
      'measurements': measurements,
      'photos': photos.map((f) => f.path).toList(),
      'createdAt': DateTime.now().toIso8601String(),
    };
    
    final existing = prefs.getStringList('measurement_templates') ?? [];
    existing.add(jsonEncode(template));
    await prefs.setStringList('measurement_templates', existing);
    
    state = [...state, template];
  }

  Future<void> loadTemplates() async {
    final prefs = await SharedPreferences.getInstance();
    final templates = prefs.getStringList('measurement_templates') ?? [];
    state = templates.map((t) => jsonDecode(t) as Map<String, dynamic>).toList();
  }
}

final measurementsProvider = StateNotifierProvider<MeasurementsNotifier, List<Map<String, dynamic>>>((ref) {
  return MeasurementsNotifier();
});