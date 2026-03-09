#!/usr/bin/env node

const http = require('http');

// Test if the server endpoints return correct format
console.log('Testing API endpoints for response format fix...\n');

const endpoints = [
  { path: '/api/super-admin/admins', expectedField: 'admins' },
  { path: '/api/super-admin/vendors', expectedField: 'vendors' },
  { path: '/api/super-admin/clients/count', expectedField: 'count' }
];

async function testEndpoint(path, expectedField) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': 'Bearer test-token'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          console.log(`✓ ${path}`);
          console.log(`  Status: ${res.statusCode}`);
          console.log(`  Response type: ${Array.isArray(json) ? 'Array' : 'Object'}`);
          if (expectedField) {
            const hasField = expectedField in json;
            console.log(`  Has '${expectedField}' field: ${hasField ? '✓' : '✗'}`);
          }
          resolve(true);
        } catch (e) {
          console.log(`✗ ${path} - Invalid JSON response`);
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      console.log(`✗ ${path} - ${err.message}`);
      resolve(false);
    });

    req.end();
  });
}

(async () => {
  console.log('Running API format tests...\n');
  
  for (const endpoint of endpoints) {
    await testEndpoint(endpoint.path, endpoint.expectedField);
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log('\n✓ Tests complete!');
  process.exit(0);
})();
