const http = require('http');

console.log('Testing server...');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/settings',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
    if (res.statusCode === 200) {
      console.log('✅ Server is working!');
    } else {
      console.log('❌ Server returned error');
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Connection failed:', error.message);
  console.log('\n💡 Make sure backend is running!');
});

req.end();
