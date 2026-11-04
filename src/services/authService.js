
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  EmailAuthProvider,
  linkWithCredential,
} from 'firebase/auth';

import { auth } from './firebase';

const USERNAME_EMAIL_DOMAIN = 'login.heartbeat.invalid';

export function normalizeUsername(username) {
  return username.trim().toLowerCase();
}

function usernameToEmail(username) {
  return `${normalizeUsername(username)}@${USERNAME_EMAIL_DOMAIN}`;
}

export function validateUsername(username) {
  const normalized = normalizeUsername(username);

  if (!/^[a-z0-9][a-z0-9._-]{2,19}$/.test(normalized)) {
    throw new Error('Tên đăng nhập cần có 3–20 ký tự: chữ không dấu, số, dấu chấm, gạch dưới hoặc gạch ngang.');
  }

  return normalized;
}

export async function registerWithUsername(username, password) {
  const normalized = validateUsername(username);
  const credential = EmailAuthProvider.credential(
    usernameToEmail(normalized),
    password
  );

  // Giữ nguyên UID và dữ liệu Firestore của tài khoản ẩn danh cũ trên máy.
  if (auth.currentUser?.isAnonymous) {
    const result = await linkWithCredential(auth.currentUser, credential);
    return result.user;
  }

  const result = await createUserWithEmailAndPassword(
    auth,
    usernameToEmail(normalized),
    password
  );

  return result.user;
}

export async function loginWithUsername(username, password) {
  const normalized = validateUsername(username);
  const result = await signInWithEmailAndPassword(
    auth,
    usernameToEmail(normalized),
    password
  );

  return result.user;
}

// Listen to authentication state
export function subscribeToAuthChanges(callback) {
  return onAuthStateChanged(auth, callback);
}
