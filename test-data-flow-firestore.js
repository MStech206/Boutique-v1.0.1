/* eslint-disable no-console */
const DataFlowService = require('./services/dataFlowService');
const firebaseIntegrationService = require('./firebase-integration-service');

async function run() {
  console.log('\n🔬 Unit Test: DataFlowService (Firestore) — auto-assign & notifications');

  const inited = await firebaseIntegrationService.initialize();
  if (!inited) throw new Error('Firestore initialization failed (set FIRESTORE_EMULATOR_HOST for local tests)');

  const staffId = `tf_test_staff_${Date.now()}`;
  const branch = 'SAPTHALA.E2E_TEST';

  // Cleanup any leftover test staff in the same branch (ensures test isolation)
  try {
    const existing = await firebaseIntegrationService.getCollection('staff', { where: [['branch', '==', branch]], limit: 1000 });
    if (existing.success && Array.isArray(existing.data)) {
      for (const s of existing.data) {
        if (String(s.id || '').startsWith('tf_test_staff_')) {
          await firebaseIntegrationService.deleteDocument('staff', s.id);
        }
      }
    }
  } catch (e) {
    console.warn('⚠️ Cleanup existing test staff failed:', e && e.message ? e.message : e);
  }

  // 1) seed staff
  await firebaseIntegrationService.syncStaff({ staffId, name: 'TF Test Staff', phone: '+919000000000', role: 'tailor', branch, workflowStages: ['dyeing'], currentTaskCount: 0, isAvailable: true });
  console.log(' - seeded staff', staffId);

  // 2) create order payload
  const orderId = `ORD-TF-${Date.now()}`;
  const orderData = {
    orderId,
    customerName: 'Unit Test Customer',
    customerPhone: '+919111111111',
    garmentType: 'Shirt',
    totalAmount: 1200,
    advanceAmount: 200,
    branch,
    workflowTasks: [ { stageId: 'dyeing', stageName: 'Dyeing', status: 'pending', createdAt: new Date(), updatedAt: new Date() } ],
    createdAt: new Date()
  };

  // Ensure order exists in Firestore so DataFlowService operates on it
  await firebaseIntegrationService.syncOrder(orderData);

  // 3) call DataFlowService to process the order (should auto-assign to our staff)
  const res = await DataFlowService.processOrderCreation(orderData, { id: 'test-admin' });
  if (!res || !res.success) throw new Error('DataFlowService returned failure');
  console.log(' - DataFlowService.processOrderCreation ok');

  // small delay for eventual consistency
  await new Promise(r => setTimeout(r, 500));

  // 4) verify order updated in Firestore
  const ord = await firebaseIntegrationService.getDocument('orders', orderId);
  if (!ord.success) throw new Error('Order not found in Firestore after processing');
  const firstTask = (ord.data.workflowTasks || [])[0];
  if (!firstTask) throw new Error('No workflowTasks present on Firestore order');
  if (!firstTask.assignedTo || String(firstTask.assignedTo) !== staffId) throw new Error(`Expected assignedTo=${staffId} but got '${firstTask.assignedTo}'`);
  console.log(' - order task assigned to staff in Firestore OK');

  // 5) verify staff currentTaskCount incremented
  const staffDoc = await firebaseIntegrationService.getDocument('staff', staffId);
  if (!staffDoc.success) throw new Error('Staff doc missing');
  if (!staffDoc.data.currentTaskCount || staffDoc.data.currentTaskCount < 1) throw new Error('Staff currentTaskCount not incremented');
  console.log(' - staff currentTaskCount increment verified');

  // 6) verify notification created
  const notifs = await firebaseIntegrationService.getCollection('notifications', { where: [['recipientId', '==', staffId]], limit: 20 });
  if (!notifs.success) throw new Error('Failed to query notifications');
  if (!Array.isArray(notifs.data) || notifs.data.length === 0) throw new Error('No notification created for assigned staff');
  console.log(' - notification for staff exists');

  // Cleanup (best-effort)
  try { await firebaseIntegrationService.deleteDocument('orders', orderId); } catch (e) {}
  try { await firebaseIntegrationService.deleteDocument('staff', staffId); } catch (e) {}
  console.log('\n✅ DataFlowService (Firestore) unit test passed');
}

run().catch(err => { console.error('❌ Test failed:', err && err.message ? err.message : err); process.exit(1); });
