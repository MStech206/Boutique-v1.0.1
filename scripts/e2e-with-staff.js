const path = require('path');

const API_BASE = 'http://localhost:3000/api';
const ADMIN_USER = { username: 'admin', password: 'sapthala@2029' };
const BRANCH_ID = 'SAPTHALA.E2ETEST';

async function fetchJson(url, opts = {}){
  const res = await fetch(url, opts);
  let body = null;
  try { body = await res.json(); } catch(e){ body = null; }
  return { ok: res.ok, status: res.status, body };
}

async function run(){
  console.log('\n🔁 E2E (create staff → create order → verify assignment)');

  const login = await fetchJson(`${API_BASE}/admin/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ADMIN_USER) });
  if (!login.ok || !login.body || !login.body.success) { console.error('Admin login failed', login); process.exit(1); }
  const token = login.body.token;
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  console.log(' - Admin token acquired');

  // create staff (idempotent)
  const staffPayload = { staffId: 'staff_e2e_1', name: 'E2E Tailor', phone: '+919000000001', email: 'e2e.staff@test', role: 'tailor', pin: '1234', branch: BRANCH_ID, workflowStages: ['dyeing','cutting','stitching','finishing','quality-check'] };
  const staffCreate = await fetchJson(`${API_BASE}/staff`, { method: 'POST', headers, body: JSON.stringify(staffPayload) });
  if (!staffCreate.ok) {
    // if exists, try to find existing staff in branch
    console.warn(' - POST /api/staff returned', staffCreate.status, staffCreate.body);
    const staffList = await fetchJson(`${API_BASE}/staff?branch=${encodeURIComponent(BRANCH_ID)}`, { method: 'GET', headers });
    console.log(' - Staff in branch count:', (staffList.body || []).length);
  } else {
    console.log('   ✅ Staff created:', staffCreate.body.staff.staffId);
  }

  // Create an order (new) to test assignment
  const testOrder = { customer: { name: 'E2E Customer 2', phone: '+919000000002', address: 'E2E address' }, garmentType: 'Shirt', measurements: { length: 40 }, pricing: { total: 1200, advance: 500, balance: 700 }, deliveryDate: new Date(Date.now() + 3*24*3600*1000).toISOString(), designNotes: 'E2E run with staff', branch: BRANCH_ID };
  const orderCreate = await fetchJson(`${API_BASE}/admin/orders/create`, { method: 'POST', headers, body: JSON.stringify(testOrder) });
  if (!orderCreate.ok || !orderCreate.body || !orderCreate.body.success) { console.error('Order creation failed', orderCreate); process.exit(1); }
  const created = orderCreate.body.order;
  console.log('   ✅ Order created:', created.orderId);
  console.log('   Workflow tasks count:', created.workflowTasks.length);
  console.log('   First task status:', created.workflowTasks[0].status, '-', created.workflowTasks[0].assignedToName || '(unassigned)');

  // Poll order from GET /api/orders to allow DataFlowService to assign
  console.log('\n   Polling order for assignment (10s window)...');
  let assigned = false;
  for (let i=0;i<10;i++){
    await new Promise(r => setTimeout(r, 1000));
    const orders = await fetchJson(`${API_BASE}/orders`, { method: 'GET', headers });
    const ord = (orders.body || []).find(o => o.orderId === created.orderId);
    if (ord && ord.workflowTasks && ord.workflowTasks[0] && ord.workflowTasks[0].assignedToName) { assigned = true; console.log('   ✅ Assigned to', ord.workflowTasks[0].assignedToName); break; }
  }
  if (!assigned) console.warn('   ⚠️ Still not assigned after polling — DataFlowService did not find available staff');

  console.log('\nDone — let me know if you want me to remove test data (branch/order/staff)');
}

run().catch(err=>{ console.error('Failed', err.message); process.exit(1); });
