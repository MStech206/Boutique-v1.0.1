const admin = require('firebase-admin');
const axios = require('axios');

// Connect to Firestore emulator
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';

admin.initializeApp({ projectId: 'sapthala-test' });
const db = admin.firestore();

async function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

(async () => {
    try {
        console.log('Creating order via backend...');
        let resp;
        try {
            resp = await axios.post('http://localhost:8080/api/orders', { items: [{ sku: 'p1', qty: 1 }] }, { timeout: 20000 });
            if (resp.status !== 200) {
                console.error('Order creation failed', resp.status, resp.data || resp);
                if (resp.data && resp.data.error) console.error('Backend error:', resp.data.error, resp.data.detail || '');
                process.exit(2);
            }
        } catch (err) {
            console.error('Order creation axios error:', err.toString());
            if (err.response) { console.error('Response:', err.response.status, err.response.data); }
            if (err.request) { console.error('No response received, request:', err.request); }
            if (err.stack) console.error(err.stack);
            process.exit(2);
        }
        const orderId = resp.data && resp.data.orderId;
        console.log('Order created:', orderId, 'full response:', resp && resp.data);

        // Log order document contents for debugging
        const orderDoc = await db.collection('orders').doc(orderId).get();
        console.log('Order doc snapshot exists?', orderDoc.exists);
        if (orderDoc.exists) console.log('Order doc:', orderDoc.data());

        // Create a PayU payment (advance) for the order
        console.log('Creating payment for order...');
        let payResp;
        try {
            payResp = await axios.post('http://localhost:8080/api/payments/create', { orderId: orderId, amount: 1000.0, productInfo: 'Test product', firstname: 'Test', email: 'test@example.com' }, { timeout: 20000 });
            if (payResp.status !== 200) { console.error('Payment create failed', payResp.status, payResp.data); process.exit(5); }
        } catch (err) {
            console.error('Payment create axios error:', err.toString());
            if (err.response) { console.error('Response:', err.response.status, err.response.data); }
            if (err.request) { console.error('No response received, request:', err.request); }
            if (err.stack) console.error(err.stack);
            process.exit(5);
        }
        console.log('Payment create response:', payResp.data);
        const payUrl = payResp.data.payUrl;
        if (!payUrl) { console.error('No payUrl returned', payResp.data); process.exit(6); }

        // Extract hash and txnid from payUrl
        const url = new URL(payUrl);
        const txnid = url.searchParams.get('txnid');
        const hash = url.searchParams.get('hash');
        console.log('Extracted txnid, hash:', txnid, hash);
        if (!txnid || !hash) { console.error('Missing txnid or hash', payResp.data); process.exit(7); }

        // Verify payment (simulate gateway callback)
        let verifyResp;
        try {
            verifyResp = await axios.post('http://localhost:8080/api/payments/verify', { txnid: txnid, status: 'SUCCESS', hash: hash }, { timeout: 20000 });
            if (verifyResp.status !== 200) { console.error('Payment verify failed', verifyResp.status, verifyResp.data); process.exit(8); }
        } catch (err) {
            console.error('Payment verify axios error:', err.toString());
            if (err.response) { console.error('Response:', err.response.status, err.response.data); }
            if (err.request) { console.error('No response received, request:', err.request); }
            if (err.stack) console.error(err.stack);
            process.exit(8);
        }
        console.log('Payment verify response:', verifyResp.data);

        // Poll for payment audit log
        let paymentAuditFound = false;
        for (let i = 0; i < 20; i++) {
            const q = await db.collection('audit_logs').where('type', '==', 'payment_verification').where('txnid', '==', txnid).limit(1).get();
            if (!q.empty) { paymentAuditFound = true; break; }
            console.log('Waiting for payment audit log...');
            await sleep(1000);
        }
        if (!paymentAuditFound) { console.error('Payment audit log not found'); process.exit(9); }
        console.log('Payment audit log found');
        let found = false;
        for (let i = 0; i < 20; i++) {
            const snap = await db.collection('orders').doc(orderId).get();
            if (snap.exists) { found = true; break; }
            console.log('Waiting for order to appear in Firestore...');
            await sleep(1000);
        }

        if (!found) {
            console.error('Order document not found in Firestore after timeout');
            process.exit(3);
        }
        console.log('Order document found in Firestore');

        // Now poll for analytics record created by Cloud Function
        let analyticsFound = false;
        for (let i = 0; i < 20; i++) {
            const q = await db.collection('analytics_orders').where('orderId', '==', orderId).limit(1).get();
            if (!q.empty) { analyticsFound = true; break; }
            console.log('Waiting for analytics record...');
            await sleep(1000);
        }

        if (!analyticsFound) {
            console.error('Analytics record not found in Firestore after timeout');
            process.exit(4);
        }

        console.log('Analytics record found — integration test passed');
        process.exit(0);
    } catch (e) {
        console.error('Integration test failed:', e);
        if (e && e.stack) console.error(e.stack);
        process.exit(1);
    }
})();
