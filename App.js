
import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';

import HomeScreen from './src/screens/HomeScreen';
import ProfileSetupScreen from './src/screens/ProfileSetupScreen';
import PairScreen from './src/screens/PairScreen';
import AuthScreen from './src/screens/AuthScreen';

import { subscribeToAuthChanges } from './src/services/authService';

import {
  getUserProfile,
  createUserProfile,
  updateUserProfile,
} from './src/services/userService';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [initError, setInitError] = useState(null);

  const loadUserProfile = useCallback(async (user) => {
    setAuthUser(user);
    setInitError(null);

    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const existingProfile = await getUserProfile(user.uid);
      setProfile(existingProfile);
    } catch (error) {
      console.error('APP INITIALIZATION ERROR:', error);
      setInitError(error.message || 'Không thể kết nối Firebase.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeToAuthChanges((user) => {
      if (!active) return;
      setAuthReady(true);
      loadUserProfile(user);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [loadUserProfile]);

  const handleCreateProfile = async ({ displayName, gender }) => {
    try {
      if (!authUser) throw new Error('Vui lòng đăng nhập lại.');

      const updatedProfile = profile?.displayName
        ? await updateUserProfile(authUser.uid, displayName, gender, profile)
        : await createUserProfile(authUser.uid, displayName, gender);

      setProfile(updatedProfile);
    } catch (error) {
      console.error('CREATE PROFILE ERROR:', error.code, error);

      const permissionDenied = error.code === 'permission-denied';

      Alert.alert(
        permissionDenied ? 'Firestore chưa cho phép lưu hồ sơ' : 'Không thể lưu hồ sơ',
        permissionDenied
          ? 'Hãy cập nhật và Publish quy tắc Firestore trong rules.txt ở Firebase Console → Firestore Database → Rules, rồi thử lại. Nếu đã Publish, gửi mình nội dung Rules hiện tại để đối chiếu.'
          : error.message || 'Vui lòng thử lại.'
      );
    }
  };

  const handlePaired = useCallback((updatedProfile) => {
    setProfile(updatedProfile);
  }, []);

  const handleProfileUpdated = useCallback(async ({ displayName, gender }) => {
    if (!authUser || !profile) throw new Error('Không tìm thấy tài khoản hiện tại.');
    const updatedProfile = await updateUserProfile(authUser.uid, displayName, gender, profile);
    setProfile(updatedProfile);
    return updatedProfile;
  }, [authUser, profile]);

  const handleAuthenticated = useCallback(async (user) => {
    await loadUserProfile(user);
  }, [loadUserProfile]);

  if (!authReady || loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#F1789A" />
        <Text style={styles.loadingText}>Đang kết nối...</Text>
      </View>
    );
  }

  if (initError) {
    return (
      <View style={styles.loading}>
        <Text style={styles.errorText}>Lỗi kết nối Firebase</Text>
        <Text>{initError}</Text>
      </View>
    );
  }

  if (!authUser || authUser.isAnonymous) {
    return (
      <AuthScreen
        currentUser={authUser}
        onAuthenticated={handleAuthenticated}
      />
    );
  }

  if (!profile || !profile.displayName || !profile.gender) {
    return (
      <ProfileSetupScreen profile={profile} onSubmit={handleCreateProfile} />
    );
  }

  if (profile.pairStatus !== 'paired') {
    return (
      <PairScreen
        profile={profile}
        onPaired={handlePaired}
      />
    );
  }

  const username = authUser.email?.split('@')[0] || '';
  return <HomeScreen profile={profile} username={username} onProfileUpdated={handleProfileUpdated} />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFF8FA',
  },
  loadingText: {
    marginTop: 12,
    color: '#F1789A',
  },
  errorText: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#D9534F',
  },
});
