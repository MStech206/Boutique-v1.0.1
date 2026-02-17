/**
 * Test Login API Endpoint
 * This script tests the /api/admin/login endpoint directly
 */

const http = require('http');

function testLogin(username, password) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      username: username,
      password: password
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/admin/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    console.log(`\n🔐 Testing login with:`);
    console.log(`   Username: "${username}"`);
    console.log(`   Password: "${password}"`);
    console.log(`   Endpoint: http://localhost:3000/api/admin/login`);

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`\n📡 Response Status: ${res.statusCode}`);
        console.log(`📦 Response Headers:`, res.headers);
        
        try {
          const jsonData = JSON.parse(data);
          console.log(`📄 Response Body:`, JSON.stringify(jsonData, null, 2));
          
          if (res.statusCode === 200 && jsonData.success) {
            console.log(`✅ LOGIN SUCCESSFUL!`);
            console.log(`   Token: ${jsonData.token.substring(0, 20)}...`);
            console.log(`   User: ${jsonData.user.username} (${jsonData.user.role})`);
          } else {
            console.log(`❌ LOGIN FAILED!`);
            console.log(`   Error: ${jsonData.error || 'Unknown error'}`);
          }
          
          resolve({ statusCode: res.statusCode, data: jsonData });
        } catch (e) {
          console.log(`📄 Raw Response:`, data);
          reject(new Error(`Failed to parse JSON: ${e.message}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error(`❌ Request Error: ${error.message}`);
      console.error(`   Make sure the server is running on port 3000`);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 SAPTHALA LOGIN API TEST');
  console.log('=' .repeat(60));
  
  try {
    // Test 1: Correct credentials
    console.log('\n📝 Test 1: Correct credentials');
    await testLogin('admin', 'sapthala@2029');
    
    // Test 2: Wrong password
    console.log('\n📝 Test 2: Wrong password');
    await testLogin('admin', 'wrong_password');
    
    // Test 3: Non-existent user
    console.log('\n📝 Test 3: Non-existent user');
    await testLogin('nonexistent', 'sapthala@2029');
    
    console.log('\n✅ ALL TESTS COMPLETED');
    console.log('=' .repeat(60));
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('\n⚠️  TROUBLESHOOTING:');
    console.error('   1. Make sure MongoDB is running: net start MongoDB');
    console.error('   2. Make sure server is running: node server.js');
    console.error('   3. Check if port 3000 is available');
  }
}

// Run the tests
runTests();
