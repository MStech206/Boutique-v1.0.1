// MongoDB initialization script
db = db.getSiblingDB("sapthala_boutique");

// Create collections with indexes
db.createCollection("orders");
db.orders.createIndex({ "orderId": 1 }, { unique: true });
db.orders.createIndex({ "customer.phone": 1 });
db.orders.createIndex({ "status": 1 });
db.orders.createIndex({ "createdAt": -1 });

db.createCollection("tasks");
db.tasks.createIndex({ "taskId": 1 }, { unique: true });
db.tasks.createIndex({ "orderId": 1 });
db.tasks.createIndex({ "assignedTo.staffId": 1 });
db.tasks.createIndex({ "status": 1 });
db.tasks.createIndex({ "stage": 1 });
db.tasks.createIndex({ "createdAt": -1 });

db.createCollection("staff");
db.staff.createIndex({ "staffId": 1 }, { unique: true });
db.staff.createIndex({ "role": 1 });
db.staff.createIndex({ "availability.status": 1 });

db.createCollection("notifications");
db.notifications.createIndex({ "staffId": 1 });
db.notifications.createIndex({ "isRead": 1 });
db.notifications.createIndex({ "createdAt": -1 });
db.notifications.createIndex({ "expiresAt": 1 }, { expireAfterSeconds: 0 }); // TTL

db.createCollection("workflowTemplates");
db.workflowTemplates.createIndex({ "templateId": 1 }, { unique: true });
db.workflowTemplates.createIndex({ "category": 1, "subcategory": 1 });

db.createCollection("staffAssignmentLog");
db.staffAssignmentLog.createIndex({ "taskId": 1 });
db.staffAssignmentLog.createIndex({ "staffId": 1 });
db.staffAssignmentLog.createIndex({ "assignedAt": -1 });

// Insert default workflow templates
db.workflowTemplates.insertMany([
  {
    templateId: "TEMPLATE-STANDARD-001",
    name: "Standard Garment Workflow",
    category: "all",
    stages: [
      { index: 0, name: "dye", displayName: "Fabric Dyeing", estimatedTime: 360, requiredRole: "dyer" },
      { index: 1, name: "cutting", displayName: "Pattern Cutting", estimatedTime: 240, requiredRole: "cutter" },
      { index: 2, name: "stitching", displayName: "Stitching & Assembly", estimatedTime: 480, requiredRole: "tailor" },
      { index: 3, name: "qc", displayName: "Quality Check", estimatedTime: 120, requiredRole: "qc" },
      { index: 4, name: "delivery", displayName: "Packaging & Delivery", estimatedTime: 180, requiredRole: "delivery" }
    ],
    isActive: true,
    createdAt: new Date()
  }
]);

// Insert default staff members
db.staff.insertMany([
  {
    staffId: "STAFF-DYE-001",
    name: "Rajesh Kumar",
    phone: "9876543210",
    role: "dyer",
    expertise: ["dyeing", "fabric-preparation"],
    availability: { status: "available", lastUpdated: new Date() },
    currentWorkload: { activeTasks: 0, pausedTasks: 0, maxConcurrentTasks: 5 },
    statistics: { totalTasksCompleted: 120, averageCompletionTime: 300, qualityRating: 4.7, onTimeDelivery: 94 },
    contact: { whatsapp: "9876543210", email: "rajesh@sapthala.com" },
    joinDate: new Date("2024-01-01"),
    isActive: true,
    createdAt: new Date()
  },
  {
    staffId: "STAFF-CUT-001",
    name: "Priya Singh",
    phone: "9876543211",
    role: "cutter",
    expertise: ["cutting", "pattern-design"],
    availability: { status: "available", lastUpdated: new Date() },
    currentWorkload: { activeTasks: 0, pausedTasks: 0, maxConcurrentTasks: 5 },
    statistics: { totalTasksCompleted: 150, averageCompletionTime: 220, qualityRating: 4.8, onTimeDelivery: 96 },
    contact: { whatsapp: "9876543211", email: "priya@sapthala.com" },
    joinDate: new Date("2024-01-01"),
    isActive: true,
    createdAt: new Date()
  },
  {
    staffId: "STAFF-TAIL-001",
    name: "Amit Verma",
    phone: "9876543212",
    role: "tailor",
    expertise: ["stitching", "garment-assembly"],
    availability: { status: "available", lastUpdated: new Date() },
    currentWorkload: { activeTasks: 0, pausedTasks: 0, maxConcurrentTasks: 3 },
    statistics: { totalTasksCompleted: 180, averageCompletionTime: 450, qualityRating: 4.9, onTimeDelivery: 98 },
    contact: { whatsapp: "9876543212", email: "amit@sapthala.com" },
    joinDate: new Date("2024-01-01"),
    isActive: true,
    createdAt: new Date()
  },
  {
    staffId: "STAFF-QC-001",
    name: "Meera Patel",
    phone: "9876543213",
    role: "qc",
    expertise: ["quality-control", "finishing"],
    availability: { status: "available", lastUpdated: new Date() },
    currentWorkload: { activeTasks: 0, pausedTasks: 0, maxConcurrentTasks: 6 },
    statistics: { totalTasksCompleted: 200, averageCompletionTime: 100, qualityRating: 5.0, onTimeDelivery: 100 },
    contact: { whatsapp: "9876543213", email: "meera@sapthala.com" },
    joinDate: new Date("2024-01-01"),
    isActive: true,
    createdAt: new Date()
  },
  {
    staffId: "STAFF-DEL-001",
    name: "Vikram Gupta",
    phone: "9876543214",
    role: "delivery",
    expertise: ["packaging", "delivery", "customer-service"],
    availability: { status: "available", lastUpdated: new Date() },
    currentWorkload: { activeTasks: 0, pausedTasks: 0, maxConcurrentTasks: 10 },
    statistics: { totalTasksCompleted: 250, averageCompletionTime: 150, qualityRating: 4.6, onTimeDelivery: 92 },
    contact: { whatsapp: "9876543214", email: "vikram@sapthala.com" },
    joinDate: new Date("2024-01-01"),
    isActive: true,
    createdAt: new Date()
  }
]);

print("✅ MongoDB initialized successfully!");
print("Database: sapthala_boutique");
print("Collections created: orders, tasks, staff, notifications, workflowTemplates, staffAssignmentLog");
print("Default staff members created");
