const admin = require('firebase-admin');

const branchId = process.argv[2];
if (!branchId) {
  console.error('Usage: node check-firestore-branch.js <BRANCH_ID>');
  process.exit(2);
}

// Use emulator if set
if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.warn('FIRESTORE_EMULATOR_HOST not set — making best-effort using default admin credentials');
}

admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'sapthala-test' });
const db = admin.firestore();

(async () => {
  try {
    const doc = await db.collection('branches').doc(branchId).get();
    if (!doc.exists) {
      console.log('NOT_FOUND');
      process.exit(0);
    }
    console.log('FOUND:', JSON.stringify(doc.data(), null, 2));
    process.exit(0);
  } catch (e) {
    console.error('ERROR', e && e.message ? e.message : e);
    process.exit(1);
  }
})();
