const express = require('express');
const { Order, Staff, Settings } = require('../database');
const firebaseIntegrationService = require('../firebase-integration-service');

const router = express.Router();

// Workflow stages configuration with Khakha
const WORKFLOW_STAGES = [
  { id: 'dyeing', name: 'Dyeing', icon: '🎨', order: 1, requiredSkills: ['dyeing'], estimatedDuration: 120 },
  { id: 'cutting', name: 'Cutting', icon: '✂️', order: 2, requiredSkills: ['cutting'], estimatedDuration: 90 },
  { id: 'stitching', name: 'Stitching', icon: '🧵', order: 3, requiredSkills: ['stitching'], estimatedDuration: 180 },
  { id: 'khakha', name: 'Khakha', icon: '🔧', order: 4, requiredSkills: ['khakha'], estimatedDuration: 60 },
  { id: 'maggam', name: 'Maggam Work', icon: '🪡', order: 5, requiredSkills: ['maggam'], estimatedDuration: 240 },
  { id: 'painting', name: 'Painting', icon: '🖌️', order: 6, requiredSkills: ['painting'], estimatedDuration: 120 },
  { id: 'finishing', name: 'Finishing', icon: '✨', order: 7, requiredSkills: ['finishing'], estimatedDuration: 60 },
  { id: 'quality-check', name: 'Quality Check', icon: '🔍', order: 8, requiredSkills: ['quality'], estimatedDuration: 30 },
  { id: 'ready-to-deliver', name: 'Ready to Deliver', icon: '🚚', order: 9, requiredSkills: ['delivery'], estimatedDuration: 15 }
];

// Get workflow stages
router.get('/stages', (req, res) => {
  res.json(WORKFLOW_STAGES);
});

// Validate stage order
function validateStageOrder(order, targetStageId) {
  const tasks = order.workflowTasks || [];
  const targetIdx = tasks.findIndex(t => t.stageId === targetStageId);
  if (targetIdx === -1) return { valid: false, error: 'Stage not found' };
  
  for (let i = 0; i < targetIdx; i++) {
    if (tasks[i].status !== 'completed') {
      return { 
        valid: false, 
        error: `Cannot proceed. Previous stage ${tasks[i].stageName} must be completed first.`
      };
    }
  }
  return { valid: true };
}

// Get available tasks for a staff member (Firestore)
router.get('/tasks/available/:staffId', async (req, res) => {
  try {
    const { staffId } = req.params;
    
    if (!firebaseIntegrationService.initialized) {
      return res.status(503).json({ error: 'Firebase not initialized' });
    }

    const fbStaff = await firebaseIntegrationService.getCollection('staff', {
      where: [['staffId', '==', staffId]],
      limit: 1
    });
    
    if (!fbStaff.success || !fbStaff.data || fbStaff.data.length === 0) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    const staff = fbStaff.data[0];
    const fbOrders = await firebaseIntegrationService.getCollection('orders', {
      where: [['status', 'in', ['pending', 'in_progress']]],
      limit: 500
    });

    const orders = fbOrders.success ? fbOrders.data : [];
    const availableTasks = [];
    
    for (const order of orders) {
      const tasks = order.workflowTasks || [];
      for (const task of tasks) {
        if (task.status === 'pending' && !task.assignedTo) {
          const stage = WORKFLOW_STAGES.find(s => s.id === task.stageId);
          if (stage && staff.workflowStages && staff.workflowStages.includes(task.stageId)) {
            availableTasks.push({
              id: `${order.orderId}-${task.stageId}`,
              orderId: order.orderId,
              stageId: task.stageId,
              stageName: stage.name,
              stageIcon: stage.icon,
              status: task.status,
              orderDetails: {
                customerName: order.customerName,
                garmentType: order.garmentType,
                deliveryDate: order.deliveryDate
              }
            });
          }
        }
      }
    }

    res.json(availableTasks);
  } catch (error) {
    console.error('Error getting available tasks:', error);
    res.status(500).json({ error: 'Failed to get available tasks' });
  }
});

// Get assigned tasks for a staff member (Firestore)
router.get('/tasks/my/:staffId', async (req, res) => {
  try {
    const { staffId } = req.params;
    
    if (!firebaseIntegrationService.initialized) {
      return res.status(503).json({ error: 'Firebase not initialized' });
    }

    const fbOrders = await firebaseIntegrationService.getCollection('orders', { limit: 1000 });
    const orders = fbOrders.success ? fbOrders.data : [];
    const myTasks = [];
    
    for (const order of orders) {
      const tasks = order.workflowTasks || [];
      for (const task of tasks) {
        if (task.assignedTo === staffId) {
          const stage = WORKFLOW_STAGES.find(s => s.id === task.stageId);
          if (stage) {
            myTasks.push({
              id: `${order.orderId}-${task.stageId}`,
              orderId: order.orderId,
              stageId: task.stageId,
              stageName: stage.name,
              stageIcon: stage.icon,
              status: task.status,
              startedAt: task.startedAt,
              completedAt: task.completedAt,
              orderDetails: {
                customerName: order.customerName,
                garmentType: order.garmentType,
                deliveryDate: order.deliveryDate
              }
            });
          }
        }
      }
    }

    res.json(myTasks);
  } catch (error) {
    console.error('Error getting my tasks:', error);
    res.status(500).json({ error: 'Failed to get my tasks' });
  }
});

// Accept a task (Firestore)
router.post('/tasks/:taskId/accept', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { staffId } = req.body;
    
    if (!firebaseIntegrationService.initialized) {
      return res.status(503).json({ error: 'Firebase not initialized' });
    }

    const dashIndex = taskId.indexOf('-');
const orderId = taskId.substring(0, dashIndex);
const stageId = taskId.substring(dashIndex + 1);
    
    const fbOrder = await firebaseIntegrationService.getCollection('orders', {
      where: [['orderId', '==', orderId]],
      limit: 1
    });
    
    if (!fbOrder.success || !fbOrder.data || fbOrder.data.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = fbOrder.data[0];
    const taskIndex = order.workflowTasks.findIndex(t => t.stageId === stageId);
    
    if (taskIndex === -1) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const fbStaff = await firebaseIntegrationService.getCollection('staff', {
      where: [['staffId', '==', staffId]],
      limit: 1
    });
    
    if (!fbStaff.success || !fbStaff.data || fbStaff.data.length === 0) {
      return res.status(404).json({ error: 'Staff not found' });
    }

    const staff = fbStaff.data[0];
    
    order.workflowTasks[taskIndex].assignedTo = staffId;
    order.workflowTasks[taskIndex].assignedToName = staff.name;
    order.workflowTasks[taskIndex].status = 'assigned';
    order.workflowTasks[taskIndex].updatedAt = new Date();

    await firebaseIntegrationService.setDocument('orders', order.id, order);
    
    const newCount = (staff.currentTaskCount || 0) + 1;
    await firebaseIntegrationService.setDocument('staff', staff.id, { currentTaskCount: newCount });

    res.json({ success: true, message: 'Task accepted successfully' });
  } catch (error) {
    console.error('Error accepting task:', error);
    res.status(500).json({ error: 'Failed to accept task' });
  }
});

// Complete a task (Firestore with validation)
router.post('/tasks/:taskId/complete', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { staffId, notes } = req.body;
    
    if (!firebaseIntegrationService.initialized) {
      return res.status(503).json({ error: 'Firebase not initialized' });
    }

const dashIndex = taskId.indexOf('-', taskId.indexOf('-') + 1); // find second dash
const orderId = taskId.substring(0, dashIndex);   
const stageId = taskId.substring(dashIndex + 1);
    
    const fbOrder = await firebaseIntegrationService.getCollection('orders', {
      where: [['orderId', '==', orderId]],
      limit: 1
    });
    
    if (!fbOrder.success || !fbOrder.data || fbOrder.data.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = fbOrder.data[0];
    
    // Validate stage order
    const validation = validateStageOrder(order, stageId);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const taskIndex = order.workflowTasks.findIndex(t => t.stageId === stageId);
    if (taskIndex === -1) {
      return res.status(404).json({ error: 'Task not found' });
    }

    order.workflowTasks[taskIndex].status = 'completed';
    order.workflowTasks[taskIndex].completedAt = new Date();
    order.workflowTasks[taskIndex].updatedAt = new Date();
    if (notes) order.workflowTasks[taskIndex].notes = notes;

    // Progress to next stage
    const currentStage = WORKFLOW_STAGES.find(s => s.id === stageId);
    const nextStage = WORKFLOW_STAGES.find(s => s.order === currentStage.order + 1);
    
    if (nextStage) {
      const nextTaskIdx = order.workflowTasks.findIndex(t => t.stageId === nextStage.id);
      if (nextTaskIdx !== -1) {
        order.workflowTasks[nextTaskIdx].status = 'pending';
        order.workflowTasks[nextTaskIdx].updatedAt = new Date();
        
        order.currentStage = nextStage.id; 
        if (order.status === 'pending') {
        order.status = 'in_progress';    
}
      }

    } else {
      order.status = 'completed';
    }

    await firebaseIntegrationService.setDocument('orders', order.id, order);

    // Decrement staff task count
    const fbStaff = await firebaseIntegrationService.getCollection('staff', {
      where: [['staffId', '==', staffId]],
      limit: 1
    });
    
    if (fbStaff.success && fbStaff.data && fbStaff.data.length > 0) {
      const staff = fbStaff.data[0];
      const newCount = Math.max(0, (staff.currentTaskCount || 0) - 1);
      await firebaseIntegrationService.setDocument('staff', staff.id, { currentTaskCount: newCount });
    }

    res.json({ success: true, message: 'Task completed successfully' });
  } catch (error) {
    console.error('Error completing task:', error);
    res.status(500).json({ error: 'Failed to complete task' });
  }
});

module.exports = router;
