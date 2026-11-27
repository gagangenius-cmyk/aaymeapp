import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

let registered: string | null = null;

// 'offers' is a new channel on purpose: Android never changes the sound of a channel that already exists
const channel = async () => {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', { name: 'AAYME', importance: Notifications.AndroidImportance.HIGH, sound: 'default', vibrationPattern: [0, 250, 150, 250], lightColor: '#2874F0' });
  await Notifications.setNotificationChannelAsync('offers', { name: 'Offers', importance: Notifications.AndroidImportance.HIGH, sound: 'default', vibrationPattern: [0, 250, 150, 250], lightColor: '#2874F0' });
};

/** Rings the phone for an offer the app has just found (works while the app is open, with or without push set up). */
export async function alertNewOffer(title: string, body: string, retailerId: number): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await channel();
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return;
    await Notifications.scheduleNotificationAsync({ content: { title, body, sound: 'default', data: { type: 'store_offer', id: retailerId } }, trigger: Platform.OS === 'android' ? { channelId: 'offers' } : null });
  } catch { /* the red badge still shows it */ }
}

/** Ask permission, get the Expo push token and tell the server which user it belongs to. Safe to call on every sign-in. */
export async function registerForPush(): Promise<void> {
  try {
    if (!Device.isDevice) return; // emulators cannot receive push
    await channel();
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
