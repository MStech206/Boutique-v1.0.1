const http = require('http');

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = { hostname: 'localhost', port: 3000, path, method: 'GET' };
    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
    });
    req.on('error', reject);
    req.end();
  });
}

(async () => {
  try {
    const res = await makeRequest('/api/staff');
    console.log('Status:', res.status);
    const staff = res.data;
    if (!Array.isArray(staff) || staff.length === 0) {
      console.error('❌ No staff returned'); process.exit(1);
    }
    const map = {};
    staff.forEach(s => map[s.staffId] = s.role);
    const checks = [
      ['staff_001', 'Design Coordinator'],
      ['staff_005', 'Khakha Expert'],
      ['staff_010', 'Delivery Executive']
    ];
    let ok = true;
    checks.forEach(([id, role]) => {
      if (map[id] !== role) {
        console.error(`❌ Mismatch for ${id}: expected '${role}', got '${map[id]}'`);
        ok = false;
      } else {
        console.log(`✅ ${id} -> ${role}`);
      }
    });
    process.exit(ok ? 0 : 2);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();