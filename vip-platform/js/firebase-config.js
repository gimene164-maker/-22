/* ============================================
   VIP Platform - Firebase Configuration
   ============================================

   ✅ المشروع: elite3-v2
   تم التحديث: 2026-08-16
*/

const firebaseConfig = {
  apiKey: "AIzaSyC83L-MDMS0ZTLKmdmtWzTLp_JiI3bWug8",
  authDomain: "elite3-v2.firebaseapp.com",
  projectId: "elite3-v2",
  storageBucket: "elite3-v2.firebasestorage.app",
  messagingSenderId: "166500295362",
  appId: "1:166500295362:web:39aeb10ca2cf7bac6fd15b",
  measurementId: "G-2381V4FSE6"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Enable offline persistence
firebase.firestore().enablePersistence({ synchronizeTabs: true })
  .then(() => console.log('[VIP] ✅ Firestore offline persistence enabled'))
  .catch((err) => console.warn('[VIP] ⚠️ Persistence error:', err));

console.log('[VIP] ✅ Firebase connected to project: elite3-v2');

// Verify Firestore is accessible
firebase.firestore().collection('_test').doc('_test').get()
  .then(() => console.log('[VIP] ✅ Firestore connection verified'))
  .catch(err => {
    console.error('[VIP] ❌ Firestore error:', err.message);
    if (err.message.includes('permission')) {
      console.error('[VIP] ⚠️ Firestore Rules not configured! Go to Firebase Console > Firestore > Rules');
    }
  });
