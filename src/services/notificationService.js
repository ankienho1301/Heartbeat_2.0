import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';

// Cấu hình cách hiển thị thông báo khi app đang mở
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Đăng ký nhận Expo Push Token
export async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web') return null;

  // Tạo notification channel cho Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('heartbeat', {
      name: 'Heartbeat',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
    });
  }

  // Kiểm tra quyền thông báo
  const permission = await Notifications.getPermissionsAsync();
  let finalStatus = permission.status;

  if (finalStatus !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }

  if (finalStatus !== 'granted') {
    console.log('Người dùng chưa cấp quyền thông báo.');
    return null;
  }

  // Lấy EAS Project ID
  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ??
    Constants?.easConfig?.projectId;

  if (!projectId) {
    throw new Error(
      'Chưa có EAS projectId. Hãy chạy npx eas-cli@latest init trước.'
    );
  }

  // Lấy Expo Push Token
  try {
  console.log('Đang đăng ký Expo Push Token...');
  console.log('Project ID:', projectId);

  const tokenResult = await Notifications.getExpoPushTokenAsync({
    projectId,
  });

  console.log('EXPO PUSH TOKEN:', tokenResult.data);

  return tokenResult.data;
  } catch (error) {
    console.error('LỖI ĐĂNG KÝ PUSH TOKEN:', error);
    throw error;
  }
}

// Gửi thông báo thông qua Expo Push API
export async function sendExpoPushNotification(
  expoPushToken,
  title,
  body,
  data = {}
) {
  if (!expoPushToken) return false;

  const response = await fetch(
    'https://exp.host/--/api/v2/push/send',
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: expoPushToken,
        sound: 'default',
        title,
        body,
        data,
        priority: 'high',
        channelId: 'heartbeat',
      }),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result?.errors?.[0]?.message ||
      `Expo Push API trả về HTTP ${response.status}.`
    );
  }

  const ticket = Array.isArray(result?.data)
    ? result.data[0]
    : result?.data;

  if (ticket?.status === 'error') {
    throw new Error(
      ticket?.message ||
      ticket?.details?.error ||
      'Expo không nhận được thông báo.'
    );
  }

  return true;
}