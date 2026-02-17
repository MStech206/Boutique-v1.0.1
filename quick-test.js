#!/usr/bin/env node

// Simple test - just check if data exists
const { connectDB, Order, Staff } = require('./database');

async function quickTest() {
  console.log('\n✅ QUICK DATABASE TEST\n');
  
  try {
    await connectDB();
    
    // Check orders
    const orders = await Order.find({});
    console.log(`📦 Total Orders: ${orders.length}`);
    
    if (orders.length > 0) {
      orders.forEach(order => {
        console.log(`   - ${order.orderId}: ${order.customerName}`);
        const khakhaTask = order.workflowTasks.find(t => t.stageId === 'khakha');
        if (khakhaTask) {
          console.log(`     ✅ Has khakha task (assigned to: ${khakhaTask.assignedToName})`);
        }
      });
    }
    
    // Check staff
    console.log('\n👥 Staff Members:');
    const staff = await Staff.find({});
    staff.forEach(s => {
      console.log(`   - ${s.name} (${s.staffId}): ${s.currentTaskCount} tasks, stages: ${s.workflowStages.join(',')}`);
    });
    
    // Check Vikram specifically
    const vikram = await Staff.findOne({ staffId: 'staff_005' });
    console.log(`\n🔍 Vikram Singh (staff_005) Details:`);
    console.log(`   Workflow Stages: ${vikram.workflowStages.join(', ')}`);
    console.log(`   Task Count: ${vikram.currentTaskCount}`);
    
    // Get Vikram's assigned tasks
    const vikramOrders = await Order.find({});
    let vikramTaskCount = 0;
    vikramOrders.forEach(order => {
      order.workflowTasks.forEach(task => {
        if (task.assignedTo && task.assignedTo.equals(vikram._id)) {
          vikramTaskCount++;
        }
      });
    });
    
    console.log(`   Actual Assigned Tasks: ${vikramTaskCount}`);
    console.log(`\n✅ TEST COMPLETED\n`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

quickTest();
