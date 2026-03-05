import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth, signInAnonymously } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Only initialize if we have the project ID (meaning env vars are set)
const isConfigured = !!firebaseConfig.projectId;

const app = isConfigured ? (!getApps().length ? initializeApp(firebaseConfig) : getApp()) : null;
const db = app ? getFirestore(app, process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID || '(default)') : null;
const storage = app ? getStorage(app) : null;
const auth = app ? getAuth(app) : null;

export { app, db, storage, auth, signInAnonymously, isConfigured };
