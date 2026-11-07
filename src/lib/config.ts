import Constants from 'expo-constants';

// Android emulator reaches the dev machine at 10.0.2.2. Override with EXPO_PUBLIC_API_URL (e.g. your LAN IP for a real phone).
export const API_URL: string = process.env.EXPO_PUBLIC_API_URL ?? (Constants.expoConfig?.extra?.apiUrl as string);
export const API = `${API_URL}/api/v1`;
