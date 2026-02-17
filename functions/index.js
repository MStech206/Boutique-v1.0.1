const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

exports.onOrderCreated = functions.firestore.document('orders/{orderId}').onCreate(async (snap, context) => {
    const order = snap.data();
    console.log('Order created:', context.params.orderId, order);

    // Send a notification to the customer via FCM (if we have a token stored against the user)
    try {
        const uid = order.customerId || order.customer || null;
        if (uid) {
            // Lookup user token in users collection
            const userDoc = await admin.firestore().collection('users').doc(uid).get();
            if (userDoc.exists) {
                const token = userDoc.data().fcmToken;
                if (token) {
                    const message = {
                        token: token,
                        notification: {
                            title: 'Order Confirmed',
                            body: `Your order ${context.params.orderId} is confirmed.`
                        },
                        data: {
                            orderId: context.params.orderId,
                            status: 'confirmed'
                        }
                    };
                    await admin.messaging().send(message);
                    console.log('Notification sent to', uid);
                }
            }
        }
    } catch (e) {
        console.error('Failed to send notification', e);
    }

    // Also add a basic analytics record
    try {
        await admin.firestore().collection('analytics_orders').add({ orderId: context.params.orderId, createdAt: admin.firestore.FieldValue.serverTimestamp(), value: order.total || 0 });
    } catch (e) {
        console.error('Failed to write analytics record', e);
    }
});