import React, { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useGet } from '../lib/hooks';
import { alertNewOffer } from '../lib/push';
import { colors } from '../lib/theme';
import { AppText as Text } from './AppText';

const KEY = 'seen_offer_id';
const ALERTED = 'alerted_offer_id';
const read = async (k: string) => { try { return Platform.OS === 'web' ? 0 : Number(await SecureStore.getItemAsync(k)) || 0; } catch { return 0; } };
const write = async (k: string, id: number) => { try { if (Platform.OS !== 'web') await SecureStore.setItemAsync(k, String(id)); } catch { /* the badge just stays */ } };
export const markSeen = async (id: number) => { await write(KEY, id); await write(ALERTED, id); };

/**
 * The customer's bell: a red count of the offers from their stores that they have not opened yet.
 * While the app is open it looks for new offers every 30 seconds and rings once for each new one.
 */
export function NotificationBell() {
  const router = useRouter();
  const q = useGet<any>('/customer/notifications');
  const [seen, setSeen] = useState(0);
  useFocusEffect(useCallback(() => {
    read(KEY).then(setSeen); q.refetch();
    const t = setInterval(() => q.refetch(), 30_000);
    return () => clearInterval(t);
  }, []));  // eslint-disable-line react-hooks/exhaustive-deps
  const items: any[] = q.data?.items ?? [];
  const newest = items[0];
  useEffect(() => {
    if (!newest) return;
    (async () => {
      if (newest.id <= Math.max(await read(ALERTED), await read(KEY))) return;
      await write(ALERTED, newest.id);
      await alertNewOffer(`${newest.store_name}: ${newest.title}`, newest.description ?? 'New offer', newest.retailer_id);
    })();
  }, [newest?.id]);  // eslint-disable-line react-hooks/exhaustive-deps
  const n = items.filter((x) => x.id > seen).length;
  return (
    <Pressable onPress={() => router.push('/customer/notifications')} accessibilityRole="button" accessibilityLabel={`Notifications, ${n} new`}
      style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name="notifications" size={22} color={colors.primary} />
      {n > 0 && <View style={{ position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>{n > 9 ? '9+' : n}</Text></View>}
    </Pressable>
  );
}
