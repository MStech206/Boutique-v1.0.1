class TaskModel {
  final String id;
  final String taskId;
  final String orderId;
  final OrderDetails? orderDetails;
  final String stage;
  final int stageIndex;
  final String description;
  final String status; // pending, in-progress, paused, completed, failed
  final StaffAssignment? assignedTo;
  final int? estimatedDuration;
  final int? actualDuration;
  final String notes;
  final String priority;
  final DateTime createdAt;
  final DateTime updatedAt;

  TaskModel({
    required this.id,
    required this.taskId,
    required this.orderId,
    this.orderDetails,
    required this.stage,
    required this.stageIndex,
    required this.description,
    required this.status,
    this.assignedTo,
    this.estimatedDuration,
    this.actualDuration,
    required this.notes,
    required this.priority,
    required this.createdAt,
    required this.updatedAt,
  });

  factory TaskModel.fromJson(Map<String, dynamic> json) {
    return TaskModel(
      id: json['_id'] ?? json['id'] ?? '',
      taskId: json['taskId'] ?? '',
      orderId: json['orderId'] ?? '',
      orderDetails: json['orderDetails'] != null
          ? OrderDetails.fromJson(json['orderDetails'])
          : null,
      stage: json['stage'] ?? '',
      stageIndex: json['stageIndex'] ?? 0,
      description: json['description'] ?? '',
      status: json['status'] ?? 'pending',
      assignedTo: json['assignedTo'] != null
          ? StaffAssignment.fromJson(json['assignedTo'])
          : null,
      estimatedDuration: json['estimatedDuration'],
      actualDuration: json['actualDuration'],
      notes: json['notes'] ?? '',
      priority: json['priority'] ?? 'normal',
      createdAt: DateTime.parse(json['createdAt'] ?? DateTime.now().toString()),
      updatedAt: DateTime.parse(json['updatedAt'] ?? DateTime.now().toString()),
    );
  }

  Map<String, dynamic> toJson() => {
    '_id': id,
    'taskId': taskId,
    'orderId': orderId,
    'orderDetails': orderDetails?.toJson(),
    'stage': stage,
    'stageIndex': stageIndex,
    'description': description,
    'status': status,
    'assignedTo': assignedTo?.toJson(),
    'estimatedDuration': estimatedDuration,
    'actualDuration': actualDuration,
    'notes': notes,
    'priority': priority,
    'createdAt': createdAt.toIso8601String(),
    'updatedAt': updatedAt.toIso8601String(),
  };

  TaskModel copyWith({
    String? status,
    String? notes,
    int? actualDuration,
  }) {
    return TaskModel(
      id: id,
      taskId: taskId,
      orderId: orderId,
      orderDetails: orderDetails,
      stage: stage,
      stageIndex: stageIndex,
      description: description,
      status: status ?? this.status,
      assignedTo: assignedTo,
      estimatedDuration: estimatedDuration,
      actualDuration: actualDuration ?? this.actualDuration,
      notes: notes ?? this.notes,
      priority: priority,
      createdAt: createdAt,
      updatedAt: DateTime.now(),
    );
  }
}

class OrderDetails {
  final String customerName;
  final String customerPhone;
  final String garmentName;
  final String deliveryDate;

  OrderDetails({
    required this.customerName,
    required this.customerPhone,
    required this.garmentName,
    required this.deliveryDate,
  });

  factory OrderDetails.fromJson(Map<String, dynamic> json) {
    return OrderDetails(
      customerName: json['customerName'] ?? '',
      customerPhone: json['customerPhone'] ?? '',
      garmentName: json['garmentName'] ?? '',
      deliveryDate: json['deliveryDate'] ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
    'customerName': customerName,
    'customerPhone': customerPhone,
    'garmentName': garmentName,
    'deliveryDate': deliveryDate,
  };
}

class StaffAssignment {
  final String staffId;
  final String name;
  final String phone;
  final String role;

  StaffAssignment({
    required this.staffId,
    required this.name,
    required this.phone,
    required this.role,
  });

  factory StaffAssignment.fromJson(Map<String, dynamic> json) {
    return StaffAssignment(
      staffId: json['staffId'] ?? '',
      name: json['name'] ?? '',
      phone: json['phone'] ?? '',
      role: json['role'] ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
    'staffId': staffId,
    'name': name,
    'phone': phone,
    'role': role,
  };
}
