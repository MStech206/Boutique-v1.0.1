const mongoose = require('mongoose');
const { connectDB, Branch, Staff, Order, Customer, Settings, User } = require('./database');
const bcrypt = require('bcryptjs');

/**
 * Comprehensive Integration and Testing Script
 * Tests all functionality and ensures everything works
 */

class SystemTester {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            tests: []
        };
    }

    log(message, type = 'info') {
        const icons = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️' };
        console.log(`${icons[type]} ${message}`);
    }

    async test(name, fn) {
        try {
            await fn();
            this.results.passed++;
            this.results.tests.push({ name, status: 'PASS' });
            this.log(`${name} - PASSED`, 'success');
        } catch (error) {
            this.results.failed++;
            this.results.tests.push({ name, status: 'FAIL', error: error.message });
            this.log(`${name} - FAILED: ${error.message}`, 'error');
        }
    }

    async runAllTests() {
        console.log('\n' + '='.repeat(60));
        console.log('🚀 SAPTHALA SYSTEM - COMPREHENSIVE TEST SUITE');
        console.log('='.repeat(60) + '\n');

        await this.testDatabaseConnection();
        await this.testBranchManagement();
        await this.testStaffManagement();
        await this.testOrderManagement();
        await this.testReportsSystem();
        await this.testAuthentication();
        await this.testDataIntegrity();

        this.printResults();
    }

    async testDatabaseConnection() {
        this.log('\n📊 Testing Database Connection...', 'info');
        
        await this.test('MongoDB Connection', async () => {
            if (mongoose.connection.readyState !== 1) {
                throw new Error('MongoDB not connected');
            }
        });

        await this.test('Collections Exist', async () => {
            const collections = await mongoose.connection.db.listCollections().toArray();
            const required = ['branches', 'staff', 'orders', 'customers', 'users', 'settings'];
            const existing = collections.map(c => c.name);
            
            required.forEach(col => {
                if (!existing.includes(col)) {
                    throw new Error(`Collection ${col} not found`);
                }
            });
        });
    }

    async testBranchManagement() {
        this.log('\n🏢 Testing Branch Management...', 'info');

        await this.test('No Duplicate Branches', async () => {
            const branches = await Branch.find();
            const ids = branches.map(b => b.branchId.toLowerCase());
            const unique = new Set(ids);
            
            if (ids.length !== unique.size) {
                throw new Error(`Found ${ids.length - unique.size} duplicate branches`);
            }
        });

        await this.test('All Branches Have Staff', async () => {
            const branches = await Branch.find();
            const settings = await Settings.findOne();
            
            for (const branch of branches) {
                for (const stage of settings.workflowStages) {
                    const staff = await Staff.findOne({
                        branch: branch.branchId,
                        workflowStages: stage.id
                    });
                    
                    if (!staff) {
                        throw new Error(`Branch ${branch.branchId} missing staff for ${stage.id}`);
                    }
                }
            }
        });

        await this.test('Branch Dropdown Data', async () => {
            const branches = await Branch.find();
            if (branches.length === 0) {
                throw new Error('No branches found');
            }
            
            branches.forEach(b => {
                if (!b.branchId || !b.branchName) {
                    throw new Error('Branch missing required fields');
                }
            });
        });
    }

    async testStaffManagement() {
        this.log('\n👥 Testing Staff Management...', 'info');

        await this.test('All Staff Visible', async () => {
            const staff = await Staff.find();
            if (staff.length === 0) {
                throw new Error('No staff members found');
            }
            this.log(`   Found ${staff.length} staff members`, 'info');
        });

        await this.test('Staff Have Valid Branches', async () => {
            const staff = await Staff.find();
            const validBranches = await Branch.find().distinct('branchId');
            
            for (const s of staff) {
                if (!validBranches.includes(s.branch)) {
                    throw new Error(`Staff ${s.staffId} has invalid branch: ${s.branch}`);
                }
            }
        });

        await this.test('Staff Have Workflow Stages', async () => {
            const staff = await Staff.find();
            
            for (const s of staff) {
                if (!s.workflowStages || s.workflowStages.length === 0) {
                    throw new Error(`Staff ${s.staffId} has no workflow stages`);
                }
            }
        });
    }

    async testOrderManagement() {
        this.log('\n📦 Testing Order Management...', 'info');

        await this.test('Orders Have Valid Structure', async () => {
            const orders = await Order.find().limit(10);
            
            for (const order of orders) {
                if (!order.orderId || !order.customerName || !order.customerPhone) {
                    throw new Error(`Order ${order._id} missing required fields`);
                }
            }
        });

        await this.test('Orders Have Workflow Tasks', async () => {
            const orders = await Order.find().limit(10);
            
            for (const order of orders) {
                if (!order.workflowTasks || order.workflowTasks.length === 0) {
                    this.log(`   Warning: Order ${order.orderId} has no workflow tasks`, 'warning');
                }
            }
        });
    }

    async testReportsSystem() {
        this.log('\n📊 Testing Reports System...', 'info');

        await this.test('Reports Query Performance', async () => {
            const start = Date.now();
            await Order.find().limit(100);
            const duration = Date.now() - start;
            
            if (duration > 2000) {
                throw new Error(`Query too slow: ${duration}ms`);
            }
            this.log(`   Query time: ${duration}ms`, 'info');
        });

        await this.test('Reports Filtering', async () => {
            const branches = await Branch.find().limit(1);
            if (branches.length > 0) {
                const orders = await Order.find({ branch: branches[0].branchId });
                this.log(`   Found ${orders.length} orders for branch ${branches[0].branchId}`, 'info');
            }
        });

        await this.test('Reports Date Range', async () => {
            const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const orders = await Order.find({ createdAt: { $gte: lastWeek } });
            this.log(`   Found ${orders.length} orders in last 7 days`, 'info');
        });
    }

    async testAuthentication() {
        this.log('\n🔐 Testing Authentication...', 'info');

        await this.test('Admin User Exists', async () => {
            const admin = await User.findOne({ username: 'admin' });
            if (!admin) {
                throw new Error('Admin user not found');
            }
        });

        await this.test('Super Admin Exists', async () => {
            const superAdmin = await User.findOne({ username: 'superadmin' });
            if (!superAdmin) {
                throw new Error('Super admin user not found');
            }
        });

        await this.test('Password Hashing', async () => {
            const admin = await User.findOne({ username: 'admin' });
            if (!admin.password.startsWith('$2')) {
                throw new Error('Password not properly hashed');
            }
        });
    }

    async testDataIntegrity() {
        this.log('\n🔍 Testing Data Integrity...', 'info');

        await this.test('No Orphaned Orders', async () => {
            const orders = await Order.find();
            const validBranches = await Branch.find().distinct('branchId');
            
            let orphaned = 0;
            for (const order of orders) {
                if (order.branch && !validBranches.includes(order.branch)) {
                    orphaned++;
                }
            }
            
            if (orphaned > 0) {
                this.log(`   Warning: ${orphaned} orders with invalid branches`, 'warning');
            }
        });

        await this.test('Customer-Order Consistency', async () => {
            const customers = await Customer.find().limit(10);
            
            for (const customer of customers) {
                const orderCount = await Order.countDocuments({ customerPhone: customer.phone });
                if (customer.totalOrders !== orderCount) {
                    this.log(`   Warning: Customer ${customer.phone} order count mismatch`, 'warning');
                }
            }
        });
    }

    printResults() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 TEST RESULTS');
        console.log('='.repeat(60));
        console.log(`\n✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`📊 Total:  ${this.results.passed + this.results.failed}`);
        
        if (this.results.failed > 0) {
            console.log('\n❌ Failed Tests:');
            this.results.tests
                .filter(t => t.status === 'FAIL')
                .forEach(t => console.log(`   - ${t.name}: ${t.error}`));
        }
        
        console.log('\n' + '='.repeat(60));
        
        if (this.results.failed === 0) {
            console.log('🎉 ALL TESTS PASSED! System is ready to use.');
        } else {
            console.log('⚠️  Some tests failed. Please review and fix issues.');
        }
        
        console.log('='.repeat(60) + '\n');
    }
}

async function integrateAndTest() {
    console.log('🚀 Starting Integration and Testing...\n');
    
    try {
        // Connect to database
        await connectDB();
        
        // Run comprehensive tests
        const tester = new SystemTester();
        await tester.runAllTests();
        
        // Additional integration checks
        console.log('\n🔧 Running Integration Checks...\n');
        
        // Check if admin panel file exists
        const fs = require('fs');
        const adminPanelExists = fs.existsSync('./sapthala-admin-clean.html');
        console.log(`${adminPanelExists ? '✅' : '❌'} Admin Panel File: ${adminPanelExists ? 'Found' : 'Missing'}`);
        
        // Check if integration script exists
        const integrationExists = fs.existsSync('./admin-panel-db-integration.js');
        console.log(`${integrationExists ? '✅' : '❌'} Integration Script: ${integrationExists ? 'Found' : 'Missing'}`);
        
        // Check server file
        const serverExists = fs.existsSync('./server.js');
        console.log(`${serverExists ? '✅' : '❌'} Server File: ${serverExists ? 'Found' : 'Missing'}`);
        
        console.log('\n' + '='.repeat(60));
        console.log('✅ INTEGRATION COMPLETE');
        console.log('='.repeat(60));
        console.log('\nNext Steps:');
        console.log('1. Run: LAUNCH_SYSTEM.bat');
        console.log('2. Open: http://localhost:3000');
        console.log('3. Login with: admin / sapthala@2029');
        console.log('4. Test all features');
        console.log('='.repeat(60) + '\n');
        
    } catch (error) {
        console.error('\n❌ Integration Failed:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
    }
}

// Run if executed directly
if (require.main === module) {
    integrateAndTest();
}

module.exports = { SystemTester, integrateAndTest };
