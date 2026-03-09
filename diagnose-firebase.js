#!/usr/bin/env node

/**
 * FIREBASE DIAGNOSTICS & STATUS CHECK
 * Helps identify and fix connection issues
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n' + '='.repeat(70));
console.log('🔍 FIREBASE CONNECTION DIAGNOSTICS');
console.log('='.repeat(70) + '\n');

let allGood = true;

// ==================== CHECK 1: CREDENTIALS ====================

console.log('📋 CHECK 1: Firebase Credentials');
console.log('-'.repeat(70));

const credentialsPath = path.join(__dirname, 'firebase-credentials.json');
if (fs.existsSync(credentialsPath)) {
    console.log('✅ firebase-credentials.json found');
    try {
        const creds = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
        console.log(`   Project ID: ${creds.project_id}`);
        console.log(`   Client Email: ${creds.client_email}`);
    } catch (e) {
        console.log('❌ Invalid JSON in credentials file');
        allGood = false;
    }
} else {
    console.log('❌ firebase-credentials.json NOT found');
    console.log('   Path: ' + credentialsPath);
    allGood = false;
}

// ==================== CHECK 2: NODE MODULES ====================

console.log('\n📦 CHECK 2: Required Packages');
console.log('-'.repeat(70));

const packages = ['firebase-admin', 'mongoose', 'express', 'cors'];
for (const pkg of packages) {
    try {
        require.resolve(pkg);
        console.log(`✅ ${pkg}`);
    } catch (e) {
        console.log(`❌ ${pkg} - NOT installed`);
        allGood = false;
    }
}

// ==================== CHECK 3: ENVIRONMENT ====================

console.log('\n⚙️  CHECK 3: Environment Configuration');
console.log('-'.repeat(70));

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    console.log('✅ .env file exists');
    const env = fs.readFileSync(envPath, 'utf8');
    const hasFirebase = env.includes('USE_FIREBASE=true') || env.includes('USE_FIREBASE=true');
    if (hasFirebase) {
        console.log('✅ Firebase enabled in .env');
    } else {
        console.log('⚠️  Firebase not enabled in .env');
    }
} else {
    console.log('⚠️  .env file not found (optional)');
}

// ==================== CHECK 4: PORT ====================

console.log('\n🔌 CHECK 4: Port Availability');
console.log('-'.repeat(70));

try {
    const output = execSync('netstat -aon | findstr "127.0.0.1:3000"', { encoding: 'utf8', stdio: 'pipe' });
    if (output.includes('LISTENING')) {
        console.log('⚠️  Port 3000 already in use (server might be running)');
        console.log('   Solution: Run RESTART_SERVER.bat to kill old process');
    }
} catch (e) {
    console.log('✅ Port 3000 is available');
}

// ==================== CHECK 5: DATABASE ====================

console.log('\n🗄️  CHECK 5: Database Connection');
console.log('-'.repeat(70));

try {
    const conn = execSync('netstat -aon | findstr "27017"', { encoding: 'utf8', stdio: 'pipe' });
    if (conn) {
        console.log('✅ MongoDB port 27017 listening');
    } else {
        console.log('⚠️  MongoDB not detected on port 27017');
    }
} catch (e) {
    console.log('⚠️  MongoDB not detected (will use Firebase)');
}

// ==================== CHECK 6: NETWORK ====================

console.log('\n🌐 CHECK 6: Internet Connectivity');
console.log('-'.repeat(70));

try {
    execSync('ping -n 1 firebase.google.com', { stdio: 'pipe' });
    console.log('✅ Can reach firebase.google.com');
} catch (e) {
    console.log('❌ Cannot reach firebase.google.com');
    console.log('   Check: Internet connection, firewall, proxy');
    allGood = false;
}

// ==================== CHECK 7: LOGS ====================

console.log('\n📝 CHECK 7: Server Logs');
console.log('-'.repeat(70));

const logPath = path.join(__dirname, 'server.log');
if (fs.existsSync(logPath)) {
    const logs = fs.readFileSync(logPath, 'utf8').split('\n').slice(-5);
    console.log('Recent log entries:');
    logs.forEach(log => {
        if (log.includes('error') || log.includes('Error')) {
            console.log('  ❌ ' + log);
        } else if (log.includes('✅') || log.includes('connected')) {
            console.log('  ✅ ' + log);
        }
    });
} else {
    console.log('ℹ️  No server logs found (server hasn\'t run yet)');
}

// ==================== SUMMARY ====================

console.log('\n' + '='.repeat(70));
if (allGood) {
    console.log('✅ ALL CHECKS PASSED - SYSTEM READY FOR FIREBASE SETUP');
    console.log('\n🚀 Next Step: Run SETUP_FIREBASE_COMPLETE.bat');
} else {
    console.log('⚠️  SOME ISSUES DETECTED - PLEASE FIX BEFORE PROCEEDING');
    console.log('\n📋 Issues to fix:');
    console.log('   1. Ensure firebase-credentials.json exists');
    console.log('   2. Install missing packages: npm install');
    console.log('   3. Check internet connection');
    console.log('   4. Verify Firebase project is active');
}
console.log('='.repeat(70) + '\n');

process.exit(allGood ? 0 : 1);
