
import {
  collection,
  doc,
  addDoc,
  onSnapshot,
  getDoc,
  setDoc,
  updateDoc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';

import { db } from './firebase';

const CODE_LENGTH = 8;
const CODE_CHARACTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateInviteCode() {
  let code = '';

  for (let i = 0; i < CODE_LENGTH; i++) {
    const index = Math.floor(Math.random() * CODE_CHARACTERS.length);
    code += CODE_CHARACTERS[index];
  }

  return code;
}

// ===================================
// CREATE PAIR
// ===================================

export async function createPair(uid) {
  const userRef = doc(db, 'users', uid);
  const userSnapshot = await getDoc(userRef);

  if (!userSnapshot.exists()) {
    throw new Error('Không tìm thấy hồ sơ người dùng.');
  }

  const userData = userSnapshot.data();

  if (userData.pairId) {
    throw new Error('Tài khoản này đã có cặp đôi.');
  }

  let pairId;
  let inviteCode;
  let created = false;

  for (let attempt = 0; attempt < 5; attempt++) {
    inviteCode = generateInviteCode();

    const codeRef = doc(db, 'pairCodes', inviteCode);
    const codeSnapshot = await getDoc(codeRef);

    if (codeSnapshot.exists()) {
      continue;
    }

    pairId = doc(collection(db, 'pairs')).id;

    const pairRef = doc(db, 'pairs', pairId);
    const batch = writeBatch(db);

    batch.set(pairRef, {
      createdBy: uid,
      members: [uid],
      status: 'waiting',
      inviteCode,
      createdAt: serverTimestamp(),
    });

    batch.set(codeRef, {
      createdBy: uid,
      pairId,
      status: 'open',
      createdAt: serverTimestamp(),
    });

    await batch.commit();
    created = true;
    break;
  }

  if (!created) {
    throw new Error('Không thể tạo mã mời. Vui lòng thử lại.');
  }

  await setDoc(doc(db, 'pairs', pairId, 'profiles', uid), {
    uid,
    displayName: userData.displayName,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await updateDoc(userRef, {
    pairId,
    pairStatus: 'waiting',
    inviteCode,
    updatedAt: serverTimestamp(),
  });

  return {
    ...userData,
    pairId,
    pairStatus: 'waiting',
    inviteCode,
  };
}

// ===================================
// JOIN PAIR
// ===================================

export async function joinPair(uid, inputCode) {
  const inviteCode = inputCode.trim().toUpperCase();

  if (inviteCode.length !== CODE_LENGTH) {
    throw new Error('Mã mời phải có 8 ký tự.');
  }

  const userRef = doc(db, 'users', uid);
  const userSnapshot = await getDoc(userRef);

  if (!userSnapshot.exists()) {
    throw new Error('Không tìm thấy hồ sơ người dùng.');
  }

  const userData = userSnapshot.data();

  if (userData.pairId) {
    throw new Error('Tài khoản này đã có cặp đôi.');
  }

  const codeRef = doc(db, 'pairCodes', inviteCode);
  const codeSnapshot = await getDoc(codeRef);

  if (!codeSnapshot.exists()) {
    throw new Error('Mã mời không tồn tại.');
  }

  const codeData = codeSnapshot.data();

  if (codeData.status !== 'open') {
    throw new Error('Mã mời đã được sử dụng.');
  }

  const pairId = codeData.pairId;
  const pairRef = doc(db, 'pairs', pairId);
  const pairSnapshot = await getDoc(pairRef);

  if (!pairSnapshot.exists()) {
    throw new Error('Không tìm thấy cặp đôi.');
  }

  const pairData = pairSnapshot.data();

  if (
    pairData.status !== 'waiting' ||
    pairData.members.length !== 1
  ) {
    throw new Error('Cặp đôi này không còn chờ thành viên.');
  }

  if (pairData.createdBy === uid) {
    throw new Error('Ông không thể tự ghép đôi với chính mình!');
  }

  const batch = writeBatch(db);

  batch.update(pairRef, {
    members: [...pairData.members, uid],
    status: 'paired',
    pairedAt: serverTimestamp(),
  });

  batch.update(codeRef, {
    status: 'used',
    joinedBy: uid,
    usedAt: serverTimestamp(),
  });

  await batch.commit();

  await setDoc(doc(db, 'pairs', pairId, 'profiles', uid), {
    uid,
    displayName: userData.displayName,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const creatorUid = pairData.createdBy;

  const creatorProfileSnapshot = await getDoc(
    doc(db, 'pairs', pairId, 'profiles', creatorUid)
  );

  const partnerName = creatorProfileSnapshot.exists()
    ? creatorProfileSnapshot.data().displayName
    : 'Người thương';

  await updateDoc(userRef, {
    pairId,
    pairStatus: 'paired',
    partnerUid: creatorUid,
    partnerName,
    updatedAt: serverTimestamp(),
  });

  return {
    ...userData,
    pairId,
    pairStatus: 'paired',
    partnerUid: creatorUid,
    partnerName,
  };
}

// ===================================
// LOVE EVENTS + QUICK SIGNALS
// ===================================

const signalsCollection = (pairId) =>
  collection(db, 'pairs', pairId, 'signals');

// Gửi một trái tim đến người thương.
export async function sendLove(
  pairId,
  senderUid,
  recipientUid,
  senderName
) {
  if (!pairId || !senderUid || !recipientUid) {
    throw new Error('Thiếu thông tin cặp đôi để gửi yêu thương.');
  }

  await addDoc(signalsCollection(pairId), {
    senderUid,
    recipientUid,
    senderName,
    text: 'Gửi bạn một trái tim',
    emoji: '💗',
    isLove: true,
    createdAt: serverTimestamp(),
  });
}

// Gửi tín hiệu nhanh.
export async function sendQuickSignal(
  pairId,
  senderUid,
  recipientUid,
  senderName,
  signal
) {
  if (!pairId || !senderUid || !recipientUid) {
    throw new Error('Thiếu thông tin cặp đôi để gửi tín hiệu.');
  }

  await addDoc(signalsCollection(pairId), {
    senderUid,
    recipientUid,
    senderName,
    text: signal.label,
    emoji: signal.emoji,
    isLove: false,
    createdAt: serverTimestamp(),
  });
}

// Lắng nghe tất cả tín hiệu trong cặp.
export function subscribeToPairSignals(
  pairId,
  callback,
  onError
) {
  return onSnapshot(
    signalsCollection(pairId),
    (snapshot) => {
      const items = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      items.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });

      callback(items);
    },
    onError
  );
}

// ===================================
// SHARED DIARY
// ===================================

const diaryCollection = (pairId) =>
  collection(db, 'pairs', pairId, 'diaryEntries');

// Thêm một mục nhật ký.
export async function addDiaryEntry(
  pairId,
  authorUid,
  authorName,
  text
) {
  const content = text.trim();

  if (!content) {
    throw new Error('Ông chưa viết nội dung nhật ký.');
  }

  if (content.length > 2000) {
    throw new Error('Nhật ký tối đa 2.000 ký tự.');
  }

  await addDoc(diaryCollection(pairId), {
    authorUid,
    authorName,
    text: content,
    createdAt: serverTimestamp(),
  });
}

// Lắng nghe nhật ký của cả hai người.
export function subscribeToDiary(
  pairId,
  callback,
  onError
) {
  return onSnapshot(
    diaryCollection(pairId),
    (snapshot) => {
      const entries = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      entries.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });

      callback(entries);
    },
    onError
  );
}


// ===================================
// MEMBER STATUS
// ===================================

function pairProfileRef(pairId, uid) {
  return doc(db, 'pairs', pairId, 'profiles', uid);
}

// Cập nhật trạng thái của thành viên.
export async function updatePairMemberStatus(pairId, uid, status) {
  if (!pairId || !uid || !status) {
    throw new Error('Thiếu thông tin trạng thái.');
  }

  await updateDoc(pairProfileRef(pairId, uid), {
    status: {
      emoji: status.emoji,
      label: status.label,
    },
    statusUpdatedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// Lắng nghe hồ sơ và trạng thái của thành viên.
export function subscribeToPairProfile(
  pairId,
  uid,
  callback,
  onError
) {
  return onSnapshot(
    pairProfileRef(pairId, uid),
    (snapshot) => {
      callback(
        snapshot.exists()
          ? { uid, ...snapshot.data() }
          : null
      );
    },
    onError
  );
}

// Lưu Expo Push Token vào profile của chính người dùng
export async function savePairPushToken(pairId, uid, expoPushToken) {
  if (!pairId || !uid || !expoPushToken) {
    throw new Error('Thiếu thông tin để lưu Push Token.');
  }

  await updateDoc(pairProfileRef(pairId, uid), {
    expoPushToken,
    pushTokenUpdatedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// Lấy thông tin profile của thành viên trong cặp
export async function getPairMemberProfile(pairId, uid) {
  if (!pairId || !uid) return null;

  const snapshot = await getDoc(pairProfileRef(pairId, uid));

  return snapshot.exists()
    ? { uid, ...snapshot.data() }
    : null;
}