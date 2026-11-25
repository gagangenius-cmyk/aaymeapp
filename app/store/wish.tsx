import React, { useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../src/lib/api';
import { useGet } from '../../src/lib/hooks';
import { Alert } from '../../src/ui/alert';
import { Body, Button, Card, Empty, ErrorBox, Field, H2, Loading, Muted, Screen } from '../../src/ui/kit';

/** Send a birthday / anniversary wish, with an offer, to a customer: a ready message the retailer can edit, sent in the AAYME app or on WhatsApp. */
export default function Wish() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const q = useGet<any>('/store/occasions/upcoming', { days: 60 });
  const o = q.data?.occasions.find((x: any) => String(x.id) === String(id));
  const [offer, setOffer] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const base = o?.wish as string | undefined;
  useEffect(() => { if (base && !msg) setMsg(base); }, [base]);  // eslint-disable-line react-hooks/exhaustive-deps
  const withOffer = (v: string) => { setOffer(v); if (base) setMsg(v.trim() ? base.replace(/ - ([^-]*)$/, ` ${v.trim()} - $1`) : base); };
  const done = (via: 'app' | 'whatsapp') => { qc.invalidateQueries({ queryKey: ['/store/occasions/upcoming'] }); Alert.alert('Done', via === 'app' ? 'The wish was sent to the customer in the app.' : 'Marked as wished.', [{ text: 'OK', onPress: () => router.back() }]); };
  async function send(via: 'app' | 'whatsapp') {
    setBusy(true);
    try {
      if (via === 'whatsapp') await Linking.openURL(`https://wa.me/91${o.customer_phone}?text=${encodeURIComponent(msg.trim())}`);
      await api(`/store/occasions/${o.id}/wish`, { method: 'POST', body: { message: msg.trim(), sent_via: via } });
      done(via);
    } catch (e: any) { Alert.alert('Not sent', e.message); } finally { setBusy(false); }
  }
  if (q.isLoading) return <Screen><Loading /></Screen>;
  if (q.error) return <Screen><ErrorBox error={q.error} retry={q.refetch} /></Screen>;
  if (!o) return <Screen><Empty text="This date was not found" /></Screen>;
  return (
    <Screen>
      <Card>
        <H2>{o.person_name}{o.relation ? ` (${o.relation})` : ''}</H2>
        <Body>{o.kind === 'other' ? o.label || 'Special day' : o.kind === 'birthday' ? 'Birthday' : 'Anniversary'} · {o.days_until === 0 ? 'today' : o.days_until === 1 ? 'tomorrow' : `in ${o.days_until} days`}</Body>
        <Muted>Customer: {o.customer_name} · {o.customer_phone}</Muted>
      </Card>
      <Field label="Your offer (optional)" value={offer} onChangeText={withOffer} placeholder="e.g. Flat 10% off on any cake this week" />
      <Field label="Message" value={msg} onChangeText={setMsg} multiline style={{ minHeight: 110 }} />
      <Button title="Send in the AAYME app" onPress={() => send('app')} loading={busy} disabled={!o.has_app || msg.trim().length < 3} />
      {!o.has_app && <Muted>This customer is not on the AAYME app yet. Use WhatsApp.</Muted>}
      <Button variant="ghost" title="Send on WhatsApp" onPress={() => send('whatsapp')} disabled={busy || msg.trim().length < 3} />
    </Screen>
  );
}
