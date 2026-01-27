import admin from 'firebase-admin';
import { ServiceAccount } from 'firebase-admin';
import path from 'path';
import fs from 'fs';

// Initialize Firebase Admin SDK
const setupFirebase = () => {
    try {
        if (!admin.apps.length) {
            // Load service account key
            // Start looking from specific absolute path or relative to this file
            // Use process.cwd() for Next.js compatibility
            const serviceAccountPath = path.join(process.cwd(), 'src', 'config', 'serviceAccountKey.json');
            
            if (fs.existsSync(serviceAccountPath)) {
                const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8')) as ServiceAccount;

                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                    // Check if storage bucket is needed, implied from prompt config
                    storageBucket: "armoured-mart.firebasestorage.app" 
                });
                
                console.log('Firebase Admin initialized successfully');
            } else {
               console.warn('Firebase service account key not found at:', serviceAccountPath);
            }
        }
    } catch (error) {
        console.error('Firebase initialization error:', error);
    }

    return admin;
};

const firebaseAdmin = setupFirebase();

export { firebaseAdmin };
