#!/usr/bin/env node
/**
 * Fix Firestore 'admins' and 'boutique_admins' documents so `role` uses canonical values
 * (super-admin, admin, sub-admin). Requires Firebase service account available via
 * GOOGLE_APPLICATION_CREDENTIALS or ./firebase-credentials.json
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

function canonicalizeRole(r) {
  if (!r) return '';
  const s = String(r).trim().toLowerCase();
  if (/^(super[_\- ]?admin|superadmin|super-admin|super_admin)$/.test(s)) return 'super-admin';
  if (/^(sub[_\- ]?admin|subadmin|sub-admin|sub_admin)$/.test(s)) return 'sub-admin';
  if (/^admin$/.test(s)) return 'admin';
  return s;
}

const possiblePaths = [
  process.env.GOOGLE_APPLICATION_CREDENTIALS,
  './firebase-credentials.json',
  './Boutique-app/super-admin-backend/src/main/resources/firebase/super-admin-auth.json'
].filter(Boolean);

let credPath = possiblePaths.find(p => fs.existsSync(p));
if (!credPath) {
  console.log('No Firebase service account JSON found. Skipping Firestore fixes.');
  process.exit(0);
}

const svc = require(path.resolve(credPath));
admin.initializeApp({ credential: admin.credential.cert(svc) });
const db = admin.firestore();

(async () => {
  try {
    const collections = ['admins', 'boutique_admins', 'users'];
    let total = 0;

    for (const col of collections) {
      const snap = await db.collection(col).get();
      for (const doc of snap.docs) {
        const data = doc.data();
        if (!data || !data.role) continue;
        const normalized = canonicalizeRole(data.role);
        if (normalized && normalized !== String(data.role).toLowerCase()) {
          await db.collection(col).doc(doc.id).update({ role: normalized });
          console.log(`Firestore: ${col}/${doc.id} role '${data.role}' → '${normalized}'`);
          total++;
        }
      }
    }

    console.log(`Firestore normalization finished — ${total} document(s) updated`);
    process.exit(0);
  } catch (err) {
    console.error('Error updating Firestore roles:', err.message);
    process.exit(1);
  }
})();