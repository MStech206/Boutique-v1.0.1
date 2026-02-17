const fs = require('fs');
const http = require('http');
const axios = require('axios');
const fetch = async (url, opts = {}) => {
  const method = (opts.method || 'GET').toUpperCase();
  const headers = opts.headers || {};
  const data = opts.body ? JSON.parse(opts.body) : undefined;
  const res = await axios({ url, method, headers, data, validateStatus: () => true });
  return { ok: res.status >=200 && res.status < 300, status: res.status, json: async () => res.data };
};

(async () => {
  const out = { timestamp: new Date().toISOString(), results: [] };
  try {
    // GET staff
    const staffRes = await fetch('http://localhost:3000/api/staff');
    out.results.push({ name: 'GET /api/staff', ok: staffRes.ok, status: staffRes.status });
    const staff = await staffRes.json();

    // Login as first staff if exists
    if (Array.isArray(staff) && staff.length > 0) {
      const sid = staff[0].staffId || staff[0]._id;
      const loginRes = await fetch('http://localhost:3000/api/staff/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId: sid, pin: '1234' })
      });
      out.results.push({ name: 'POST /api/staff/login', ok: loginRes.ok, status: loginRes.status });
      const loginJson = await loginRes.json();
      out.login = loginJson;
    } else {
      out.results.push({ name: 'POST /api/staff/login', ok: false, status: 'no-staff' });
    }

    // Share PDF (test endpoint)
    const orderData = {
      orderId: `ORD-RUNTEST-${Date.now()}`,
      customerName: 'Run Test',
      customerPhone: '+919999888777',
      garmentType: 'Shirt',
      measurements: { chest: 38 },
      totalAmount: 700, advanceAmount: 200, deliveryDate: new Date().toISOString()
    };
    const shareRes = await fetch('http://localhost:3000/api/share-order-pdf', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderData, sendNow: false })
    });
    out.results.push({ name: 'POST /api/share-order-pdf', ok: shareRes.ok, status: shareRes.status });
    out.share = await shareRes.json();

    // Get admin orders
    const adminRes = await fetch('http://localhost:3000/api/admin/orders', {
      method: 'GET', headers: { 'Content-Type': 'application/json' }
    });
    out.results.push({ name: 'GET /api/admin/orders', ok: adminRes.ok, status: adminRes.status });
    out.ordersCount = (await adminRes.json()).length;

  } catch (err) {
    out.error = err.message;
  }

  fs.writeFileSync('test-report.json', JSON.stringify(out, null, 2));
  console.log('Test report written to test-report.json');
})();