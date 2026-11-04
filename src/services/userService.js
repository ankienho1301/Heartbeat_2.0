import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
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

export async function createUserProfile(uid, displayName, gender) {
  const userRef = doc(db, 'users', uid);

  try {
    await setDoc(userRef, {
      uid,
      displayName: displayName.trim(),
      gender,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('USER DOCUMENT CREATE FAILED:', error.code, error.message);
    throw error;
  }

  return {
    uid,
    displayName: displayName.trim(),
    gender,
  };
}

export async function updateUserProfile(uid, displayName, gender, profile) {
  const normalizedName = displayName.trim();
  const updatedAt = serverTimestamp();

  try {
    await updateDoc(doc(db, 'users', uid), {
      displayName: normalizedName,
      gender,
      updatedAt,
    });
  } catch (error) {
    console.error('USER DOCUMENT UPDATE FAILED:', error.code, error.message);
    throw error;
  }

  if (profile?.pairId) {
    try {
      await updateDoc(doc(db, 'pairs', profile.pairId, 'profiles', uid), {
        displayName: normalizedName,
        gender,
        updatedAt,
      });
    } catch (error) {
      console.error('PAIR MEMBER PROFILE UPDATE FAILED:', error.code, error.message);
      throw error;
    }
  }

  return {
    ...profile,
    uid,
    displayName: normalizedName,
    gender,
  };
}
