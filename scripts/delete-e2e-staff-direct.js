const { connectDB, Staff } = require('../database');

async function run() {
  await connectDB();
  const toDelete = await Staff.find({ $or: [ { name: /E2E/i }, { staffId: /staff_e2e/i } ] });
  if (!toDelete.length) {
    console.log('No E2E staff found');
    process.exit(0);
  }
  for (const s of toDelete) {
    console.log('Deleting', s._id, s.staffId, s.name);
    await Staff.findByIdAndDelete(s._id);
  }
  console.log('Done');
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });