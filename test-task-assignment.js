const axios = require('axios');

async function testTaskAssignment() {
  console.log('\n\ud83e\uddea Testing Task Assignment\n');
  console.log('='.repeat(50));
  
  try {
    // Step 1: Check staff
    console.log('\n1\ufe0f\u20e3 Checking staff availability...');
    const staffRes = await axios.get('http://localhost:3000/api/staff');
    const staff = staffRes.data;
    console.log(`   Found ${staff.length} staff members`);
    
    const firstStageStaff = staff.filter(s => s.workflowStages.includes('measurements-design'));
    console.log(`   Staff for "measurements-design": ${firstStageStaff.length}`);
    firstStageStaff.forEach(s => {
      console.log(`   - ${s.name} (${s.staffId}): Available=${s.isAvailable}, Tasks=${s.currentTaskCount}`);
    });
    
    if (firstStageStaff.length === 0) {
      console.log('\n\u274c ERROR: No staff assigned to "measurements-design" stage!');
      console.log('   Please assign staff to this stage in the admin panel.');
      return;
    }
    
    // Step 2: Create test order
    console.log('\n2\ufe0f\u20e3 Creating test order...');
    const orderData = {
      customer: {
        name: 'Test Customer ' + Date.now(),
        phone: '+919999999999',
        address: 'Test Address'
      },
      garmentType: 'Test Saree',
      measurements: { length: 42 },
      pricing: { total: 5000, advance: 2000, balance: 3000 },
      deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      designNotes: 'Test order for task assignment',
      workflow: ['measurements-design', 'dyeing', 'cutting', 'stitching']
    };
    
    const orderRes = await axios.post('http://localhost:3000/api/orders', orderData);
    
    if (!orderRes.data.success) {
      console.log('\n\u274c Order creation failed:', orderRes.data.error);
      return;
    }
    
    const order = orderRes.data.order;
    console.log(`   \u2705 Order created: ${order.orderId}`);
    console.log(`   Workflow tasks: ${order.workflowTasks.length}`);
    
    // Step 3: Check task assignment
    console.log('\n3\ufe0f\u20e3 Checking task assignment...');
    if (order.workflowTasks.length > 0) {
      const firstTask = order.workflowTasks[0];
      console.log(`   First task: ${firstTask.stageName}`);
      console.log(`   Status: ${firstTask.status}`);
      console.log(`   Assigned to: ${firstTask.assignedToName || 'UNASSIGNED'}`);
      
      if (firstTask.assignedToName) {
        console.log('\n\u2705 SUCCESS: Task assigned to staff!');
        
        // Step 4: Verify staff can see the task
        console.log('\n4\ufe0f\u20e3 Verifying staff can see task...');
        const assignedStaff = staff.find(s => s.name === firstTask.assignedToName);
        if (assignedStaff) {
          const tasksRes = await axios.get(`http://localhost:3000/api/staff/${assignedStaff.staffId}/tasks`);
          const tasks = tasksRes.data;
          console.log(`   Staff ${assignedStaff.name} has ${tasks.length} tasks`);
          
          const thisTask = tasks.find(t => t.orderId === order.orderId);
          if (thisTask) {
            console.log(`   \u2705 Staff can see the task!`);
            console.log(`      Order: ${thisTask.orderId}`);
            console.log(`      Customer: ${thisTask.customerName}`);
            console.log(`      Stage: ${thisTask.stageName}`);
          } else {
            console.log(`   \u274c Staff cannot see this specific task`);
          }
        }
      } else {
        console.log('\n\u274c FAILED: Task NOT assigned to any staff!');
        console.log('\nPossible reasons:');
        console.log('1. No staff available for this stage');
        console.log('2. All staff are busy (isAvailable = false)');
        console.log('3. Staff workflow stages not configured correctly');
      }
    } else {
      console.log('\n\u274c FAILED: No workflow tasks created!');
    }
    
    console.log('\n' + '='.repeat(50));
    
  } catch (error) {
    console.error('\n\u274c Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testTaskAssignment();
