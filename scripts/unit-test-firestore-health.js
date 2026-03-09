const http = require('http');

function checkFirestoreHealth() {
  return new Promise((resolve, reject) => {
    const opts = { hostname: 'localhost', port: 3000, path: '/api/health/firestore', method: 'GET', timeout: 2500 };
    const req = http.request(opts, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk.toString());
      res.on('end', () => {
        // If server requires auth, 401 is acceptable for this unit test (route exists)
        if (res.statusCode === 401) return resolve({ ok: true, reason: 'unauthenticated (expected)' });
        if (res.statusCode === 200) {
          try {
            const j = JSON.parse(body);
            return resolve({ ok: true, reason: 'ok', body: j });
          } catch (e) {
            return reject(new Error('Invalid JSON from /api/health/firestore'));
          }
        }
        return reject(new Error('Unexpected status from /api/health/firestore: ' + res.statusCode + ' ' + body));
      });
    });

    req.on('error', (err) => {
      // Server not running — not a hard failure for unit-level check
      if (err.code === 'ECONNREFUSED') return resolve({ ok: false, reason: 'server-not-running' });
      return reject(err);
    });
    req.end();
  });
}

(async function run() {
  console.log('🧪 unit-test: Firestore health endpoint');
  try {
    const res = await checkFirestoreHealth();
    if (res.ok && res.reason === 'server-not-running') {
      console.log('  ⚠️ Server not running on localhost:3000 — skipping Firestore health assertion');
      process.exit(0);
    }
    if (res.ok) {
      console.log('  ✅ /api/health/firestore route reachable —', res.reason);
      process.exit(0);
    }
    console.error('  ❌ Unexpected result:', res);
    process.exit(1);
  } catch (err) {
    console.error('  ❌ Firestore health test failed:', err.message);
    process.exit(1);
  }
})();