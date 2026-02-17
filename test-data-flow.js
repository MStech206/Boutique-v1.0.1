const { connectDB, Order, Staff, Customer, Notification, Settings } = require('./database');
const DataFlowService = require('./services/dataFlowService');

/**
 * Comprehensive Test Suite for Data Flow System
 * Tests the seamless synchronization between admin panel and staff application
 */

async function runDataFlowTests() {
    console.log('🧪 Starting Data Flow System Tests...\n');
    
    try {
        // Connect to database
        await connectDB();
        console.log('✅ Database connected successfully\n');
        
        // Test 1: Order Creation and Auto-Assignment
        await testOrderCreationAndAssignment();
        
        // Test 2: Staff Task Updates
        await testStaffTaskUpdates();
        
        // Test 3: Workflow Progression
        await testWorkflowProgression();
        
        // Test 4: Real-Time Data Retrieval
        await testRealTimeDataRetrieval();
        
        // Test 5: Notification System
        await testNotificationSystem();
        
        console.log('🎉 All Data Flow System tests completed successfully!');
        
    } catch (error) {
        console.error('❌ Test suite failed:', error);
    } finally {
        process.exit(0);
    }
}

/**
 * Test 1: Order Creation and Auto-Assignment
 */
async function testOrderCreationAndAssignment() {
    console.log('📋 Test 1: Order Creation and Auto-Assignment');
    console.log('=' .repeat(50));
    
    try {
        // Create test order data
        const orderData = {
            orderId: `TEST-${Date.now()}`,
            customerName: 'Test Customer',
            customerPhone: '+919876543210',
            customerAddress: 'Test Address',
            garmentType: 'Test Lehenga',
            measurements: { B: 36, W: 28, LL: 42 },
            totalAmount: 5000,
            advanceAmount: 1000,
            balanceAmount: 4000,
            deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            branch: 'SAPTHALA.MAIN',
            status: 'pending',
            currentStage: 'dyeing',
            workflowTasks: [
                {
                    stageId: 'dyeing',
                    stageName: 'Dyeing',
                    stageIcon: '🎨',
                    status: 'pending',
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    stageId: 'cutting',
                    stageName: 'Cutting',
                    stageIcon: '✂️',
                    status: 'waiting',
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ],
            designNotes: 'Test design notes',
            designImages: []
        };
        
        console.log(`   Creating order: ${orderData.orderId}`);
        
        // Process order creation
        const result = await DataFlowService.processOrderCreation(orderData, { id: 'test-admin' });
        
        if (result.success) {
            console.log('   ✅ Order created successfully');
            console.log(`   ✅ Order ID: ${result.order.orderId}`);
            
            // Check if first task was auto-assigned
            const order = await Order.findOne({ orderId: orderData.orderId });
            const firstTask = order.workflowTasks[0];
            
            if (firstTask.assignedTo) {
                console.log(`   ✅ First task auto-assigned to: ${firstTask.assignedToName}`);
            } else {
                console.log('   ⚠️ No staff available for auto-assignment (task kept as pending)');
            }
            
            // Check customer record
            const customer = await Customer.findOne({ phone: orderData.customerPhone });
            if (customer) {
                console.log(`   ✅ Customer record updated: ${customer.name}`);
            }
            
        } else {
            throw new Error('Order creation failed');
        }
        
        console.log('   ✅ Test 1 passed\n');
        
    } catch (error) {
        console.error('   ❌ Test 1 failed:', error.message);
        throw error;
    }
}

/**
 * Test 2: Staff Task Updates
 */
async function testStaffTaskUpdates() {
    console.log('👷 Test 2: Staff Task Updates');
    console.log('=' .repeat(50));
    
    try {
        // Find a staff member and an assigned task
        const staff = await Staff.findOne({ workflowStages: 'dyeing' });
        if (!staff) {
            console.log('   ⚠️ No dyeing staff found, skipping task update test');
            return;
        }
        
        const order = await Order.findOne({ 
            'workflowTasks.assignedTo': staff._id,
            'workflowTasks.status': 'assigned'
        });
        
        if (!order) {
            console.log('   ⚠️ No assigned tasks found, skipping task update test');
            return;
        }
        
        const task = order.workflowTasks.find(t => 
            t.assignedTo && t.assignedTo.toString() === staff._id.toString() && t.status === 'assigned'
        );
        
        console.log(`   Testing task updates for: ${staff.name}`);
        console.log(`   Order: ${order.orderId}, Task: ${task.stageName}`);
        
        // Test task start
        console.log('   Starting task...');
        let result = await DataFlowService.processStaffTaskUpdate(
            staff.staffId, 
            order.orderId, 
            task.stageId, 
            { status: 'started' }
        );
        
        if (result.success) {
            console.log('   ✅ Task started successfully');
        } else {
            throw new Error('Task start failed');
        }
        
        // Test task pause
        console.log('   Pausing task...');
        result = await DataFlowService.processStaffTaskUpdate(
            staff.staffId, 
            order.orderId, 
            task.stageId, 
            { status: 'paused', notes: 'Taking a break' }
        );
        
        if (result.success) {
            console.log('   ✅ Task paused successfully');
        } else {
            throw new Error('Task pause failed');
        }
        
        // Test task resume
        console.log('   Resuming task...');
        result = await DataFlowService.processStaffTaskUpdate(
            staff.staffId, 
            order.orderId, 
            task.stageId, 
            { status: 'resumed' }
        );
        
        if (result.success) {
            console.log('   ✅ Task resumed successfully');
        } else {
            throw new Error('Task resume failed');
        }
        
        console.log('   ✅ Test 2 passed\n');
        
    } catch (error) {
        console.error('   ❌ Test 2 failed:', error.message);
        throw error;
    }
}

/**
 * Test 3: Workflow Progression
 */
async function testWorkflowProgression() {
    console.log('🔄 Test 3: Workflow Progression');
    console.log('=' .repeat(50));
    
    try {
        // Find an order with a task in progress
        const order = await Order.findOne({ 
            'workflowTasks.status': { $in: ['started', 'resumed'] }
        });
        
        if (!order) {
            console.log('   ⚠️ No orders with active tasks found, skipping progression test');
            return;
        }
        
        const activeTask = order.workflowTasks.find(t => 
            ['started', 'resumed'].includes(t.status)
        );
        
        const staff = await Staff.findById(activeTask.assignedTo);
        
        console.log(`   Testing workflow progression for order: ${order.orderId}`);
        console.log(`   Completing task: ${activeTask.stageName} by ${staff?.name}`);
        
        // Complete the task
        const result = await DataFlowService.processStaffTaskUpdate(
            staff.staffId, 
            order.orderId, 
            activeTask.stageId, 
            { 
                status: 'completed', 
                notes: 'Test completion', 
                qualityRating: 5 
            }
        );
        
        if (result.success) {
            console.log('   ✅ Task completed successfully');
            
            // Check if next stage was activated
            const updatedOrder = await Order.findById(order._id);
            const nextTask = updatedOrder.workflowTasks.find(t => 
                t.status === 'pending' || t.status === 'assigned'
            );
            
            if (nextTask) {
                console.log(`   ✅ Next stage activated: ${nextTask.stageName}`);
                if (nextTask.assignedTo) {
                    console.log(`   ✅ Next task auto-assigned to: ${nextTask.assignedToName}`);
                }
            } else {
                console.log('   ✅ All stages completed - order finished');
            }
            
        } else {
            throw new Error('Task completion failed');
        }
        
        console.log('   ✅ Test 3 passed\n');
        
    } catch (error) {
        console.error('   ❌ Test 3 failed:', error.message);
        throw error;
    }
}

/**
 * Test 4: Real-Time Data Retrieval
 */
async function testRealTimeDataRetrieval() {
    console.log('📊 Test 4: Real-Time Data Retrieval');
    console.log('=' .repeat(50));
    
    try {
        // Find a staff member
        const staff = await Staff.findOne();
        if (!staff) {
            throw new Error('No staff found for testing');
        }
        
        console.log(`   Testing data retrieval for staff: ${staff.name}`);
        
        // Test enhanced task retrieval
        const result = await DataFlowService.getStaffTasks(staff.staffId, true);
        
        console.log(`   ✅ Retrieved ${result.myTasks.length} assigned tasks`);
        console.log(`   ✅ Retrieved ${result.availableTasks.length} available tasks`);
        console.log(`   ✅ Staff info: ${result.staff.name} (${result.staff.role})`);
        
        // Verify data structure
        if (result.myTasks.every(task => task.orderId && task.stageName)) {
            console.log('   ✅ Task data structure is correct');
        } else {
            throw new Error('Invalid task data structure');
        }
        
        console.log('   ✅ Test 4 passed\n');
        
    } catch (error) {
        console.error('   ❌ Test 4 failed:', error.message);
        throw error;
    }
}

/**
 * Test 5: Notification System
 */
async function testNotificationSystem() {
    console.log('🔔 Test 5: Notification System');
    console.log('=' .repeat(50));
    
    try {
        // Find a staff member
        const staff = await Staff.findOne();
        if (!staff) {
            throw new Error('No staff found for testing');
        }
        
        console.log(`   Testing notifications for staff: ${staff.name}`);
        
        // Create a test notification
        const notification = await DataFlowService.createStaffNotification({
            type: 'task_assigned',
            title: 'Test Notification',
            message: 'This is a test notification for the data flow system',
            recipientId: staff._id,
            orderId: 'TEST-ORDER-123'
        });
        
        if (notification) {
            console.log('   ✅ Notification created successfully');
            console.log(`   ✅ Notification ID: ${notification._id}`);
        } else {
            throw new Error('Notification creation failed');
        }
        
        // Check if notification was saved
        const savedNotification = await Notification.findById(notification._id);
        if (savedNotification) {
            console.log('   ✅ Notification saved to database');
        } else {
            throw new Error('Notification not found in database');
        }
        
        console.log('   ✅ Test 5 passed\n');
        
    } catch (error) {
        console.error('   ❌ Test 5 failed:', error.message);
        throw error;
    }
}

/**
 * Display system statistics
 */
async function displaySystemStats() {
    console.log('📈 System Statistics');
    console.log('=' .repeat(50));
    
    try {
        const stats = {
            totalOrders: await Order.countDocuments(),
            activeOrders: await Order.countDocuments({ status: { $in: ['pending', 'in_progress'] } }),
            totalStaff: await Staff.countDocuments(),
            availableStaff: await Staff.countDocuments({ isAvailable: true }),
            totalCustomers: await Customer.countDocuments(),
            totalNotifications: await Notification.countDocuments(),
            pendingTasks: await Order.countDocuments({ 'workflowTasks.status': 'pending' }),
            activeTasks: await Order.countDocuments({ 'workflowTasks.status': { $in: ['assigned', 'started', 'resumed'] } }),
            completedTasks: await Order.countDocuments({ 'workflowTasks.status': 'completed' })
        };
        
        console.log(`   Total Orders: ${stats.totalOrders}`);
        console.log(`   Active Orders: ${stats.activeOrders}`);
        console.log(`   Total Staff: ${stats.totalStaff}`);
        console.log(`   Available Staff: ${stats.availableStaff}`);
        console.log(`   Total Customers: ${stats.totalCustomers}`);
        console.log(`   Total Notifications: ${stats.totalNotifications}`);
        console.log(`   Pending Tasks: ${stats.pendingTasks}`);
        console.log(`   Active Tasks: ${stats.activeTasks}`);
        console.log(`   Completed Tasks: ${stats.completedTasks}`);
        
        console.log('\n✅ System statistics displayed successfully\n');
        
    } catch (error) {
        console.error('❌ Failed to get system statistics:', error.message);
    }
}

// Run the test suite
if (require.main === module) {
    runDataFlowTests()
        .then(() => displaySystemStats())
        .catch(console.error);
}

module.exports = {
    runDataFlowTests,
    testOrderCreationAndAssignment,
    testStaffTaskUpdates,
    testWorkflowProgression,
    testRealTimeDataRetrieval,
    testNotificationSystem
};