import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  loginWithUsername,
  registerWithUsername,
} from '../services/authService';

export default function AuthScreen({ currentUser, onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isRegistering = mode === 'register';

  const handleSubmit = async () => {
    setErrorMessage('');

    if (password.length < 6) {
      setErrorMessage('Mật khẩu cần có ít nhất 6 ký tự.');
      return;
    }

    if (isRegistering && password !== confirmPassword) {
      setErrorMessage('Mật khẩu nhập lại chưa khớp.');
      return;
    }

    try {
      setLoading(true);
      const user = isRegistering
        ? await registerWithUsername(username, password)
        : await loginWithUsername(username, password);
      await onAuthenticated(user);
    } catch (error) {
      const messages = {
        'auth/email-already-in-use': 'Tên đăng nhập này đã được sử dụng.',
        'auth/invalid-credential': 'Tên đăng nhập hoặc mật khẩu không đúng.',
        'auth/user-not-found': 'Không tìm thấy tài khoản này.',
        'auth/wrong-password': 'Tên đăng nhập hoặc mật khẩu không đúng.',
        'auth/weak-password': 'Mật khẩu cần có ít nhất 6 ký tự.',
        'auth/credential-already-in-use': 'Tên đăng nhập này đã được liên kết với tài khoản khác.',
        'auth/provider-already-linked': 'Tài khoản này đã có thông tin đăng nhập.',
        'auth/network-request-failed': 'Không kết nối được mạng. Hãy thử lại.',
      };
      setErrorMessage(
        messages[error.code] || error.message || 'Không thể đăng nhập. Vui lòng thử lại.'
      );
    } finally {
      setLoading(false);
    }
  };

  const changeMode = (nextMode) => {
    setMode(nextMode);
    setErrorMessage('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.logo}>heartbeat.</Text>
        <Text style={styles.title}>
          {isRegistering ? 'Tạo tài khoản của bạn' : 'Chào mừng trở lại'}
        </Text>
        <Text style={styles.subtitle}>
          Đăng nhập để tiếp tục ở bên người thương, kể cả khi đổi điện thoại.
        </Text>

        {currentUser?.isAnonymous && (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              Tạo tài khoản ngay trên thiết bị này để giữ nguyên cặp đôi và dữ liệu hiện có.
            </Text>
          </View>
        )}

        <Text style={styles.label}>TÊN ĐĂNG NHẬP</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="Ví dụ: ankien_23"
          placeholderTextColor="#B9A6A4"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="username"
          maxLength={20}
          editable={!loading}
        />

        <Text style={styles.label}>MẬT KHẨU</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Ít nhất 6 ký tự"
          placeholderTextColor="#B9A6A4"
          secureTextEntry
          textContentType={isRegistering ? 'newPassword' : 'password'}
          autoCapitalize="none"
          maxLength={128}
          editable={!loading}
        />

        {isRegistering && (
          <>
            <Text style={styles.label}>NHẬP LẠI MẬT KHẨU</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Nhập lại mật khẩu"
              placeholderTextColor="#B9A6A4"
              secureTextEntry
              textContentType="newPassword"
              autoCapitalize="none"
              maxLength={128}
              editable={!loading}
            />
          </>
        )}

        {!!errorMessage && (
          <Text accessibilityRole="alert" style={styles.error}>
            {errorMessage}
          </Text>
        )}

        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, loading && styles.disabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>
              {isRegistering ? 'Tạo tài khoản ❤️' : 'Đăng nhập'}
            </Text>
          )}
        </Pressable>

        <View style={styles.switchRow}>
          <Text style={styles.switchText}>
            {isRegistering ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => changeMode(isRegistering ? 'login' : 'register')}
            disabled={loading}
          >
            <Text style={styles.switchAction}>
              {isRegistering ? 'Đăng nhập' : 'Đăng ký'}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.passwordNote}>
          Hãy ghi nhớ mật khẩu. Tài khoản tên đăng nhập chưa có email hoặc số điện thoại để khôi phục mật khẩu.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 22,
    backgroundColor: '#FFF8FA',
  },
  card: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    padding: 24,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F3E5E7',
  },
  logo: {
    color: '#E96B79',
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
  },
  title: {
    color: '#493A3A',
    fontSize: 21,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 16,
  },
  subtitle: {
    color: '#A99A98',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 22,
  },
  notice: {
    backgroundColor: '#FFF3F4',
    borderRadius: 14,
    padding: 13,
    marginBottom: 18,
  },
  noticeText: {
    color: '#A94E60',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  label: {
    color: '#A6787D',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 7,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#FFF9F7',
    borderWidth: 1,
    borderColor: '#F1DFE0',
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: '#493A3A',
    fontSize: 15,
  },
  error: {
    color: '#B33D4E',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 12,
  },
  primaryButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E96B79',
    borderRadius: 15,
    marginTop: 20,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.6,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  switchText: {
    color: '#887978',
    fontSize: 13,
    marginRight: 5,
  },
  switchAction: {
    color: '#D85E70',
    fontSize: 13,
    fontWeight: '800',
    padding: 4,
  },
  passwordNote: {
    color: '#A99A98',
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 18,
  },
});
