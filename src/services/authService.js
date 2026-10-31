
import {
  signInAnonymously,
  onAuthStateChanged,
} from 'firebase/auth';

import { auth } from './firebase';

// Login anonymously if user has no existing session
export async function signInAnonymouslyIfNeeded() {
  if (auth.currentUser) {
    return auth.currentUser;
  }

  const result = await signInAnonymously(auth);

  return result.user;
}

// Listen to authentication state
export function subscribeToAuthChanges(callback) {
  return onAuthStateChanged(auth, callback);
}
