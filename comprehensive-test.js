#!/usr/bin/env node

/**
 * Comprehensive Test Suite for SAPTHALA Boutique
 * Tests: Admin Panel, Staff Portal, Task Assignment, Workflow
 */

const http = require('http');
const assert = require('assert');

const BASE_URL = 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api`;

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m'
};

// Test results tracker
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
let tests = [];

// HTTP request helper
function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            data: parsed,
            headers: res.headers
          });
        } catch {
          resolve({
            status: res.statusCode,
            data: data,
            headers: res.headers
          });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Test logger
async function test(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`${colors.green}✅ PASS:${colors.reset} ${name}`);
    tests.push({ name, status: 'PASS' });
  } catch (error) {
    failedTests++;
    console.log(`${colors.red}❌ FAIL:${colors.reset} ${name}`);
    console.log(`   ${colors.yellow}Error: ${error.message}${colors.reset}`);
    tests.push({ name, status: 'FAIL', error: error.message });
  }
}

async function runTests() {
  console.log(`\n${colors.cyan}╔════════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║          SAPTHALA BOUTIQUE - COMPREHENSIVE TEST SUITE           ║${colors.reset}`);
  console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  // ===== ADMIN PANEL TESTS =====
  console.log(`\n${colors.blue}📊 ADMIN PANEL TESTS${colors.reset}\n`);

  let adminToken = null;
  let testOrderId = null;

  await test('Admin Login', async () => {
    const res = await makeRequest('POST', '/api/admin/login', {
      username: 'admin',
      password: 'admin123'
    });
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert(res.data.token, 'No token returned');
    adminToken = res.data.token;
  });

  await test('Get Orders List (Admin)', async () => {
    const res = await makeRequest('GET', '/api/admin/orders', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.data.orders), 'Orders should be array');
  });

  await test('Create New Order (Admin)', async () => {
    const res = await makeRequest('POST', '/api/admin/orders', {
      customerName: 'Test Customer',
      customerPhone: '9999999999',
      customerAddress: 'Test Address',
      garmentType: 'Saree',
      color: 'Red',
      fabric: 'Silk',
      measurements: {
        chest: 38,
        waist: 32,
        length: 600,
        width: 120
      },
      designNotes: 'Test design notes',
      estimatedPrice: 5000,
      advancePayment: 2500,
      deliveryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    }, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert(res.status === 201 || res.status === 200, `Expected 200/201, got ${res.status}`);
    assert(res.data.orderId || res.data._id, 'No order ID returned');
    testOrderId = res.data.orderId || res.data._id;
  });

  await test('Get Order Details (Admin)', async () => {
    if (!testOrderId) {
      throw new Error('No order ID available');
    }
    const res = await makeRequest('GET', `/api/admin/orders/${testOrderId}`, null, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert(res.status === 200 || res.status === 404, `Unexpected status: ${res.status}`);
  });

  await test('Get Dashboard Stats (Admin)', async () => {
    const res = await makeRequest('GET', '/api/admin/stats', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.totalOrders !== undefined, 'Missing totalOrders');
    assert(res.data.totalRevenue !== undefined, 'Missing totalRevenue');
  });

  // ===== STAFF PORTAL TESTS =====
  console.log(`\n${colors.blue}👤 STAFF PORTAL TESTS${colors.reset}\n`);

  let staffToken = null;

  await test('Staff Login', async () => {
    const res = await makeRequest('POST', '/api/staff/login', {
      staffId: 'staff_005',
      password: 'password123'
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.token, 'No token returned');
    assert(res.data.staffName === 'Vikram Singh', `Expected Vikram Singh, got ${res.data.staffName}`);
    assert(res.data.role === 'khakha', `Expected role 'khakha', got ${res.data.role}`);
    staffToken = res.data.token;
  });

  await test('Get Staff Assigned Tasks', async () => {
    const res = await makeRequest('GET', '/api/staff/tasks', null, {
      'Authorization': `Bearer ${staffToken}`
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.data.tasks || res.data), 'Tasks should be array');
  });

  await test('Get Available Tasks for Staff', async () => {
    const res = await makeRequest('GET', '/api/staff/tasks/available', null, {
      'Authorization': `Bearer ${staffToken}`
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.data.tasks || res.data), 'Available tasks should be array');
  });

  // ===== TASK WORKFLOW TESTS =====
  console.log(`\n${colors.blue}⚙️ TASK WORKFLOW TESTS${colors.reset}\n`);

  await test('Get All Orders (for workflow)', async () => {
    const res = await makeRequest('GET', '/api/orders');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.data.orders || res.data), 'Orders should be array');
    if (Array.isArray(res.data.orders)) {
      console.log(`   Found ${res.data.orders.length} orders in database`);
    }
  });

  await test('Assign Task to Staff', async () => {
    if (!testOrderId) {
      throw new Error('No order ID available for task assignment');
    }
    const res = await makeRequest('POST', `/api/orders/${testOrderId}/assign-task`, {
      stageName: 'khakha',
      staffId: 'staff_005',
      staffName: 'Vikram Singh'
    }, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert(res.status === 200 || res.status === 201, `Expected 200/201, got ${res.status}`);
  });

  await test('Start Task', async () => {
    if (!testOrderId) {
      throw new Error('No order ID available');
    }
    const res = await makeRequest('POST', `/api/orders/${testOrderId}/start-task`, {
      stageName: 'khakha'
    }, {
      'Authorization': `Bearer ${staffToken}`
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  // ===== API ENDPOINT TESTS =====
  console.log(`\n${colors.blue}🔗 API ENDPOINT TESTS${colors.reset}\n`);

  await test('API Health Check', async () => {
    const res = await makeRequest('GET', '/api');
    assert(res.status === 200 || res.status === 404, `Unexpected status: ${res.status}`);
  });

  await test('Static Files - Admin HTML', async () => {
    const res = await makeRequest('GET', '/admin-dashboard-enhanced.html');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  await test('Static Files - Staff Portal HTML', async () => {
    const res = await makeRequest('GET', '/staff-portal-enhanced.html');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  // ===== TEST SUMMARY =====
  console.log(`\n${colors.cyan}╔════════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║                       TEST SUMMARY REPORT                      ║${colors.reset}`);
  console.log(`${colors.cyan}╠════════════════════════════════════════════════════════════════╣${colors.reset}`);
  console.log(`${colors.cyan}║${colors.reset} Total Tests:    ${String(totalTests).padEnd(50)}${colors.cyan}║${colors.reset}`);
  console.log(`${colors.cyan}║${colors.reset} ${colors.green}Passed Tests:${colors.reset}   ${String(passedTests).padEnd(50)}${colors.cyan}║${colors.reset}`);
  console.log(`${colors.cyan}║${colors.reset} ${colors.red}Failed Tests:${colors.reset}   ${String(failedTests).padEnd(50)}${colors.cyan}║${colors.reset}`);
  console.log(`${colors.cyan}║${colors.reset} Success Rate:   ${((passedTests / totalTests * 100).toFixed(2) + '%').padEnd(50)}${colors.cyan}║${colors.reset}`);
  console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════════╝${colors.reset}`);

  // Detailed results
  if (failedTests > 0) {
    console.log(`\n${colors.yellow}⚠️ FAILED TESTS:${colors.reset}`);
    tests.filter(t => t.status === 'FAIL').forEach(t => {
      console.log(`   ${colors.red}❌${colors.reset} ${t.name}`);
      if (t.error) console.log(`      ${colors.yellow}${t.error}${colors.reset}`);
    });
  }

  console.log(`\n${failedTests === 0 ? colors.green + '✅ ALL TESTS PASSED!' : colors.red + '❌ SOME TESTS FAILED'} ${colors.reset}\n`);

  process.exit(failedTests > 0 ? 1 : 0);
}

// Run tests
runTests().catch(err => {
  console.error(`${colors.red}❌ Test suite error: ${err.message}${colors.reset}`);
  process.exit(1);
});
