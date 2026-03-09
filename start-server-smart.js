/**
 * Smart Server Launcher for SAPTHALA
 * Starts the server with graceful fallback when MongoDB is unavailable
 * 
 * Usage: node start-server-smart.js
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

console.log(`
╔════════════════════════════════════════════════════════════╗
║    SAPTHALA Smart Server - Starting with Fallbacks        ║
╚════════════════════════════════════════════════════════════╝
`);

// Step 1: Check if MongoDB is running
function checkMongoDB() {
  return new Promise((resolve) => {
    const net = require('net');
    const client = net.createConnection({ host: '127.0.0.1', port: 27017, timeout: 2000 }, () => {
      client.destroy();
      resolve(true);
    });
    client.on('error', () => resolve(false));
    client.on('timeout', () => { client.destroy(); resolve(false); });
  });
}

// Step 2: Ensure demo data exists
function ensureDemoData() {
  const dataDir = path.join(__dirname, '.data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Create demo orders file
  const ordersFile = path.join(dataDir, 'orders.json');
  if (!fs.existsSync(ordersFile)) {
    const demoOrders = [
      {
        orderId: 'ORD-DEMO-001',
        customerName: 'Anita Singh',
        customerPhone: '9876543220',
        garmentType: 'Party Saree',
        category: 'Saree',
        totalAmount: 5000,
        advanceAmount: 2000,
        status: 'in_progress',
        branch: 'Main',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      },
      {
        orderId: 'ORD-DEMO-002',
        customerName: 'Priya Gupta',
        customerPhone: '9876543221',
        garmentType: 'Bridal Lehenga',
        category: 'Lehenga',
        totalAmount: 15000,
        advanceAmount: 5000,
        status: 'pending',
        branch: 'Main',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        orderId: 'ORD-DEMO-003',
        customerName: 'Siya Verma',
        customerPhone: '9876543222',
        garmentType: 'Silk Kurta',
        category: 'Kurta',
        totalAmount: 3500,
        advanceAmount: 1500,
        status: 'completed',
        branch: 'Main',
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
      },
      {
        orderId: 'ORD-DEMO-004',
        customerName: 'Neha Desai',
        customerPhone: '9876543223',
        garmentType: 'Wedding Saree',
        category: 'Saree',
        totalAmount: 8000,
        advanceAmount: 3000,
        status: 'in_progress',
        branch: 'Main',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      },
      {
        orderId: 'ORD-DEMO-005',
        customerName: 'Divya Nair',
        customerPhone: '9876543224',
        garmentType: 'Designer Suit',
        category: 'Suit',
        totalAmount: 6500,
        advanceAmount: 2000,
        status: 'pending',
        branch: 'Main',
        createdAt: new Date()
      }
    ];
    fs.writeFileSync(ordersFile, JSON.stringify(demoOrders, null, 2), 'utf8');
    console.log('📝 Created demo orders in .data/orders.json');
  }

  // Create demo branches file
  const branchesFile = path.join(dataDir, 'branches.json');
  if (!fs.existsSync(branchesFile)) {
    const demoBranches = [
      {
        branchId: 'MAIN_BRANCH',
        branchName: 'Main Branch - Central Store',
        location: 'Mumbai, Maharashtra',
        email: 'main@sapthala.com',
        isActive: true,
        createdAt: new Date()
      }
    ];
    fs.writeFileSync(branchesFile, JSON.stringify(demoBranches, null, 2), 'utf8');
    console.log('📝 Created demo branches in .data/branches.json');
  }
}

(async function startup() {
  try {
    // Check MongoDB
    console.log('🔍 Checking MongoDB connectivity...');
    const mongoAvailable = await checkMongoDB();
    
    if (mongoAvailable) {
      console.log('✅ MongoDB is available');
    } else {
      console.log('❌ MongoDB is NOT available');
      console.log('   ℹ️  Server will use FILE-BASED storage for demo/testing');
      console.log('   ℹ️  When MongoDB comes online, data will sync automatically\n');
    }

    // Prepare demo data
    console.log('📋 Preparing demo data...');
    ensureDemoData();
    console.log('✅ Demo data ready\n');

    // Start the server
    console.log('🚀 Starting server...\n');
    const serverProcess = spawn('node', ['server.js'], {
      stdio: 'inherit',
      cwd: __dirname,
      env: { ...process.env, MONGO_OPTIONAL: mongoAvailable ? '0' : '1' }
    });

    serverProcess.on('exit', (code) => {
      console.error(`\n❌ Server exited with code ${code}`);
      process.exit(code);
    });

    serverProcess.on('error', (err) => {
      console.error('❌ Failed to start server:', err.message);
      process.exit(1);
    });

    // Print instructions
    setTimeout(() => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║                   Server Ready! 🎉                        ║
╠════════════════════════════════════════════════════════════╣
║  Open: http://localhost:3000                              ║
║  Click: "⚠️ Skip to Dashboard (Bypass)"                   ║
║  See: Demo data with 5 orders, ₹38,000 total revenue     ║
╠════════════════════════════════════════════════════════════╣
║  Status: ${mongoAvailable ? '✅ MongoDB Connected' : '📁 File-Based Storage'}                    ║
╚════════════════════════════════════════════════════════════╝
      `);
    }, 2000);

  } catch (error) {
    console.error('❌ Startup error:', error.message);
    process.exit(1);
  }
})();
