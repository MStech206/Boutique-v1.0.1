#!/usr/bin/env node

/**
 * Test Staff Portal Functionality
 * Tests staff login and task retrieval
 */

const http = require('http');

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            text: data
          });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(3000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testStaffPortal() {
  console.log('\n📱 STAFF PORTAL FUNCTIONALITY TEST\n');
  
  try {
    // Test Staff Login
    console.log('1️⃣  Staff Login Test (Vikram Singh - staff_005)');
    const loginRes = await makeRequest('POST', '/api/staff/login', {
      staffId: 'staff_005',
      pin: '1234'
    });
    
    console.log(`   Status: ${loginRes.status}`);
    if (loginRes.data) {
      console.log(`   Staff Name: ${loginRes.data.staffName}`);
      console.log(`   Staff ID: ${loginRes.data.staffId}`);
      console.log(`   Role: ${loginRes.data.role}`);
      console.log(`   Token: ${loginRes.data.token ? 'YES ✅' : 'NO ❌'}`);
    } else {
      console.log(`   Response: ${JSON.stringify(loginRes.text).substring(0, 100)}`);
    }
    
    // Test Get Tasks
    console.log('\n2️⃣  Get Assigned Tasks for staff_005');
    const tasksRes = await makeRequest('GET', '/api/staff/staff_005/tasks');
    
    console.log(`   Status: ${tasksRes.status}`);
    if (Array.isArray(tasksRes.data)) {
      console.log(`   ✅ Total Tasks: ${tasksRes.data.length}`);
      tasksRes.data.slice(0, 3).forEach((task, i) => {
        console.log(`\n   Task ${i + 1}:`);
        console.log(`      Order: ${task.orderId}`);
        console.log(`      Stage: ${task.stageName}`);
        console.log(`      Customer: ${task.customerName}`);
        console.log(`      Status: ${task.status}`);
        console.log(`      Garment: ${task.garmentType}`);
        console.log(`      Measurements present: ${task.measurements ? 'YES' : 'NO'}`);
        console.log(`      Design notes present: ${task.designNotes ? 'YES' : 'NO'}`);
        console.log(`      Design images count: ${task.designImages ? task.designImages.length : 0}`);
      });
    } else {
      console.log(`   Response: ${JSON.stringify(tasksRes.data).substring(0, 200)}`);
    }
    
    // Test Available Tasks
    console.log('\n3️⃣  Get Available Tasks for staff_005');
    const availRes = await makeRequest('GET', '/api/staff/staff_005/available-tasks');
    
    console.log(`   Status: ${availRes.status}`);
    if (availRes.data) {
      console.log(`   Response: ${JSON.stringify(availRes.data).substring(0, 200)}`);
    }
    
    console.log('\n✅ STAFF PORTAL TEST COMPLETED\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

testStaffPortal();
