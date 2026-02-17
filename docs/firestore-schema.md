# Firestore Schema (initial draft)

Collections and example document shapes:

users/{uid}
- uid: string
- name: string
- phone: string
- email: string
- roles: ["Customer"]
- profile: {addresses: [], measurementTemplates: []}
- createdAt: timestamp

orders/{orderId}
- orderId: string
- customerId: uid
- status: string (draft|confirmed|cutting|stitching|finishing|qc|dispatch|delivered|completed|canceled)
- tasks: [ {taskId, type, assigneeRole, status, startedAt, finishedAt, photos[]} ]
- items: [ {sku, measurementTemplate, price, qty} ]
- payment: {advancePaid: bool, advanceTxnId, finalPaid: bool}
- createdAt, updatedAt

products/{productId}
- productId, title, description, basePrice, skus, inventoryCount

logs/{any}
- Keep audit records for admin actions and payment callbacks (retention policy applies)

Notes:
- Use subcollections for tasks and photos when necessary.
- Indexes: orders by customerId and status; products by low inventory query.
