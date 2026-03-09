/**
 * Staff Deduplication & Cleanup Script
 * Removes duplicate staff entries and unused roles
 * 
 * Run: node scripts/cleanup-duplicate-staff.js
 */

const path = require('path');
const db = require(path.join(__dirname, '..', 'database'));
const { Staff, Branch } = db;

const ROLES_TO_REMOVE = ['measuring', 'designing', 'designer', 'design_person'];
const VALID_ROLES = [
  'dyeing', 'cutting', 'stitching', 'khakha', 'maggam', 
  'painting', 'finishing', 'quality_check', 'delivery'
];

(async function cleanup() {
  try {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║         Staff Deduplication & Cleanup Utility              ║
╚════════════════════════════════════════════════════════════╝
    `);

    // Check if MongoDB is available
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      console.log('⚠️ MongoDB not connected - cannot run cleanup');
      console.log('Start MongoDB and try again');
      process.exit(0);
    }

    // Step 1: Remove staff with invalid roles
    console.log('📋 Step 1: Removing staff with invalid roles...');
    const invalidStaff = await Staff.find({ role: { $in: ROLES_TO_REMOVE } });
    if (invalidStaff.length > 0) {
      const result = await Staff.deleteMany({ role: { $in: ROLES_TO_REMOVE } });
      console.log(`   ✅ Removed ${result.deletedCount} staff with invalid roles`);
      invalidStaff.forEach(s => {
        console.log(`      - ${s.staffId}: ${s.name} (role: ${s.role})`);
      });
    } else {
      console.log('   ✅ No invalid roles found');
    }

    // Step 2: Find and remove exact duplicates (same staffId)
    console.log('\n📋 Step 2: Removing exact duplicate staffId entries...');
    const allStaff = await Staff.find().lean();
    const staffByBranch = {};
    let duplicatesRemoved = 0;

    for (const staff of allStaff) {
      const key = `${staff.branch || 'main'}|${staff.role}`;
      if (!staffByBranch[key]) {
        staffByBranch[key] = [];
      }
      staffByBranch[key].push(staff);
    }

    // For each role per branch, keep only ONE staff
    for (const [key, staffList] of Object.entries(staffByBranch)) {
      if (staffList.length > 1) {
        // Keep the first (earliest created), remove rest
        const toKeep = staffList[0];
        const toRemove = staffList.slice(1);
        
        console.log(`\n   Role: ${key}`);
        console.log(`   ✅ Keeping: ${toKeep.staffId} - ${toKeep.name}`);
        
        for (const dup of toRemove) {
          await Staff.findByIdAndDelete(dup._id);
          console.log(`   🗑️ Removed: ${dup.staffId} - ${dup.name}`);
          duplicatesRemoved++;
        }
      }
    }
    
    if (duplicatesRemoved === 0) {
      console.log('   ✅ No duplicates found');
    } else {
      console.log(`\n   Total duplicates removed: ${duplicatesRemoved}`);
    }

    // Step 3: Verify final state
    console.log('\n📋 Step 3: Final Staff Verification...');
    const finalStaff = await Staff.find().lean();
    const staffPerBranch = {};
    
    for (const staff of finalStaff) {
      const branch = staff.branch || 'unknown';
      if (!staffPerBranch[branch]) {
        staffPerBranch[branch] = {};
      }
      if (!staffPerBranch[branch][staff.role]) {
        staffPerBranch[branch][staff.role] = [];
      }
      staffPerBranch[branch][staff.role].push(staff);
    }

    for (const [branch, roles] of Object.entries(staffPerBranch)) {
      console.log(`\n   Branch: ${branch}`);
      for (const [role, staff] of Object.entries(roles)) {
        if (staff.length > 1) {
          console.log(`   ⚠️ ${role}: ${staff.length} staff (should be 1)`);
        } else {
          console.log(`   ✅ ${role}: ${staff[0].staffId} - ${staff[0].name}`);
        }
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Cleanup Complete!`);
    console.log(`   Total staff: ${finalStaff.length}`);
    console.log(`   Branches: ${Object.keys(staffPerBranch).length}`);
    console.log(`${'='.repeat(60)}\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    process.exit(1);
  }
})();
