const { MongoClient } = require('mongodb');
const admin = require('firebase-admin');

// Firebase Configuration
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};

// Initialize Firebase Admin SDK
const serviceAccount = require('./firebase-service-account.json'); // You'll need to download this
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://your-project-default-rtdb.firebaseio.com"
});

const db = admin.firestore();

// MongoDB Configuration
const MONGO_URI = 'mongodb://localhost:27017/sapthala_boutique';

async function migrateToFirebase() {
  let mongoClient;
  
  try {
    console.log('🔄 Starting MongoDB to Firebase migration...');
    
    // Connect to MongoDB
    mongoClient = new MongoClient(MONGO_URI);
    await mongoClient.connect();
    const mongoDb = mongoClient.db();
    
    // Collections to migrate
    const collections = [
      'orders',
      'customers', 
      'staff',
      'branches',
      'tasks',
      'users'
    ];
    
    for (const collectionName of collections) {
      console.log(`\n📦 Migrating ${collectionName}...`);
      
      const mongoCollection = mongoDb.collection(collectionName);
      const documents = await mongoCollection.find({}).toArray();
      
      console.log(`   Found ${documents.length} documents`);
      
      if (documents.length === 0) {
        console.log(`   ⚠️  No documents found in ${collectionName}`);
        continue;
      }
      
      // Batch write to Firebase
      const batch = db.batch();
      let batchCount = 0;
      
      for (const doc of documents) {
        // Convert MongoDB _id to string for Firebase
        const docId = doc._id.toString();
        delete doc._id;
        
        // Convert dates to Firebase timestamps
        Object.keys(doc).forEach(key => {
          if (doc[key] instanceof Date) {
            doc[key] = admin.firestore.Timestamp.fromDate(doc[key]);
          }
        });
        
        const firebaseDocRef = db.collection(collectionName).doc(docId);
        batch.set(firebaseDocRef, doc);
        batchCount++;
        
        // Firebase batch limit is 500
        if (batchCount === 500) {
          await batch.commit();
          console.log(`   ✅ Committed batch of ${batchCount} documents`);
          batchCount = 0;
        }
      }
      
      // Commit remaining documents
      if (batchCount > 0) {
        await batch.commit();
        console.log(`   ✅ Committed final batch of ${batchCount} documents`);
      }
      
      console.log(`   ✅ Successfully migrated ${documents.length} documents from ${collectionName}`);
    }
    
    // Create Firebase indexes for better performance
    console.log('\n🔍 Creating Firebase indexes...');
    await createFirebaseIndexes();
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📋 Summary:');
    for (const collection of collections) {
      const count = await db.collection(collection).get();
      console.log(`   ${collection}: ${count.size} documents`);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    if (mongoClient) {
      await mongoClient.close();
    }
  }
}

async function createFirebaseIndexes() {
  // Note: Indexes need to be created via Firebase Console or CLI
  // This is just documentation of recommended indexes
  
  const recommendedIndexes = {
    orders: [
      { fields: ['branchId', 'status'] },
      { fields: ['customerPhone'] },
      { fields: ['createdAt'] },
      { fields: ['assignedStaff.staffId'] }
    ],
    staff: [
      { fields: ['branchId'] },
      { fields: ['staffId'] },
      { fields: ['workflowStages'] }
    ],
    customers: [
      { fields: ['phone'] },
      { fields: ['branchId'] }
    ],
    tasks: [
      { fields: ['assignedTo'] },
      { fields: ['status'] },
      { fields: ['orderId'] }
    ]
  };
  
  console.log('📝 Recommended indexes to create in Firebase Console:');
  Object.keys(recommendedIndexes).forEach(collection => {
    console.log(`\n   ${collection}:`);
    recommendedIndexes[collection].forEach(index => {
      console.log(`     - ${JSON.stringify(index.fields)}`);
    });
  });
}

// Run migration
if (require.main === module) {
  migrateToFirebase();
}

module.exports = { migrateToFirebase };