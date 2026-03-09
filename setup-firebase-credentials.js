#!/usr/bin/env node

/**
 * AUTOMATIC FIREBASE SETUP HELPER
 * Downloads Firebase credentials and configures the system
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise(resolve => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('🔥 FIREBASE CREDENTIALS SETUP HELPER');
  console.log('='.repeat(70) + '\n');

  console.log('This script will help you set up Firebase credentials.\n');
  console.log('You need to:\n');
  console.log('1. Go to: https://console.firebase.google.com');
  console.log('2. Select your project: "boutique-staff-app"');
  console.log('3. Click Project Settings (gear icon)');
  console.log('4. Go to "Service Accounts" tab');
  console.log('5. Click "Generate New Private Key"');
  console.log('6. A JSON file will download\n');

  const hasCredentials = await question('Have you downloaded the JSON file? (yes/no): ');
  
  if (hasCredentials.toLowerCase() !== 'yes') {
    console.log('\n❌ Please download the JSON file first and try again.\n');
    rl.close();
    process.exit(0);
  }

  const credentialsPath = await question('\nEnter the full path to your JSON file (or just filename if in same folder):\n> ');
  
  if (!credentialsPath || !fs.existsSync(credentialsPath)) {
    console.log(`\n❌ File not found: ${credentialsPath}\n`);
    rl.close();
    process.exit(1);
  }

  // Copy credentials to project root
  const projectRoot = path.join(__dirname);
  const destPath = path.join(projectRoot, 'firebase-credentials.json');

  try {
    const content = fs.readFileSync(credentialsPath, 'utf8');
    fs.writeFileSync(destPath, content);
    console.log(`\n✅ Credentials saved to: ${destPath}\n`);
  } catch (error) {
    console.error(`\n❌ Error copying file: ${error.message}\n`);
    rl.close();
    process.exit(1);
  }

  // Create .env file if not exists
  const envPath = path.join(projectRoot, '.env');
  if (!fs.existsSync(envPath)) {
    const basicEnv = `MONGODB_URI=mongodb://localhost:27017/sapthala_boutique
USE_FIREBASE=true
GOOGLE_APPLICATION_CREDENTIALS=./firebase-credentials.json
AUTO_SYNC_TO_FIREBASE=true
PORT=3000
JWT_SECRET=sapthala_boutique_secret_2024
NODE_ENV=development
`;
    fs.writeFileSync(envPath, basicEnv);
    console.log('✅ Created .env file with Firebase configuration\n');
  }

  console.log('='.repeat(70));
  console.log('✅ SETUP COMPLETE!\n');
  console.log('Next steps:');
  console.log('1. Install firebase-admin package:');
  console.log('   npm install firebase-admin\n');
  console.log('2. Run Firebase setup:');
  console.log('   SETUP_FIREBASE.bat\n');
  console.log('3. Restart server:');
  console.log('   RESTART_SERVER.bat\n');
  console.log('='.repeat(70) + '\n');

  rl.close();
  process.exit(0);
}

main().catch(error => {
  console.error('Error:', error);
  rl.close();
  process.exit(1);
});
