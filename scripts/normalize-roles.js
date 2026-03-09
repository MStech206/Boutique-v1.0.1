#!/usr/bin/env node
/*
  Normalize role strings stored in MongoDB `users` collection.
  - Converts variants like SUPER_ADMIN, superadmin, SUPER-ADMIN to canonical: 'super-admin'
  - Ensures 'admin' and 'sub-admin' normalized too
  Idempotent and safe to run on every start.
*/
const mongoose = require('mongoose');
const path = require('path');
// Read MONGODB_URI from environment or fall back to default
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sapthala_boutique';


const canonicalizeRole = (r) => {
  if (!r) return '';
  const s = String(r).trim().toLowerCase();
  if (/^(super[_\- ]?admin|superadmin|super-admin)$/.test(s)) return 'super-admin';
  if (/^(sub[_\- ]?admin|subadmin|sub-admin)$/.test(s)) return 'sub-admin';
  if (/^admin$/.test(s)) return 'admin';
  return s;
};

(async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');

    const users = await User.find({});
    let changed = 0;

    for (const u of users) {
      const orig = u.role;
      const norm = canonicalizeRole(orig);
      if (!orig && !norm) continue;
      if (orig !== norm) {
        u.role = norm;
        await u.save();
        console.log(`Updated user ${u.username || u.email} role: '${orig}' → '${norm}'`);
        changed += 1;
      }
    }

    console.log(`Normalization complete — ${changed} document(s) modified`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error during role normalization:', err.message);
    process.exit(1);
  }
})();