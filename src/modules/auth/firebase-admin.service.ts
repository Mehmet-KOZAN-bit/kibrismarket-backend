import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';

// Fallback embedded credentials from official service account JSON
const DEFAULT_SERVICE_ACCOUNT = {
  projectId: 'mobiapp-18b5e',
  clientEmail: 'firebase-adminsdk-fbsvc@mobiapp-18b5e.iam.gserviceaccount.com',
  privateKey: `-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7lQ2UJ/5+k69r\nCDUHnqaBHI6zBPtCo1Fb5ksyAARV+ESSjZZN02r9UeZm2Sk8G+ZbrNKpwIZqtLBQ\nyXYQCTFd/jaFaJBiFFshVmwA24rk7AL26Yi/A+zX4rf28EobRmkvPywKqcdryAKC\n8V556H0faRpuD2L/zdj6IIPrNc5XemBezOZT4tJDZmHGOzBmFPNWVfOeVBncm5pa\nkseY062KnEaxP3PepoAMD0wEcHOQJpbZ+Orp/eT2EBI7gAhYaQoDKnLcLYYYBdgT\nGIEgT3z/+6H4UWtPt6QgNErBJ7WuapmQ3Kde455Wa4u/1FKh40lwjXYRFxmVn+QG\nuspc0k4PAgMBAAECggEARjto8ZtF0GuIJrlUbY1rhvTDwugvEQSn7hIb/lT+Spfh\nSMPFTk9FhCIZc1GEfFJv3cwntdH1IdeUGjNLxnZCqxAGps1/HZHEiwdZ+bo5Vzu8\nYmkOv4H/N9dVjJnsDSlAMaXj3fwyQ7sHobIwbtFqo4uNDz8okGEoh4IMElE7eAmf\nah04TWU0NtJgLSllSqwXJR9iwfS0ZxS1eIqdkG8ltchqTBw9wkq5u3RgGAgXKKZy\nWwoWmBHELpwjG2JLPYQ1U3AlSxi8dTl8tyDUNvSJ/KmTN14pwnOvpicvdonCdd37\nUkb0jY1dMRMx3Oe9xuYN+dFdK+8JlccwHf5vdDlymQKBgQDwIWDKQ/IeMkH1zPVC\neGJ4H+9ACxIs7MR0H7pxkYw3+tyCmrkz0JAazTU/cyv6gu5glZkOODhOUvbMwzNJ\nepoJEqhq3rjy1IOwF1bmJZuAOnQye6I6aXPzvkdhMe1IB/uO3Dd4AovQyL7aqNyi\nDvJjBZUaVVmn3X3cnXjomx4qJwKBgQDH+qT4bAGb42B+vLLHCetyi7DS9EOYppwm\nbkIOz+tcPcfkd3ED4zPnrq6cWdhr4KC20/hEICo7qZxddzM8TfQdk5ouZDW0kk3n\nMCEoYqeqprmVQVEJd3oR7CNzHyI2nAWv848C69WSAfT2PRle7dMhev82gq9WrcfQ\n2Djo9tW12QKBgQDKuHL87tWU9nrG5uva3MTMgrE5UN9cO9ox6qM8w1Ir5EWKoNJf\nUuCFL96XHUTwbN6PfVvELGQkg1fFT7mZe75UkILMDhD3N7+gxmNfUjpvy2lTQRqY\n03PHP0kFXd/iopKVbYYKc6PTc9XjxRDWY2XvgMP6gjl5RLy/pdVwEZwqmwKBgBZi\nkCTesi9o/Fwzcy+khJ6F1H1Iqmhj/gavQOW3kHj60W1ZkWUGAcFlZFZMGFW7B0Jv\n59J4Z0HWcpJjzXBqqXDGHPQkc36LAf1m/c8ve+U2VH/Il/GfViK7dBxm18WVIW3Y\nraF+FKILZghKPpTJumB9DCRl7IqfWUafbX9mYfXBAoGBAIs+Rartf9yRE8VdWRKM\naNBSEjsmzbVQ7waz40H892Da0efLyTArJ5K4xzgfEp4Q6jCVxypydWcsInhdkx/5\nbiQmfRE3mRt3X3k95iR9n0+TNwHPiZmuaniNzC5eBXYNEmS3cG0vaACMwJ7iHQcN\nv1KsgdteyAmGRBgW1ayE5+JZ\n-----END PRIVATE KEY-----\n`
};

@Injectable()
export class FirebaseAdminService implements OnModuleInit {
  private dbInstance!: admin.firestore.Firestore;

  onModuleInit() {
    if (admin.apps.length === 0) {
      const fs = require('fs');
      const serviceAccountPath = '/Users/mehmetkozan/Desktop/mobiapp-18b5e-firebase-adminsdk-fbsvc-8a96724ff1.json';

      try {
        let credential;
        if (fs.existsSync(serviceAccountPath)) {
          console.log('Firebase Service Account loaded directly from local JSON file.');
          credential = admin.credential.cert(serviceAccountPath);
        } else {
          console.log('Firebase Service Account loading from environment variables or embedded fallback.');
          let privateKey = process.env.FIREBASE_PRIVATE_KEY || DEFAULT_SERVICE_ACCOUNT.privateKey;
          if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
            privateKey = privateKey.slice(1, -1);
          }
          privateKey = privateKey.replace(/\\n/g, '\n');

          credential = admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID || DEFAULT_SERVICE_ACCOUNT.projectId,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL || DEFAULT_SERVICE_ACCOUNT.clientEmail,
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
        console.error('⚠️ Firebase Admin SDK initialization FAILED:', err.message);
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
