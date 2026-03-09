const API_BASE = 'http://localhost:3000/api';
const ADMIN_USER = { username: 'admin', password: 'sapthala@2029' };

async function fetchJson(url, opts = {}){
  const res = await fetch(url, opts);
  let body = null;
  try { body = await res.json(); } catch(e){ body = null; }
  return { ok: res.ok, status: res.status, body };
}

async function run(){
  console.log('Cleanup E2E test data');
  const login = await fetchJson(`${API_BASE}/admin/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ADMIN_USER) });
  if (!login.ok || !login.body || !login.body.success) { console.error('Admin login failed:', login.status, login.body); process.exit(1); }
  const token = login.body.token;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // Orders
  const ordersResp = await fetchJson(`${API_BASE}/orders`, { method: 'GET', headers });
  const orders = ordersResp.body || [];
  const e2eOrders = orders.filter(o => (o.customer && /E2E/i.test(o.customer.name)) || /E2E/i.test(o.orderId));
  for (const o of e2eOrders) {
    console.log('Deleting order', o.orderId);
    const del = await fetchJson(`${API_BASE}/orders/${o._id}`, { method: 'DELETE', headers });
    console.log(' ->', del.status, del.body);
  }

  // Branches
  const branchesResp = await fetchJson(`${API_BASE}/branches`, { method: 'GET', headers });
  const branches = branchesResp.body && branchesResp.body.branches ? branchesResp.body.branches : branchesResp.body || [];
  const e2eBranches = branches.filter(b => /E2E/i.test(b.branchName) || /E2E/i.test(b.branchId));
  for (const b of e2eBranches) {
    console.log('Deleting branch', b.branchId || b._id || b.branchName);
    const id = b._id || b.branchId || b.id;
    const del = await fetchJson(`${API_BASE}/branches/${id}`, { method: 'DELETE', headers });
    console.log(' ->', del.status, del.body);
  }

  // Staff
  const staffResp = await fetchJson(`${API_BASE}/staff`, { method: 'GET', headers });
  const staffList = staffResp.body || [];
  const e2eStaff = staffList.filter(s => /E2E/i.test(s.name) || /staff_e2e/i.test(s.staffId || ''));
  for (const s of e2eStaff) {
    console.log('Deleting staff', s.staffId || s._id || s.name);
    const del = await fetchJson(`${API_BASE}/staff/${s._id}`, { method: 'DELETE', headers });
    console.log(' ->', del.status, del.body);
  }

  console.log('Cleanup complete.');
}

run().catch(err => { console.error('Cleanup failed', err && err.message); process.exit(1); });