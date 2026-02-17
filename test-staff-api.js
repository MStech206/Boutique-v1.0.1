const fetch = require('node-fetch');

async function testStaffAPI() {
    try {
        console.log('🧪 Testing Staff API endpoint...');
        
        const response = await fetch('http://localhost:3000/api/staff', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log(`📡 Response status: ${response.status}`);
        console.log(`📡 Response headers:`, response.headers.raw());
        
        if (response.ok) {
            const staff = await response.json();
            console.log(`✅ API Response successful!`);
            console.log(`📊 Staff count: ${staff.length}`);
            
            staff.forEach((member, index) => {
                console.log(`   ${index + 1}. ${member.staffId}: ${member.name} - ${member.role}`);
                console.log(`      Stages: ${member.workflowStages.join(', ')}`);
                console.log(`      Available: ${member.isAvailable}`);
                console.log(`      MongoDB ID: ${member._id}`);
                console.log('');
            });
        } else {
            const errorText = await response.text();
            console.log(`❌ API Error: ${response.status} - ${errorText}`);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testStaffAPI();