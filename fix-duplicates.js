const mongoose = require('mongoose');
const { Staff, Branch, connectDB } = require('./database');

async function fixDuplicates() {
  try {
    await connectDB();
    console.log('🔧 Starting comprehensive duplicate fix...\n');

    // Fix duplicate branches
    console.log('📍 Fixing duplicate branches...');
    const allBranches = await Branch.find().sort({ createdAt: 1 });
    const seenBranches = new Map();
    let branchesRemoved = 0;

    for (const branch of allBranches) {
      if (seenBranches.has(branch.branchId)) {
        await Branch.deleteOne({ _id: branch._id });
        branchesRemoved++;
        console.log(`  ❌ Removed duplicate: ${branch.branchId}`);
      } else {
        seenBranches.set(branch.branchId, branch);
        console.log(`  ✅ Kept: ${branch.branchId} - ${branch.branchName}`);
      }
    }

    // Fix duplicate staff
    console.log('\n👥 Fixing duplicate staff...');
    const allStaff = await Staff.find().sort({ createdAt: 1 });
    const seenStaff = new Map();
    let staffRemoved = 0;

    for (const member of allStaff) {
      if (seenStaff.has(member.staffId)) {
        await Staff.deleteOne({ _id: member._id });
        staffRemoved++;
        console.log(`  ❌ Removed duplicate: ${member.staffId} - ${member.name}`);
      } else {
        seenStaff.set(member.staffId, member);
        console.log(`  ✅ Kept: ${member.staffId} - ${member.name} (${member.branch})`);
      }
    }

    console.log('\n📊 Summary:');
    console.log(`  Branches removed: ${branchesRemoved}`);
    console.log(`  Staff removed: ${staffRemoved}`);
    console.log(`  Unique branches: ${seenBranches.size}`);
    console.log(`  Unique staff: ${seenStaff.size}`);

    console.log('\n✅ Duplicate fix completed!');
    console.log('\n💡 Next steps:');
    console.log('  1. Run: node sync-to-firebase.js (to sync to Firebase)');
    console.log('  2. Restart server: node server.js');

    process.exit(0);
  } catch (error) {
    console.error('❌ Fix error:', error);
    process.exit(1);
  }
}

fixDuplicates();
