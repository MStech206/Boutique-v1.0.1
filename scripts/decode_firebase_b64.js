#!/usr/bin/env node
// Decode GOOGLE_APPLICATION_CREDENTIALS_B64 and write firebase-credentials.json (safe helper for local dev)
const fs = require('fs');
const path = require('path');

(async function main() {
  try {
    const b64 = process.env.GOOGLE_APPLICATION_CREDENTIALS_B64;
    if (!b64) {
      console.error('ERROR: Environment variable GOOGLE_APPLICATION_CREDENTIALS_B64 is not set.');
      console.error('Tip: set it to the base64-encoded contents of your Firebase service-account JSON.');
      process.exit(2);
    }

    let json = null;
    try {
      const decoded = Buffer.from(b64, 'base64').toString('utf8');
      json = JSON.parse(decoded);
    } catch (err) {
      console.error('ERROR: Failed to decode/parse GOOGLE_APPLICATION_CREDENTIALS_B64:', err.message);
      process.exit(2);
    }

    if (!json.private_key || !/BEGIN\s+PRIVATE\s+KEY/.test(json.private_key)) {
      console.error('ERROR: Decoded JSON appears invalid — missing properly formatted private_key.');
      process.exit(2);
    }

    const outPath = path.join(__dirname, '..', 'firebase-credentials.json');
    fs.writeFileSync(outPath, JSON.stringify(json, null, 2), { mode: 0o600 });
    console.log('✅ Decoded service-account written to', outPath);
    console.log('⚠️ Keep this file secure. Remove when not needed.');
    process.exit(0);
  } catch (err) {
    console.error('Unexpected error decoding credentials:', err && err.message ? err.message : err);
    process.exit(2);
  }
})();
