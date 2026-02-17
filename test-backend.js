const http = require('http');

console.log('\n🔍 Testing SAPTHALA Backend Connection...\n');

const tests = [
    { name: 'Server Health', path: '/api/dashboard' },
    { name: 'Staff List', path: '/api/staff' },
    { name: 'Settings', path: '/api/settings' }
];

let passed = 0;
let failed = 0;

tests.forEach((test, index) => {
    setTimeout(() => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: test.path,
            method: 'GET'
        };

        const req = http.request(options, (res) => {
            if (res.statusCode === 200 || res.statusCode === 401) {
                console.log(`✅ ${test.name}: PASS (${res.statusCode})`);
                passed++;
            } else {
                console.log(`❌ ${test.name}: FAIL (${res.statusCode})`);
                failed++;
            }

            if (index === tests.length - 1) {
                setTimeout(() => {
                    console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
                    if (passed === tests.length) {
                        console.log('✅ Backend is working correctly!\n');
                    } else {
                        console.log('⚠️  Some tests failed. Check server logs.\n');
                    }
                }, 500);
            }
        });

        req.on('error', (error) => {
            console.log(`❌ ${test.name}: FAIL (${error.message})`);
            failed++;
            
            if (index === tests.length - 1) {
                setTimeout(() => {
                    console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
                    console.log('❌ Backend is NOT running!');
                    console.log('💡 Run: START_COMPLETE_SYSTEM.bat\n');
                }, 500);
            }
        });

        req.end();
    }, index * 500);
});
