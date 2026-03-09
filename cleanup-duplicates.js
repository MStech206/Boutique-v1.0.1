const mongoose = require('mongoose');
const { Staff, Branch, connectDB } = require('./database');

async function cleanupDuplicates() {
  try {
    await connectDB();
    console.log('🧹 Starting cleanup of duplicates...');

    // Remove duplicate branches - keep only unique branchIds
    const branches = await Branch.find();
    const seenBranches = new Set();
    let branchesRemoved = 0;

    for (const branch of branches) {
      if (seenBranches.has(branch.branchId)) {
        await Branch.deleteOne({ _id: branch._id });
        branchesRemoved++;
        console.log(`❌ Removed duplicate branch: ${branch.branchId}`);
      } else {
        seenBranches.add(branch.branchId);
      }
    }

    // Remove duplicate staff - keep only unique staffIds
    const staff = await Staff.find();
    const seenStaff = new Set();
    let staffRemoved = 0;

    for (const member of staff) {
      if (seenStaff.has(member.staffId)) {
        await Staff.deleteOne({ _id: member._id });
        staffRemoved++;
        console.log(`❌ Removed duplicate staff: ${member.staffId}`);
      } else {
        seenStaff.add(member.staffId);
      }
    }

    console.log(`\n✅ Cleanup complete!`);
    console.log(`   Branches removed: ${branchesRemoved}`);
    console.log(`   Staff removed: ${staffRemoved}`);
    console.log(`   Unique branches: ${seenBranches.size}`);
    console.log(`   Unique staff: ${seenStaff.size}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Cleanup error:', error);
    process.exit(1);
  }
}

cleanupDuplicates();
