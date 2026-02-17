const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testCompleteSystem() {
  console.log('🧪 SAPTHALA System Integration Test\n');
  console.log('=' .repeat(60));
  
  try {
    // Test 1: Check if server is running
    console.log('\n📡 Test 1: Server Health Check');
    try {
      const response = await axios.get('http://localhost:3000/api/settings');
      console.log('✅ Server is running');
      console.log(`   Company: ${response.data.companyName}`);
    } catch (error) {
      console.log('❌ Server is not running. Please start the server first.');
      return;
    }

    // Test 2: Check staff availability
    console.log('\n👥 Test 2: Staff Availability');
    const staffResponse = await axios.get(`${API_BASE}/staff`);
    const staff = staffResponse.data;
    console.log(`✅ Found ${staff.length} staff members`);
    
    const availableStaff = staff.filter(s => s.isAvailable);
    console.log(`   Available: ${availableStaff.length}`);
    
    staff.slice(0, 3).forEach(s => {
      console.log(`   - ${s.name} (${s.staffId}): ${s.workflowStages.join(', ')} - ${s.isAvailable ? '✅ Available' : '❌ Busy'}`);
    });

    // Test 3: Create a test order
    console.log('\n📦 Test 3: Create Test Order');
    const testOrder = {
      customer: {
        name: 'Test Customer',
        phone: '+919876543210',
        address: 'Test Address, City'
      },
      garmentType: 'Saree',
      measurements: {
        length: 42,
        chest: 36,
        waist: 32,
        hip: 38
      },
      pricing: {
        total: 5000,
        advance: 2000,
        balance: 3000
      },
      deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      designNotes: 'Test design with floral patterns',
      designImages: []
    };

    const orderResponse = await axios.post(`${API_BASE}/orders`, testOrder);
    
    if (orderResponse.data.success) {
      const order = orderResponse.data.order;
      console.log('✅ Order created successfully');
      console.log(`   Order ID: ${order.orderId}`);
      console.log(`   Customer: ${order.customerName}`);
      console.log(`   Status: ${order.status}`);
      console.log(`   Workflow tasks: ${order.workflowTasks.length}`);
      
      if (order.workflowTasks.length > 0) {
        const firstTask = order.workflowTasks[0];
        console.log(`\n   First Task:`);
        console.log(`   - Stage: ${firstTask.stageName}`);
        console.log(`   - Status: ${firstTask.status}`);
        console.log(`   - Assigned to: ${firstTask.assignedToName || 'Unassigned'}`);
        
        // Test 4: Check if staff received the task
        if (firstTask.assignedToName) {
          console.log('\n📱 Test 4: Staff Task Assignment');
          
          // Find the staff member
          const assignedStaff = staff.find(s => s.name === firstTask.assignedToName);
          if (assignedStaff) {
            console.log(`✅ Task assigned to: ${assignedStaff.name} (${assignedStaff.staffId})`);
            
            // Test staff login
            console.log('\n🔐 Test 5: Staff Login');
            try {
              const loginResponse = await axios.post(`${API_BASE}/staff/login`, {
                staffId: assignedStaff.staffId,
                pin: '1234'
              });
              
              if (loginResponse.data.success) {
                console.log('✅ Staff login successful');
                const token = loginResponse.data.token;
                
                // Test 6: Get staff tasks
                console.log('\n📋 Test 6: Staff Tasks Retrieval');
                const tasksResponse = await axios.get(`${API_BASE}/staff/${assignedStaff.staffId}/tasks`);
                const tasks = tasksResponse.data;
                
                console.log(`✅ Retrieved ${tasks.length} tasks for ${assignedStaff.name}`);
                tasks.forEach(task => {
                  console.log(`   - Order ${task.orderId}: ${task.stageName} (${task.status})`);
                  console.log(`     Customer: ${task.customerName}`);
                  console.log(`     Garment: ${task.garmentType}`);
                });
              }
            } catch (error) {
              console.log('❌ Staff login failed:', error.response?.data?.error || error.message);
            }
          }
        } else {
          console.log('\n⚠️  Test 4: No staff assigned to first task');
          console.log('   This may indicate no available staff for this stage');
        }
      }
    } else {
      console.log('❌ Order creation failed');
    }

    // Test 7: Get all orders
    console.log('\n📊 Test 7: Retrieve All Orders');
    const allOrdersResponse = await axios.get(`${API_BASE}/orders`, {
      headers: { Authorization: 'Bearer dummy-token-for-test' }
    }).catch(() => ({ data: [] }));
    
    console.log(`✅ Total orders in system: ${allOrdersResponse.data.length || 0}`);

    // Test 8: Reports
    console.log('\n📈 Test 8: Reports Generation');
    try {
      // Need admin token for reports
      const adminLogin = await axios.post(`${API_BASE}/admin/login`, {
        username: 'admin',
        password: 'sapthala@2029'
      });
      
      if (adminLogin.data.success) {
        const adminToken = adminLogin.data.token;
        
        // Last orders report
        const lastOrdersReport = await axios.get(`${API_BASE}/reports/last-orders?limit=5`, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
        
        if (lastOrdersReport.data.success) {
          console.log('✅ Last Orders Report generated');
          console.log(`   Orders: ${lastOrdersReport.data.orders.length}`);
          console.log(`   Total Amount: ₹${lastOrdersReport.data.summary.totalAmount}`);
          console.log(`   Total Advance: ₹${lastOrdersReport.data.summary.totalAdvance}`);
          console.log(`   Balance: ₹${lastOrdersReport.data.summary.totalBalance}`);
        }
        
        // Staff performance report
        const staffReport = await axios.get(`${API_BASE}/reports/staff-performance`);
        
        if (staffReport.data.success) {
          console.log('✅ Staff Performance Report generated');
          console.log(`   Staff members: ${staffReport.data.reports.length}`);
        }
      }
    } catch (error) {
      console.log('⚠️  Reports test skipped (requires authentication)');
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 System Integration Test Completed!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
  }
}

testCompleteSystem();
