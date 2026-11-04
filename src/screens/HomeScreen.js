
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
} from 'react-native';

import {
  sendLove,
  sendQuickSignal,
  subscribeToPairSignals,
  addDiaryEntry,
  subscribeToDiary,
  updatePairMemberStatus,
  subscribeToPairProfile,
  savePairPushToken,
  getPairMemberProfile,
  subscribeToPairDetails,
  updatePairAnniversaryDate,
} from '../services/pairService';

import {
  registerForPushNotificationsAsync,
  sendExpoPushNotification,
} from '../services/notificationService';



const ANNIVERSARY_DATE = '2026-10-23';

function getSignals(gender) {
  const pronoun = gender === 'female' ? 'anh' : 'em';
  const pronounCapitalized = gender === 'female' ? 'Anh' : 'Em';

  return [
    { emoji: '(つ >ω<)つ', label: 'Muốn ômmm' },
    { emoji: '(づ￣ ³￣)づ', label: 'Muốn hunn' },
    { emoji: '(  ^〇^) ', label: 'Muốn cắn nhiều miếng' },
    { emoji: '(˘⌣˘)♡(˘⌣˘)', label: 'Muốn đi dạo' },
    { emoji: '(￣￢￣) ', label: 'Muốn đi mukbang' },
    { emoji: '(；´д` )', label: 'Muốn nốc ngoja' },
    { emoji: '(︶｡︶)zZ', label: `Chúc ${pronoun} iu ngủ ngon` },
    { emoji: '٩( O_O )۶', label: `${pronounCapitalized} iu mau dậy thôii` },
    { emoji: '(;￣Д￣)っ 🛏️', label: 'Đi ngủ đee' },
    { emoji: '(; ¬_¬)☞🔥', label: 'Repp chuỗi toptop' },
  ];
}

function getStatuses(gender) {
  return [
    { emoji: '📚', label: 'Đang học bài' },
    { emoji: '🍜', label: 'Đang mukbang' },
    { emoji: '💤', label: 'Đang ngủ khò' },
    { emoji: '🚽', label: 'Đang đi ẻ' },
    { emoji: '😤', label: 'Đang dỗi' },
    { emoji: '🥺', label: 'Đang nhớ ai đó' },
    { emoji: '🎮', label: 'Đang combat cực căng' },
    { emoji: '💼', label: 'Đang kiếm tiền nuôi em' },
    { emoji: '🤬', label: 'Đang siêu cáu' },
    { emoji: '🚗', label: 'Đang phóng zìn zìn' },
    { emoji: '🛁', label: 'Đang tém' },
    { emoji: '❤️‍🔥', label: 'Đang siêu nhớ ngừi iu' },
    {
      emoji: '💗',
      label: gender === 'female'
        ? 'Đang rất rất yêu anh'
        : 'Đang rất rất yêu em',
    },
    { emoji: '🎉', label: 'Đang đi chơi đàn đúm' },
    { emoji: '🍽️', label: 'Đang siêu đói' },
    { emoji: '🤒', label: 'Đang mệch mỏi vô cùng :(' },
    { emoji: '🥱', label: 'Đang quá là chán' },
  ];
}

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateKey(dateKey) {
  const [year, month, day] = dateKey.split('-');
  return `${day}/${month}/${year}`;
}

function formatDiaryDateInput(value) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function parseDiaryDateInput(value) {
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
  ) {
    return null;
  }

  return getDateKey(date);
}



function getDaysTogether(anniversaryDate = ANNIVERSARY_DATE) {
  const [year, month, day] = anniversaryDate.split('-').map(Number);
  const anniversary = new Date(year, month - 1, day);
  const today = new Date();

  today.setHours(0, 0, 0, 0);
  anniversary.setHours(0, 0, 0, 0);

  return Math.max(
    0,
    Math.floor((today - anniversary) / (1000 * 60 * 60 * 24))
  );
}

function formatDate(timestamp) {
  if (!timestamp?.toDate) return 'Vừa xong';

  return timestamp.toDate().toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function HomeScreen({ profile, username, onProfileUpdated }) {
  const signals = getSignals(profile?.gender);
  const statuses = getStatuses(profile?.gender);
  const [activePage, setActivePage] = useState('together');
  const [loveCount, setLoveCount] = useState(0);
  const [myStatus, setMyStatus] = useState(statuses[0]);
  const [incomingSignals, setIncomingSignals] = useState([]);
  const [diaryEntries, setDiaryEntries] = useState([]);
  const [diaryText, setDiaryText] = useState('');
  const [reviewDiaryDate, setReviewDiaryDate] = useState(null);
  const [reviewDiaryRangeDays, setReviewDiaryRangeDays] = useState(null);
  const [customDiaryDate, setCustomDiaryDate] = useState('');
  const [customDateMode, setCustomDateMode] = useState(false);
  const [dateInputError, setDateInputError] = useState('');
  const [sendingLove, setSendingLove] = useState(false);
  const [sendingDiary, setSendingDiary] = useState(false);
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [feedbackScore, setFeedbackScore] = useState(4);
  const [feedbackTrackWidth, setFeedbackTrackWidth] = useState(0);
  const [diaryModalVisible, setDiaryModalVisible] = useState(false);
  const [partnerProfile, setPartnerProfile] = useState(null);
  const [pairDetails, setPairDetails] = useState(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileNameInput, setProfileNameInput] = useState('');
  const [profileGenderInput, setProfileGenderInput] = useState('');
  const [profileAnniversaryInput, setProfileAnniversaryInput] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState('');
  const [displayNameOverride, setDisplayNameOverride] = useState(null);

  const displayName = displayNameOverride || profile?.displayName?.trim() || 'Bạn';
  const partnerDisplayName = partnerProfile?.displayName?.trim()
    || profile?.partnerName
    || 'Người thương';
  const avatarInitial = displayName.charAt(0).toUpperCase();
  const daysTogether = getDaysTogether(pairDetails?.anniversaryDate || ANNIVERSARY_DATE);

  const pairId = profile?.pairId;
  const myUid = profile?.uid;
  const partnerUid = profile?.partnerUid;
  const todayDateKey = getDateKey(new Date());
  const reviewDiaryRangeStart = new Date();
  if (reviewDiaryRangeDays) {
    reviewDiaryRangeStart.setDate(reviewDiaryRangeStart.getDate() - reviewDiaryRangeDays + 1);
  }
  const reviewDiaryRangeStartKey = getDateKey(reviewDiaryRangeStart);
  const todayDiaryEntries = diaryEntries.filter(
    (entry) => entry.createdAt?.toDate
      && getDateKey(entry.createdAt.toDate()) === todayDateKey
  );
  const reviewDiaryEntries = diaryEntries.filter((entry) => {
    if (!entry.createdAt?.toDate) return false;
    const entryDateKey = getDateKey(entry.createdAt.toDate());
    if (reviewDiaryRangeDays) {
      return entryDateKey >= reviewDiaryRangeStartKey && entryDateKey <= todayDateKey;
    }
    return reviewDiaryDate && entryDateKey === reviewDiaryDate;
  });
  const diarySectionTitle = `Nhật ký hôm nay ngày ${formatDateKey(todayDateKey)}`;

  const openProfile = () => {
    setProfileNameInput(displayName);
    setProfileGenderInput(profile?.gender || 'male');
    setProfileAnniversaryInput(formatDateKey(pairDetails?.anniversaryDate || ANNIVERSARY_DATE));
    setProfileSaveError('');
    setEditingProfile(false);
    setProfileModalVisible(true);
  };

  const saveProfile = async () => {
    const dateKey = parseDiaryDateInput(profileAnniversaryInput);
    if (!profileNameInput.trim()) return setProfileSaveError('Nhập tên hiển thị nhé.');
    if (!dateKey) return setProfileSaveError('Ngày kỷ niệm cần theo định dạng ngày/tháng/năm.');
    setSavingProfile(true);
    setProfileSaveError('');
    try {
      const updatedProfile = await onProfileUpdated({
        displayName: profileNameInput,
        gender: profileGenderInput,
      });
      setDisplayNameOverride(updatedProfile?.displayName || profileNameInput.trim());
      await updatePairAnniversaryDate(pairId, dateKey);
      setEditingProfile(false);
    } catch (error) {
      setProfileSaveError(error.message || 'Chưa lưu được hồ sơ. Thử lại nhé.');
    } finally {
      setSavingProfile(false);
    }
  };

  useEffect(() => {
    if (!pairId) return undefined;
    return subscribeToPairDetails(pairId, setPairDetails,
      (error) => console.error('PAIR DETAILS ERROR:', error));
  }, [pairId]);

  useEffect(() => {
    setMyStatus((current) => statuses.find((item) => item.label === current?.label) || statuses[0]);
  }, [profile?.gender]);

  useEffect(() => {
    setDisplayNameOverride(null);
  }, [profile?.displayName]);

  const handleReviewRecentDate = (daysAgo) => {
    setReviewDiaryRangeDays(daysAgo);
    setReviewDiaryDate(null);
    setCustomDateMode(false);
    setDateInputError('');
  };

  const handleReviewCustomDate = () => {
    const dateKey = parseDiaryDateInput(customDiaryDate);
    if (!dateKey) {
      setDateInputError('Nhập ngày hợp lệ theo định dạng ngày/tháng/năm nhé.');
      return;
    }

    setReviewDiaryRangeDays(null);
    setReviewDiaryDate(dateKey);
    setDateInputError('');
  };

  const feedbackLevels = [
    { emoji: '💔', label: 'Vô cùng không hài lòng', note: 'Hôm nay yêu đương hơi sai cách rồi...', color: '#D95C68' },
    { emoji: '🥲', label: 'Rất không hài lòng', note: 'Có chút tổn thương, buồn lòng.', color: '#DB7478' },
    { emoji: '😕', label: 'Không hài lòng', note: 'Hôm nay chưa được vui lắm, có gì đó sai sai.', color: '#DF8B7A' },
    { emoji: '😶', label: 'Hơi thất vọng', note: 'Có gì đó chưa đúng kỳ vọng.', color: '#DBA078' },
    { emoji: '😐', label: 'Bình thường', note: 'Một ngày yêu đương bình thường.', color: '#D2AE70' },
    { emoji: '🙂', label: 'Khá hài lòng', note: 'Có nhớ chút chút, hơn bình thường chút chút.', color: '#B9B573' },
    { emoji: '😊', label: 'Hài lòng', note: 'Hôm nay coi như là cũng cũng vui đi.', color: '#9EB77A' },
    { emoji: '🥰', label: 'Rất hài lòng', note: 'Được quan tâm, yêu thương và chiều chuộng.', color: '#83B586' },
    { emoji: '💗', label: 'Cực kỳ hạnh phúc', note: 'Hôm nay yêu nhau thật tuyệt vời.', color: '#70B89A' },
    { emoji: '❤️‍🔥', label: 'Rất rất yêu', note: 'Muốn yêu người này thêm 100 năm nữa.', color: '#E66F89' },
  ];
  const selectedFeedback = feedbackLevels[feedbackScore];

  const setFeedbackFromTouch = (locationX) => {
    if (!feedbackTrackWidth) return;
    const ratio = Math.max(0, Math.min(1, locationX / feedbackTrackWidth));
    setFeedbackScore(Math.round(ratio * (feedbackLevels.length - 1)));
  };

  const handleConfirmFeedback = async () => {
    if (!pairId || !myUid || sendingFeedback) return;
    setSendingFeedback(true);
    try {
      await addDiaryEntry(
        pairId,
        myUid,
        displayName,
        `Feedback dịch vụ yêu đương hôm nay: ${feedbackScore + 1}/10 · ${selectedFeedback.emoji} ${selectedFeedback.label}\n${selectedFeedback.note}`
      );
      setFeedbackScore(4);
      Alert.alert('Đã lưu feedback ❤️', 'Đánh giá hôm nay đã được thêm vào nhật ký chung.');
    } catch (error) {
      Alert.alert('Chưa lưu được feedback', error.message || 'Vui lòng thử lại nhé.');
    } finally {
      setSendingFeedback(false);
    }
  };

  useEffect(() => {
    if (!pairId || !myUid) return undefined;

    const unsubscribeSignals = subscribeToPairSignals(
      pairId,
      (items) => {
        const received = items.filter(
          (item) => item.recipientUid === myUid
        );

        setLoveCount(
          received.filter((item) => item.isLove === true).length
        );

        const latestSignal = received
          .filter((item) => item.isLove !== true)
          .sort((a, b) => {
            const timeA = a.createdAt?.toMillis?.() || 0;
            const timeB = b.createdAt?.toMillis?.() || 0;
            return timeB - timeA;
          })
          .slice(0, 1);

        setIncomingSignals(latestSignal);
      },
      (error) => console.error('SIGNAL LISTENER ERROR:', error)
    );

    const unsubscribeDiary = subscribeToDiary(
      pairId,
      setDiaryEntries,
      (error) => console.error('DIARY LISTENER ERROR:', error)
    );

    return () => {
      unsubscribeSignals();
      unsubscribeDiary();
    };
  }, [pairId, myUid]);
  // Đăng ký Expo Push Token và lưu vào hồ sơ của thiết bị này.
  useEffect(() => {
    if (!pairId || !myUid || Platform.OS === 'web') return undefined;

    let active = true;

    const registerToken = async () => {
      try {
        const token = await registerForPushNotificationsAsync();

        if (active && token) {
          await savePairPushToken(pairId, myUid, token);
          console.log('HEARTBEAT EXPO PUSH TOKEN:', token);
        }
      } catch (error) {
        console.error('PUSH TOKEN REGISTRATION ERROR:', error);
      }
    };

    registerToken();

    return () => {
      active = false;
    };
  }, [pairId, myUid]);

  useEffect(() => {
  if (!pairId || !myUid) return undefined;

  // Lắng nghe trạng thái của chính mình.
  const unsubscribeMine = subscribeToPairProfile(
    pairId,
    myUid,
    (data) => {
      if (data?.status) {
        const matchingStatus = statuses.find(
          (item) => item.label === data.status.label
        );
        setMyStatus(matchingStatus || statuses[0]);
      }
    },
    (error) => console.error('MY STATUS ERROR:', error)
  );

  // Lắng nghe trạng thái người thương.
  let unsubscribePartner = () => {};

  if (partnerUid) {
    unsubscribePartner = subscribeToPairProfile(
      pairId,
      partnerUid,
      setPartnerProfile,
      (error) => console.error('PARTNER STATUS ERROR:', error)
    );
  }

  return () => {
    unsubscribeMine();
    unsubscribePartner();
  };
}, [pairId, myUid, partnerUid]);

  // Gửi thông báo cho người thương. Lỗi notification không làm hỏng thao tác chính.
  const notifyPartner = async (title, body, type, extraData = {}) => {
    if (!pairId || !partnerUid || Platform.OS === 'web') return;

    try {
      const partner = await getPairMemberProfile(pairId, partnerUid);

      if (!partner?.expoPushToken) {
        console.log('Người thương chưa đăng ký Expo Push Token.');
        return;
      }

      await sendExpoPushNotification(
        partner.expoPushToken,
        title,
        body,
        {
          type,
          pairId,
          senderUid: myUid,
          ...extraData,
        }
      );
    } catch (error) {
      console.error('SEND PUSH NOTIFICATION ERROR:', error);
    }
  };

  const handleSendLove = async () => {
    if (!partnerUid) {
      Alert.alert(
        'Chưa kết nối',
        'Tài khoản chưa có thông tin người thương.'
      );
      return;
    }

    try {
      setSendingLove(true);
      await sendLove(pairId, myUid, partnerUid, displayName);
      await notifyPartner(
        '💗 Bạn vừa nhận được một trái tim',
        `${displayName} đã gửi bạn một trái tim.`,
        'love'
      );
    } catch (error) {
      console.error('SEND LOVE ERROR:', error);
      Alert.alert('Chưa gửi được', error.message || 'Vui lòng thử lại.');
    } finally {
      setSendingLove(false);
    }
  };

  const handleSendSignal = async (signal) => {
    if (!partnerUid) {
      Alert.alert(
        'Chưa kết nối',
        'Tài khoản chưa có thông tin người thương.'
      );
      return;
    }

    try {
      await sendQuickSignal(
        pairId,
        myUid,
        partnerUid,
        displayName,
        signal
      );

      await notifyPartner(
        `${signal.emoji || '💌'} ${displayName} vừa gửi tín hiệu`,
        signal.label,
        'signal',
        { signal: signal.label }
      );

      Alert.alert(
        'Heartbeat ❤️',
        `Đã gửi "${signal.label}" đến người thương!`
      );
    } catch (error) {
      console.error('SEND SIGNAL ERROR:', error);
      Alert.alert('Chưa gửi được', error.message || 'Vui lòng thử lại.');
    }
  };

  const handleAddDiary = async () => {
    if (!diaryText.trim()) return;

    try {
      setSendingDiary(true);
      await addDiaryEntry(pairId, myUid, displayName, diaryText);
      await notifyPartner(
        '📖 Người thương vừa viết nhật ký',
        `${displayName} vừa thêm một dòng vào nhật ký chung.`,
        'diary'
      );
      setDiaryText('');
    } catch (error) {
      console.error('ADD DIARY ERROR:', error);
      Alert.alert(
        'Chưa lưu được nhật ký',
        error.message || 'Vui lòng thử lại.'
      );
    } finally {
      setSendingDiary(false);
    }
  };

  const handleSelectStatus = async (item) => {
  const previousStatus = myStatus;

  // Cập nhật giao diện ngay lập tức.
  setMyStatus(item);

    try {
      await updatePairMemberStatus(pairId, myUid, item);
      await notifyPartner(
        '💗 Người thương vừa cập nhật trạng thái',
        `${displayName} ${item.label.toLocaleLowerCase('vi-VN')}`,
        'status',
        { status: item.label, emoji: item.emoji }
      );
    } catch (error) {
      console.error('UPDATE STATUS ERROR:', error);

      setMyStatus(previousStatus);

      Alert.alert(
        'Không cập nhật được',
        error.message || 'Vui lòng thử lại.'
      );
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.headerArea}>
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>heartbeat.</Text>
            <Text style={styles.subtitle}>Just the Two of Us ❤️</Text>
          </View>

          <Pressable accessibilityRole="button" accessibilityLabel="Xem hồ sơ hiện tại" onPress={openProfile} style={styles.avatar}>
            <Text style={styles.avatarText}>{avatarInitial}</Text>
            <Text style={styles.avatarEdit}>✎</Text>
          </Pressable>
        </View>

        <View style={styles.connection}>
          <View style={styles.onlineDot} />
          <Text style={styles.connectionText}>
            Đã kết nối với {partnerDisplayName}
          </Text>
          <Text style={styles.heartSmall}>♥</Text>
        </View>
      </View>

      <ScrollView
        key={activePage}
        style={styles.pageScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {activePage === 'together' && (
          <>
            <View style={styles.greeting}>
              <Text style={styles.greetingTitle}>Xin chào, {displayName}! ❤️‍🔥</Text>
              <Text style={styles.greetingDesc}>Hôm nay đã gửi yêu thương chưa?</Text>
            </View>

            <View style={styles.anniversaryCard}>
              <Text style={styles.anniversaryLabel}>CUỘC TỀNH NÀY</Text>
              <Text style={styles.anniversaryTitle}>Đã có danh phận</Text>
              <View style={styles.daysRow}>
                <Text style={styles.daysNumber}>{daysTogether}</Text>
                <Text style={styles.daysUnit}>ngày</Text>
              </View>
              <Text style={styles.anniversaryDesc}>
                Và vẫn đang tiếp tục viết câu chuyện của chúng mình.
              </Text>
            </View>

            <View style={styles.loveCard}>
              <Text style={styles.cardLabel}>
                {partnerDisplayName} đã gửi bạn
              </Text>
              <Text style={styles.counter}>{loveCount}</Text>
              <Text style={styles.counterDesc}>lần yêu thương</Text>
              <Pressable
                style={({ pressed }) => [
                  styles.loveButton,
                  pressed && styles.pressed,
                  sendingLove && styles.disabledButton,
                ]}
                onPress={handleSendLove}
                disabled={sendingLove}
              >
                {sendingLove ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.loveButtonText}>♥</Text>
                )}
              </Pressable>
              <Text style={styles.buttonHint}>Chạm để gửi một trái tim đến người thương</Text>
            </View>

            <View style={styles.section}>
              <View style={styles.partnerStatusCard}>
                <Text style={styles.partnerStatusLabel}>TRẠNG THÁI NGƯỜI THƯƠNG</Text>
                <View style={styles.partnerStatusRow}>
                  <Text style={styles.partnerStatusEmoji}>
                    {partnerProfile?.status?.emoji || '💗'}
                  </Text>
                  <Text style={styles.partnerStatusText}>
                    {partnerDisplayName}{' '}
                    {partnerProfile?.status?.label
                      ? partnerProfile.status.label.toLocaleLowerCase('vi-VN')
                      : 'chưa cập nhật trạng thái'}
                  </Text>
                </View>
              </View>

              <View style={styles.incomingSignalCard}>
                <Text style={styles.partnerStatusLabel}>TÍN HIỆU TỪ NGƯỜI THƯƠNG</Text>
                {incomingSignals.length === 0 ? (
                  <View style={styles.incomingSignalRow}>
                    <Text style={styles.incomingSignalEmoji}>💌</Text>
                    <Text style={styles.incomingEmptyText}>
                      Chưa có tín hiệu mới. Chờ một điều dễ thương nhé!
                    </Text>
                  </View>
                ) : (
                  incomingSignals.map((item) => (
                    <View key={item.id} style={styles.incomingSignalRow}>
                      <Text style={styles.incomingSignalEmoji}>{item.emoji || '💌'}</Text>
                      <Text style={styles.incomingSignalText}>{item.text}</Text>
                    </View>
                  ))
                )}
              </View>
            </View>
          </>
        )}

        {activePage === 'send' && (
          <View style={styles.sectionFirst}>
            <Text style={styles.sectionTitle}>Trạng thái của bạn</Text>
            <Text style={styles.sectionDesc}>
              Chọn một trạng thái để người thương biết bạn đang làm gì.
            </Text>
            <View style={styles.statusGrid}>
              {statuses.map((item) => {
                const selected = myStatus.label === item.label;
                return (
                  <Pressable
                    key={item.label}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => handleSelectStatus(item)}
                    style={[styles.statusButton, selected && styles.statusSelected]}
                  >
                    <Text style={styles.statusEmoji}>{item.emoji}</Text>
                    <Text style={[styles.statusLabel, selected && styles.statusLabelSelected]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.sectionTitle, styles.signalHeading]}>
              Gửi một tín hiệu 💌
            </Text>
            <Text style={styles.sectionDesc}>
              Chọn một điều muốn nói, người ấy sẽ nhìn thấy.
            </Text>
            <View style={styles.signalGrid}>
              {signals.map((item) => (
                <Pressable
                  key={item.label}
                  style={({ pressed }) => [styles.signalButton, pressed && styles.pressed]}
                  onPress={() => handleSendSignal(item)}
                >
                  <Text style={styles.signalEmoji}>{item.emoji}</Text>
                  <Text style={styles.signalLabel}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {activePage === 'diary' && (
          <View style={styles.sectionFirst}>
            <Text style={styles.sectionTitle}>Nhật ký của chúng mình 📖</Text>
            <Text style={styles.sectionDesc}>
              Viết chuyện hôm nay, hoặc chọn ngày để xem lại kỷ niệm.
            </Text>

            <View style={styles.diaryComposer}>
              <TextInput
                style={styles.diaryInput}
                value={diaryText}
                onChangeText={setDiaryText}
                placeholder="Hôm nay có chuyện gì muốn kể..."
                placeholderTextColor="#B9A6A4"
                multiline
                maxLength={2000}
                textAlignVertical="top"
              />
              <View style={styles.diaryComposerFooter}>
                <Text style={styles.characterCount}>{diaryText.length}/2000</Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.diaryButton,
                    pressed && styles.pressed,
                    (!diaryText.trim() || sendingDiary) && styles.disabledButton,
                  ]}
                  onPress={handleAddDiary}
                  disabled={!diaryText.trim() || sendingDiary}
                >
                  {sendingDiary ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.diaryButtonText}>Lưu nhật ký ♥</Text>
                  )}
                </Pressable>
              </View>
            </View>

            <View style={styles.diaryListHeader}>
              <Text style={styles.diaryDayTitle}>{diarySectionTitle}</Text>
              <Text style={styles.characterCount}>{todayDiaryEntries.length} mục</Text>
            </View>
            {todayDiaryEntries.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>
                  Hãy viết lại nhật ký hôm nay đi nàoooo
                </Text>
              </View>
            ) : (
              <>
                {todayDiaryEntries.slice(0, 2).map((entry) => (
                  <View key={entry.id} style={styles.diaryEntry}>
                    <Text style={styles.diaryAuthor}>
                      {entry.authorName || 'Một người thương'}
                    </Text>
                    <Text style={styles.diaryEntryText} numberOfLines={2} ellipsizeMode="tail">
                      {entry.text}
                    </Text>
                    <Text style={styles.entryMeta}>{formatDate(entry.createdAt)}</Text>
                  </View>
                ))}
              </>
            )}

            <Pressable
              style={styles.viewAllDiary}
              onPress={() => {
                setReviewDiaryDate(todayDateKey);
                setReviewDiaryRangeDays(null);
                setCustomDateMode(false);
                setDateInputError('');
                setDiaryModalVisible(true);
              }}
            >
              <Text style={styles.viewAllDiaryText}>Xem lại nhật ký →</Text>
            </Pressable>

            <View style={styles.feedbackCard}>
              <Text style={styles.feedbackTitle}>Thanh tiến độ yêu đương 💞</Text>
              <Text style={styles.feedbackDescription}>Hôm nay bạn hài lòng với dịch vụ yêu đương đến mức nào?</Text>
              <View style={styles.feedbackSelected}>
                <Text style={styles.feedbackSelectedEmoji}>{selectedFeedback.emoji}</Text>
                <Text style={[styles.feedbackSelectedLabel, { color: selectedFeedback.color }]}>{selectedFeedback.label}</Text>
              </View>
              <Text style={styles.feedbackScoreText}>{feedbackScore + 1}/10</Text>
              <Text style={styles.feedbackNote}>{selectedFeedback.note}</Text>
              <View
                style={styles.feedbackTouchArea}
                onLayout={(event) => setFeedbackTrackWidth(event.nativeEvent.layout.width)}
                onStartShouldSetResponder={() => true}
                onMoveShouldSetResponder={() => true}
                onResponderGrant={(event) => setFeedbackFromTouch(event.nativeEvent.locationX)}
                onResponderMove={(event) => setFeedbackFromTouch(event.nativeEvent.locationX)}
                onResponderTerminationRequest={() => false}
                accessibilityRole="adjustable"
                accessibilityLabel="Mức độ hài lòng về dịch vụ yêu đương"
                accessibilityValue={{ min: 1, max: 10, now: feedbackScore + 1, text: selectedFeedback.label }}
              >
                <View style={styles.feedbackTrack}>
                  <View style={[styles.feedbackTrackFill, { width: `${(feedbackScore / (feedbackLevels.length - 1)) * 100}%`, backgroundColor: selectedFeedback.color }]} />
                  {feedbackLevels.map((level, index) => (
                    <View key={level.label} style={[styles.feedbackTick, { left: `${(index / (feedbackLevels.length - 1)) * 100}%` }]} />
                  ))}
                  <View style={[styles.feedbackThumb, { left: `${(feedbackScore / (feedbackLevels.length - 1)) * 100}%`, borderColor: selectedFeedback.color }]}>
                    <View style={[styles.feedbackThumbInner, { backgroundColor: selectedFeedback.color }]} />
                  </View>
                </View>
                <View style={styles.feedbackEnds}>
                  <Text style={styles.feedbackEndLabel}>1 · Thấp</Text>
                  <Text style={styles.feedbackEndLabel}>10 · Cao</Text>
                </View>
              </View>
              <Pressable
                onPress={handleConfirmFeedback}
                disabled={sendingFeedback}
                style={[styles.feedbackConfirmButton, sendingFeedback && styles.disabledButton]}
              >
                {sendingFeedback ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.feedbackConfirmText}>Xác nhận feedback</Text>}
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.tabBar}>
        {[
          { key: 'together', emoji: '❤️', label: 'Tụi mình' },
          { key: 'send', emoji: '💌', label: 'Gửi yêu thương' },
          { key: 'diary', emoji: '📖', label: 'Nhật ký' },
        ].map((tab) => {
          const selected = activePage === tab.key;
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setActivePage(tab.key)}
              style={styles.tabButton}
            >
              <Text style={[styles.tabEmoji, selected && styles.tabSelectedText]}>
                {tab.emoji}
              </Text>
              <Text style={[styles.tabLabel, selected && styles.tabSelectedText]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Modal visible={profileModalVisible} animationType="fade" transparent onRequestClose={() => setProfileModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.profileModal} contentContainerStyle={styles.profileModalContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{editingProfile ? 'Chỉnh sửa hồ sơ' : 'Hồ sơ tụi mình'}</Text>
                <Text style={styles.modalSubtitle}>{editingProfile ? 'Cập nhật thông tin của hai bạn' : 'Thông tin cơ bản của hai bạn ❤️'}</Text>
              </View>
              <Pressable onPress={() => setProfileModalVisible(false)} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </Pressable>
            </View>
            {editingProfile ? (
              <>
                <View style={styles.profileEditIntro}>
                  <Text style={styles.profileEditEmoji}>💌</Text>
                  <View style={styles.profileEditIntroCopy}>
                    <Text style={styles.profileEditIntroTitle}>Thông tin của bạn</Text>
                    <Text style={styles.profileEditIntroText}>Tên và giới tính dùng để cá nhân hóa app.</Text>
                  </View>
                </View>
                <Text style={styles.profileFieldLabel}>TÊN HIỂN THỊ</Text>
                <TextInput value={profileNameInput} onChangeText={setProfileNameInput} style={styles.profileInput} placeholder="Nhập tên của bạn" placeholderTextColor="#B9A5A4" maxLength={40} />
                <Text style={styles.profileFieldLabel}>GIỚI TÍNH</Text>
                <View style={styles.profileGenderRow}>
                  {[
                    { value: 'male', label: 'Nam', emoji: '🙋🏻‍♂️' },
                    { value: 'female', label: 'Nữ', emoji: '🙋🏻‍♀️' },
                  ].map((option) => (
                    <Pressable key={option.value} onPress={() => setProfileGenderInput(option.value)} style={[styles.profileGenderOption, profileGenderInput === option.value && styles.profileGenderSelected]}>
                      <Text style={styles.profileGenderEmoji}>{option.emoji}</Text>
                      <Text style={[styles.profileGenderText, profileGenderInput === option.value && styles.profileGenderSelectedText]}>{option.label}</Text>
                    </Pressable>
                  ))}
                </View>
                <View style={styles.profileSectionDivider} />
                <Text style={styles.profileSectionTitle}>Ngày đặc biệt của tụi mình</Text>
                <Text style={styles.profileSectionHint}>Ngày bắt đầu bên nhau, dùng để tính số ngày có danh phận.</Text>
                <TextInput value={profileAnniversaryInput} onChangeText={(value) => setProfileAnniversaryInput(formatDiaryDateInput(value))} style={styles.profileInput} placeholder="ngày / tháng / năm" placeholderTextColor="#B9A5A4" keyboardType="numeric" maxLength={10} />
                {!!profileSaveError && <Text style={styles.dateInputError}>{profileSaveError}</Text>}
                <Pressable disabled={savingProfile} onPress={saveProfile} style={[styles.profileSaveButton, savingProfile && styles.disabledButton]}>
                  {savingProfile ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.profileSaveButtonText}>Lưu thay đổi</Text>}
                </Pressable>
                <Pressable disabled={savingProfile} onPress={() => { setEditingProfile(false); setProfileSaveError(''); }} style={styles.profileCancelButton}><Text style={styles.profileCancelText}>Để sau</Text></Pressable>
              </>
            ) : (
              <>
                <View style={styles.profileInfoCard}>
                  <Text style={styles.profileFieldLabel}>BẠN</Text>
                  <Text style={styles.profileInfoValue}>{displayName} · {profile?.gender === 'female' ? 'Nữ' : 'Nam'}</Text>
                  {!!username && <Text style={styles.profileUsername}>@{username}</Text>}
                </View>
                <View style={styles.profileInfoCard}><Text style={styles.profileFieldLabel}>NGƯỜI THƯƠNG</Text><Text style={styles.profileInfoValue}>{partnerDisplayName}{partnerProfile?.gender ? ` · ${partnerProfile.gender === 'female' ? 'Nữ' : 'Nam'}` : ''}</Text></View>
                <View style={styles.profileInfoCard}><Text style={styles.profileFieldLabel}>NGÀY KỶ NIỆM</Text><Text style={styles.profileInfoValue}>{formatDateKey(pairDetails?.anniversaryDate || ANNIVERSARY_DATE)}</Text></View>
                <Pressable onPress={() => setEditingProfile(true)} style={styles.profileEditOpenButton}><Text style={styles.profileEditOpenButtonText}>Chỉnh sửa profile</Text></Pressable>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={diaryModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setDiaryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.diaryModal}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  Xem lại nhật ký
                </Text>
                <Text style={styles.modalSubtitle}>
                  {reviewDiaryRangeDays
                    ? `${reviewDiaryRangeDays} ngày gần nhất · ${reviewDiaryEntries.length} mục`
                    : reviewDiaryDate
                      ? `Ngày ${formatDateKey(reviewDiaryDate)} · ${reviewDiaryEntries.length} mục`
                      : 'Chọn ngày muốn mở lại kỷ niệm ❤️'}
                </Text>
              </View>

              <Pressable
                onPress={() => setDiaryModalVisible(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.reviewPrompt}>Chọn mốc thời gian</Text>
              <View style={styles.reviewOptions}>
                <Pressable
                  style={({ pressed }) => [styles.reviewOption, pressed && styles.pressed]}
                  onPress={() => handleReviewRecentDate(3)}
                >
                  <Text style={styles.reviewOptionEmoji}>🗓️</Text>
                  <Text style={styles.reviewOptionText}>3 ngày gần nhất</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.reviewOption, pressed && styles.pressed]}
                  onPress={() => handleReviewRecentDate(7)}
                >
                  <Text style={styles.reviewOptionEmoji}>📆</Text>
                  <Text style={styles.reviewOptionText}>7 ngày gần nhất</Text>
                </Pressable>
              </View>

              <Pressable
                style={[
                  styles.customDateOption,
                  customDateMode && styles.customDateOptionSelected,
                ]}
                onPress={() => {
                  setCustomDateMode(true);
                  setReviewDiaryDate(null);
                  setReviewDiaryRangeDays(null);
                  setDateInputError('');
                }}
              >
                <Text style={styles.reviewOptionEmoji}>📅</Text>
                <Text style={styles.reviewOptionText}>Ngày bất kỳ</Text>
              </Pressable>

              {customDateMode && (
                <View style={styles.customDateForm}>
                  <TextInput
                    style={styles.dateInput}
                    value={customDiaryDate}
                    onChangeText={(value) => {
                      setCustomDiaryDate(formatDiaryDateInput(value));
                      setReviewDiaryDate(null);
                      setReviewDiaryRangeDays(null);
                      setDateInputError('');
                    }}
                    placeholder="DD/MM/YYYY"
                    placeholderTextColor="#B9A6A4"
                    keyboardType="number-pad"
                    maxLength={10}
                  />
                  <Pressable
                    style={({ pressed }) => [styles.dateSearchButton, pressed && styles.pressed]}
                    onPress={handleReviewCustomDate}
                  >
                    <Text style={styles.dateSearchButtonText}>Xem nhật ký</Text>
                  </Pressable>
                  {!!dateInputError && (
                    <Text style={styles.dateInputError}>{dateInputError}</Text>
                  )}
                </View>
              )}

              {(!!reviewDiaryDate || !!reviewDiaryRangeDays) && (
                <View style={styles.reviewResults}>
                  <Text style={styles.reviewDateTitle}>
                    {reviewDiaryRangeDays
                      ? `Nhật ký ${reviewDiaryRangeDays} ngày gần nhất (${formatDateKey(reviewDiaryRangeStartKey)} – ${formatDateKey(todayDateKey)})`
                      : `Nhật ký ngày ${formatDateKey(reviewDiaryDate)}`}
                  </Text>
                  {reviewDiaryEntries.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <Text style={styles.emptyText}>
                        {reviewDiaryRangeDays
                          ? 'Khoảng thời gian này chưa có nhật ký nào nè.'
                          : 'Ngày này chưa có nhật ký nào nè.'}
                      </Text>
                    </View>
                  ) : (
                    reviewDiaryEntries.map((entry) => (
                      <View key={entry.id} style={styles.diaryEntry}>
                        <Text style={styles.diaryAuthor}>
                          {entry.authorName || 'Một người thương'}
                        </Text>
                        <Text style={styles.diaryEntryText}>{entry.text}</Text>
                        <Text style={styles.entryMeta}>{formatDate(entry.createdAt)}</Text>
                      </View>
                    ))
                  )}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F7',
  },
  headerArea: {
    paddingHorizontal: 22,
    paddingTop: 48,
    paddingBottom: 8,
    backgroundColor: '#FFF9F7',
  },
  pageScroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 28,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    fontSize: 29,
    fontWeight: '800',
    color: '#E96B79',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 12,
    color: '#A99A98',
    marginTop: 3,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F8D9D8',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarText: {
    fontSize: 19,
    fontWeight: '700',
    color: '#C75F6D',
  },
  avatarEdit: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 17,
    height: 17,
    borderRadius: 9,
    textAlign: 'center',
    overflow: 'hidden',
    color: '#FFFFFF',
    backgroundColor: '#D86C7C',
    fontSize: 11,
    fontWeight: '800',
  },
  connection: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FCECEB',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    marginTop: 12,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#78B995',
    marginRight: 8,
  },
  connectionText: {
    fontSize: 12,
    color: '#956E70',
    fontWeight: '600',
  },
  heartSmall: {
    color: '#E96B79',
    marginLeft: 7,
  },
  greeting: {
    marginTop: 11,
    marginBottom: 12,
  },
  greetingTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#493A3A',
  },
  greetingDesc: {
    fontSize: 13,
    color: '#A99A98',
    marginTop: 8,
  },
  anniversaryCard: {
    backgroundColor: '#F9E8E5',
    borderRadius: 22,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  anniversaryLabel: {
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '700',
    color: '#B47C7B',
  },
  anniversaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#795052',
    marginTop: 6,
  },
  daysRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 3,
  },
  daysNumber: {
    fontSize: 40,
    fontWeight: '800',
    color: '#D36D79',
  },
  daysUnit: {
    fontSize: 16,
    fontWeight: '700',
    color: '#D36D79',
    marginLeft: 7,
  },
  anniversaryDesc: {
    fontSize: 11,
    color: '#A47C7A',
    textAlign: 'center',
    marginTop: 5,
  },
  loveCard: {
    backgroundColor: '#F7DCDD',
    borderRadius: 23,
    paddingVertical: 15,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '700',
    color: '#B46E74',
  },
  counter: {
    fontSize: 42,
    fontWeight: '800',
    color: '#A94E60',
    marginTop: 2,
  },
  counterDesc: {
    fontSize: 12,
    color: '#A66F73',
  },
  loveButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EA7180',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    elevation: 3,
    shadowColor: '#C65A68',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  loveButtonText: {
    fontSize: 29,
    color: '#FFFFFF',
  },
  buttonHint: {
    fontSize: 11,
    color: '#A66F73',
    marginTop: 7,
    textAlign: 'center',
  },
  section: {
    marginTop: 13,
  },
  sectionFirst: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#493A3A',
  },
  sectionDesc: {
    fontSize: 12,
    color: '#A99A98',
    marginTop: 6,
    marginBottom: 17,
  },
  signalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 11,
  },
  signalButton: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F5EAE7',
  },
  signalEmoji: {
    fontSize: 24,
  },
  signalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#745C5C',
    marginTop: 6,
    textAlign: 'center',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F5EAE7',
    padding: 16,
  },
  emptyText: {
    color: '#A99A98',
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
  },
  entryMeta: {
    fontSize: 10,
    color: '#B8A5A3',
    marginTop: 6,
  },
  diaryComposer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F2E5E3',
    marginBottom: 14,
  },
  diaryInput: {
    minHeight: 105,
    maxHeight: 180,
    color: '#493A3A',
    fontSize: 13,
    lineHeight: 20,
    padding: 2,
  },
  diaryComposerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  characterCount: {
    color: '#B8A5A3',
    fontSize: 10,
  },
  diaryButton: {
    backgroundColor: '#E97988',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 115,
    alignItems: 'center',
  },
  diaryButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  diaryEntry: {
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F5EAE7',
  },
  diaryAuthor: {
    color: '#C75F6D',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
  },
  diaryEntryText: {
    color: '#5F4A4A',
    fontSize: 13,
    lineHeight: 21,
  },
  diaryListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 8,
  },
  diaryDayTitle: {
    flex: 1,
    color: '#493A3A',
    fontSize: 15,
    fontWeight: '800',
    marginRight: 8,
  },
  signalHeading: {
    marginTop: 23,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 9,
  },
  statusButton: {
    width: '48%',
    minHeight: 76,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3E9E6',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 9,
  },
  statusSelected: {
    backgroundColor: '#F9DCDD',
    borderColor: '#E98A94',
    borderWidth: 1.5,
  },
  statusEmoji: {
    fontSize: 23,
  },
  statusLabel: {
    fontSize: 11,
    color: '#856D6B',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 7,
  },
  statusLabelSelected: {
    color: '#B64F60',
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },
  disabledButton: {
    opacity: 0.55,
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F2E5E3',
    paddingTop: 9,
    paddingBottom: Platform.OS === 'ios' ? 22 : 10,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  tabEmoji: {
    fontSize: 19,
    opacity: 0.65,
  },
  tabLabel: {
    color: '#9B8887',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 3,
  },
  tabSelectedText: {
    color: '#D85E70',
    opacity: 1,
    fontWeight: '800',
  },

  viewAllDiary: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 2,
  },

  viewAllDiaryText: {
    color: '#C75F6D',
    fontSize: 12,
    fontWeight: '800',
  },

  feedbackCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F3DEDF',
    padding: 17,
    marginTop: 8,
    marginBottom: 8,
  },
  feedbackTitle: {
    color: '#493A3A',
    fontSize: 16,
    fontWeight: '800',
  },
  feedbackDescription: {
    color: '#A99A98',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },
  feedbackSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    marginBottom: 2,
  },
  feedbackSelectedEmoji: { fontSize: 24, marginRight: 7 },
  feedbackSelectedLabel: { flexShrink: 1, fontSize: 14, fontWeight: '800', textAlign: 'center' },
  feedbackScoreText: { color: '#8B7473', fontSize: 12, fontWeight: '800', textAlign: 'center', marginTop: 3 },
  feedbackNote: {
    color: '#795F60',
    backgroundColor: '#FFF6F4',
    borderRadius: 12,
    overflow: 'hidden',
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 11,
    paddingVertical: 9,
    marginTop: 8,
  },
  feedbackTouchArea: {
    paddingTop: 14,
    paddingBottom: 4,
  },
  feedbackTrack: {
    height: 9,
    borderRadius: 5,
    backgroundColor: '#F1E6E4',
    justifyContent: 'center',
  },
  feedbackTrackFill: {
    position: 'absolute',
    left: 0,
    height: 9,
    borderRadius: 5,
  },
  feedbackTick: {
    position: 'absolute',
    top: 2,
    width: 3,
    height: 5,
    borderRadius: 2,
    marginLeft: -1,
    backgroundColor: '#FFFFFF',
  },
  feedbackThumb: {
    position: 'absolute',
    width: 27,
    height: 27,
    borderRadius: 14,
    borderWidth: 3,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -13,
    shadowColor: '#7A5555',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  feedbackThumbInner: { width: 11, height: 11, borderRadius: 6 },
  feedbackEnds: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 11,
  },
  feedbackEndLabel: { color: '#A99A98', fontSize: 11, fontWeight: '600' },
  feedbackConfirmButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#E9788A',
    marginTop: 16,
  },
  feedbackConfirmText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(50, 30, 30, 0.4)',
    justifyContent: 'flex-end',
  },

  diaryModal: {
    height: '85%',
    backgroundColor: '#FFF9F7',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
  },

  profileModal: {
    width: '100%',
    maxHeight: '92%',
    backgroundColor: '#FFF9F7',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
  },
  profileModalContent: {
    padding: 20,
    paddingBottom: 28,
  },
  profileInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 14,
    marginBottom: 10,
  },
  profileFieldLabel: {
    color: '#A27478',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: 0.7,
  },
  profileInfoValue: {
    color: '#493A3A',
    fontSize: 15,
    fontWeight: '700',
  },
  profileUsername: {
    color: '#A99A98',
    fontSize: 13,
    marginTop: 5,
  },
  profileInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0D4D8',
    borderRadius: 14,
    minHeight: 52,
    paddingHorizontal: 15,
    color: '#493A3A',
    marginBottom: 18,
    fontSize: 15,
  },
  profileGenderRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  profileGenderOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F0D4D8',
    backgroundColor: '#FFFFFF',
  },
  profileGenderSelected: {
    borderColor: '#E98A94',
    backgroundColor: '#F9DCDD',
  },
  profileGenderText: { color: '#856D6B', fontWeight: '700' },
  profileGenderSelectedText: { color: '#B64F60' },
  profileGenderEmoji: { fontSize: 17 },
  profileEditIntro: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FCEDEE',
    borderRadius: 16,
    padding: 13,
    marginBottom: 20,
  },
  profileEditEmoji: { fontSize: 25, marginRight: 12 },
  profileEditIntroCopy: { flex: 1 },
  profileEditIntroTitle: { color: '#8B4F59', fontSize: 14, fontWeight: '800' },
  profileEditIntroText: { color: '#A77E80', fontSize: 11, marginTop: 3, lineHeight: 16 },
  profileSectionDivider: {
    height: 1,
    backgroundColor: '#F1E2E1',
    marginBottom: 18,
  },
  profileSectionTitle: { color: '#493A3A', fontSize: 15, fontWeight: '800' },
  profileSectionHint: { color: '#A99A98', fontSize: 11, lineHeight: 16, marginTop: 4, marginBottom: 12 },
  profileSaveButton: {
    minHeight: 50,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E9788A',
    marginTop: 2,
    shadowColor: '#D66C7B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 7,
    elevation: 2,
  },
  profileSaveButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  profileEditOpenButton: {
    minHeight: 58,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E9788A',
    marginTop: 8,
    paddingHorizontal: 22,
  },
  profileEditOpenButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  profileCancelButton: { alignItems: 'center', paddingVertical: 12 },
  profileCancelText: { color: '#A27478', fontWeight: '700' },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F2E5E3',
    marginBottom: 15,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#493A3A',
  },

  modalSubtitle: {
    fontSize: 11,
    color: '#A99A98',
    marginTop: 5,
  },

  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F7DCDD',
    alignItems: 'center',
    justifyContent: 'center',
  },

  closeButtonText: {
    color: '#A94E60',
    fontWeight: '800',
    fontSize: 15,
  },
  reviewPrompt: {
    color: '#795052',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 11,
  },
  reviewOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  reviewOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF0F2',
    borderWidth: 1,
    borderColor: '#F0D4D8',
    borderRadius: 15,
    minHeight: 50,
    paddingHorizontal: 9,
  },
  reviewOptionEmoji: {
    fontSize: 18,
    marginRight: 7,
  },
  reviewOptionText: {
    color: '#92535C',
    fontSize: 12,
    fontWeight: '800',
  },
  customDateOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0D4D8',
    borderRadius: 15,
    minHeight: 48,
    paddingHorizontal: 14,
    marginTop: 10,
  },
  customDateOptionSelected: {
    backgroundColor: '#FCE1E5',
    borderColor: '#EAB9C2',
  },
  customDateForm: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  dateInput: {
    flex: 1,
    minWidth: 150,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0D4D8',
    borderRadius: 13,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#493A3A',
    fontSize: 13,
  },
  dateSearchButton: {
    backgroundColor: '#E97988',
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  dateSearchButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  dateInputError: {
    width: '100%',
    color: '#B33D4E',
    fontSize: 11,
    lineHeight: 16,
  },
  reviewResults: {
    marginTop: 19,
  },
  reviewDateTitle: {
    color: '#493A3A',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 11,
  },
  partnerStatusCard: {
    backgroundColor: '#FCE1E5',
    borderRadius: 20,
    padding: 15,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: '#EAB9C2',
    shadowColor: '#C75F6D',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },

  partnerStatusLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: '#B47C7B',
  },

  partnerStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 9,
  },

  partnerStatusEmoji: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    fontSize: 24,
    lineHeight: 44,
    textAlign: 'center',
    marginRight: 12,
  },

  partnerStatusText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#92535C',
  },
  incomingSignalCard: {
    backgroundColor: '#FFF0F2',
    borderRadius: 20,
    padding: 15,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#EAB9C2',
    shadowColor: '#C75F6D',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  incomingSignalRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginTop: 9,
  },
  incomingSignalEmoji: {
    alignSelf: 'stretch',
    color: '#92535C',
    fontSize: 20,
    lineHeight: 28,
    marginBottom: 5,
  },
  incomingSignalText: {
    alignSelf: 'stretch',
    color: '#92535C',
    fontSize: 15,
    fontWeight: '800',
  },
  incomingEmptyText: {
    alignSelf: 'stretch',
    color: '#92535C',
    fontSize: 14,
    fontWeight: '700',
  },
});
