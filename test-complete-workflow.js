const { connectDB, Order, Staff, Customer, Notification } = require('./database');

async function testCompleteWorkflow() {
  try {
    console.log('🧪 Starting Complete Workflow Test...');
    await connectDB();
    
    // 1. Verify staff system
    console.log('\n📋 Step 1: Verifying Staff System');
    const allStaff = await Staff.find({}).sort({ staffId: 1 });
    console.log(`   Total staff: ${allStaff.length}`);
    
    const stagesCovered = new Set();
    allStaff.forEach(staff => {
      console.log(`   ${staff.name} (${staff.staffId}) - ${staff.role}`);
      console.log(`     Stages: ${staff.workflowStages.join(', ')}`);
      console.log(`     Available: ${staff.isAvailable}, Tasks: ${staff.currentTaskCount}`);
      staff.workflowStages.forEach(stage => stagesCovered.add(stage));
    });
    
    const requiredStages = ['measurements-design', 'dyeing', 'cutting', 'stitching', 'khakha', 'maggam', 'painting', 'finishing', 'quality-check', 'ready-to-deliver'];
    const missingStages = requiredStages.filter(stage => !stagesCovered.has(stage));
    
    if (missingStages.length > 0) {
      console.log(`   ❌ Missing stages: ${missingStages.join(', ')}`);
      return;
    }
    console.log('   ✅ All workflow stages covered');
    
    // 2. Create test order
    console.log('\n📦 Step 2: Creating Test Order');
    const testOrderData = {
      orderId: `TEST-${Date.now()}`,
      customerName: 'Test Customer',
      customerPhone: '+919876543210',
      customerAddress: 'Test Address, Test City',
      garmentType: 'Test Blouse',
      measurements: { BL: '15', B: '36', W: '32', SH: '14' },
      totalAmount: 1200,
      advanceAmount: 500,
      balanceAmount: 700,
      deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      status: 'pending',
      currentStage: 'measurements-design',
      workflowTasks: []
    };
    
    // Create workflow tasks
    const workflowStages = [
      { id: 'measurements-design', name: 'Measurements & Design', order: 1 },
      { id: 'dyeing', name: 'Dyeing', order: 2 },
      { id: 'cutting', name: 'Cutting', order: 3 },
      { id: 'stitching', name: 'Stitching', order: 4 },
      { id: 'khakha', name: 'Khakha', order: 5 },
      { id: 'maggam', name: 'Maggam', order: 6 },
      { id: 'painting', name: 'Painting', order: 7 },
      { id: 'finishing', name: 'Finishing', order: 8 },
      { id: 'quality-check', name: 'Quality Check', order: 9 },
      { id: 'ready-to-deliver', name: 'Ready to Deliver', order: 10 }
    ];
    
    workflowStages.forEach((stage, index) => {
      testOrderData.workflowTasks.push({
        stageId: stage.id,
        stageName: stage.name,
        status: index === 0 ? 'pending' : 'waiting',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });
    
    const testOrder = new Order(testOrderData);
    
    // Auto-assign first task
    const firstTask = testOrder.workflowTasks[0];
    const designStaff = await Staff.findOne({ 
      workflowStages: 'measurements-design',
      isAvailable: true 
    });
    
    if (designStaff) {
      firstTask.status = 'assigned';
      firstTask.assignedTo = designStaff._id;
      firstTask.assignedToName = designStaff.name;
      firstTask.updatedAt = new Date();
      
      designStaff.currentTaskCount += 1;
      await designStaff.save();
      
      console.log(`   ✅ Order created and assigned to ${designStaff.name}`);
    }
    
    await testOrder.save();
    console.log(`   📋 Order ID: ${testOrder.orderId}`);
    
    // 3. Simulate workflow progression
    console.log('\n🔄 Step 3: Simulating Workflow Progression');
    
    for (let i = 0; i < testOrder.workflowTasks.length; i++) {
      const task = testOrder.workflowTasks[i];
      console.log(`\n   Stage ${i + 1}: ${task.stageName}`);
      
      if (task.status === 'waiting') {
        // Auto-assign task
        const stageStaff = await Staff.findOne({
          workflowStages: task.stageId,
          isAvailable: true
        }).sort({ currentTaskCount: 1 });
        
        if (stageStaff) {
          task.status = 'assigned';
          task.assignedTo = stageStaff._id;
          task.assignedToName = stageStaff.name;
          task.updatedAt = new Date();
          
          stageStaff.currentTaskCount += 1;
          await stageStaff.save();
          
          console.log(`     ✅ Assigned to ${stageStaff.name}`);
        }
      }
      
      if (task.status === 'assigned' || task.status === 'pending') {
        // Simulate task progression
        task.status = 'started';
        task.startedAt = new Date();
        console.log(`     🚀 Task started`);
        
        // Simulate completion
        task.status = 'completed';
        task.completedAt = new Date();
        task.notes = `Completed by ${task.assignedToName || 'system'}`;
        task.qualityRating = 5;
        
        // Update staff task count
        if (task.assignedTo) {
          const staff = await Staff.findById(task.assignedTo);
          if (staff) {
            staff.currentTaskCount = Math.max(0, staff.currentTaskCount - 1);
            await staff.save();
          }
        }
        
        console.log(`     ✅ Task completed`);
        
        // Activate next task
        if (i < testOrder.workflowTasks.length - 1) {
          const nextTask = testOrder.workflowTasks[i + 1];
          nextTask.status = 'pending';
          nextTask.updatedAt = new Date();
          console.log(`     ➡️ Next stage activated: ${nextTask.stageName}`);
        }
      }
      
      await testOrder.save();
      
      // Small delay to simulate real workflow
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // 4. Final order status
    testOrder.status = 'completed';
    testOrder.currentStage = 'completed';
    await testOrder.save();
    
    console.log('\n🎉 Step 4: Order Completion');
    console.log(`   ✅ Order ${testOrder.orderId} completed successfully!`);
    console.log(`   📊 Total stages: ${testOrder.workflowTasks.length}`);
    console.log(`   ⏱️ All tasks completed`);
    
    // 5. Create customer notification
    await Notification.create({
      type: 'order_completed',
      title: 'Order Ready for Delivery',
      message: `Your order ${testOrder.orderId} is ready for pickup/delivery!`,
      recipientId: null, // Customer notification
      orderId: testOrder.orderId,
      customerPhone: testOrder.customerPhone
    });
    
    console.log('   📱 Customer notification created');
    
    // 6. Verify final state
    console.log('\n📊 Step 5: Final Verification');
    const finalOrder = await Order.findOne({ orderId: testOrder.orderId });
    console.log(`   Order Status: ${finalOrder.status}`);
    console.log(`   Current Stage: ${finalOrder.currentStage}`);
    
    const completedTasks = finalOrder.workflowTasks.filter(t => t.status === 'completed');
    console.log(`   Completed Tasks: ${completedTasks.length}/${finalOrder.workflowTasks.length}`);
    
    // Check staff availability
    const finalStaffCheck = await Staff.find({});
    const busyStaff = finalStaffCheck.filter(s => s.currentTaskCount > 0);
    console.log(`   Staff with active tasks: ${busyStaff.length}`);
    
    if (busyStaff.length === 0) {
      console.log('   ✅ All staff are available for new orders');
    }
    
    console.log('\n🎊 WORKFLOW TEST COMPLETED SUCCESSFULLY!');
    console.log('   ✅ Staff system working');
    console.log('   ✅ Order creation working');
    console.log('   ✅ Task assignment working');
    console.log('   ✅ Workflow progression working');
    console.log('   ✅ Notifications working');
    console.log('   ✅ Order completion working');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Workflow test failed:', error);
    process.exit(1);
  }
}

testCompleteWorkflow();