const {connectDB, Settings, Order, Staff} = require('./database');

async function fixWorkflow() {
  await connectDB();
  
  console.log('\n🔧 Fixing Workflow\n');
  
  // 1. Update settings to remove measurements-design requirement
  const settings = await Settings.findOne();
  const measurementStage = settings.workflowStages.find(s => s.id === 'measurements-design');
  if (measurementStage) {
    measurementStage.order = 0; // Make it optional/first but not required
  }
  await settings.save();
  console.log('✅ Updated workflow settings');
  
  // 2. Update all pending orders to start with dyeing
  const orders = await Order.find({status: 'pending'});
  console.log(`\n📦 Updating ${orders.length} pending orders...\n`);
  
  for (const order of orders) {
    // Remove measurements-design task if it's the first one
    const firstTask = order.workflowTasks[0];
    if (firstTask && firstTask.stageId === 'measurements-design') {
      order.workflowTasks.shift(); // Remove first task
      
      // Assign first task (now dyeing) to staff_001
      if (order.workflowTasks.length > 0) {
        const newFirstTask = order.workflowTasks[0];
        const staff = await Staff.findOne({workflowStages: newFirstTask.stageId, isAvailable: true});
        
        if (staff) {
          newFirstTask.status = 'assigned';
          newFirstTask.assignedTo = staff._id;
          newFirstTask.assignedToName = staff.name;
          console.log(`  ✅ ${order.orderId}: ${newFirstTask.stageName} → ${staff.name}`);
        } else {
          newFirstTask.status = 'pending';
          console.log(`  ⚠️  ${order.orderId}: ${newFirstTask.stageName} → No staff available`);
        }
      }
      
      await order.save();
    }
  }
  
  // 3. Reset staff_001 to only dyeing
  const staff001 = await Staff.findOne({staffId: 'staff_001'});
  staff001.workflowStages = ['dyeing'];
  staff001.role = 'Dyeing Specialist';
  await staff001.save();
  console.log(`\n✅ ${staff001.name} assigned to: dyeing`);
  
  console.log('\n✅ Workflow fixed! Orders now start with Dyeing.\n');
  process.exit(0);
}

fixWorkflow();
