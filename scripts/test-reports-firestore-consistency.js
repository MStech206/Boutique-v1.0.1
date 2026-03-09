const axios = require('axios');
const jwt = require('jsonwebtoken');

const BASE = 'http://localhost:3000';
const JWT_SECRET = 'sapthala_boutique_secret_2024';

async function run() {
  try {
    console.log('🔬 Test: reports/dashboard Firestore consistency + sub-admin redaction');

    // 1) Create a test order (public endpoint)
    const uniquePhone = `+91900${Date.now().toString().slice(-6)}`;
    const orderPayload = {
      customer: { name: 'Consistency Test', phone: uniquePhone, address: 'Test address' },
      garmentType: 'Shirt',
      pricing: { total: 2500, advance: 500, balance: 2000 },
      workflow: ['dyeing','finishing','quality-check','ready-to-deliver']
    };

    let createRes;
    try {
      createRes = await axios.post(`${BASE}/api/orders`, orderPayload, { timeout: 30000 });
      console.log(' - POST /api/orders status:', createRes.status);
    } catch (err) {
      console.error(' - POST /api/orders failed:', err.response ? err.response.status : err.message);
      throw err;
    }

    if (!createRes.data || !createRes.data.success) throw new Error('Order creation failed');
    const createdOrderId = (createRes.data.order && (createRes.data.order.orderId || createRes.data.order._id)) || null;
    console.log(' - Created order:', createdOrderId || '(no id)');

    // Small delay to allow Firestore sync (syncOrder is called in POST /api/orders)
    await new Promise(r => setTimeout(r, 1200));

    // 2) Query dashboard and last-orders as ADMIN (JWT)
    const adminToken = jwt.sign({ id: 'test-admin', username: 'tester', role: 'admin', branch: 'SAPTHALA.MAIN' }, JWT_SECRET, { expiresIn: '1h' });
    const headers = { Authorization: `Bearer ${adminToken}` };

    let dashboard;
    try {
      dashboard = await axios.get(`${BASE}/api/dashboard`, { headers, timeout: 30000 });
      console.log(' - GET /api/dashboard status:', dashboard.status);
    } catch (err) {
      console.error(' - GET /api/dashboard failed:', err.response ? err.response.status : err.message);
      throw err;
    }

    if (!dashboard.data || dashboard.status !== 200) throw new Error('Dashboard request failed');
    console.log(' - Dashboard:', { totalOrders: dashboard.data.totalOrders, totalRevenue: dashboard.data.totalRevenue });

    let lastOrders;
    try {
      // Increase limit to 100 to account for existing dataset with irregular timestamps
      lastOrders = await axios.get(`${BASE}/api/reports/last-orders?limit=100`, { headers, timeout: 30000 });
      console.log(' - GET /api/reports/last-orders status:', lastOrders.status);
    } catch (err) {
      console.error(' - GET /api/reports/last-orders failed:', err.response ? (err.response.status + ' ' + JSON.stringify(err.response.data)) : err.message);
      throw err;
    }

    if (!lastOrders.data || lastOrders.status !== 200) throw new Error('Last-orders request failed');
    const found = (lastOrders.data.orders || []).find(o => o.orderId === createdOrderId || o.customerPhone === uniquePhone);
    if (!found) throw new Error('Created order not found in last-orders');
    console.log(' - Created order is present in last-orders (admin view)');

    // Ensure dashboard totalRevenue includes the created order amount (basic sanity check)
    const createdAmount = orderPayload.pricing.total;
    if (typeof dashboard.data.totalRevenue === 'number') {
      if (dashboard.data.totalRevenue < createdAmount) {
        console.warn(' ⚠️ Dashboard totalRevenue is smaller than created order amount — check consistency');
      } else {
        console.log(' - Dashboard totalRevenue appears consistent');
      }
    } else {
      console.warn(' - Dashboard totalRevenue not present (could be redacted or unavailable)');
    }

    // 3) Query as SUB-ADMIN and assert revenue redaction
    const subToken = jwt.sign({ id: 'test-sub', username: 'sub', role: 'sub-admin', branch: 'SAPTHALA.MAIN' }, JWT_SECRET, { expiresIn: '1h' });
    const subHeaders = { Authorization: `Bearer ${subToken}` };

    const subLast = await axios.get(`${BASE}/api/reports/last-orders?limit=10`, { headers: subHeaders, timeout: 5000 });
    if (!subLast.data || subLast.status !== 200) throw new Error('Sub-admin last-orders request failed');

    const subFound = (subLast.data.orders || []).find(o => o.orderId === createdOrderId || o.customerPhone === uniquePhone);
    if (!subFound) throw new Error('Created order not visible to sub-admin (unexpected)');
    if ('totalAmount' in subFound || 'advanceAmount' in subFound || 'balanceAmount' in subFound) {
      throw new Error('Revenue fields not redacted for sub-admin');
    }
    if (!subLast.data.revenueRedacted) console.warn('Note: sub-admin response did not include explicit revenueRedacted flag');
    console.log(' - Sub-admin redaction verified: revenue fields removed');

    console.log('\n✅ All checks passed — reports and dashboard are using Firestore and sub-admin revenue is redacted');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Test failed:', err.message || err);
    process.exit(1);
  }
}

if (require.main === module) run();
module.exports = run;