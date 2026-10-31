
import { useEffect, useState } from 'react';

import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';

import {
  doc,
  onSnapshot,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';

import { db } from '../services/firebase';

import {
  createPair,
  joinPair,
} from '../services/pairService';

export default function PairScreen({ profile, onPaired }) {
  const [activePairId, setActivePairId] = useState(
    profile?.pairId || null
  );

  const [inviteCode, setInviteCode] = useState(
    profile?.inviteCode || ''
  );

  const [inputCode, setInputCode] = useState('');
  const [loading, setLoading] = useState(false);

  // Theo dõi trạng thái ghép đôi.
  useEffect(() => {
    if (!activePairId) return;

    let partnerUnsubscribe = null;

    const pairRef = doc(db, 'pairs', activePairId);

    const pairUnsubscribe = onSnapshot(
      pairRef,
      (snapshot) => {
        if (!snapshot.exists()) return;

        const pairData = snapshot.data();

        if (pairData.status !== 'paired') return;

        const partnerUid = pairData.members.find(
          (memberUid) => memberUid !== profile.uid
        );

        if (!partnerUid || partnerUnsubscribe) return;

        const partnerRef = doc(
          db,
          'pairs',
          activePairId,
          'profiles',
          partnerUid
        );

        // Chờ hồ sơ thành viên còn lại xuất hiện.
        partnerUnsubscribe = onSnapshot(
          partnerRef,
          async (partnerSnapshot) => {
            if (!partnerSnapshot.exists()) return;

            const partnerName =
              partnerSnapshot.data().displayName || 'Người thương';

            const updatedProfile = {
              ...profile,
              pairId: activePairId,
              pairStatus: 'paired',
              partnerUid,
              partnerName,
            };

            try {
              await updateDoc(doc(db, 'users', profile.uid), {
                pairStatus: 'paired',
                partnerUid,
                partnerName,
                updatedAt: serverTimestamp(),
              });

              onPaired(updatedProfile);
            } catch (error) {
              console.error('PAIR SYNC ERROR:', error);
            }
          },
          (error) => {
            console.error('PARTNER PROFILE ERROR:', error);
          }
        );
      },
      (error) => {
        console.error('PAIR LISTENER ERROR:', error);
      }
    );

    return () => {
      pairUnsubscribe();

      if (partnerUnsubscribe) {
        partnerUnsubscribe();
      }
    };
  }, [activePairId]);

  // Tạo mã mời.
  const handleCreatePair = async () => {
    try {
      setLoading(true);

      const result = await createPair(profile.uid);

      setActivePairId(result.pairId);
      setInviteCode(result.inviteCode);
    } catch (error) {
      console.error('CREATE PAIR ERROR:', error);

      Alert.alert(
        'Không thể tạo mã',
        error.message || 'Vui lòng thử lại.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Tham gia bằng mã mời.
  const handleJoinPair = async () => {
    if (!inputCode.trim()) {
      Alert.alert('Thiếu mã mời', 'Nhập mã của người thương nhé.');
      return;
    }

    try {
      setLoading(true);

      const result = await joinPair(profile.uid, inputCode);

      onPaired(result);
    } catch (error) {
      console.error('JOIN PAIR ERROR:', error);

      Alert.alert(
        'Không thể ghép đôi',
        error.message || 'Vui lòng thử lại.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>heartbeat.</Text>

      <Text style={styles.title}>
        Một thế giới dành cho hai người ❤️
      </Text>

      <Text style={styles.description}>
        Xin chào {profile.displayName}!
        {'\n'}
        Hãy kết nối với người thương để bắt đầu nhé.
      </Text>

      {activePairId ? (
        <View style={styles.waitingCard}>
          <Text style={styles.waitingTitle}>
            Đang chờ người thương...
          </Text>

          <Text style={styles.waitingDescription}>
            Gửi mã này cho người ấy để kết nối với ông.
          </Text>

          <Text style={styles.code}>
            {inviteCode || 'Đang tải mã...'}
          </Text>

          <Text style={styles.waitingHint}>
            Khi người ấy nhập mã thành công,
            ứng dụng sẽ tự động kết nối.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Tạo mã mời
            </Text>

            <Text style={styles.cardDescription}>
              Tạo mã riêng và gửi cho người thương.
            </Text>

            <Pressable
              style={styles.primaryButton}
              onPress={handleCreatePair}
              disabled={loading}
            >
              <Text style={styles.primaryButtonText}>
                Tạo mã kết nối
              </Text>
            </Pressable>
          </View>

          <Text style={styles.orText}>HOẶC</Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Nhập mã mời
            </Text>

            <Text style={styles.cardDescription}>
              Nhập mã mà người thương đã gửi cho ông.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="NHẬP MÃ 8 KÝ TỰ"
              value={inputCode}
              onChangeText={(text) =>
                setInputCode(text.toUpperCase().replace(/\s/g, ''))
              }
              autoCapitalize="characters"
              maxLength={8}
              editable={!loading}
            />

            <Pressable
              style={styles.primaryButton}
              onPress={handleJoinPair}
              disabled={loading}
            >
              <Text style={styles.primaryButtonText}>
                Kết nối ngay ❤️
              </Text>
            </Pressable>
          </View>
        </>
      )}

      {loading && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#E96B79" />
          <Text style={styles.loadingText}>
            Đang xử lý...
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F7',
    justifyContent: 'center',
    padding: 25,
  },

  logo: {
    fontSize: 34,
    fontWeight: '800',
    color: '#E96B79',
    textAlign: 'center',
    marginBottom: 18,
  },

  title: {
    fontSize: 21,
    fontWeight: '800',
    color: '#493A3A',
    textAlign: 'center',
  },

  description: {
    fontSize: 14,
    color: '#A99A98',
    textAlign: 'center',
    lineHeight: 23,
    marginTop: 12,
    marginBottom: 30,
  },

  card: {
    backgroundColor: '#FFFFFF',
    padding: 22,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#F5EAE7',
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#493A3A',
  },

  cardDescription: {
    fontSize: 12,
    color: '#A99A98',
    marginTop: 7,
    marginBottom: 18,
  },

  primaryButton: {
    backgroundColor: '#E96B79',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },

  orText: {
    textAlign: 'center',
    color: '#B8A5A3',
    fontSize: 11,
    fontWeight: '700',
    marginVertical: 18,
  },

  input: {
    backgroundColor: '#FFF9F7',
    borderWidth: 1,
    borderColor: '#F3D9D9',
    borderRadius: 13,
    padding: 15,
    textAlign: 'center',
    letterSpacing: 3,
    fontWeight: '800',
    fontSize: 17,
    color: '#A94E60',
    marginBottom: 15,
  },

  waitingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F5EAE7',
  },

  waitingTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#493A3A',
  },

  waitingDescription: {
    fontSize: 13,
    color: '#A99A98',
    textAlign: 'center',
    marginTop: 12,
  },

  code: {
    fontSize: 29,
    fontWeight: '900',
    color: '#E96B79',
    letterSpacing: 5,
    marginVertical: 25,
  },

  waitingHint: {
    fontSize: 12,
    color: '#A99A98',
    textAlign: 'center',
    lineHeight: 20,
  },

  loading: {
    alignItems: 'center',
    marginTop: 20,
  },

  loadingText: {
    color: '#A99A98',
    marginTop: 8,
  },
});
