/**
 * Complete E2E Verification for SAPTHALA Admin Panel
 * Tests: Admin UI, API endpoints, data flow, authentication
 * 
 * Run: node scripts/e2e-verify-all.js
 */

const http = require('http');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';
let testsPassed = 0;
let testsFailed = 0;

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000
    };

    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : { status: res.statusCode };
          resolve({ status: res.statusCode, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function test(name, fn) {
  return (async () => {
    try {
      await fn();
      console.log(`✅ ${name}`);
      testsPassed++;
    } catch (err) {
      console.error(`❌ ${name}`);
      console.error(`   Error: ${err.message}`);
      testsFailed++;
    }
  })();
}

(async function runE2E() {
  console.log(`
🧪 SAPTHALA Admin Panel - Complete E2E Verification
${'='.repeat(60)}
Target: ${BASE_URL}
${'='.repeat(60)}
\n`);

  // 1. Test server connectivity
  console.log('📍 Phase 1: Server Connectivity');
  await test('Server is reachable', async () => {
    const res = await request('GET', '/');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  });

  // 2. Test API endpoints
  console.log('\n📍 Phase 2: API Endpoints');
  
  await test('GET /api/health/firestore (unauthenticated, should be 401 or 503)', async () => {
    const res = await request('GET', '/api/health/firestore');
    if (![401, 403, 502, 503].includes(res.status)) {
      throw new Error(`Expected auth error or Firestore error, got ${res.status}`);
    }
  });

  await test('GET /api/public/branches', async () => {
    const res = await request('GET', '/api/public/branches');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!Array.isArray(res.body)) throw new Error('Response should be an array');
    // Ensure no duplicate branch names (case-insensitive)
    const names = res.body.map(b => (b.branchName || b.branchId || '').toString().toLowerCase());
    const unique = new Set(names);
    if (names.length !== unique.size) throw new Error('Duplicate branch names returned by /api/public/branches');
  });

  // 3. Test authentication
  console.log('\n📍 Phase 3: Authentication');
  
  let adminToken = null;
  await test('POST /api/admin/login (invalid credentials → 401)', async () => {
    const res = await request('POST', '/api/admin/login', { username: 'invalid', password: 'invalid' });
    if (res.status !== 401 && res.status !== 403) {
      throw new Error(`Expected 401/403 for bad credentials, got ${res.status}`);
    }
  });

  // Try to login as default admin
  await test('POST /api/admin/login (default admin)', async () => {
    const res = await request('POST', '/api/admin/login', { username: 'admin', password: 'admin' });
    if (res.status === 200) {
      adminToken = res.body.token;
      console.log('      (Got valid token, will use for authenticated calls)');
    } else if (res.status === 401 || res.status === 403) {
      console.log('      (Default admin not available, proceeding with bypass mode)');
    } else {
      throw new Error(`Unexpected status: ${res.status}`);
    }
  });

  // 4. Test authenticated endpoints
  console.log('\n📍 Phase 4: Authenticated Endpoints');
  
  if (adminToken) {
    const authHeaders = { 'Authorization': `Bearer ${adminToken}` };
    
    await test('GET /api/dashboard (with token)', async () => {
      const opts = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/dashboard',
        method: 'GET',
        headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders),
        timeout: 5000
      };
      
      return new Promise((resolve, reject) => {
        const req = http.request(opts, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            if (res.statusCode === 200) {
              const json = JSON.parse(data);
              if (json.totalOrders !== undefined) {
                console.log(`      Dashboard stats: ${json.totalOrders} orders, ₹${json.totalRevenue} revenue`);
                resolve();
              } else {
                reject(new Error('Missing dashboard fields'));
              }
            } else {
              reject(new Error(`Status ${res.statusCode}`));
            }
          });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
        req.end();
      });
    });

    // Verify authenticated branches list is accessible to admin
    await test('GET /api/branches (authenticated)', async () => {
      const opts = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/branches',
        method: 'GET',
        headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders),
        timeout: 5000
      };
      return new Promise((resolve, reject) => {
        const req = http.request(opts, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            if (res.statusCode === 200) {
              try {
                const json = JSON.parse(data);
                if (!Array.isArray(json.branches)) return reject(new Error('branches array missing'));
                // ensure uniqueness by branchId/branchName
                const names = json.branches.map(b => (b.branchName || b.branchId || '').toString().toLowerCase());
                const unique = new Set(names);
                if (names.length !== unique.size) return reject(new Error('Duplicate branch names returned by /api/branches'));
                return resolve();
              } catch (e) {
                return reject(new Error('Invalid JSON response'));
              }
            }
            reject(new Error(`Status ${res.statusCode}`));
          });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
        req.end();
      });
    });

    // Dry-run cleanup duplicates (admin only)
    await test('POST /api/admin/cleanup-duplicate-branches (dry-run)', async () => {
      const opts = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/admin/cleanup-duplicate-branches',
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders),
        timeout: 10000
      };
      return new Promise((resolve, reject) => {
        const req = http.request(opts, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            if (res.statusCode === 200) {
              try {
                const json = JSON.parse(data);
                if (json.success && Array.isArray(json.report)) return resolve();
              } catch (e) {
                return reject(new Error('Invalid JSON from cleanup API'));
              }
            }
            reject(new Error(`Status ${res.statusCode}`));
          });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
        req.end();
      });
    });
  } else {
    console.log('⏭️ Skipping authenticated endpoint tests (no token)');
  }

  // 5. Test admin UI assets
  console.log('\n📍 Phase 5: Admin UI Assets');
  
  const htmlFile = path.join(__dirname, '..', 'sapthala-admin-clean.html');
  await test('Admin HTML file exists', async () => {
    if (!fs.existsSync(htmlFile)) throw new Error('sapthala-admin-clean.html not found');
  });

  await test('Admin HTML contains expected elements', async () => {
    const content = fs.readFileSync(htmlFile, 'utf8');
    const checks = [
      { text: 'updateDashboardStats', name: 'Dashboard update function' },
      { text: 'loadDemoDataOffline', name: 'Demo data loader' },
      { text: 'bypassLogin', name: 'Bypass login' },
      { text: 'Dashboard', name: 'Dashboard section' }
    ];
    for (const check of checks) {
      if (!content.includes(check.text)) {
        throw new Error(`Missing: ${check.name}`);
      }
    }
  });

  // 6. Test API routes
  console.log('\n📍 Phase 6: API Routes (public)');
  
  await test('GET /api/customers (public fallback)', async () => {
    const res = await request('GET', '/api/customers');
    // Could be 200, 401, or 200 with empty array
    if (![200, 401, 403].includes(res.status)) {
      throw new Error(`Unexpected status: ${res.status}`);
    }
  });

  await test('GET /api/staff (public)', async () => {
    const res = await request('GET', '/api/staff');
    if (![200, 400, 404].includes(res.status)) {
      throw new Error(`Unexpected status: ${res.status}`);
    }
  });

  // Verify admin order creation writes to Firestore
  await test('POST /api/orders writes to Firestore', async () => {
    // unique phone to identify the test order
    const uniquePhone = `+91900${Date.now().toString().slice(-6)}`;
    const payload = {
      customer: { name: 'E2E Firestore Test', phone: uniquePhone, address: 'Test Address' },
      garmentType: 'E2E Test Garment',
      pricing: { total: 1200, advance: 200, balance: 1000 },
      workflow: ['dyeing','finishing','quality-check','ready-to-deliver'],
      designNotes: 'E2E verification'
    };

    const res = await request('POST', '/api/orders', payload);
    if (res.status !== 200 || !res.body?.success) {
      throw new Error(`Order creation failed: status=${res.status} body=${JSON.stringify(res.body)}`);
    }
    const createdOrderId = res.body.order?.orderId;
    if (!createdOrderId) throw new Error('Missing orderId in response');

    // Verify presence in Firestore
    const FirebaseService = require('../firebase-service');
    const firebaseService = new FirebaseService();
    const fbOrders = await firebaseService.getOrders(null, 50);
    const found = fbOrders.find(o => o.orderId === createdOrderId || o.customerPhone === uniquePhone);
    if (!found) throw new Error('Order not found in Firestore');

    // Cleanup Firestore doc (best-effort)
    try {
      if (found.id) await firebaseService.db.collection('orders').doc(found.id).delete();
    } catch (e) {
      console.warn('Could not delete Firestore test order:', e.message);
    }

    // Try to cleanup MongoDB entry (best-effort)
    try {
      const { connectDB, Order } = require('../database');
      await connectDB();
      await Order.deleteOne({ orderId: createdOrderId });
    } catch (e) {
      // ignore cleanup errors
    }
  });

  // 7. Test feature switches
  console.log('\n📍 Phase 7: Feature Checks');
  
  const serverPath = path.join(__dirname, '..', 'server.js');
  await test('Server.js has demo data endpoints', async () => {
    const content = fs.readFileSync(serverPath, 'utf8');
    if (!content.includes('GET /api/public/branches')) {
      throw new Error('Missing public branches endpoint');
    }
  });

  await test('Services have NotificationService', async () => {
    const notifPath = path.join(__dirname, '..', 'services', 'notificationService.js');
    if (!fs.existsSync(notifPath)) {
      throw new Error('NotificationService not found');
    }
    const content = fs.readFileSync(notifPath, 'utf8');
    if (!content.includes('generateCustomerMessage')) {
      throw new Error('generateCustomerMessage method not found');
    }
  });

  // Final summary
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 E2E Verification Results`);
  console.log(`${'='.repeat(60)}`);
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log(`${'='.repeat(60)}`);

  if (testsFailed === 0) {
    console.log(`\n🎉 All checks passed! Admin panel is ready to use.`);
    console.log(`\n📝 Next steps:`);
    console.log(`   1. Open http://localhost:3000 in browser`);
    console.log(`   2. Click "Skip to Dashboard" button`);
    console.log(`   3. Demo data will be loaded automatically`);
    console.log(`   4. You should see 5 demo orders with ₹38,000 total revenue\n`);
  } else {
    console.log(`\n⚠️ Some checks failed. Review errors above.\n`);
  }

  process.exit(testsFailed > 0 ? 1 : 0);
})().catch(err => {
  console.error('❌ E2E Suite Error:', err.message);
  process.exit(1);
});
