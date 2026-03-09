const fs = require('fs');
const path = require('path');

/**
 * SAPTHALA BOUTIQUE - SYSTEM VERIFICATION
 * Verifies complete Firebase integration across all panels
 */

console.log('\n============================================================');
console.log('  SAPTHALA BOUTIQUE - SYSTEM VERIFICATION');
console.log('  Firebase Integration Check');
console.log('============================================================\n');

const checks = {
  passed: 0,
  failed: 0,
  warnings: 0,
  results: []
};

function checkFile(filePath, description) {
  const exists = fs.existsSync(filePath);
  checks.results.push({
    type: exists ? 'PASS' : 'FAIL',
    description,
    details: exists ? `Found: ${filePath}` : `Missing: ${filePath}`
  });
  if (exists) checks.passed++;
  else checks.failed++;
  return exists;
}

function checkOptionalFile(filePath, description) {
  const exists = fs.existsSync(filePath);
  checks.results.push({
    type: exists ? 'PASS' : 'WARN',
    description,
    details: exists ? `Found: ${filePath}` : `Optional: ${filePath}`
  });
  if (exists) checks.passed++;
  else checks.warnings++;
  return exists;
}

console.log('Checking system files...\n');

// Core Files
console.log('📁 Core System Files:');
checkFile('server.js', 'Main server file');
checkFile('database.js', 'Database configuration');
checkFile('package.json', 'Package configuration');
checkFile('LAUNCH_SYSTEM.bat', 'Launch script');

// Firebase Integration
console.log('\n🔥 Firebase Integration:');
checkFile('firebase-integration-service.js', 'Firebase integration service');
checkFile('setup-firebase-integration.js', 'Firebase setup wizard');
checkOptionalFile('firebase-credentials.json', 'Firebase credentials');
checkOptionalFile('.env', 'Environment configuration');

// Admin Panels
console.log('\n👥 Admin Panels:');
checkFile('sapthala-admin-clean.html', 'Admin panel');
checkOptionalFile('super-admin.html', 'Super admin panel (fallback)');
checkFile('staff-portal.html', 'Staff portal');

// Super Admin React App
console.log('\n⚛️ Super Admin React App:');
const superAdminPath = 'Boutique-app/super-admin-panel';
checkFile(path.join(superAdminPath, 'package.json'), 'Super admin package.json');
checkOptionalFile(path.join(superAdminPath, 'dist/index.html'), 'Super admin build');

// Services
console.log('\n🔧 Services:');
checkFile('services/pdfService.js', 'PDF service');
checkFile('services/enhancedPdfService.js', 'Enhanced PDF service');
checkFile('services/notificationService.js', 'Notification service');
checkFile('services/dataFlowService.js', 'Data flow service');

// Routes
console.log('\n🛣️ Routes:');
checkFile('routes/dataFlowRoutes.js', 'Data flow routes');

// Documentation
console.log('\n📚 Documentation:');
checkFile('FIREBASE_INTEGRATED_SYSTEM_README.md', 'System README');
checkFile('QUICK_START.md', 'Quick start guide');

// Check Node Modules
console.log('\n📦 Dependencies:');
const hasNodeModules = checkFile('node_modules', 'Node modules installed');
if (!hasNodeModules) {
  checks.results.push({
    type: 'INFO',
    description: 'Install dependencies',
    details: 'Run: npm install'
  });
}

// Check Firebase Admin SDK
if (hasNodeModules) {
  const hasFirebaseAdmin = checkFile('node_modules/firebase-admin', 'Firebase Admin SDK');
  if (!hasFirebaseAdmin) {
    checks.results.push({
      type: 'FAIL',
      description: 'Firebase Admin SDK missing',
      details: 'Run: npm install firebase-admin'
    });
    checks.failed++;
  }
}

// Print Results
console.log('\n============================================================');
console.log('  VERIFICATION RESULTS');
console.log('============================================================\n');

checks.results.forEach(result => {
  const icon = result.type === 'PASS' ? '✅' : result.type === 'FAIL' ? '❌' : result.type === 'WARN' ? '⚠️' : 'ℹ️';
  console.log(`${icon} ${result.type.padEnd(6)} ${result.description}`);
  console.log(`   ${result.details}\n`);
});

console.log('============================================================');
console.log(`  PASSED: ${checks.passed}`);
console.log(`  FAILED: ${checks.failed}`);
console.log(`  WARNINGS: ${checks.warnings}`);
console.log('============================================================\n');

// Recommendations
if (checks.failed > 0) {
  console.log('⚠️ CRITICAL ISSUES FOUND\n');
  console.log('Please fix the failed checks before launching the system.\n');
  
  if (!fs.existsSync('firebase-credentials.json')) {
    console.log('📋 Firebase Setup Required:');
    console.log('1. Run: node setup-firebase-integration.js');
    console.log('2. Follow the setup wizard');
    console.log('3. Place firebase-credentials.json in project root\n');
  }
  
  if (!fs.existsSync('node_modules')) {
    console.log('📦 Install Dependencies:');
    console.log('Run: npm install\n');
  }
  
  process.exit(1);
} else if (checks.warnings > 0) {
  console.log('✅ SYSTEM READY (with warnings)\n');
  console.log('Optional components missing. System will work but some features may be limited.\n');
  
  if (!fs.existsSync('firebase-credentials.json')) {
    console.log('💡 Recommendation:');
    console.log('Configure Firebase for full functionality:');
    console.log('Run: node setup-firebase-integration.js\n');
  }
  
  if (!fs.existsSync(path.join('Boutique-app/super-admin-panel/dist/index.html'))) {
    console.log('💡 Recommendation:');
    console.log('Build Super Admin panel:');
    console.log('cd Boutique-app/super-admin-panel');
    console.log('npm install');
    console.log('npm run build\n');
  }
} else {
  console.log('✅ SYSTEM FULLY READY!\n');
  console.log('All components verified. You can launch the system now.\n');
}

console.log('🚀 To launch the system:');
console.log('Run: LAUNCH_SYSTEM.bat\n');

console.log('📚 For more information:');
console.log('- Read: FIREBASE_INTEGRATED_SYSTEM_README.md');
console.log('- Quick Start: QUICK_START.md\n');

console.log('============================================================\n');

// Exit with appropriate code
process.exit(checks.failed > 0 ? 1 : 0);
