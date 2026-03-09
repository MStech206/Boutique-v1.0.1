const fetch = require('node-fetch');
const BASE = 'http://localhost:3000/api';

async function fetchJson(path, opts = {}){
  const res = await fetch(`${BASE}${path}`, opts);
  const body = await res.json().catch(()=>null);
  return { ok: res.ok, status: res.status, body };
}

async function run(){
  console.log('\n🔎 Test: Dashboard charts data (last-orders)');

  // Try to use stored token in environment for CI, else attempt admin login
  let token = process.env.SAPTHALA_ADMIN_TOKEN || null;
  if (!token) {
    const resp = await fetchJson('/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'admin', password: 'sapthala@2029' }) });
    if (!resp.ok || !resp.body || !resp.body.token) throw new Error('Admin login failed for dashboard test');
    token = resp.body.token;
  }

  const headers = { Authorization: `Bearer ${token}` };
  const r = await fetchJson('/reports/last-orders?limit=30', { method: 'GET', headers });
  if (!r.ok) throw new Error('GET /api/reports/last-orders failed: ' + JSON.stringify(r));

  const orders = (r.body && r.body.orders) || [];
  if (!Array.isArray(orders) || orders.length === 0) throw new Error('No recent orders returned for dashboard charts');

  for (const o of orders) {
    if (!o.createdAt) throw new Error('Order missing createdAt');
    if (typeof o.totalAmount === 'undefined') throw new Error('Order missing totalAmount');
  }

  console.log('✅ Dashboard reports endpoint returned valid orders for charts');
}

run().catch(err=>{ console.error('❌ Dashboard charts test failed:', err.message || err); process.exit(1); });