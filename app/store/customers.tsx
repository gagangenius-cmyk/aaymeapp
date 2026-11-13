import React, { useState } from 'react';
import { Linking } from 'react-native';
import { fieldErrors, useGet, useSend } from '../../src/lib/hooks';
import { Body, Button, Card, Chip, Empty, ErrorBox, Field, H2, inr, Loading, Muted, Row, Screen } from '../../src/ui/kit';

const SOURCE: Record<string, string> = { qr: 'Joined by QR', online: 'Ordered online', counter: 'Billed at the counter', manual: 'Added by you' };

/** The store's customers: who joined by QR, who ordered, who was billed at the counter, and what each has spent. */
export default function StoreCustomers() {
  const [find, setFind] = useState('');
  const [f, setF] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const q = useGet<any>('/store/customers', { q: find.trim() || undefined });
  const add = useSend<any>('/store/customers', { invalidate: ['/store/customers', '/store/dashboard'], success: 'Customer added', onDone: () => setF({}) });
  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      <Card>
        <H2>Add a customer</H2>
        <Row><Field label="Name" value={f.name ?? ''} onChangeText={(v) => setF({ ...f, name: v })} autoCapitalize="words" style={{ minWidth: 150 }} error={errors.name} /><Field label="Mobile number" value={f.phone ?? ''} onChangeText={(v) => setF({ ...f, phone: v })} keyboardType="phone-pad" maxLength={10} style={{ minWidth: 150 }} error={errors.phone} /></Row>
        <Button small title="Add" loading={add.isPending} disabled={(f.name ?? '').trim().length < 2 || (f.phone ?? '').length !== 10} onPress={() => { setErrors({}); add.mutate({ name: f.name.trim(), phone: f.phone }, { onError: (e) => setErrors(fieldErrors(e)) }); }} />
      </Card>
      <Field label="Search customers" value={find} onChangeText={setFind} placeholder="Name or phone number" />
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : !q.data.customers.length ? <Empty text="No customers yet. Share your store QR code." /> :
        q.data.customers.map((c: any) => (
          <Card key={c.id}>
            <Row style={{ justifyContent: 'space-between' }}><Body style={{ fontWeight: '700' }}>{c.name}</Body>{c.has_app && <Chip label="On AAYME" tone="ok" />}</Row>
            <Muted>{c.phone} · {SOURCE[c.source] ?? c.source}</Muted>
            <Muted>{c.orders} {c.orders === 1 ? 'order' : 'orders'} · {inr(c.spent)}</Muted>
            <Row><Button small variant="ghost" title="Call" onPress={() => Linking.openURL(`tel:${c.phone}`)} /><Button small variant="ghost" title="WhatsApp" onPress={() => Linking.openURL(`https://wa.me/91${c.phone}`)} /></Row>
          </Card>
        ))}
    </Screen>
  );
}
