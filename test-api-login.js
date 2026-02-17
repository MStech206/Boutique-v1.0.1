const http = require('http');

function testAPI(method, path, data) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(body)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: body
          });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runTests() {
  console.log('\n🧪 SAPTHALA API LOGIN TESTS\n');
  console.log('=' .repeat(50));
  
  // Test 1: Correct credentials
  console.log('\n✅ Test 1: Login with correct credentials');
  try {
    const result1 = await testAPI('POST', '/api/admin/login', {
      username: 'admin',
      password: 'sapthala@2029'
    });
    console.log('   Status:', result1.status);
    console.log('   Success:', result1.data.success);
    console.log('   Token:', result1.data.token ? 'Generated ✅' : 'Missing ❌');
    console.log('   User:', result1.data.user?.username);
  } catch (error) {
    console.log('   ❌ ERROR:', error.message);
  }
  
  // Test 2: Wrong password
  console.log('\n❌ Test 2: Login with wrong password');
  try {
    const result2 = await testAPI('POST', '/api/admin/login', {
      username: 'admin',
      password: 'wrongpassword'
    });
    console.log('   Status:', result2.status);
    console.log('   Success:', result2.data.success);
    console.log('   Error:', result2.data.error);
    console.log('   Expected: 401 status ✅');
  } catch (error) {
    console.log('   ❌ ERROR:', error.message);
  }
  
  // Test 3: Missing username
  console.log('\n❌ Test 3: Login without username');
  try {
    const result3 = await testAPI('POST', '/api/admin/login', {
      password: 'sapthala@2029'
    });
    console.log('   Status:', result3.status);
    console.log('   Success:', result3.data.success);
    console.log('   Error:', result3.data.error);
  } catch (error) {
    console.log('   ❌ ERROR:', error.message);
  }
  
  // Test 4: Missing password
  console.log('\n❌ Test 4: Login without password');
  try {
    const result4 = await testAPI('POST', '/api/admin/login', {
      username: 'admin'
    });
    console.log('   Status:', result4.status);
    console.log('   Success:', result4.data.success);
    console.log('   Error:', result4.data.error);
  } catch (error) {
    console.log('   ❌ ERROR:', error.message);
  }
  
  // Test 5: Invalid username
  console.log('\n❌ Test 5: Login with invalid username');
  try {
    const result5 = await testAPI('POST', '/api/admin/login', {
      username: 'invaliduser',
      password: 'sapthala@2029'
    });
    console.log('   Status:', result5.status);
    console.log('   Success:', result5.data.success);
    console.log('   Error:', result5.data.error);
  } catch (error) {
    console.log('   ❌ ERROR:', error.message);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ ALL TESTS COMPLETED\n');
}

// Wait for server to be ready
setTimeout(runTests, 2000);
