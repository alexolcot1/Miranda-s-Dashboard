import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  onSnapshot, 
  getDocFromServer,
  Unsubscribe 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { AppData } from '../types/inventory';
import { normalizeData } from './storage';

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// CRITICAL: Initialize Firestore with the database ID specified in the configuration
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Firebase Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test on boot
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

// Sign in with Google using popup (recommended for iFrame)
export async function signInWithGoogle(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (err: any) {
    if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
      return null;
    }
    console.warn('Google Sign-In notice:', err?.message || err);
    throw err;
  }
}

export async function logOut(): Promise<void> {
  await signOut(auth);
}

export const SHARED_STORE_ID = 'mirandas_closets_plus';
export const SHARED_DOC_ID = 'main';

// Real-time synchronization functions for the shared store
export function subscribeToStoreData(
  userId: string,
  onDataReceived: (remoteData: AppData) => void,
  onError?: (err: any) => void,
  onEmpty?: () => void
): Unsubscribe {
  // If not signed in yet, do not trigger a rejected Firestore query
  if (!auth.currentUser) {
    return () => {};
  }

  const sharedRef = doc(db, 'stores', SHARED_STORE_ID, 'data', SHARED_DOC_ID);

  return onSnapshot(
    sharedRef,
    (snapshot) => {
      if (snapshot.exists()) {
        try {
          const raw = snapshot.data();
          const normalized = normalizeData(raw);
          onDataReceived(normalized);
        } catch (err) {
          console.error('Error normalizing remote data:', err);
        }
      } else {
        if (onEmpty) {
          onEmpty();
        }
      }
    },
    (error) => {
      // If user signed out while listener was shutting down, avoid throwing permission error
      if (!auth.currentUser) {
        if (onError) onError(error);
        return;
      }
      handleFirestoreError(error, OperationType.GET, `stores/${SHARED_STORE_ID}/data/${SHARED_DOC_ID}`);
      if (onError) onError(error);
    }
  );
}


export async function pushStoreDataToCloud(userId: string, data: AppData): Promise<void> {
  const path = `stores/${SHARED_STORE_ID}/data/${SHARED_DOC_ID}`;
  try {
    const sharedRef = doc(db, 'stores', SHARED_STORE_ID, 'data', SHARED_DOC_ID);
    await setDoc(sharedRef, {
      ...data,
      lastModifiedBy: auth.currentUser?.email || userId,
      lastModifiedName: auth.currentUser?.displayName || 'Equipo Miranda',
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

