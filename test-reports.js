const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000/api';

async function testReports() {
    console.log('🧪 Testing Reports System...');
    
    try {
        // Test staff performance report
        console.log('\n📊 Testing Staff Performance Report...');
        const staffResponse = await fetch(`${API_BASE}/reports/staff-performance`);
        const staffData = await staffResponse.json();
        console.log('✅ Staff Performance:', staffData.length, 'staff members');
        
        // Test order reports
        console.log('\n📦 Testing Order Reports...');
        const orderResponse = await fetch(`${API_BASE}/reports/orders`);
        const orderData = await orderResponse.json();
        console.log('✅ Order Reports:', orderData.length, 'orders');
        
        // Test individual staff report
        console.log('\n👤 Testing Individual Staff Report...');
        const individualResponse = await fetch(`${API_BASE}/reports/staff/staff_001`);
        if (individualResponse.ok) {
            const individualData = await individualResponse.json();
            console.log('✅ Individual Staff Report:', individualData.staff.name);
            console.log('   Tasks completed:', individualData.summary.completedTasks);
            console.log('   Average time:', individualData.summary.averageTimePerTask, 'minutes');
        } else {
            console.log('⚠️ Individual staff report not available (no data yet)');
        }
        
        console.log('\n🎉 Reports system test completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run test if server is running
testReports();