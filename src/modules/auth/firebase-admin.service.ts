import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseAdminService implements OnModuleInit {
  private dbInstance!: admin.firestore.Firestore;

  onModuleInit() {
    if (admin.apps.length === 0) {
      const fs = require('fs');
      const serviceAccountPath = '/Users/mehmetkozan/Desktop/mobiapp-18b5e-firebase-adminsdk-fbsvc-812bb79469.json';

      try {
        let credential;
        if (fs.existsSync(serviceAccountPath)) {
          console.log('Firebase Service Account loaded directly from local JSON file.');
          credential = admin.credential.cert(serviceAccountPath);
        } else {
          console.log('Firebase Service Account loading from environment variables.');
          let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
          // Strip surrounding quotes added by some env loaders
          if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
            privateKey = privateKey.slice(1, -1);
          }
          // Replace literal \n sequences with real newlines
          privateKey = privateKey.replace(/\\n/g, '\n');
          credential = admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey,
          });
        }

        admin.initializeApp({
          credential,
          databaseURL: process.env.FIREBASE_DATABASE_URL,
        });

        this.dbInstance = admin.firestore();
        console.log('✅ Firebase Admin SDK initialized successfully.');
      } catch (err: any) {
        console.error('⚠️  Firebase Admin SDK initialization FAILED:', err.message);
        console.error('   The server will start but Firebase-dependent features will be unavailable.');
        console.error('   To fix: Place your Firebase service account JSON at:', serviceAccountPath);
        // Provide a dummy firestore-like object to prevent null pointer errors
        this.dbInstance = null as any;
      }
    } else {
      this.dbInstance = admin.firestore();
    }
  }

  getAuth() {
    return admin.auth();
  }

  getFirestore() {
    return this.dbInstance;
  }

  getMessaging() {
    return admin.messaging();
  }
}
