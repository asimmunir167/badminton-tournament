import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { apiFetch } from './api';

/** Register Expo push token when available. Safe no-op in Expo Go without projectId. */
export async function registerForPushNotifications(accessToken: string | null): Promise<void> {
  if (!accessToken || Platform.OS === 'web') return;

  try {
    // Dynamic require so the app still runs if expo-notifications is not installed yet.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Notifications = require('expo-notifications');
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    const projectId =
      Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId ?? undefined;
    const tokenResponse = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();

    const token = tokenResponse?.data as string | undefined;
    if (!token) return;

    await apiFetch('/api/notifications/push-token', {
      method: 'POST',
      token: accessToken,
      body: { token },
    });
  } catch {
    // Push is optional for demo / Expo Go without credentials.
  }
}
