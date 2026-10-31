
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

import { signInAnonymouslyIfNeeded } from './src/services/authService';

import {
  getUserProfile,
  createUserProfile,
} from './src/services/userService';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [initError, setInitError] = useState(null);

  useEffect(() => {
    async function initialize() {
      try {
        const currentUser = await signInAnonymouslyIfNeeded();

        console.log('HEARTBEAT AUTH SUCCESS');
        console.log('User UID:', currentUser.uid);

        const existingProfile = await getUserProfile(currentUser.uid);

        console.log('USER PROFILE:', existingProfile);

        setProfile(existingProfile);
      } catch (error) {
        console.error('APP INITIALIZATION ERROR:', error);
        setInitError(error.message || 'Không thể kết nối Firebase.');
      } finally {
        setLoading(false);
      }
    }

    initialize();
  }, []);

  const handleCreateProfile = async (displayName) => {
    try {
      const currentUser = await signInAnonymouslyIfNeeded();

      const newProfile = await createUserProfile(
        currentUser.uid,
        displayName
      );

      setProfile(newProfile);
    } catch (error) {
      console.error('CREATE PROFILE ERROR:', error);

      Alert.alert(
        'Không thể tạo hồ sơ',
        error.message || 'Vui lòng thử lại.'
      );
    }
  };

  const handlePaired = useCallback((updatedProfile) => {
    setProfile(updatedProfile);
  }, []);

  if (loading) {
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

  if (!profile || !profile.displayName) {
    return (
      <ProfileSetupScreen onSubmit={handleCreateProfile} />
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

  return <HomeScreen profile={profile} />;
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
