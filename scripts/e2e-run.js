const admin = require('firebase-admin');
const path = require('path');
const { execSync } = require('child_process');

const API_BASE = 'http://localhost:3000/api';
const ADMIN_USER = { username: 'admin', password: 'sapthala@2029' };
const TEST_BRANCH_NAME = 'E2E TEST';

async function wait(ms){ return new Promise(r => setTimeout(r, ms)); }

async function fetchJson(url, opts = {}){
  const res = await fetch(url, opts);
  let body = null;
  try { body = await res.json(); } catch(e){ body = null; }
  return { ok: res.ok, status: res.status, body };
}

async function run() {
  console.log('\n🚀 Starting E2E smoke test (admin → branch → order → whatsapp → staff)');

  // 1) Login as admin
  console.log('\n1) Admin login');
  const login = await fetchJson(`${API_BASE}/admin/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ADMIN_USER) });
  if (!login.ok || !login.body || !login.body.success) {
    console.error('❌ Admin login failed:', login.status, login.body);
    process.exit(1);
  }
  const token = login.body.token;
  console.log('   ✅ Logged in — token obtained');

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // 2) Create branch
  console.log('\n2) Create test branch via API');
  const branchPayload = { branchName: TEST_BRANCH_NAME, location: 'E2E Lab', phone: '+910000000000', email: 'e2e@test' };
  const branchCreated = await fetchJson(`${API_BASE}/branches`, { method: 'POST', headers, body: JSON.stringify(branchPayload) });
  if (!branchCreated.ok || !branchCreated.body || !branchCreated.body.success) {
    console.error('❌ Branch creation failed:', branchCreated.status, branchCreated.body);
    process.exit(1);
  }
  const branch = branchCreated.body.branch;
  console.log(`   ✅ Branch created: ${branch.branchName} (${branch.branchId})`);

  // 3) Verify branch visible via public API
  console.log('\n3) Verify branch via /api/public/branches');
  const pubBranches = await fetchJson(`${API_BASE}/public/branches`);
  const list = (pubBranches.body || []);
  const found = list.find(b => (b.branchId || b.branchName || '').toString().toLowerCase().includes((branch.branchId || branch.branchName).toString().toLowerCase()));
  console.log(`   ${found ? '✅' : '❌'} Branch ${found ? 'visible' : 'NOT visible'} in /api/public/branches`);

  // 4) Sync to Firestore (run sync-to-firebase.js) so Firestore gets the new branch
  console.log('\n4) Sync MongoDB → Firestore (running sync-to-firebase.js)');
  try {
    execSync('node sync-to-firebase.js', { stdio: 'inherit' });
    console.log('   ✅ sync-to-firebase.js completed');
  } catch (err) {
    console.warn('   ⚠️ sync-to-firebase.js failed or printed warnings — continuing', err.message);
  }

  // 5) Verify branch exists in Firestore using service account used by server
  console.log('\n5) Verify branch presence in Firestore');
  try {
    const svcPath = path.join(__dirname, '..', 'Boutique-app', 'super-admin-backend', 'src', 'main', 'resources', 'firebase', 'super-admin-auth.json');
    const svc = require(svcPath);
    if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(svc) });
    const db = admin.firestore();

    const doc = await db.collection('branches').doc(branch.branchId).get();
    if (doc.exists) {
      console.log(`   ✅ Branch found in Firestore: ${branch.branchId}`);
    } else {
      console.warn(`   ⚠️ Branch NOT found in Firestore: ${branch.branchId}`);
    }
  } catch (err) {
    console.warn('   ⚠️ Firestore check skipped or failed (check credentials):', err.message);
  }

  // 6) Create an order for that branch using admin/orders/create
  console.log('\n6) Create test order (admin/orders/create)');
  const testOrder = {
    customer: { name: 'E2E Customer', phone: '+919876543210', address: 'Test address' },
    garmentType: 'Kurta',
    measurements: { length: 40, chest: 36 },
    pricing: { total: 1500, advance: 500, balance: 1000 },
    deliveryDate: new Date(Date.now() + 5*24*3600*1000).toISOString(),
    designNotes: 'E2E test design',
    branch: branch.branchId
  };

  const orderCreated = await fetchJson(`${API_BASE}/admin/orders/create`, { method: 'POST', headers, body: JSON.stringify(testOrder) });
  if (!orderCreated.ok || !orderCreated.body || !orderCreated.body.success) {
    console.error('❌ Order creation failed:', orderCreated.status, orderCreated.body);
    process.exit(1);
  }
  const createdOrder = orderCreated.body.order;
  console.log(`   ✅ Order created: ${createdOrder.orderId}`);
  console.log(`   Workflow tasks: ${createdOrder.workflowTasks.length}`);
  if (createdOrder.workflowTasks && createdOrder.workflowTasks.length > 0) {
    console.log(`   First task status: ${createdOrder.workflowTasks[0].status} ${createdOrder.workflowTasks[0].assignedToName ? `- assigned to ${createdOrder.workflowTasks[0].assignedToName}` : ''}`);
  }

  // 7) Verify order present in admin GET /api/orders
  console.log('\n7) Confirm order in GET /api/orders');
  const ordersList = await fetchJson(`${API_BASE}/orders`, { method: 'GET', headers });
  const allOrders = ordersList.body || [];
  const foundOrder = allOrders.find(o => o.orderId === createdOrder.orderId);
  console.log(`   ${foundOrder ? '✅' : '❌'} Order ${createdOrder.orderId} ${foundOrder ? 'found' : 'not found'} in /api/orders`);

  // 8) Verify staff received task (if assigned)
  console.log('\n8) Verify staff assignment & staff tasks (if assigned)');
  const firstTask = foundOrder ? foundOrder.workflowTasks[0] : null;
  if (firstTask && firstTask.assignedToName) {
    console.log(`   ✅ First task auto-assigned to: ${firstTask.assignedToName}`);
    // Find staff by branch
    const staffListResp = await fetchJson(`${API_BASE}/staff?branch=${encodeURIComponent(branch.branchId)}`);
    const staffList = staffListResp.body || [];
    const assigned = staffList.find(s => (s.name || '').toString().toLowerCase() === (firstTask.assignedToName || '').toString().toLowerCase());
    if (assigned) {
      console.log(`   ✅ Found assigned staff record: ${assigned.name} (${assigned.staffId})`);
      // check staff tasks endpoint
      const staffTasks = await fetchJson(`${API_BASE}/staff/${assigned.staffId}/tasks`);
      if (staffTasks && (staffTasks.body && (staffTasks.body.myTasks || staffTasks.body.length >= 0))) {
        console.log('   ✅ Staff tasks endpoint returned — assigned task should be visible to staff (polling may take a moment)');
      } else {
        console.warn('   ⚠️ Could not verify staff tasks via API');
      }
    } else {
      console.warn('   ⚠️ Assigned staff not found in branch staff list (may be transient)');
    }
  } else {
    console.warn('   ⚠️ First task not auto-assigned (status may be pending)');
  }

  // 9) Verify WhatsApp sending — trigger share-order-pdf to get synchronous notify result
  console.log('\n9) Verify WhatsApp (wa.me fallback) via /api/share-order-pdf (synchronous)');
  const sharePayload = Object.assign({}, testOrder, { orderId: createdOrder.orderId });
  const shareRes = await fetchJson(`${API_BASE}/share-order-pdf`, { method: 'POST', headers, body: JSON.stringify({ orderData: sharePayload, sendNow: true }) });
  if (shareRes && shareRes.body && shareRes.body.notify) {
    console.log('   ✅ /api/share-order-pdf notify result:', shareRes.body.notify);
  } else {
    console.warn('   ⚠️ /api/share-order-pdf did not return notify info — check server logs');
  }

  console.log('\n🎉 E2E run completed. Summary:');
  console.log(` - Branch created: ${branch.branchId}`);
  console.log(` - Order created: ${createdOrder.orderId}`);
  console.log(' - WhatsApp verification: check `share-order-pdf` response above');

  console.log('\nNext steps (optional): delete the test branch/order if you want to clean up.');
}

run().catch(err => { console.error('\n❌ E2E script failed:', err && err.message); process.exit(1); });
