const fetch = require('node-fetch');

async function testOrderCreation() {
    console.log('🧪 Testing Order Creation Fix\n');
    
    const orderData = {
        customer: {
            name: 'Test Customer',
            phone: '+919876543210',
            address: 'Test Address'
        },
        garmentType: 'Test Blouse',
        measurements: { B: '36', W: '30', BL: '15' },
        designNotes: 'Test design notes',
        designImages: [{ name: 'test.jpg', size: 1024 }],
        pricing: {
            total: 2000,
            advance: 500,
            balance: 1500
        },
        deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        workflow: ['measurements-design', 'dyeing', 'cutting', 'stitching', 'finishing', 'quality-check', 'ready-to-deliver']
    };

    try {
        console.log('📤 Sending order creation request...');
        const response = await fetch('http://localhost:3000/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });

        const result = await response.json();
        
        if (response.ok && result.success) {
            console.log('✅ Order created successfully!');
            console.log('   Order ID:', result.order.orderId);
            console.log('   Customer:', result.order.customerName);
            console.log('   Workflow Tasks:', result.order.workflowTasks.length);
            console.log('\n✅ TEST PASSED - Order creation is working!');
        } else {
            console.log('❌ Order creation failed');
            console.log('   Error:', result.error);
            console.log('\n❌ TEST FAILED');
        }
    } catch (error) {
        console.log('❌ Connection error:', error.message);
        console.log('\n⚠️  Make sure backend is running: LAUNCH_SYSTEM.bat');
    }
}

testOrderCreation();
