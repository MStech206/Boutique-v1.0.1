#!/usr/bin/env node

/**
 * FIX: Normalize all role comparisons to lowercase
 * Ensures super-admin, admin, sub-admin roles work regardless of case
 */

const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, 'server.js');
let content = fs.readFileSync(serverPath, 'utf8');

const originalLength = content.length;
let replacements = 0;

// Pattern 1: if (req.user.role !== 'admin')
// Only replace in contexts where we're checking req.user (not destructured body.role)
const patterns = [
  {
    pattern: /if \(req\.user\.role !== 'admin'\) \{/g,
    replacement: "const userRole = (req.user && (req.user.role || '')).toLowerCase();\n    if (userRole !== 'admin') {",
    description: "Admin-only checks (multi-line)"
  },
  {
    pattern: /if \(req\.user\.role !== 'admin'\) return res\.status\(403\)/g,
    replacement: "const userRole = (req.user && (req.user.role || '')).toLowerCase();\n    if (userRole !== 'admin') return res.status(403)",
    description: "Admin-only checks (single-line)"
  },
  {
    pattern: /if \(req\.user\.role === 'sub-admin'\) \{/g,
    replacement: "const userRole = (req.user && (req.user.role || '')).toLowerCase();\n    if (userRole === 'sub-admin') {",
    description: "Sub-admin checks"
  },
  {
    pattern: /if \(req\.user\.role === 'admin'\) \{/g,
    replacement: "const userRole = (req.user && (req.user.role || '')).toLowerCase();\n    if (userRole === 'admin') {",
    description: "Admin equality checks"
  },
  {
    pattern: /if \(req\.user\.role === 'sub-admin' \|\| req\.user\.role === 'admin'\) \{/g,
    replacement: "const userRole = (req.user && (req.user.role || '')).toLowerCase();\n    if (userRole === 'sub-admin' || userRole === 'admin') {",
    description: "Admin or sub-admin checks"
  },
  {
    pattern: /if \(req\.user\.role !== 'admin' && req\.user\.role !== 'sub-admin'\) \{/g,
    replacement: "const userRole = (req.user && (req.user.role || '')).toLowerCase();\n    if (userRole !== 'admin' && userRole !== 'sub-admin') {",
    description: "Not admin and not sub-admin checks"
  }
];

console.log('🔧 Fixing role normalization in server.js...\n');

patterns.forEach(({ pattern, replacement, description }) => {
  const matches = content.match(pattern);
  if (matches) {
    console.log(`✅ Found ${matches.length} occurrence(s) - ${description}`);
    content = content.replace(pattern, replacement);
    replacements += matches.length;
  }
});

if (replacements > 0) {
  fs.writeFileSync(serverPath, content, 'utf8');
  console.log(`\n✅ FIXED: Applied ${replacements} replacements`);
  console.log(`📊 Size: ${originalLength} → ${content.length} bytes`);
  console.log('✅ server.js updated successfully\n');
  process.exit(0);
} else {
  console.log('\n✅ No additional replacements needed\n');
  process.exit(0);
}
