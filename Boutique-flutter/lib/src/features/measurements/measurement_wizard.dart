import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import '../../data/measurements/measurements_provider.dart';

class MeasurementWizard extends ConsumerStatefulWidget {
  const MeasurementWizard({super.key});

  @override
  ConsumerState<MeasurementWizard> createState() => _MeasurementWizardState();
}

class _MeasurementWizardState extends ConsumerState<MeasurementWizard> {
  final _formKey = GlobalKey<FormState>();
  final Map<String, TextEditingController> _controllers = {};
  final List<File> _photos = [];
  int _step = 0;

  final _fields = ['Chest', 'Waist', 'Hips', 'Length'];

  @override
  void initState() {
    super.initState();
    for (final f in _fields) {
      _controllers[f] = TextEditingController();
    }
  }

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final XFile? x = await picker.pickImage(source: ImageSource.camera, imageQuality: 80);
    if (x != null) {
      setState(() => _photos.add(File(x.path)));
    }
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    final measurements = <String, double>{};
    for (final f in _fields) {
      measurements[f] = double.parse(_controllers[f]!.text);
    }
    await ref.read(measurementsProvider.notifier).saveTemplate(measurements, _photos);
    if (mounted) Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Measurements Wizard')),
      body: Form(
        key: _formKey,
        child: Stepper(
          currentStep: _step,
          onStepContinue: () {
            if (_step < _fields.length) {
              setState(() => _step++);
            } else {
              _save();
            }
          },
          onStepCancel: () {
            if (_step > 0) {
              setState(() => _step--);
            } else {
              Navigator.of(context).pop();
            }
          },
          steps: [
            for (final f in _fields)
              Step(
                title: Text(f),
                content: TextFormField(
                  controller: _controllers[f],
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: InputDecoration(labelText: '$f (cm)'),
                  validator: (v) => (v == null || v.isEmpty) ? 'Required' : null,
                ),
                isActive: _fields.indexOf(f) == _step,
              ),
            Step(
              title: const Text('Photos'),
              content: Column(
                children: [
                  ElevatedButton.icon(onPressed: _pickImage, icon: const Icon(Icons.camera_alt), label: const Text('Take Photo')),
                  const SizedBox(height: 8),
                  Wrap(children: _photos.map((p) => Padding(padding: const EdgeInsets.all(4.0), child: Image.file(p, width: 80, height: 80))).toList()),
                ],
              ),
              isActive: _step == _fields.length,
            )
          ],
        ),
      ),
    );
  }
}
