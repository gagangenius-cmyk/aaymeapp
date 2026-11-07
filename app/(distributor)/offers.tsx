import React, { useEffect, useState } from 'react';
import { Alert } from '../../src/ui/alert';
import { Stack } from 'expo-router';
import { api } from '../../src/lib/api';
import { fieldErrors, useGet, useSend } from '../../src/lib/hooks';
import { Body, Button, Card, Chip, Field, H2, Muted, Row, Screen } from '../../src/ui/kit';

type Audience = 'all' | 'pincodes' | 'retailers' | 'employee';

/** Send a scheme/offer as a notification: to all retailers, chosen pincodes, hand-picked retailers, or one employee's retailers. */
export default function Offers() {
  const [aud, setAud] = useState<Audience>('all');
  const [f, setF] = useState<Record<string, string>>({});
  const [pins, setPins] = useState('');
  const [retailerIds, setRetailerIds] = useState<number[]>([]);
  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [reach, setReach] = useState<number | null>(null);
  const retailers = useGet<any>('/distributor/retailers', undefined, aud === 'retailers');
  const team = useGet<any>('/distributor/employees', undefined, aud === 'employee');
  const history = useGet<any>('/announcements');

  const pinList = pins.split(/[,\s]+/).filter((p) => /^\d{6}$/.test(p));
  // live "this will reach N retailers" so a wrong selection is obvious before sending
  useEffect(() => {
    const query: Record<string, string> = { audience: aud };
    if (aud === 'pincodes') query.pincodes = pinList.join(',');
    if (aud === 'retailers') query.retailer_ids = retailerIds.join(',');
    if (aud === 'employee' && employeeId) query.employee_id = String(employeeId);
    api('/announcements/audience', { query }).then((r) => setReach(r.recipients)).catch(() => setReach(null));
  }, [aud, pins, retailerIds, employeeId]);

  const send = useSend<any>('/announcements', { invalidate: ['/announcements'], onDone: () => { Alert.alert('Sent', 'Your offer was sent.'); setF({}); } });
  const submit = () => {
    setErrors({});
    send.mutate({
      title: f.title, body: f.body, audience: aud,
      ...(aud === 'pincodes' ? { pincodes: pinList } : {}), ...(aud === 'retailers' ? { retailer_ids: retailerIds } : {}), ...(aud === 'employee' && employeeId ? { employee_id: employeeId } : {}),
      ...(f.valid_until ? { valid_until: f.valid_until } : {}),
    }, { onError: (e) => setErrors(fieldErrors(e)) });
  };
  const toggleRetailer = (id: number) => setRetailerIds(retailerIds.includes(id) ? retailerIds.filter((x) => x !== id) : [...retailerIds, id]);

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'Offers & notifications', headerStyle: { backgroundColor: '#2874F0' }, headerTintColor: '#fff' }} />
      <Field label="Title" value={f.title} onChangeText={(v) => setF({ ...f, title: v })} autoCapitalize="sentences" error={errors.title} />
      <Field label="Message" value={f.body} onChangeText={(v) => setF({ ...f, body: v })} multiline autoCapitalize="sentences" style={{ minHeight: 80 }} error={errors.body} />
      <Field label="Valid until (YYYY-MM-DD, optional)" value={f.valid_until} onChangeText={(v) => setF({ ...f, valid_until: v })} error={errors.valid_until} />

      <H2>Send to</H2>
      <Row>
        <Chip label="All my retailers" active={aud === 'all'} onPress={() => setAud('all')} />
        <Chip label="Pincodes" active={aud === 'pincodes'} onPress={() => setAud('pincodes')} />
        <Chip label="Choose retailers" active={aud === 'retailers'} onPress={() => setAud('retailers')} />
        <Chip label="One employee's retailers" active={aud === 'employee'} onPress={() => setAud('employee')} />
      </Row>
      {aud === 'pincodes' && <Field label="Pincodes (comma separated)" value={pins} onChangeText={setPins} keyboardType="numbers-and-punctuation" error={errors.pincodes} />}
      {aud === 'retailers' && <Row>{retailers.data?.retailers.map((r: any) => <Chip key={r.id} label={r.shop_name} active={retailerIds.includes(r.id)} onPress={() => toggleRetailer(r.id)} />)}</Row>}
      {aud === 'employee' && <Row>{team.data?.employees.map((e: any) => <Chip key={e.id} label={e.name} active={employeeId === e.id} onPress={() => setEmployeeId(e.id)} />)}</Row>}
      {reach !== null && <Muted>This will reach {reach} retailer{reach === 1 ? '' : 's'}.</Muted>}
      <Button title="Send offer" onPress={submit} loading={send.isPending} />

      <H2>Sent recently</H2>
      {history.data?.announcements?.map((a: any) => (
        <Card key={a.id}><Body style={{ fontWeight: '700' }}>{a.title}</Body><Muted>{a.audience} · {a.recipients} recipients · {new Date(a.created_at).toLocaleDateString()}</Muted></Card>
      ))}
    </Screen>
  );
}
