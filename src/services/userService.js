import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';

import { db } from './firebase';

export async function getUserProfile(uid) {
  const userRef = doc(db, 'users', uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data();
}

export async function createUserProfile(uid, displayName) {
  const userRef = doc(db, 'users', uid);

  await setDoc(userRef, {
    uid,
    displayName: displayName.trim(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return {
    uid,
    displayName: displayName.trim(),
  };
}