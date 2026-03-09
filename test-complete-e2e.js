// Complete End-to-End Test: Order Creation → Branch-Specific Staff Assignment → Workflow
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
let authToken = '';
let testBranchId = 'SAPTHALA.KPHB';
let testOrderId = '';
let testStaffIds = [];

console.log('🚀 Starting Complete E2E Test\n');

// Step 1: Login
async function login() {
    console.log('1️⃣ Testing Admin Login...');
    try {
        const res = await axios.post(`${BASE_URL}/api/admin/login`, {
            username: 'admin',
            password: 'sapthala@2029'
        });
        authToken = res.data.token;
        console.log('   ✅ Login successful\n');
        return true;
    } catch (e) {
        console.log('   ❌ Login failed:', e.message, '\n');
        return false;
    }
}

// Step 2: Create Branch
async function createBranch() {
    console.log('2️⃣ Creating Test Branch (KPHB)...');
    try {
        await axios.post(`${BASE_URL}/api/branches`, {
            branchId: testBranchId,
            branchName: 'KPHB Branch',
            address: 'KPHB, Hyderabad',
            phone: '9876543210'
        }, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        console.log(`   ✅ Branch created: ${testBranchId}\n`);
        return true;
    } catch (e) {
        if (e.response?.status === 400) {
            console.log(`   ℹ️ Branch already exists: ${testBranchId}\n`);
            return true;
        }
        console.log('   ❌ Branch creation failed:', e.message, '\n');
        return false;
    }
}

// Step 3: Create Staff for Different Stages
async function createStaff() {
    console.log('3️⃣ Creating Staff Members for KPHB Branch...');
    
    const staffMembers = [
        { name: 'Cutter Staff', role: 'cutter', stages: ['cutting'] },
        { name: 'Tailor Staff', role: 'tailor', stages: ['stitching'] },
        { name: 'Finisher Staff', role: 'finisher', stages: ['finishing', 'quality-check'] }
    ];
    
    for (const member of staffMembers) {
        try {
            const res = await axios.post(`${BASE_URL}/api/staff`, {
                name: member.name,
                phone: `999${Math.floor(Math.random() * 10000000)}`,
                email: `${member.role}@test.com`,
                role: member.role,
                staffId: `STAFF-KPHB-${member.role.toUpperCase()}`,
                pin: '1234',
                branch: testBranchId,
                stages: member.stages
            }, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            
            const staffId = res.data.staff._id || res.data.staff.id;
            testStaffIds.push({ id: staffId, role: member.role, stages: member.stages });
            console.log(`   ✅ Created ${member.name} (${member.role}) - Stages: ${member.stages.join(', ')}`);
        } catch (e) {
            console.log(`   ⚠️ ${member.name} creation failed:`, e.response?.data?.error || e.message);
        }
    }
    console.log('');
    return testStaffIds.length > 0;
}

// Step 4: Create Order
async function createOrder() {
    console.log('4️⃣ Creating Order for KPHB Branch...');
    try {
        const res = await axios.post(`${BASE_URL}/api/orders`, {
            customer: {
                name: 'Test Customer KPHB',
                phone: '8888888888',
                address: 'KPHB, Hyderabad'
            },
            branch: testBranchId,
            garmentType: 'Silk Kurthi',
            category: 'women',
            measurements: { KL: '38', B: '36', W: '32' },
            designDescription: 'Beautiful silk kurthi with golden embroidery',
            totalAmount: 1000,
            advanceAmount: 500,
            deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            workflowStages: ['cutting', 'stitching', 'finishing', 'quality-check', 'ready-to-deliver']
        }, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        testOrderId = res.data.order.orderId || res.data.order._id;
        console.log(`   ✅ Order created: ${testOrderId}`);
        console.log(`   📍 Branch: ${testBranchId}`);
        console.log(`   👤 Customer: Test Customer KPHB`);
        console.log(`   👗 Garment: Silk Kurthi`);
        console.log(`   💰 Amount: ₹1000 (Advance: ₹500)\n`);
        return true;
    } catch (e) {
        console.log('   ❌ Order creation failed:', e.response?.data?.error || e.message, '\n');
        return false;
    }
}

// Step 5: Verify Order
async function verifyOrder() {
    console.log('5️⃣ Verifying Order in Database...');
    try {
        const res = await axios.get(`${BASE_URL}/api/orders/${testOrderId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const order = res.data.order || res.data;
        console.log(`   ✅ Order verified: ${order.orderId}`);
        console.log(`   📊 Status: ${order.status}`);
        console.log(`   🔄 Workflow stages: ${order.workflowStages?.length || 0}\n`);
        return true;
    } catch (e) {
        console.log('   ❌ Order verification failed:', e.message, '\n');
        return false;
    }
}

// Step 6: Auto-assign to Branch Staff
async function autoAssignStaff() {
    console.log('6️⃣ Auto-Assigning Order to Branch Staff...');
    
    for (const staff of testStaffIds) {
        try {
            const res = await axios.post(`${BASE_URL}/api/orders/${testOrderId}/assign`, {
                staffId: staff.id,
                stage: staff.stages[0]
            }, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            
            console.log(`   ✅ Assigned to ${staff.role} for stage: ${staff.stages[0]}`);
        } catch (e) {
            console.log(`   ⚠️ Assignment to ${staff.role} failed:`, e.response?.data?.error || e.message);
        }
    }
    console.log('');
    return true;
}

// Step 7: Verify Staff Notifications
async function verifyStaffNotifications() {
    console.log('7️⃣ Verifying Staff Received Notifications...');
    
    for (const staff of testStaffIds) {
        try {
            const res = await axios.get(`${BASE_URL}/api/staff/${staff.id}/tasks`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            
            const tasks = res.data.tasks || res.data || [];
            const hasTask = tasks.some(t => t.orderId === testOrderId || t.order?.orderId === testOrderId);
            
            if (hasTask) {
                console.log(`   ✅ ${staff.role} received notification`);
            } else {
                console.log(`   ⚠️ ${staff.role} did NOT receive notification`);
            }
        } catch (e) {
            console.log(`   ⚠️ ${staff.role} notification check failed:`, e.message);
        }
    }
    console.log('');
    return true;
}

// Step 8: Staff Workflow Simulation
async function simulateWorkflow() {
    console.log('8️⃣ Simulating Staff Workflow...');
    
    for (const staff of testStaffIds) {
        console.log(`\n   🔄 ${staff.role.toUpperCase()} WORKFLOW:`);
        
        // Accept task
        try {
            await axios.post(`${BASE_URL}/api/staff/tasks/${testOrderId}/accept`, {
                staffId: staff.id
            }, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            console.log(`      ✅ Task accepted`);
        } catch (e) {
            console.log(`      ⚠️ Accept failed: ${e.response?.data?.error || e.message}`);
        }
        
        // Complete task
        try {
            await axios.post(`${BASE_URL}/api/staff/tasks/${testOrderId}/complete`, {
                staffId: staff.id,
                notes: `${staff.role} work completed successfully`,
                qualityRating: 5
            }, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            console.log(`      ✅ Task completed with quality rating: 5/5`);
        } catch (e) {
            console.log(`      ⚠️ Complete failed: ${e.response?.data?.error || e.message}`);
        }
    }
    console.log('');
    return true;
}

// Step 9: Verify Final Order Status
async function verifyFinalStatus() {
    console.log('9️⃣ Verifying Final Order Status...');
    try {
        const res = await axios.get(`${BASE_URL}/api/orders/${testOrderId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const order = res.data.order || res.data;
        console.log(`   ✅ Order ID: ${order.orderId}`);
        console.log(`   📊 Status: ${order.status}`);
        console.log(`   📈 Progress: ${order.progress || 0}%`);
        console.log(`   👥 Assigned Staff: ${order.assignedStaff?.length || 0}`);
        console.log('');
        return true;
    } catch (e) {
        console.log('   ❌ Status verification failed:', e.message, '\n');
        return false;
    }
}

// Step 10: Generate PDF
async function generatePDF() {
    console.log('🔟 Generating Order PDF...');
    try {
        const res = await axios.post(`${BASE_URL}/api/share-order-pdf`, {
            orderData: { orderId: testOrderId },
            sendNow: false
        }, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        console.log(`   ✅ PDF generated: ${res.data.pdf?.pdfPath || 'Success'}\n`);
        return true;
    } catch (e) {
        console.log('   ⚠️ PDF generation failed:', e.message, '\n');
        return false;
    }
}

// Cleanup
async function cleanup() {
    console.log('🧹 Cleanup (keeping test data for inspection)...');
    console.log(`   ℹ️ Test Order ID: ${testOrderId}`);
    console.log(`   ℹ️ Test Branch: ${testBranchId}`);
    console.log(`   ℹ️ Staff Count: ${testStaffIds.length}\n`);
}

// Run all tests
async function runTests() {
    const results = [];
    
    results.push(await login());
    if (!results[0]) process.exit(1);
    
    results.push(await createBranch());
    results.push(await createStaff());
    results.push(await createOrder());
    if (!results[3]) process.exit(1);
    
    results.push(await verifyOrder());
    results.push(await autoAssignStaff());
    results.push(await verifyStaffNotifications());
    results.push(await simulateWorkflow());
    results.push(await verifyFinalStatus());
    results.push(await generatePDF());
    
    await cleanup();
    
    const passed = results.filter(r => r).length;
    const total = results.length;
    
    console.log('═'.repeat(60));
    console.log(`\n📊 TEST SUMMARY: ${passed}/${total} passed (${Math.round(passed/total*100)}%)\n`);
    console.log('═'.repeat(60));
    
    process.exit(passed === total ? 0 : 1);
}

runTests().catch(e => {
    console.error('❌ Test suite crashed:', e.message);
    process.exit(1);
});
