(async () => {
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:9000';
  const svc = require('../firebase-integration-service');
  try {
    const ok = await svc.initialize();
    console.log('initialize() returned ->', ok);
    console.log('svc.initialized =', svc.initialized);
    if (svc.initialized) {
      try {
        const health = await svc.healthCheck ? svc.healthCheck() : { healthy: true };
        console.log('healthCheck ->', health);
      } catch (e) {
        console.error('healthCheck failed:', e.message || e);
      }
    }
  } catch (e) {
    console.error('initialize() threw:', e && e.stack ? e.stack : e);
  }
  process.exit(0);
})();