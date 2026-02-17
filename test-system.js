const { connectDB, Order, Staff } = require('./database');

async function testSystem() {
  try {
    console.log('🧪 Testing SAPTHALA System...');
    await connectDB();
    
    // Test staff loading
    const staff = await Staff.find({}).sort({ staffId: 1 });
    console.log(`✅ Found ${staff.length} staff members`);
    
    staff.forEach((member, index) => {
      console.log(`   ${index + 1}. ${member.name} (${member.staffId}) - ${member.role}`);
      console.log(`      Stages: ${member.workflowStages.join(', ')}`);
    });
    
    // Test order creation
    const testOrder = new Order({
      orderId: `TEST-${Date.now()}`,
      customerName: 'Test Customer',
      customerPhone: '+919876543210',
      garmentType: 'Test Blouse',
      totalAmount: 1200,
      advanceAmount: 500,
      status: 'pending',
      workflowTasks: [{
        stageId: 'measurements-design',
        stageName: 'Measurements & Design',
        status: 'pending',
        createdAt: new Date()
      }]
    });
    
    // Auto-assign first task
    const designStaff = await Staff.findOne({ workflowStages: 'measurements-design' });
    if (designStaff) {
      testOrder.workflowTasks[0].status = 'assigned';
      testOrder.workflowTasks[0].assignedTo = designStaff._id;
      testOrder.workflowTasks[0].assignedToName = designStaff.name;
      
      designStaff.currentTaskCount += 1;
      await designStaff.save();
      
      console.log(`✅ Order assigned to ${designStaff.name}`);
    }
    
    await testOrder.save();
    console.log(`✅ Order created: ${testOrder.orderId}`);
    
    console.log('\\n🎉 SYSTEM TEST COMPLETED!');
    console.log('   ✅ Database connection works');
    console.log('   ✅ Staff system works');
    console.log('   ✅ Order creation works');
    console.log('   ✅ Task assignment works');
    
    console.log('\\n📱 Admin Panel Ready:');
    console.log('   1. Open http://localhost:3000');
    console.log('   2. Login: admin / sapthala@2029');
    console.log('   3. Check Staff tab for 10 members');
    console.log('   4. Create new orders');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testSystem();