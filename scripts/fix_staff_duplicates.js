#!/usr/bin/env node
/**
 * Migration script: find case-insensitive duplicate staffId values,
 * rename duplicates to unique values and update references.
 * Uses the project's `database.js` to reuse existing models and connection.
 */
const path = require('path');
const { connectDB, Staff, Order } = require('../database');

async function run() {
  await connectDB();
  console.log('Connected to DB for duplicate staffId fix');

  // Dry-run by default. Pass --apply to actually perform renames.
  const APPLY = process.argv.includes('--apply');
  if (!APPLY) console.log('Running in dry-run mode. No database writes will be performed. Use --apply to execute changes.');

  // Load all staff
  const all = await Staff.find().lean();
  console.log(`Loaded ${all.length} staff records`);

  // Group by lowercase staffId
  const groups = {};
  for (const s of all) {
    const key = (s.staffId || '').toString().toLowerCase();
    if (!key) continue;
    groups[key] = groups[key] || [];
    groups[key].push(s);
  }

  const duplicates = Object.values(groups).filter(g => g.length > 1);
  if (duplicates.length === 0) {
    console.log('No case-insensitive duplicates found. Nothing to do.');
    process.exit(0);
  }

  console.log(`Found ${duplicates.length} duplicate staffId groups`);
  const changes = [];

  // Build a set of existing staffIds (case-insensitive)
  const existingLower = new Set(all.map(s => (s.staffId||'').toString().toLowerCase()));

  // Helper to find next available staff_### if pattern exists
  function nextStaffNumber(existingLowerSet) {
    // collect numbers used by staff_### pattern
    const nums = new Set();
    for (const id of existingLowerSet) {
      const m = id.match(/^staff_(\d{3,})$/i);
      if (m) nums.add(parseInt(m[1], 10));
    }
    let n = 1;
    while (nums.has(n)) n++;
    return n;
  }

  for (const group of duplicates) {
    // Sort group so we pick canonical: prefer exact lowercase match first, or earliest created (if available)
    group.sort((a,b) => (a._id.toString()).localeCompare(b._id.toString()));
    const canonical = group[0];
    const others = group.slice(1);

    console.log(`Processing group for staffId base='${canonical.staffId}' -> ${group.length} records`);

    for (const dup of others) {
      const original = dup.staffId || '';
      let newId = null;

      // If canonical follows staff_### pattern, try to generate staff_### for duplicates too
      const canMatch = (canonical.staffId || '').toString().match(/^staff_(\d{3,})$/i);
      if (canMatch) {
        // find next available numeric id
        let num = nextStaffNumber(existingLower);
        const pad = (n) => n.toString().padStart(3,'0');
        newId = `staff_${pad(num)}`;
        // reserve it
        existingLower.add(newId.toLowerCase());
      } else {
        // Generic: append incremental suffix `_1`, `_2` until unique
        let suffix = 1;
        const base = (original || 'staff').replace(/[^a-z0-9_-]/ig, '').toLowerCase() || 'staff';
        while (true) {
          const candidate = `${base}_${suffix}`;
          if (!existingLower.has(candidate.toLowerCase())) {
            newId = candidate;
            existingLower.add(candidate.toLowerCase());
            break;
          }
          suffix++;
        }
      }

      if (!newId) {
        console.warn('Could not compute newId for', dup._id, dup.staffId);
        continue;
      }

      // Prepare DB updates: update Staff.staffId and any Orders referencing this staffId
      const oldIdRegex = new RegExp('^' + original.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&') + '$', 'i');
      const orderFilter = {
        $or: [
          { 'workflowTasks.assignedTo': { $regex: oldIdRegex } },
          { 'assignedStaff': { $regex: oldIdRegex } }
        ]
      };

      const orders = await Order.find(orderFilter).lean();

      if (APPLY) {
        const updated = await Staff.findByIdAndUpdate(dup._id, { staffId: newId }, { new: true });
        if (!updated) {
          console.warn('Failed to update staff id for', dup._id);
          continue;
        }

        for (const ord of orders) {
          let modified = false;
          if (Array.isArray(ord.workflowTasks)) {
            const tasks = ord.workflowTasks.map(t => {
              if (t.assignedTo && typeof t.assignedTo === 'string' && t.assignedTo.match(oldIdRegex)) {
                modified = true;
                return Object.assign({}, t, { assignedTo: newId });
              }
              return t;
            });
            if (modified) {
              await Order.updateOne({ _id: ord._id }, { $set: { 'workflowTasks': tasks } });
            }
          }
          // also update assignedStaff field if present
          if (!modified && ord.assignedStaff && typeof ord.assignedStaff === 'string' && ord.assignedStaff.match(oldIdRegex)) {
            await Order.updateOne({ _id: ord._id }, { $set: { assignedStaff: newId } });
            modified = true;
          }
        }

        changes.push({ _id: dup._id.toString(), from: original, to: newId, ordersUpdated: orders.length });
        console.log(`Renamed ${original} -> ${newId} (orders updated: ${orders.length})`);
      } else {
        // Dry-run: report what would be changed
        changes.push({ _id: dup._id.toString(), from: original, to: newId, ordersMatched: orders.length });
        console.log(`[DRY-RUN] Would rename ${original} -> ${newId} (orders matched: ${orders.length})`);
      }
    }
  }

  // Summary report
  console.log('\nMigration completed. Summary:');
  console.log(`Total groups processed: ${duplicates.length}`);
  console.log(`Total renames applied: ${changes.length}`);
  if (changes.length > 0) {
    console.log('Changes:');
    for (const c of changes) console.log(JSON.stringify(c));
  }

  process.exit(0);
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
