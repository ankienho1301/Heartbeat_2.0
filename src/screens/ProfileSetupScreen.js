import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';

export default function ProfileSetupScreen({ profile, onSubmit }) {
  const [name, setName] = useState(profile?.displayName || '');
  const [gender, setGender] = useState(profile?.gender || null);

  const handleSubmit = () => {
    if (!name.trim()) {
      Alert.alert('Thiếu thông tin', 'Nhập tên hiển thị trước nhé!');
      return;
    }

    if (!gender) {
      Alert.alert('Chọn cách xưng hô', 'Chọn nam hoặc nữ để người thương nhận được tín hiệu đúng cách xưng hô nhé.');
      return;
    }

    onSubmit({ displayName: name.trim(), gender });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>heartbeat.</Text>
      <Text style={styles.subtitle}>
        {profile?.displayName ? 'Chọn cách xưng hô của bạn' : 'Bạn muốn được gọi là gì?'}
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Nhập tên của bạn..."
        value={name}
        onChangeText={setName}
        maxLength={30}
      />

      <Text style={styles.genderTitle}>Bạn là</Text>
      <View style={styles.genderRow}>
        {[
          { value: 'male', label: 'Nam', emoji: '🙋‍♂️' },
          { value: 'female', label: 'Nữ', emoji: '🙋‍♀️' },
        ].map((option) => {
          const selected = gender === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[styles.genderButton, selected && styles.genderSelected]}
              onPress={() => setGender(option.value)}
            >
              <Text style={styles.genderEmoji}>{option.emoji}</Text>
              <Text style={[styles.genderLabel, selected && styles.genderLabelSelected]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>
          {profile?.displayName ? 'Lưu lựa chọn ❤️' : 'Bắt đầu ❤️'}
        </Text>
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
  genderTitle: {
    color: '#795052',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 22,
  },
  genderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F3C5D2',
    borderRadius: 14,
    padding: 14,
  },
  genderSelected: {
    backgroundColor: '#F9DCDD',
    borderColor: '#E98A94',
    borderWidth: 1.5,
  },
  genderEmoji: {
    fontSize: 19,
  },
  genderLabel: {
    color: '#856D6B',
    fontSize: 15,
    fontWeight: '600',
  },
  genderLabelSelected: {
    color: '#B64F60',
    fontWeight: '800',
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
