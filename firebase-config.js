const admin = require('firebase-admin');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

let firebaseDb = null;
let firebaseConnected = false;
let mongooseConnected = false;

// ==================== FIREBASE INITIALIZATION ====================

const initializeFirebase = async () => {
  try {
    if (firebase.apps.length > 0) {
      console.log('✅ Firebase already initialized');
      firebaseDb = admin.firestore();
      firebaseConnected = true;
      return true;
    }

    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './firebase-credentials.json';
    
    if (!fs.existsSync(credentialsPath)) {
      console.warn('⚠️  Firebase credentials not found at:', credentialsPath);
      return false;
    }

    const serviceAccount = require(path.resolve(credentialsPath));

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL || `https://${serviceAccount.project_id}.firebaseio.com`
    });

    firebaseDb = admin.firestore();
    firebaseConnected = true;
    console.log('✅ Firebase initialized successfully');
    console.log(`   Project: ${serviceAccount.project_id}`);
    
    return true;
  } catch (error) {
    console.warn('⚠️  Firebase initialization failed:', error.message);
    return false;
  }
};

// ==================== DATABASE CONNECTIVITY ====================

// Check if using Firebase as primary
const useFirebase = process.env.USE_FIREBASE === 'true' || process.env.USE_FIREBASE === true;

// Initialize Firebase if enabled
if (useFirebase) {
  initializeFirebase().catch(e => console.warn('Firebase init error:', e.message));
}

// ==================== FIREBASE DATA OPERATIONS ====================

const firebaseOperations = {
  // Get all documents from a collection
  getAll: async (collection) => {
    try {
      if (!firebaseConnected) return [];
      const snapshot = await firebaseDb.collection(collection).get();
      return snapshot.docs.map(doc => ({ ...doc.data(), _id: doc.id }));
    } catch (error) {
      console.error(`Error getting ${collection}:`, error.message);
      return [];
    }
  },

  // Get document by ID
  getById: async (collection, id) => {
    try {
      if (!firebaseConnected) return null;
      const doc = await firebaseDb.collection(collection).doc(id).get();
      return doc.exists ? { ...doc.data(), _id: doc.id } : null;
    } catch (error) {
      console.error(`Error getting ${collection}/${id}:`, error.message);
      return null;
    }
  },

  // Create document
  create: async (collection, data) => {
    try {
      if (!firebaseConnected) throw new Error('Firebase not connected');
      const docRef = await firebaseDb.collection(collection).add({
        ...data,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now()
      });
      return { ...data, _id: docRef.id };
    } catch (error) {
      console.error(`Error creating in ${collection}:`, error.message);
      throw error;
    }
  },

  // Update document
  update: async (collection, id, data) => {
    try {
      if (!firebaseConnected) throw new Error('Firebase not connected');
      await firebaseDb.collection(collection).doc(id).set({
        ...data,
        updatedAt: admin.firestore.Timestamp.now()
      }, { merge: true });
      return { ...data, _id: id };
    } catch (error) {
      console.error(`Error updating ${collection}/${id}:`, error.message);
      throw error;
    }
  },

  // Delete document
  delete: async (collection, id) => {
    try {
      if (!firebaseConnected) throw new Error('Firebase not connected');
      await firebaseDb.collection(collection).doc(id).delete();
      return true;
    } catch (error) {
      console.error(`Error deleting ${collection}/${id}:`, error.message);
      throw error;
    }
  },

  // Query with filter
  query: async (collection, field, operator, value) => {
    try {
      if (!firebaseConnected) return [];
      let query = firebaseDb.collection(collection);
      query = query.where(field, operator, value);
      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({ ...doc.data(), _id: doc.id }));
    } catch (error) {
      console.error(`Error querying ${collection}:`, error.message);
      return [];
    }
  }
};

// ==================== EXPORT ====================

module.exports = {
  firebaseDb,
  firebaseConnected,
  firebaseOperations,
  initializeFirebase,
  useFirebase
};
