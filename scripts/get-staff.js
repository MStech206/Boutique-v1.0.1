const http = require('http');
http.get('http://localhost:3000/api/staff', res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    try { console.log(JSON.parse(data)); } catch (e) { console.log(data); }
  });
}).on('error', e => console.error('Error:', e));