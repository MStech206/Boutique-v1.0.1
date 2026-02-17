const {connectDB, Order, Staff} = require('./database');

async function reassignTasks() {
  await connectDB();
  
  const staff001 = await Staff.findOne({staffId: 'staff_001'});
  const staff010 = await Staff.findOne({staffId: 'staff_010'});
  
  const orders = await Order.find({'workflowTasks.assignedTo': staff010._id});
  
  console.log(`\nReassigning ${orders.length} orders from ${staff010.name} to ${staff001.name}...\n`);
  
  for (const order of orders) {
    for (const task of order.workflowTasks) {
      if (task.assignedTo && task.assignedTo.toString() === staff010._id.toString()) {
        task.assignedTo = staff001._id;
        task.assignedToName = staff001.name;
        console.log(`  ✅ ${order.orderId}: ${task.stageName}`);
      }
    }
    await order.save();
  }
  
  // Update task counts
  staff010.currentTaskCount = 0;
  staff001.currentTaskCount = orders.length;
  await staff010.save();
  await staff001.save();
  
  console.log(`\n✅ Done! ${staff001.name} now has ${orders.length} tasks\n`);
  process.exit(0);
}

reassignTasks();
