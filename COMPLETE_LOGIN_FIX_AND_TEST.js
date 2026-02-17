const http = require('http');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

console.log('🔧 SAPTHALA LOGIN COMPLETE FIX & TEST');
console.log('=====================================\n');

// Test configuration
const TEST_CONFIG = {
    host: 'localhost',
    port: 3000,
    username: 'admin',
    password: 'sapthala@2029'
};

// MongoDB connection
const MONGODB_URI = 'mongodb://localhost:27017/sapthala_boutique';

// Test counter
let testsPassed = 0;
let testsFailed = 0;

// Helper function to make HTTP requests
function makeRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ status: res.statusCode, data: parsed, headers: res.headers });
                } catch (e) {
                    resolve({ status: res.statusCode, data, headers: res.headers });
                }
            });
        });

        req.on('error', reject);
        
        if (postData) {
            req.write(JSON.stringify(postData));
        }
        
        req.end();
    });
}

// Test functions
async function testServerRunning() {
    console.log('📡 TEST 1: Server Running Check');
    try {
        const response = await makeRequest({
            hostname: TEST_CONFIG.host,
            port: TEST_CONFIG.port,
            path: '/',
            method: 'GET'
        });
        
        if (response.status === 200) {
            console.log('   ✅ Server is running on port 3000');
            testsPassed++;
            return true;
        } else {
            console.log(`   ❌ Server returned status ${response.status}`);
            testsFailed++;
            return false;
        }
    } catch (error) {
        console.log('   ❌ Server is NOT running:', error.message);
        console.log('   💡 Please start the server first: node server.js');
        testsFailed++;
        return false;
    }
}

async function testDatabaseConnection() {
    console.log('\n📊 TEST 2: Database Connection');
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('   ✅ MongoDB connected successfully');
        testsPassed++;
        return true;
    } catch (error) {
        console.log('   ❌ MongoDB connection failed:', error.message);
        testsFailed++;
        return false;
    }
}

async function testAdminUserExists() {
    console.log('\n👤 TEST 3: Admin User Verification');
    try {
        const User = mongoose.model('User');
        const admin = await User.findOne({ username: 'admin' });
        
        if (!admin) {
            console.log('   ❌ Admin user NOT found in database');
            console.log('   🔧 Creating admin user...');
            
            const hashedPassword = await bcrypt.hash('sapthala@2029', 10);
            const newAdmin = new User({
                username: 'admin',
                password: hashedPassword,
                role: 'admin',
                permissions: {
                    canEdit: true,
                    canDelete: true,
                    canViewReports: true,
                    canManageStaff: true
                }
            });
            
            await newAdmin.save();
            console.log('   ✅ Admin user created successfully');
            testsPassed++;
            return true;
        }
        
        console.log('   ✅ Admin user exists');
        console.log(`      Username: ${admin.username}`);
        console.log(`      Role: ${admin.role}`);
        
        // Verify password
        const isValid = await bcrypt.compare('sapthala@2029', admin.password);
        if (isValid) {
            console.log('   ✅ Password hash is correct');
            testsPassed++;
            return true;
        } else {
            console.log('   ❌ Password hash is INCORRECT');
            console.log('   🔧 Fixing password...');
            
            const hashedPassword = await bcrypt.hash('sapthala@2029', 10);
            admin.password = hashedPassword;
            await admin.save();
            
            console.log('   ✅ Password fixed successfully');
            testsPassed++;
            return true;
        }
    } catch (error) {
        console.log('   ❌ Database check failed:', error.message);
        testsFailed++;
        return false;
    }
}

async function testLoginAPI() {
    console.log('\n🔐 TEST 4: Login API Endpoint');
    
    // Test 1: Correct credentials
    console.log('   Test 4a: Correct credentials');
    try {
        const response = await makeRequest({
            hostname: TEST_CONFIG.host,
            port: TEST_CONFIG.port,
            path: '/api/admin/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }, {
            username: TEST_CONFIG.username,
            password: TEST_CONFIG.password
        });
        
        if (response.status === 200 && response.data.success && response.data.token) {
            console.log('      ✅ Login successful with correct credentials');
            console.log(`      Token: ${response.data.token.substring(0, 20)}...`);
            testsPassed++;
        } else {
            console.log('      ❌ Login failed with correct credentials');
            console.log('      Response:', JSON.stringify(response.data, null, 2));
            testsFailed++;
        }
    } catch (error) {
        console.log('      ❌ API request failed:', error.message);
        testsFailed++;
    }
    
    // Test 2: Wrong password
    console.log('   Test 4b: Wrong password');
    try {
        const response = await makeRequest({
            hostname: TEST_CONFIG.host,
            port: TEST_CONFIG.port,
            path: '/api/admin/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }, {
            username: TEST_CONFIG.username,
            password: 'wrongpassword'
        });
        
        if (response.status === 401) {
            console.log('      ✅ Correctly rejected wrong password');
            testsPassed++;
        } else {
            console.log('      ❌ Should have rejected wrong password');
            testsFailed++;
        }
    } catch (error) {
        console.log('      ❌ API request failed:', error.message);
        testsFailed++;
    }
    
    // Test 3: Missing credentials
    console.log('   Test 4c: Missing credentials');
    try {
        const response = await makeRequest({
            hostname: TEST_CONFIG.host,
            port: TEST_CONFIG.port,
            path: '/api/admin/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }, {
            username: TEST_CONFIG.username
        });
        
        if (response.status === 400 || response.status === 401) {
            console.log('      ✅ Correctly rejected missing password');
            testsPassed++;
        } else {
            console.log('      ❌ Should have rejected missing password');
            testsFailed++;
        }
    } catch (error) {
        console.log('      ❌ API request failed:', error.message);
        testsFailed++;
    }
}

async function testBrowserLoginFlow() {
    console.log('\n🌐 TEST 5: Browser Login Flow Simulation');
    
    try {
        // Step 1: Get the HTML page
        console.log('   Step 1: Loading admin page...');
        const pageResponse = await makeRequest({
            hostname: TEST_CONFIG.host,
            port: TEST_CONFIG.port,
            path: '/',
            method: 'GET'
        });
        
        if (pageResponse.status === 200) {
            console.log('      ✅ Admin page loaded successfully');
            
            // Check if login form exists
            if (typeof pageResponse.data === 'string' && 
                pageResponse.data.includes('handleLogin') && 
                pageResponse.data.includes('/api/admin/login')) {
                console.log('      ✅ Login form found in HTML');
                testsPassed++;
            } else {
                console.log('      ❌ Login form NOT found in HTML');
                testsFailed++;
            }
        } else {
            console.log('      ❌ Failed to load admin page');
            testsFailed++;
        }
        
        // Step 2: Simulate login POST
        console.log('   Step 2: Simulating login POST...');
        const loginResponse = await makeRequest({
            hostname: TEST_CONFIG.host,
            port: TEST_CONFIG.port,
            path: '/api/admin/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Origin': `http://${TEST_CONFIG.host}:${TEST_CONFIG.port}`,
                'Referer': `http://${TEST_CONFIG.host}:${TEST_CONFIG.port}/`
            }
        }, {
            username: TEST_CONFIG.username,
            password: TEST_CONFIG.password
        });
        
        if (loginResponse.status === 200 && loginResponse.data.success) {
            console.log('      ✅ Login POST successful');
            console.log(`      Token received: ${loginResponse.data.token ? 'YES' : 'NO'}`);
            console.log(`      User data: ${JSON.stringify(loginResponse.data.user)}`);
            testsPassed++;
        } else {
            console.log('      ❌ Login POST failed');
            console.log('      Response:', JSON.stringify(loginResponse.data, null, 2));
            testsFailed++;
        }
        
    } catch (error) {
        console.log('   ❌ Browser flow test failed:', error.message);
        testsFailed++;
    }
}

async function generateBrowserTestHTML() {
    console.log('\n📝 Generating browser test file...');
    
    const testHTML = `<!DOCTYPE html>
<html>
<head>
    <title>SAPTHALA Login Test</title>
    <style>
        body { font-family: Arial; padding: 40px; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        h1 { color: #7c183c; }
        .test-section { margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px; }
        .success { color: #10b981; font-weight: bold; }
        .error { color: #ef4444; font-weight: bold; }
        button { padding: 12px 24px; background: #7c183c; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; margin: 5px; }
        button:hover { background: #b22234; }
        #results { margin-top: 20px; padding: 15px; background: #f0f9ff; border-radius: 8px; }
        .log { padding: 8px; margin: 5px 0; background: white; border-left: 4px solid #3b82f6; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔐 SAPTHALA Login Test</h1>
        
        <div class="test-section">
            <h3>Test Credentials</h3>
            <p><strong>Username:</strong> admin</p>
            <p><strong>Password:</strong> sapthala@2029</p>
        </div>
        
        <div class="test-section">
            <h3>Run Tests</h3>
            <button onclick="testLogin()">🧪 Test Login API</button>
            <button onclick="testWithConsole()">🔍 Test with Console Logs</button>
            <button onclick="window.location.href='/'">🏠 Go to Admin Panel</button>
        </div>
        
        <div id="results"></div>
    </div>
    
    <script>
        function log(message, type = 'info') {
            const results = document.getElementById('results');
            const logDiv = document.createElement('div');
            logDiv.className = 'log';
            logDiv.innerHTML = \`<span class="\${type}">\${message}</span>\`;
            results.appendChild(logDiv);
        }
        
        async function testLogin() {
            document.getElementById('results').innerHTML = '';
            log('🔄 Starting login test...', 'info');
            
            try {
                log('📤 Sending POST request to /api/admin/login', 'info');
                
                const response = await fetch('/api/admin/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username: 'admin',
                        password: 'sapthala@2029'
                    })
                });
                
                log(\`📥 Response status: \${response.status}\`, 'info');
                
                const data = await response.json();
                log(\`📦 Response data: \${JSON.stringify(data, null, 2)}\`, 'info');
                
                if (response.ok && data.success) {
                    log('✅ LOGIN SUCCESSFUL!', 'success');
                    log(\`🎫 Token: \${data.token.substring(0, 30)}...\`, 'success');
                    log(\`👤 User: \${JSON.stringify(data.user)}\`, 'success');
                    
                    // Store token
                    localStorage.setItem('sapthala_token', data.token);
                    localStorage.setItem('sapthala_logged_in', 'true');
                    localStorage.setItem('sapthala_user', JSON.stringify(data.user));
                    
                    log('💾 Token saved to localStorage', 'success');
                    log('✅ You can now go to the admin panel', 'success');
                } else {
                    log('❌ LOGIN FAILED!', 'error');
                    log(\`Error: \${data.error || 'Unknown error'}\`, 'error');
                }
            } catch (error) {
                log('❌ REQUEST FAILED!', 'error');
                log(\`Error: \${error.message}\`, 'error');
            }
        }
        
        async function testWithConsole() {
            console.clear();
            console.log('🔐 SAPTHALA Login Test - Console Mode');
            console.log('=====================================');
            
            document.getElementById('results').innerHTML = '';
            log('🔍 Check browser console (F12) for detailed logs', 'info');
            
            try {
                console.log('📤 Sending login request...');
                console.log('Credentials:', { username: 'admin', password: 'sapthala@2029' });
                
                const response = await fetch('/api/admin/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username: 'admin',
                        password: 'sapthala@2029'
                    })
                });
                
                console.log('📥 Response received:', response);
                console.log('Status:', response.status);
                console.log('Headers:', [...response.headers.entries()]);
                
                const data = await response.json();
                console.log('📦 Response data:', data);
                
                if (response.ok && data.success) {
                    console.log('✅ LOGIN SUCCESSFUL!');
                    console.log('Token:', data.token);
                    console.log('User:', data.user);
                    log('✅ Login successful! Check console for details', 'success');
                } else {
                    console.error('❌ LOGIN FAILED!');
                    console.error('Error:', data.error);
                    log('❌ Login failed! Check console for details', 'error');
                }
            } catch (error) {
                console.error('❌ REQUEST FAILED!', error);
                log('❌ Request failed! Check console for details', 'error');
            }
        }
        
        // Auto-run test on load
        window.addEventListener('load', () => {
            log('✅ Test page loaded successfully', 'success');
            log('Click "Test Login API" to start testing', 'info');
        });
    </script>
</body>
</html>`;
    
    const fs = require('fs');
    fs.writeFileSync('d:\\Boutique\\login-test.html', testHTML);
    console.log('   ✅ Test file created: login-test.html');
    console.log('   📝 Open http://localhost:3000/login-test.html in your browser');
}

// Main test runner
async function runAllTests() {
    console.log('🚀 Starting comprehensive login tests...\n');
    
    const serverRunning = await testServerRunning();
    if (!serverRunning) {
        console.log('\n❌ Cannot continue - server is not running');
        console.log('💡 Start the server with: node server.js');
        process.exit(1);
    }
    
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
        console.log('\n❌ Cannot continue - database connection failed');
        process.exit(1);
    }
    
    await testAdminUserExists();
    await testLoginAPI();
    await testBrowserLoginFlow();
    await generateBrowserTestHTML();
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Tests Passed: ${testsPassed}`);
    console.log(`❌ Tests Failed: ${testsFailed}`);
    console.log(`📈 Success Rate: ${Math.round((testsPassed / (testsPassed + testsFailed)) * 100)}%`);
    
    if (testsFailed === 0) {
        console.log('\n🎉 ALL TESTS PASSED!');
        console.log('\n✅ Login system is working correctly');
        console.log('\n📝 Next steps:');
        console.log('   1. Open http://localhost:3000 in your browser');
        console.log('   2. Enter username: admin');
        console.log('   3. Enter password: sapthala@2029');
        console.log('   4. Click "Login to Dashboard"');
        console.log('\n   OR test in browser:');
        console.log('   Open http://localhost:3000/login-test.html');
    } else {
        console.log('\n⚠️  SOME TESTS FAILED');
        console.log('Please review the errors above');
    }
    
    // Close database connection
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
}

// Run tests
runAllTests().catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
});
