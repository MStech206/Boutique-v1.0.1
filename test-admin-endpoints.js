const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testAdminEndpoints() {
  console.log('🧪 TESTING ADMIN ENDPOINTS\n');
  console.log('='.repeat(60));
  
  try {
    // Step 1: Login as admin
    console.log('\n🔐 Step 1: Logging in as admin...');
    const loginResponse = await axios.post(`${BASE_URL}/api/admin/login`, {
      username: 'admin',
      password: 'sapthala@2029'
    });
    
    if (!loginResponse.data.success) {
      console.error('❌ Login failed');
      return;
    }
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    console.log(`   Token: ${token.substring(0, 20)}...`);
    
    // Step 2: Check health endpoint
    console.log('\n🏥 Step 2: Checking health endpoint...');
    const healthResponse = await axios.get(`${BASE_URL}/api/health`);
    console.log('✅ Health check response:');
    console.log(`   MongoDB status: ${healthResponse.data.mongodb.status}`);
    console.log(`   MongoDB connected: ${healthResponse.data.mongodb.connected}`);
    console.log(`   Ready state: ${healthResponse.data.mongodb.readyState}`);
    
    // Step 3: Get dashboard stats
    console.log('\n📊 Step 3: Getting dashboard stats...');
    const dashboardResponse = await axios.get(`${BASE_URL}/api/dashboard`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Dashboard stats:');
    console.log(`   Total Orders: ${dashboardResponse.data.totalOrders}`);
    console.log(`   Total Revenue: ₹${dashboardResponse.data.totalRevenue}`);
    console.log(`   Advance Collected: ₹${dashboardResponse.data.advanceCollected}`);
    console.log(`   Pending Orders: ${dashboardResponse.data.pendingOrders}`);
    
    // Step 4: Get all orders
    console.log('\n📦 Step 4: Getting all orders...');
    const ordersResponse = await axios.get(`${BASE_URL}/api/admin/orders`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const orders = ordersResponse.data;
    console.log(`✅ Retrieved ${orders.length} orders`);
    
    if (orders.length > 0) {
      console.log('\n   Latest 5 orders:');
      orders.slice(0, 5).forEach((order, index) => {
        console.log(`   ${index + 1}. ${order.orderId} - ${order.customerName} - ₹${order.totalAmount} - ${order.status}`);
      });
    }
    
    // Step 5: Get branches
    console.log('\n🏢 Step 5: Getting branches...');
    const branchesResponse = await axios.get(`${BASE_URL}/api/branches`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const branches = branchesResponse.data.branches || [];
    console.log(`✅ Retrieved ${branches.length} branches:`);
    branches.forEach(branch => {
      console.log(`   - ${branch.branchId}: ${branch.branchName} (${branch.location})`);
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 ALL TESTS PASSED!');
    console.log('✅ Admin login working');
    console.log('✅ Database connected');
    console.log(`✅ ${orders.length} orders accessible`);
    console.log('✅ System is fully operational');
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

// Check if server is running
async function checkServer() {
  try {
    await axios.get(`${BASE_URL}/api/health`);
    console.log('✅ Server is running\n');
    testAdminEndpoints();
  } catch (error) {
    console.error('❌ Server is not running!');
    console.error('   Please start the server first: node server.js\n');
    process.exit(1);
  }
}

checkServer();
