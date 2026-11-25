import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { useGet } from '../lib/hooks';
import { colors, radius } from '../lib/theme';
import { AppText as Text } from './AppText';
import { Button, Muted, Row } from './kit';

const KEY = 'occasion_popup_day';
const today = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);
const when = (n: number) => (n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : `In ${n} days`);
const WHAT: Record<string, string> = { birthday: 'Birthday', anniversary: 'Anniversary', other: 'Special day' };

/** A pop-up on the retailer's dashboard, once a day, when a customer's (or their family's) birthday or anniversary is coming up and has not been wished yet. */
export function OccasionReminder() {
  const router = useRouter();
  const q = useGet<any>('/store/occasions/upcoming', { days: 7 });
  const [open, setOpen] = useState(false);
  const pending = (q.data?.occasions ?? []).filter((o: any) => !o.wished);
  useEffect(() => {
    if (!pending.length) return;
    (async () => {
      try { if (Platform.OS !== 'web' && (await SecureStore.getItemAsync(KEY)) === today()) return; } catch { /* ask again */ }
      setOpen(true);
    })();
  }, [pending.length]);  // eslint-disable-line react-hooks/exhaustive-deps
  const close = async () => { setOpen(false); try { if (Platform.OS !== 'web') await SecureStore.setItemAsync(KEY, today()); } catch { /* shown again next time */ } };
  if (!pending.length) return null;
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: '#000A', justifyContent: 'center', padding: 20 }}>
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: 18, gap: 12, maxHeight: '80%' }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>🎉 Dates coming up</Text>
          <Muted>Wish your customers in advance, and send them an offer.</Muted>
          <ScrollView contentContainerStyle={{ gap: 10 }}>
            {pending.map((o: any) => (
              <View key={o.id} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, gap: 4 }}>
                <Text style={{ fontWeight: '800', color: colors.text, fontSize: 15 }}>{o.person_name}{o.relation ? ` (${o.relation})` : ''}</Text>
                <Muted>{WHAT[o.kind]}{o.kind === 'other' && o.label ? `: ${o.label}` : ''} · {when(o.days_until)}</Muted>
                <Muted>Customer: {o.customer_name}</Muted>
                <Row><Button small title="Send wish" onPress={() => { close(); router.push({ pathname: '/store/wish', params: { id: String(o.id) } }); }} /></Row>
              </View>
            ))}
          </ScrollView>
          <Row style={{ justifyContent: 'flex-end' }}><Button small variant="ghost" title="Later" onPress={close} /></Row>
        </View>
      </View>
    </Modal>
  );
}
