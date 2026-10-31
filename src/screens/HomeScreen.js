
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
} from '../services/pairService';

import {
  registerForPushNotificationsAsync,
  sendExpoPushNotification,
} from '../services/notificationService';



const ANNIVERSARY_DATE = '2026-10-23';

const signals = [
  { emoji: '🥰', label: 'Nhớ em <3' },
  { emoji: '🌙', label: 'Ngủ ngon <3' },
  { emoji: '☀️', label: 'Dậy thôi!!' },
  { emoji: '🍚', label: 'Ăn cơm chưa đấy??' },
  { emoji: '🍵', label: 'Thèm matcha' },
  { emoji: '🤗', label: 'Ôm một cái' },
  { emoji: '🔥', label: 'Rep chuỗi TopTop' },
  { emoji: '💗', label: 'Yêu em nhiều!!' },
];

const statuses = [
  { emoji: '📚', label: 'Đang học bài' },
  { emoji: '🍚', label: 'Đang ăn cơm' },
  { emoji: '💤', label: 'Đang ngủ khò' },
  { emoji: '🚽', label: 'Đang đi ẻ' },
  { emoji: '😤', label: 'Đang dỗi' },
  { emoji: '🤬', label: 'Đang siêu cáu' },
  { emoji: '🎮', label: 'Đang chơi game' },
  { emoji: '💼', label: 'Đang làm việc' },
  { emoji: '🚗', label: 'Đang đi đường' },
  { emoji: '🥺', label: 'Đang nhớ ai đó' },
  { emoji: '🛁', label: 'Đang tắm' },
  { emoji: '❤️', label: 'Đang yêu đời' },
];



function getDaysTogether() {
  const [year, month, day] = ANNIVERSARY_DATE.split('-').map(Number);
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

export default function HomeScreen({ profile }) {
  const [loveCount, setLoveCount] = useState(0);
  const [myStatus, setMyStatus] = useState(statuses[0]);
  const [incomingSignals, setIncomingSignals] = useState([]);
  const [diaryEntries, setDiaryEntries] = useState([]);
  const [diaryText, setDiaryText] = useState('');
  const [sendingLove, setSendingLove] = useState(false);
  const [sendingDiary, setSendingDiary] = useState(false);
  const [diaryModalVisible, setDiaryModalVisible] = useState(false);
  const [partnerProfile, setPartnerProfile] = useState(null);

  const displayName = profile?.displayName?.trim() || 'Bạn';
  const avatarInitial = displayName.charAt(0).toUpperCase();
  const daysTogether = getDaysTogether();

  const pairId = profile?.pairId;
  const myUid = profile?.uid;
  const partnerUid = profile?.partnerUid;

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
        setMyStatus(data.status);
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>heartbeat.</Text>
            <Text style={styles.subtitle}>A little world for two ❤️</Text>
          </View>

          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{avatarInitial}</Text>
          </View>
        </View>

        <View style={styles.connection}>
          <View style={styles.onlineDot} />
          <Text style={styles.connectionText}>
            {profile?.pairStatus === 'paired'
              ? `Đã kết nối với ${profile.partnerName || 'người thương'}`
              : 'Đang chờ người thương...'}
          </Text>
          <Text style={styles.heartSmall}>♥</Text>
        </View>

        <View style={styles.greeting}>
          <Text style={styles.greetingTitle}>
            Xin chào, {displayName}! ☀️
          </Text>
          <Text style={styles.greetingDesc}>
            Hôm nay ông đã gửi yêu thương chưa?
          </Text>
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

        {/* SỐ LƯỢT NGƯỜI THƯƠNG GỬI CHO MÌNH */}
        <View style={styles.loveCard}>
          <Text style={styles.cardLabel}>
            {profile?.partnerName || 'Người thương'} đã gửi bạn
          </Text>

          <Text style={styles.counter}>{loveCount}</Text>
          <Text style={styles.counterDesc}>lần yêu thương !!</Text>

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

          <Text style={styles.buttonHint}>
            Chạm để gửi một trái tim đến người thương
          </Text>
        </View>

        {/* TRẠNG THÁI */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trạng thái hiện tại @@</Text>
          <Text style={styles.sectionDesc}>
            Cho người ấy biết mình đang làm gì nhé.
          </Text>

          <View style={styles.currentStatusCard}>
            <Text style={styles.currentStatusLabel}>
              TRẠNG THÁI CỦA BẠN
            </Text>

            <View style={styles.currentStatusRow}>
              <Text style={styles.currentStatusEmoji}>
                {myStatus.emoji}
              </Text>
              <Text style={styles.currentStatusText}>
                {myStatus.label}
              </Text>
            </View>
          </View>
          <View style={styles.partnerStatusCard}>
            <Text style={styles.partnerStatusLabel}>
              TRẠNG THÁI NGƯỜI THƯƠNG
            </Text>

            <View style={styles.partnerStatusRow}>
              <Text style={styles.partnerStatusEmoji}>
                {partnerProfile?.status?.emoji || '💗'}
              </Text>

              <Text style={styles.partnerStatusText}>
                {partnerProfile?.displayName || profile?.partnerName || 'Người thương'}{' '}
                {partnerProfile?.status?.label
                  ? partnerProfile.status.label.toLocaleLowerCase('vi-VN')
                  : 'chưa cập nhật trạng thái'}
              </Text>
            </View>
          </View>

          <Text style={styles.chooseStatusTitle}>Chọn trạng thái</Text>

          <View style={styles.statusGrid}>
            {statuses.map((item) => {
              const selected = myStatus.label === item.label;

              return (
                <Pressable
                  key={item.label}
                  onPress={() => handleSelectStatus(item)}
                  style={[
                    styles.statusButton,
                    selected && styles.statusSelected,
                  ]}
                >
                  <Text style={styles.statusEmoji}>{item.emoji}</Text>
                  <Text
                    style={[
                      styles.statusLabel,
                      selected && styles.statusLabelSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* GỬI TÍN HIỆU */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gửi một tín hiệu 💌</Text>
          <Text style={styles.sectionDesc}>
            Chọn một điều muốn nói, người ấy sẽ nhìn thấy.
          </Text>

          <View style={styles.signalGrid}>
            {signals.map((item) => (
              <Pressable
                key={item.label}
                style={({ pressed }) => [
                  styles.signalButton,
                  pressed && styles.pressed,
                ]}
                onPress={() => handleSendSignal(item)}
              >
                <Text style={styles.signalEmoji}>{item.emoji}</Text>
                <Text style={styles.signalLabel}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* TÍN HIỆU ĐƯỢC NGƯỜI THƯƠNG GỬI */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tín hiệu từ người thương</Text>

          {incomingSignals.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                Chưa có tín hiệu mới. Chờ một chiếc tin nhắn dễ thương nhé!
              </Text>
            </View>
          ) : (
            incomingSignals.map((item) => (
              <View key={item.id} style={styles.receivedSignal}>
                <Text style={styles.receivedEmoji}>
                  {item.emoji || '💌'}
                </Text>

                <View style={styles.receivedContent}>
                  <Text style={styles.receivedText}>{item.text}</Text>
                  <Text style={styles.entryMeta}>
                    {item.senderName || 'Người thương'} ·{' '}
                    {formatDate(item.createdAt)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* NHẬT KÝ CHUNG */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Nhật ký của chúng mình 📖
          </Text>
          <Text style={styles.sectionDesc}>
            Những điều nhỏ bé mà cả hai muốn lưu lại.
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
              <Text style={styles.characterCount}>
                {diaryText.length}/2000
              </Text>

              <Pressable
                style={({ pressed }) => [
                  styles.diaryButton,
                  pressed && styles.pressed,
                  (!diaryText.trim() || sendingDiary) &&
                    styles.disabledButton,
                ]}
                onPress={handleAddDiary}
                disabled={!diaryText.trim() || sendingDiary}
              >
                {sendingDiary ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.diaryButtonText}>
                    Lưu nhật ký ♥
                  </Text>
                )}
              </Pressable>
            </View>
          </View>

          {diaryEntries.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                Trang nhật ký đầu tiên đang chờ hai người viết lên.
              </Text>
            </View>
          ) : (
            <>
              {diaryEntries.slice(0, 2).map((entry) => (
                <View key={entry.id} style={styles.diaryEntry}>
                  <Text style={styles.diaryAuthor}>
                    {entry.authorName || 'Một người thương'}
                  </Text>

                  <Text
                    style={styles.diaryEntryText}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {entry.text}
                  </Text>

                  <Text style={styles.entryMeta}>
                    {formatDate(entry.createdAt)}
                  </Text>
                </View>
              ))}

              <Pressable
                style={styles.viewAllDiary}
                onPress={() => setDiaryModalVisible(true)}
              >
                <Text style={styles.viewAllDiaryText}>
                  Xem tất cả nhật ký ({diaryEntries.length}) →
                </Text>
              </Pressable>
            </>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Made with love, just for us.
          </Text>
          <Text style={styles.footerHeart}>♥</Text>
        </View>
      </ScrollView>

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
                  Nhật ký chúng mình
                </Text>
                <Text style={styles.modalSubtitle}>
                  {diaryEntries.length} kỷ niệm đã được lưu ❤️
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
              {diaryEntries.map((entry) => (
                <View key={entry.id} style={styles.diaryEntry}>
                  <Text style={styles.diaryAuthor}>
                    {entry.authorName || 'Một người thương'}
                  </Text>

                  <Text style={styles.diaryEntryText}>
                    {entry.text}
                  </Text>

                  <Text style={styles.entryMeta}>
                    {formatDate(entry.createdAt)}
                  </Text>
                </View>
              ))}
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
  content: {
    paddingHorizontal: 22,
    paddingTop: 60,
    paddingBottom: 40,
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
  },
  avatarText: {
    fontSize: 19,
    fontWeight: '700',
    color: '#C75F6D',
  },
  connection: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FCECEB',
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 20,
    marginTop: 25,
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
    marginTop: 27,
    marginBottom: 20,
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
    borderRadius: 25,
    padding: 22,
    alignItems: 'center',
    marginBottom: 16,
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
    marginTop: 10,
  },
  daysRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 3,
  },
  daysNumber: {
    fontSize: 48,
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
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '700',
    color: '#B46E74',
  },
  counter: {
    fontSize: 55,
    fontWeight: '800',
    color: '#A94E60',
    marginTop: 8,
  },
  counterDesc: {
    fontSize: 12,
    color: '#A66F73',
  },
  loveButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#EA7180',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
    elevation: 5,
    shadowColor: '#C65A68',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  loveButtonText: {
    fontSize: 37,
    color: '#FFFFFF',
  },
  buttonHint: {
    fontSize: 11,
    color: '#A66F73',
    marginTop: 12,
    textAlign: 'center',
  },
  section: {
    marginTop: 30,
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
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 5,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F5EAE7',
  },
  signalEmoji: {
    fontSize: 27,
  },
  signalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#745C5C',
    marginTop: 9,
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
  receivedSignal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 9,
    borderWidth: 1,
    borderColor: '#F5EAE7',
  },
  receivedEmoji: {
    fontSize: 27,
    marginRight: 12,
  },
  receivedContent: {
    flex: 1,
  },
  receivedText: {
    fontSize: 14,
    color: '#745C5C',
    fontWeight: '700',
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
  currentStatusCard: {
    backgroundColor: '#FCE8E9',
    borderRadius: 20,
    padding: 18,
    marginBottom: 22,
  },
  currentStatusLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: '#B47C7B',
  },
  currentStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  currentStatusEmoji: {
    fontSize: 30,
    marginRight: 12,
  },
  currentStatusText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#92535C',
  },
  chooseStatusTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#745C5C',
    marginBottom: 12,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 9,
  },
  statusButton: {
    width: '31.5%',
    minHeight: 88,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3E9E6',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    paddingVertical: 10,
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
    fontSize: 10,
    color: '#856D6B',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 7,
  },
  statusLabelSelected: {
    color: '#B64F60',
    fontWeight: '800',
  },
  footer: {
    alignItems: 'center',
    marginTop: 35,
  },
  footerText: {
    fontSize: 11,
    color: '#B8A5A3',
  },
  footerHeart: {
    fontSize: 15,
    color: '#E96B79',
    marginTop: 6,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },
  disabledButton: {
    opacity: 0.55,
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
  partnerStatusCard: {
  backgroundColor: '#FFFFFF',
  borderRadius: 20,
  padding: 18,
  marginBottom: 22,
  borderWidth: 1,
  borderColor: '#F3E9E6',
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
    marginTop: 12,
  },

  partnerStatusEmoji: {
    fontSize: 28,
    marginRight: 12,
  },

  partnerStatusText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#92535C',
  },
});