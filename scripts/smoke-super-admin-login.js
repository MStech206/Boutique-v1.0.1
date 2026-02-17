const fetch = require('node-fetch');

(async function() {
  try {
    const res = await fetch('http://localhost:3000/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'superadmin', password: 'superadmin@2029' })
    });
    const body = await res.json().catch(() => ({}));
    console.log('STATUS:', res.status);
    console.log('BODY:', JSON.stringify(body, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err.message || err);
    process.exit(1);
  }
})();