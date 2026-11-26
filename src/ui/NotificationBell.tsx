import React, { useCallback, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useGet } from '../lib/hooks';
import { colors } from '../lib/theme';
import { AppText as Text } from './AppText';

const KEY = 'seen_offer_id';
export const readSeen = async () => { try { return Platform.OS === 'web' ? 0 : Number(await SecureStore.getItemAsync(KEY)) || 0; } catch { return 0; } };
export const markSeen = async (id: number) => { try { if (Platform.OS !== 'web') await SecureStore.setItemAsync(KEY, String(id)); } catch { /* the badge just stays */ } };

/** The customer's bell: a red count of the offers from their stores that they have not opened yet. */
export function NotificationBell() {
  const router = useRouter();
  const q = useGet<any>('/customer/notifications');
  const [seen, setSeen] = useState(0);
  useFocusEffect(useCallback(() => { readSeen().then(setSeen); q.refetch(); }, []));  // eslint-disable-line react-hooks/exhaustive-deps
  const n = (q.data?.items ?? []).filter((x: any) => x.id > seen).length;
  return (
    <Pressable onPress={() => router.push('/customer/notifications')} accessibilityRole="button" accessibilityLabel={`Notifications, ${n} new`}
      style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name="notifications" size={22} color={colors.primary} />
      {n > 0 && <View style={{ position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>{n > 9 ? '9+' : n}</Text></View>}
    </Pressable>
  );
}
