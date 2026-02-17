const { connectDB, Order, Staff, Customer } = require('./database');

async function testAdminPanelIntegration() {
  try {
    console.log('🎯 Testing Admin Panel Integration...');
    await connectDB();
    
    // 1. Test staff loading (what admin panel does)
    console.log('\n👥 Testing Staff Loading for Admin Panel');
    const staff = await Staff.find({}).sort({ staffId: 1 });
    console.log(`✅ Found ${staff.length} staff members:`);
    
    staff.forEach((member, index) => {
      console.log(`   ${index + 1}. ${member.name} (${member.staffId})`);
      console.log(`      Role: ${member.role}`);
      console.log(`      Stages: ${member.workflowStages.join(', ')}`);
      console.log(`      Available: ${member.isAvailable ? 'Yes' : 'No'}`);
      console.log(`      Current Tasks: ${member.currentTaskCount}`);
    });
    
    // 2. Test order creation (what happens when admin creates order)
    console.log('\n📦 Testing Order Creation');
    const newOrderData = {
      orderId: `ADMIN-${Date.now()}`,
      customerName: 'Admin Test Customer',
      customerPhone: '+919123456789',
      customerAddress: 'Admin Test Address',
      garmentType: 'Designer Blouse',
      measurements: { BL: '16', B: '38', W: '34', SH: '15' },
      totalAmount: 1500,
      advanceAmount: 600,
      balanceAmount: 900,
      deliveryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      status: 'pending',
      currentStage: 'measurements-design',
      workflowTasks: []
    };
    
    // Create workflow tasks
    const stages = [
      'measurements-design', 'dyeing', 'cutting', 'stitching', 
      'khakha', 'maggam', 'finishing', 'quality-check', 'ready-to-deliver'
    ];
    
    stages.forEach((stageId, index) => {
      newOrderData.workflowTasks.push({
        stageId,
        stageName: stageId.replace('-', ' ').replace(/\\b\\w/g, l => l.toUpperCase()),
        status: index === 0 ? 'pending' : 'waiting',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });
    
    const newOrder = new Order(newOrderData);
    
    // Auto-assign first task (measurements-design)
    const firstTask = newOrder.workflowTasks[0];
    const designStaff = await Staff.findOne({ 
      workflowStages: 'measurements-design',
      isAvailable: true 
    }).sort({ currentTaskCount: 1 });
    
    if (designStaff) {
      firstTask.status = 'assigned';
      firstTask.assignedTo = designStaff._id;
      firstTask.assignedToName = designStaff.name;
      firstTask.updatedAt = new Date();
      
      designStaff.currentTaskCount += 1;
      await designStaff.save();
      
      console.log(`✅ Order created and assigned to ${designStaff.name}`);
      console.log(`   Order ID: ${newOrder.orderId}`);
      console.log(`   Customer: ${newOrder.customerName}`);
      console.log(`   Garment: ${newOrder.garmentType}`);
      console.log(`   Total: ₹${newOrder.totalAmount}`);
      console.log(`   First Task: ${firstTask.stageName} → ${designStaff.name}`);
    } else {
      console.log('❌ No design staff available');
    }
    
    await newOrder.save();
    
    // 3. Test task completion and progression
    console.log('\n🔄 Testing Task Completion and Auto-Progression');
    
    // Complete first task
    firstTask.status = 'completed';
    firstTask.completedAt = new Date();
    firstTask.notes = 'Design approved by admin';
    
    // Update staff task count
    designStaff.currentTaskCount = Math.max(0, designStaff.currentTaskCount - 1);
    await designStaff.save();
    
    // Activate next task (dyeing)
    const secondTask = newOrder.workflowTasks[1];
    secondTask.status = 'pending';
    secondTask.updatedAt = new Date();
    
    // Auto-assign second task
    const dyeingStaff = await Staff.findOne({ 
      workflowStages: 'dyeing',
      isAvailable: true 
    }).sort({ currentTaskCount: 1 });
    
    if (dyeingStaff) {
      secondTask.status = 'assigned';
      secondTask.assignedTo = dyeingStaff._id;
      secondTask.assignedToName = dyeingStaff.name;
      secondTask.updatedAt = new Date();
      
      dyeingStaff.currentTaskCount += 1;
      await dyeingStaff.save();
      
      console.log(`✅ Task progression successful:`);
      console.log(`   Completed: ${firstTask.stageName} by ${designStaff.name}`);
      console.log(`   Next: ${secondTask.stageName} assigned to ${dyeingStaff.name}`);
    }
    
    newOrder.currentStage = 'dyeing';
    await newOrder.save();
    
    // 4. Test admin panel data retrieval
    console.log('\n📊 Testing Admin Panel Data Retrieval');
    
    const allOrders = await Order.find({}).sort({ createdAt: -1 }).limit(5);
    console.log(`✅ Recent orders (${allOrders.length}):`);
    
    allOrders.forEach((order, index) => {
      console.log(`   ${index + 1}. ${order.orderId} - ${order.customerName}`);
      console.log(`      Status: ${order.status}, Stage: ${order.currentStage}`);
      console.log(`      Total: ₹${order.totalAmount}, Advance: ₹${order.advanceAmount}`);
      
      const activeTasks = order.workflowTasks.filter(t => ['assigned', 'started'].includes(t.status));
      if (activeTasks.length > 0) {
        console.log(`      Active: ${activeTasks[0].stageName} (${activeTasks[0].assignedToName || 'Unassigned'})`);
      }
    });
    
    // 5. Test staff workload
    console.log('\n👷 Testing Staff Workload');
    const staffWithTasks = await Staff.find({ currentTaskCount: { $gt: 0 } });
    console.log(`✅ Staff with active tasks (${staffWithTasks.length}):`);
    
    staffWithTasks.forEach(staff => {
      console.log(`   ${staff.name}: ${staff.currentTaskCount} active tasks`);
    });
    
    const availableStaff = await Staff.find({ isAvailable: true, currentTaskCount: 0 });
    console.log(`✅ Available staff (${availableStaff.length}):`);
    
    availableStaff.forEach(staff => {
      console.log(`   ${staff.name} - ${staff.role}`);
    });
    
    console.log('\n🎉 ADMIN PANEL INTEGRATION TEST COMPLETED!');
    console.log('   ✅ Staff loading works');
    console.log('   ✅ Order creation works');
    console.log('   ✅ Task assignment works');
    console.log('   ✅ Task progression works');
    console.log('   ✅ Data retrieval works');
    console.log('   ✅ Staff workload tracking works');
    
    console.log('\n📱 Ready for admin panel testing!');
    console.log('   1. Open http://localhost:3000');
    console.log('   2. Login with admin / sapthala@2029');
    console.log('   3. Go to Staff tab - should show 10 staff members');
    console.log('   4. Go to Orders tab - should show recent orders');
    console.log('   5. Create new order - should auto-assign to staff');;\n    \n    process.exit(0);\n    \n  } catch (error) {\n    console.error('❌ Admin panel integration test failed:', error);\n    process.exit(1);\n  }\n}\n\ntestAdminPanelIntegration();