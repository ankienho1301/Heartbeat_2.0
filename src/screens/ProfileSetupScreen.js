import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';

export default function ProfileSetupScreen({ onSubmit }) {
  const [name, setName] = useState('');

  const handleSubmit = () => {
    if (!name.trim()) {
      Alert.alert('Thiếu thông tin', 'Nhập tên hiển thị trước nhé!');
      return;
    }

    onSubmit(name.trim());
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>heartbeat.</Text>
      <Text style={styles.subtitle}>Bạn muốn được gọi là gì?</Text>

      <TextInput
        style={styles.input}
        placeholder="Nhập tên của bạn..."
        value={name}
        onChangeText={setName}
        maxLength={30}
      />

      <Pressable style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>Bắt đầu ❤️</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 28,
    backgroundColor: '#FFF8FA',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#F1789A',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 24,
    color: '#555',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#F3C5D2',
    marginBottom: 18,
  },
  button: {
    backgroundColor: '#F1789A',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});