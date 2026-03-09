const axios = require('axios');
const FirebaseService = require('./firebase-service');
const { connectDB, Order } = require('./database');

const BASE_URL = 'http://localhost:3000';

async function run() {
  try {
    console.log('🔁 Running admin order → Firestore integration test');

    const uniquePhone = `+91900${Date.now().toString().slice(-6)}`;
    const payload = {
      customer: { name: 'Integration Test', phone: uniquePhone, address: 'Local test address' },
      garmentType: 'Integration Test Garment',
      pricing: { total: 1500, advance: 300, balance: 1200 },
      workflow: ['dyeing','finishing','quality-check','ready-to-deliver']
    };

    const res = await axios.post(`${BASE_URL}/api/orders`, payload, { timeout: 10000 });
    if (!res.data || !res.data.success) throw new Error('Order creation failed');
    const createdOrderId = res.data.order && res.data.order.orderId;
    console.log('✅ Order created via API:', createdOrderId);

    const firebaseService = new FirebaseService();
    const fbOrders = await firebaseService.getOrders(null, 50);
    const found = fbOrders.find(o => o.orderId === createdOrderId || o.customerPhone === uniquePhone);
    if (!found) throw new Error('Order not found in Firestore');
    console.log('✅ Order found in Firestore (doc id):', found.id || '(no id)');

    // Cleanup Firestore
    try {
      if (found.id) await firebaseService.db.collection('orders').doc(found.id).delete();
      console.log('🧹 Firestore cleanup done');
    } catch (e) { console.warn('Firestore cleanup failed:', e.message); }

    // Cleanup Mongo (best-effort)
    try {
      await connectDB();
      await Order.deleteOne({ orderId: createdOrderId });
      console.log('🧹 MongoDB cleanup done');
    } catch (e) { console.warn('Mongo cleanup failed:', e.message); }

    console.log('\n🎉 Integration test passed!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    process.exit(1);
  }
}

if (require.main === module) run();

module.exports = run;