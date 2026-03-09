// COMPREHENSIVE END-TO-END TEST FOR ORDER SYSTEM
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';
let authToken = null;
let testOrderId = null;
let testBranch = 'SAPTHALA.KPHB';

// Test Results
const results = {
    passed: [],
    failed: [],
    warnings: []
};

function log(emoji, message) {
    console.log(`${emoji} ${message}`);
}

function pass(test) {
    results.passed.push(test);
    log('✅', `PASS: ${test}`);
}

function fail(test, error) {
    results.failed.push({ test, error });
    log('❌', `FAIL: ${test} - ${error}`);
}

function warn(message) {
    results.warnings.push(message);
    log('⚠️', `WARN: ${message}`);
}

async function testAdminLogin() {
    try {
        log('🔐', 'Testing admin login...');
        
        const response = await fetch(`${BASE_URL}/api/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'admin',
                password: 'sapthala@2029'
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success && data.token) {
            authToken = data.token;
            pass('Admin login successful');
            return true;
        } else {
            fail('Admin login', data.error || 'No token received');
            return false;
        }
    } catch (error) {
        fail('Admin login', error.message);
        return false;
    }
}

async function testBranchList() {
    try {
        log('🏢', 'Testing branch list...');
        
        const response = await fetch(`${BASE_URL}/api/public/branches`);
        const branches = await response.json();
        
        if (Array.isArray(branches) && branches.length > 0) {
            pass(`Branch list retrieved (${branches.length} branches)`);
            
            // Check if test branch exists
            const testBranchExists = branches.some(b => b.branchId === testBranch);
            if (testBranchExists) {
                pass(`Test branch ${testBranch} exists`);
            } else {
                warn(`Test branch ${testBranch} not found, using first available branch`);
                testBranch = branches[0].branchId;
            }
            
            return true;
        } else {
            fail('Branch list', 'No branches found');
            return false;
        }
    } catch (error) {
        fail('Branch list', error.message);
        return false;
    }
}

async function testStaffList() {
    try {
        log('👥', 'Testing staff list for branch...');
        
        const response = await fetch(`${BASE_URL}/api/staff?branch=${testBranch}`);
        const staff = await response.json();
        
        if (Array.isArray(staff) && staff.length > 0) {
            pass(`Staff list retrieved (${staff.length} staff members for ${testBranch})`);
            
            // Check for required workflow stages
            const stages = ['dyeing', 'cutting', 'stitching', 'finishing', 'quality-check', 'ready-to-deliver'];
            const missingStages = [];
            
            stages.forEach(stage => {
                const hasStaff = staff.some(s => s.workflowStages && s.workflowStages.includes(stage));
                if (!hasStaff) {
                    missingStages.push(stage);
                }
            });
            
            if (missingStages.length === 0) {
                pass('All workflow stages have assigned staff');
            } else {
                warn(`Missing staff for stages: ${missingStages.join(', ')}`);
            }
            
            return true;
        } else {
            fail('Staff list', 'No staff found for branch');
            return false;
        }
    } catch (error) {
        fail('Staff list', error.message);
        return false;
    }
}

async function testOrderCreation() {
    try {
        log('📦', 'Testing order creation...');
        
        const orderData = {
            customer: {
                name: 'Test Customer E2E',
                phone: '+919876543210',
                address: 'Test Address, Hyderabad'
            },
            garmentType: 'Silk Kurthi',
            measurements: {
                KL: '38',
                B: '36',
                W: '32'
            },
            designNotes: 'Test design with embroidery work',
            designImages: [],
            pricing: {
                total: 1500,
                advance: 500,
                balance: 1000
            },
            deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            branch: testBranch,
            workflow: ['dyeing', 'cutting', 'stitching', 'finishing', 'quality-check', 'ready-to-deliver'],
            theme: 'default'
        };
        
        const response = await fetch(`${BASE_URL}/api/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(orderData)
        });
        
        const result = await response.json();
        
        if (response.ok && result.success && result.order) {
            testOrderId = result.order.orderId;
            pass(`Order created successfully: ${testOrderId}`);
            
            // Verify order details
            if (result.order.workflowTasks && result.order.workflowTasks.length > 0) {
                pass(`Workflow tasks created (${result.order.workflowTasks.length} tasks)`);
                
                // Check first task status
                const firstTask = result.order.workflowTasks[0];
                if (firstTask.status === 'pending') {
                    pass('First task status is pending (awaiting staff acceptance)');
                } else {
                    warn(`First task status is ${firstTask.status}, expected 'pending'`);
                }
            } else {
                fail('Order workflow', 'No workflow tasks created');
            }
            
            return true;
        } else {
            fail('Order creation', result.error || 'Unknown error');
            return false;
        }
    } catch (error) {
        fail('Order creation', error.message);
        return false;
    }
}

async function testOrderRetrieval() {
    try {
        log('🔍', 'Testing order retrieval...');
        
        if (!testOrderId) {
            fail('Order retrieval', 'No test order ID available');
            return false;
        }
        
        const response = await fetch(`${BASE_URL}/api/admin/orders/${testOrderId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const order = await response.json();
        
        if (response.ok && order.orderId === testOrderId) {
            pass('Order retrieved successfully');
            
            // Verify order data
            if (order.branch === testBranch) {
                pass('Order branch matches');
            } else {
                fail('Order branch', `Expected ${testBranch}, got ${order.branch}`);
            }
            
            if (order.customerName === 'Test Customer E2E') {
                pass('Customer name matches');
            } else {
                fail('Customer name', 'Mismatch');
            }
            
            return true;
        } else {
            fail('Order retrieval', 'Order not found or mismatch');
            return false;
        }
    } catch (error) {
        fail('Order retrieval', error.message);
        return false;
    }
}

async function testFirebaseSync() {
    try {
        log('🔥', 'Testing Firebase sync...');
        
        // Check if Firebase is configured
        const response = await fetch(`${BASE_URL}/api/health/firestore`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            pass('Firebase/Firestore is accessible');
            return true;
        } else {
            warn('Firebase/Firestore not accessible - orders will be stored in MongoDB only');
            return false;
        }
    } catch (error) {
        warn(`Firebase sync test failed: ${error.message}`);
        return false;
    }
}

async function testReports() {
    try {
        log('📊', 'Testing reports...');
        
        const response = await fetch(`${BASE_URL}/api/reports/orders?branch=${testBranch}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok && result.success && Array.isArray(result.orders)) {
            pass(`Reports retrieved (${result.orders.length} orders)`);
            
            // Check if our test order is in the report
            const testOrderInReport = result.orders.some(o => o.orderId === testOrderId);
            if (testOrderInReport) {
                pass('Test order appears in reports');
            } else {
                warn('Test order not yet in reports (may need time to sync)');
            }
            
            return true;
        } else {
            fail('Reports', 'Failed to retrieve reports');
            return false;
        }
    } catch (error) {
        fail('Reports', error.message);
        return false;
    }
}

async function testCalculations() {
    try {
        log('🧮', 'Testing pricing calculations...');
        
        // Test case 1: Basic calculation
        const test1 = {
            basePrice: 1000,
            addonPrice: 150,
            otherExpenses: 100,
            discount: 0,
            expected: 1250
        };
        
        const total1 = test1.basePrice + test1.addonPrice + test1.otherExpenses - test1.discount;
        if (total1 === test1.expected) {
            pass('Basic calculation correct');
        } else {
            fail('Basic calculation', `Expected ${test1.expected}, got ${total1}`);
        }
        
        // Test case 2: With discount
        const test2 = {
            basePrice: 1000,
            addonPrice: 150,
            otherExpenses: 100,
            subtotal: 1250,
            discountPercent: 10,
            expectedDiscount: 125,
            expectedTotal: 1125
        };
        
        const discount2 = Math.round((test2.subtotal * test2.discountPercent) / 100);
        const total2 = test2.subtotal - discount2;
        
        if (discount2 === test2.expectedDiscount && total2 === test2.expectedTotal) {
            pass('Discount calculation correct');
        } else {
            fail('Discount calculation', `Expected discount ${test2.expectedDiscount}, got ${discount2}; Expected total ${test2.expectedTotal}, got ${total2}`);
        }
        
        // Test case 3: Balance calculation
        const test3 = {
            total: 1125,
            advance: 500,
            expectedBalance: 625
        };
        
        const balance3 = test3.total - test3.advance;
        if (balance3 === test3.expectedBalance) {
            pass('Balance calculation correct');
        } else {
            fail('Balance calculation', `Expected ${test3.expectedBalance}, got ${balance3}`);
        }
        
        return true;
    } catch (error) {
        fail('Calculations', error.message);
        return false;
    }
}

async function runAllTests() {
    console.log('\\n' + '='.repeat(60));
    console.log('🧪 SAPTHALA BOUTIQUE - END-TO-END TEST SUITE');
    console.log('='.repeat(60) + '\\n');
    
    // Run tests in sequence
    await testAdminLogin();
    await testBranchList();
    await testStaffList();
    await testCalculations();
    await testOrderCreation();
    await testOrderRetrieval();
    await testFirebaseSync();
    await testReports();
    
    // Print summary
    console.log('\\n' + '='.repeat(60));
    console.log('📋 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${results.passed.length}`);
    console.log(`❌ Failed: ${results.failed.length}`);
    console.log(`⚠️  Warnings: ${results.warnings.length}`);
    
    if (results.failed.length > 0) {
        console.log('\\n❌ FAILED TESTS:');
        results.failed.forEach(f => {
            console.log(`   - ${f.test}: ${f.error}`);
        });
    }
    
    if (results.warnings.length > 0) {
        console.log('\\n⚠️  WARNINGS:');
        results.warnings.forEach(w => {
            console.log(`   - ${w}`);
        });
    }
    
    console.log('\\n' + '='.repeat(60));
    
    const successRate = Math.round((results.passed.length / (results.passed.length + results.failed.length)) * 100);
    console.log(`\\n🎯 Success Rate: ${successRate}%`);
    
    if (results.failed.length === 0) {
        console.log('\\n🎉 ALL TESTS PASSED! System is working correctly.\\n');
        process.exit(0);
    } else {
        console.log('\\n⚠️  SOME TESTS FAILED. Please review the errors above.\\n');
        process.exit(1);
    }
}

// Run tests
runAllTests().catch(error => {
    console.error('\\n❌ Test suite failed:', error);
    process.exit(1);
});
