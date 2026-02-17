const http = require('http');

console.log('Testing admin panel fix...\n');

function testEndpoint(path, name) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: 'GET'
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                const success = res.statusCode === 200 && data.length > 100;
                console.log(`${success ? '✅' : '❌'} ${name}: ${res.statusCode} (${data.length} bytes)`);
                resolve(success);
            });
        });

        req.on('error', (error) => {
            console.log(`❌ ${name}: ${error.message}`);
            resolve(false);
        });

        req.setTimeout(5000, () => {
            console.log(`❌ ${name}: Timeout`);
            req.destroy();
            resolve(false);
        });

        req.end();
    });
}

async function runTests() {
    console.log('Testing endpoints...\n');
    
    const results = await Promise.all([
        testEndpoint('/', 'Admin Panel'),
        testEndpoint('/super-admin', 'Super Admin'),
        testEndpoint('/staff', 'Staff Portal'),
        testEndpoint('/api/settings', 'API Settings')
    ]);

    const passed = results.filter(r => r).length;
    const total = results.length;

    console.log(`\n${'='.repeat(50)}`);
    console.log(`Results: ${passed}/${total} tests passed`);
    console.log('='.repeat(50));

    if (passed === total) {
        console.log('\n✅ ALL TESTS PASSED! System is working correctly.');
    } else {
        console.log('\n❌ Some tests failed. Check if backend is running.');
        console.log('   Run: LAUNCH_SYSTEM.bat → Option 1');
    }
}

runTests();
