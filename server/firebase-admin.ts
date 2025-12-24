import * as admin from 'firebase-admin';

let firebaseApp: admin.app.App | null = null;

export function getFirebaseAdmin() {
  if (firebaseApp) {
    return firebaseApp;
  }

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  
  if (!serviceAccountKey) {
    console.warn('Firebase Admin: FIREBASE_SERVICE_ACCOUNT_KEY not set. Phone auth verification will not work.');
    return null;
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountKey);
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('Firebase Admin initialized successfully');
    return firebaseApp;
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
    return null;
  }
}

export async function verifyFirebaseToken(idToken: string) {
  const app = getFirebaseAdmin();
  if (!app) {
    throw new Error('Firebase Admin not initialized');
  }
  
  const decodedToken = await admin.auth().verifyIdToken(idToken);
  return decodedToken;
}

export async function getFirebaseUser(uid: string) {
  const app = getFirebaseAdmin();
  if (!app) {
    throw new Error('Firebase Admin not initialized');
  }
  
  const user = await admin.auth().getUser(uid);
  return user;
}
