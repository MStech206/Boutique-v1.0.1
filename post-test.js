const http = require('http');

function postJSON(path, data) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify(data))
      }
    };

    const req = http.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => raw += chunk);
      res.on('end', () => {
        console.log('STATUS', res.statusCode);
        console.log('HEADERS', res.headers);
        console.log('BODY', raw);
        resolve();
      });
    });

    req.on('error', (err) => {
      console.error('REQUEST ERROR', err.message);
      reject(err);
    });

    req.write(JSON.stringify(data));
    req.end();
  });
}

(async () => {
  try {
    await postJSON('/api/staff/login', { staffId: 'staff_005', pin: '1234' });
  } catch (err) {
    console.error('ERROR', err);
  }
})();
