# Backend API (Quick Reference)

GET /health
GET /api/products
GET /api/products/{id}
POST /api/products/{id}/reserve?qty=1

POST /api/orders
- Payload: { items: [{sku: string, qty: number}], customerNote }
- Requires auth (JWT)

POST /api/payments/create
- Payload: { orderId, amount, productInfo, firstname, email }
- Returns: { status: created, paymentId, orderId, payUrl }

POST /api/payments/verify
- Payload: gateway callback payload (txnid, status, hash ...)
- Verifies signature and returns verification result

POST /auth/exchange
- Exchange Firebase ID token for server JWT

POST /api/users/{uid}/fcm-token
- Payload: { token }
- Stores `fcmToken` in `users/{uid}` document for notification delivery

POST /admin/users/{uid}/roles
- Admin-only: set roles via Firebase custom claims
- Note: role changes write an `audit_logs` record (type: role_change)

Notes: In development the backend uses in-memory product store. Orders are persisted to Firestore on creation and measurements are persisted via POST /api/measurements. Cloud Functions in `functions/` listen to `orders/{orderId}` creates to send FCM notifications and write simple analytics records.