import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

/** true khi đã có đủ cấu hình Firebase lúc build */
export const firebaseReady = Boolean(config.apiKey && config.projectId && config.appId && config.storageBucket);

let app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;

if (firebaseReady) {
  app = initializeApp(config);
  _auth = getAuth(app);
  _db = getFirestore(app);
  _storage = getStorage(app);
}

export class NotConnectedError extends Error {
  constructor() {
    super('Firebase chưa được kết nối. Dữ liệu CHƯA được lưu. Xem hướng dẫn cấu hình ở đầu trang.');
  }
}

export function db(): Firestore {
  if (!_db) throw new NotConnectedError();
  return _db;
}
export function auth(): Auth {
  if (!_auth) throw new NotConnectedError();
  return _auth;
}
export function storage(): FirebaseStorage {
  if (!_storage) throw new NotConnectedError();
  return _storage;
}
export const googleProvider = new GoogleAuthProvider();
export const projectId = config.projectId ?? '';
