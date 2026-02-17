const {connectDB, Order, Staff} = require('./database');

async function resetTasksToPending() {
  await connectDB();
  
  console.log('\n🔄 Resetting all assigned tasks to pending...\n');
  
  const orders = await Order.find({});
  let count = 0;
  
  for (const order of orders) {
    let changed = false;
    for (const task of order.workflowTasks) {
      if (task.status === 'assigned') {
        task.status = 'pending';
        task.assignedTo = null;
        task.assignedToName = null;
        changed = true;
        count++;
      }
    }
    if (changed) {
      await order.save();
      console.log(`✅ ${order.orderId}: Reset to pending`);
    }
  }
  
  // Reset all staff task counts
  await Staff.updateMany({}, { currentTaskCount: 0 });
  
  console.log(`\n✅ Reset ${count} tasks to pending`);
  console.log('✅ All staff task counts reset to 0\n');
  console.log('Tasks will now appear in "Available Tasks" section\n');
  
  process.exit(0);
}

resetTasksToPending();
