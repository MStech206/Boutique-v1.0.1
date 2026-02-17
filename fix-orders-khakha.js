#!/usr/bin/env node

/**
 * Fix Script: Add Khakha Stage to Default Orders
 * 
 * Problem: Orders are created without 'khakha' stage,
 * so staff_005 (Vikram Singh) has no tasks
 * 
 * Solution: Create sample orders WITH khakha stage included
 */

const mongoose = require('mongoose');
const path = require('path');

// Import models
const { connectDB, Order, Staff, Settings, Customer } = require('./database');

async function fixOrders() {
  try {
    console.log('🔧 FIXING ORDER WORKFLOW - Adding Khakha Stage\n');
    
    await connectDB();
    console.log('✅ MongoDB connected\n');
    
    // Get workflow stages from settings
    const settings = await Settings.findOne();
    if (!settings) {
      console.error('❌ Settings not found!');
      process.exit(1);
    }
    
    console.log('📋 Available Workflow Stages:');
    settings.workflowStages.forEach(s => {
      console.log(`   - ${s.name} (${s.id})`);
    });
    
    // Get all staff members for reference
    const allStaff = await Staff.find({});
    console.log(`\n👥 Staff Members: ${allStaff.length}`);
    allStaff.forEach(s => {
      console.log(`   - ${s.name} (${s.staffId}): ${s.workflowStages.join(', ')}`);
    });
    
    // Create sample orders WITH khakha stage
    const khakhaStaff = allStaff.find(s => s.workflowStages.includes('khakha'));
    
    if (!khakhaStaff) {
      console.error('❌ No staff found for khakha stage!');
      process.exit(1);
    }
    
    console.log(`\n✅ Khakha Staff Found: ${khakhaStaff.name} (${khakhaStaff.staffId})\n`);
    
    // Create 3 sample orders with FULL workflow including khakha
    const sampleOrders = [
      {
        customerName: 'Rajesh Kumar',
        customerPhone: '9111111111',
        customerAddress: 'Mumbai, India',
        garmentType: 'Saree',
        color: 'Red',
        fabric: 'Silk',
        measurements: {
          bust: 36,
          waist: 30,
          length: 600,
          width: 120
        },
        totalAmount: 8000,
        advanceAmount: 4000
      },
      {
        customerName: 'Priya Patel',
        customerPhone: '9222222222',
        customerAddress: 'Delhi, India',
        garmentType: 'Lehenga',
        color: 'Green',
        fabric: 'Georgette',
        measurements: {
          bust: 34,
          waist: 28,
          length: 900,
          width: 150
        },
        totalAmount: 12000,
        advanceAmount: 6000
      },
      {
        customerName: 'Sneha Desai',
        customerPhone: '9333333333',
        customerAddress: 'Bangalore, India',
        garmentType: 'Bridal Saree',
        color: 'Gold',
        fabric: 'Banarasi Silk',
        measurements: {
          bust: 38,
          waist: 32,
          length: 600,
          width: 130
        },
        totalAmount: 15000,
        advanceAmount: 7500
      }
    ];
    
    // Workflow stages with KHAKHA included
    const workflowWithKhakha = [
      'measurements-design',
      'dyeing',
      'cutting',
      'stitching',
      'khakha',  // ← KHAKHA STAGE INCLUDED!
      'maggam',
      'finishing',
      'quality-check',
      'ready-to-deliver'
    ];
    
    console.log(`📝 Creating ${sampleOrders.length} sample orders with workflow:\n`);
    workflowWithKhakha.forEach((stageId, i) => {
      const stage = settings.workflowStages.find(s => s.id === stageId);
      console.log(`   ${i + 1}. ${stage ? stage.name : '?'} (${stageId})`);
    });
    console.log();
    
    // Delete existing orders
    const deletedCount = await Order.deleteMany({});
    console.log(`🗑️  Deleted ${deletedCount.deletedCount} existing orders\n`);
    
    // Create new orders with khakha stage
    for (let i = 0; i < sampleOrders.length; i++) {
      const sampleOrder = sampleOrders[i];
      const orderId = `ORD-${Date.now()}-${i + 1}`;
      
      console.log(`📦 Creating Order ${i + 1}: ${orderId}`);
      console.log(`   Customer: ${sampleOrder.customerName}`);
      console.log(`   Garment: ${sampleOrder.garmentType}`);
      
      // Create workflow tasks
      const workflowTasks = workflowWithKhakha.map((stageId, index) => {
        const stageConfig = settings.workflowStages.find(s => s.id === stageId);
        
        return {
          stageId: stageConfig.id,
          stageName: stageConfig.name,
          stageIcon: stageConfig.icon,
          status: index === 0 ? 'pending' : 'waiting', // First task is pending
          createdAt: new Date(),
          updatedAt: new Date()
        };
      });
      
      // Auto-assign first task (measurements-design) to staff_001
      const firstStaff = allStaff.find(s => s.workflowStages.includes('measurements-design'));
      if (firstStaff && workflowTasks.length > 0) {
        workflowTasks[0].status = 'assigned';
        workflowTasks[0].assignedTo = firstStaff._id;
        workflowTasks[0].assignedToName = firstStaff.name;
        firstStaff.currentTaskCount += 1;
        await firstStaff.save();
        console.log(`   ✅ Assigned 1st task to: ${firstStaff.name}`);
      }
      
      // Auto-assign khakha task to khakhaStaff
      const khakhaTaskIndex = workflowTasks.findIndex(t => t.stageId === 'khakha');
      if (khakhaTaskIndex >= 0) {
        workflowTasks[khakhaTaskIndex].status = 'pending';
        workflowTasks[khakhaTaskIndex].assignedTo = khakhaStaff._id;
        workflowTasks[khakhaTaskIndex].assignedToName = khakhaStaff.name;
        khakhaStaff.currentTaskCount += 1;
        console.log(`   ✅ Assigned khakha task to: ${khakhaStaff.name}`);
      }
      
      // Create order
      const order = new Order({
        orderId,
        customerName: sampleOrder.customerName,
        customerPhone: sampleOrder.customerPhone,
        customerAddress: sampleOrder.customerAddress,
        garmentType: sampleOrder.garmentType,
        measurements: sampleOrder.measurements,
        totalAmount: sampleOrder.totalAmount,
        advanceAmount: sampleOrder.advanceAmount,
        balanceAmount: sampleOrder.totalAmount - sampleOrder.advanceAmount,
        status: 'pending',
        currentStage: 'measurements-design',
        deliveryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        workflowTasks
      });
      
      await order.save();
      console.log(`   ✅ Order saved\n`);
      
      // Create/update customer
      await Customer.findOneAndUpdate(
        { phone: sampleOrder.customerPhone },
        {
          $set: {
            name: sampleOrder.customerName,
            phone: sampleOrder.customerPhone,
            address: sampleOrder.customerAddress
          },
          $push: { orders: order._id },
          $inc: { totalOrders: 1, totalSpent: sampleOrder.totalAmount }
        },
        { upsert: true, new: true }
      );
    }
    
    // Save staff updates
    await Staff.bulkWrite(
      allStaff.map(staff => ({
        updateOne: {
          filter: { staffId: staff.staffId },
          update: { $set: { currentTaskCount: staff.currentTaskCount } }
        }
      }))
    );
    
    // Verify the fix
    console.log('\n✅ VERIFICATION: Checking khakha tasks\n');
    
    const orders = await Order.find({});
    console.log(`📊 Total Orders: ${orders.length}`);
    
    let khakhaTasks = 0;
    let ordersWithKhakha = 0;
    
    orders.forEach(order => {
      const khakhaTask = order.workflowTasks.find(t => t.stageId === 'khakha');
      if (khakhaTask) {
        ordersWithKhakha++;
        khakhaTasks++;
        console.log(`   ✅ ${order.orderId}: khakha task found (assigned to: ${khakhaTask.assignedToName})`);
      }
    });
    
    console.log(`\n📈 Summary:`);
    console.log(`   Total khakha tasks: ${khakhaTasks}`);
    console.log(`   Orders with khakha: ${ordersWithKhakha}`);
    
    // Check staff tasks
    console.log(`\n👥 Staff Task Counts:`);
    const updatedStaff = await Staff.find({});
    updatedStaff.forEach(s => {
      console.log(`   - ${s.name}: ${s.currentTaskCount} tasks`);
    });
    
    console.log(`\n🎉 FIX COMPLETED SUCCESSFULLY!`);
    console.log(`\n${khakhaStaff.name} (${khakhaStaff.staffId}) now has ${khakhaTasks} khakha task(s)!\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Fix error:', error);
    process.exit(1);
  }
}

// Run fix
fixOrders();
