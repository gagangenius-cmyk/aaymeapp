import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

let registered: string | null = null;

/** Ask permission, get the Expo push token and tell the server which user it belongs to. Safe to call on every sign-in. */
export async function registerForPush(): Promise<void> {
  try {
    if (!Device.isDevice) return; // emulators cannot receive push
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', { name: 'AAYME', importance: Notifications.AndroidImportance.HIGH, lightColor: '#0A8F4D' });
    }
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    registered = token;
    await api('/devices', { body: { token, platform: Platform.OS } });
  } catch { /* push is optional: never block sign-in because of it */ }
}

/** Stop pushes for this user on this device (called on sign-out). */
export async function unregisterPush(): Promise<void> {
  if (!registered) return;
  try { await api('/devices', { method: 'DELETE', body: { token: registered } }); } catch { /* ignore */ }
  registered = null;
}

export { routeForNotification } from './notificationRoutes';
