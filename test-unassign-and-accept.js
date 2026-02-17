const mongoose = require('mongoose');
const axios = require('axios');

const MONGO = process.env.MONGO_URI || 'mongodb://localhost:27017/sapthala_boutique';

async function run(){
  console.log('Connecting to Mongo...');
  await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to Mongo');

  const orderSchema = new mongoose.Schema({}, { strict: false });
  let Order;
  try{ Order = mongoose.model('Order'); } catch(e){ Order = mongoose.model('Order', orderSchema, 'orders'); }
  console.log('Order model ready');

  const order = await Order.findOne({ 'workflowTasks.stageId': 'khakha', 'workflowTasks.assignedTo': { $ne: null } });
  console.log('Query result retrieved');
  if(!order){
    console.log('No assigned khakha tasks found');
    process.exit(0);
  }
  const task = order.workflowTasks.find(t => t.stageId === 'khakha' && t.assignedTo);
  console.log('Found assigned khakha task in order', order.orderId);
  task.assignedTo = null;
  task.status = 'pending';
  await order.save();
  console.log('Unassigned task saved. Now calling accept endpoint...');

  const res = await axios.post('http://localhost:3000/api/staff/staff_005/accept-task', { orderId: order.orderId, stageId: 'khakha' }, { timeout: 5000 });
  console.log('Accept response status:', res.status);
  console.log('Accept response data:', res.data);
  process.exit(0);
}

run().catch(err=>{console.error(err); process.exit(1);});