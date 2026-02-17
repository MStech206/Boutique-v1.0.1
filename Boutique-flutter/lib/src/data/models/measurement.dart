class MeasurementTemplate {
  final String id;
  final Map<String, double> measurements;
  final List<String> photoUrls;
  final DateTime createdAt;

  MeasurementTemplate({required this.id, required this.measurements, required this.photoUrls, DateTime? createdAt}) : createdAt = createdAt ?? DateTime.now();

  Map<String, dynamic> toJson() => {
        'id': id,
        'measurements': measurements,
        'photoUrls': photoUrls,
        'createdAt': createdAt.millisecondsSinceEpoch,
      };

  factory MeasurementTemplate.fromJson(Map<String, dynamic> json) => MeasurementTemplate(
        id: json['id'] ?? '',
        measurements: Map<String, double>.from((json['measurements'] ?? {}).map((k, v) => MapEntry(k as String, (v as num).toDouble()))),
        photoUrls: List<String>.from(json['photoUrls'] ?? []),
        createdAt: DateTime.fromMillisecondsSinceEpoch(json['createdAt'] ?? DateTime.now().millisecondsSinceEpoch),
      );
}
