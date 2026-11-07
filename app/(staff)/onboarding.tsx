import React, { useState } from 'react';
import { Linking } from 'react-native';
import { Alert } from '../../src/ui/alert';
import { Stack } from 'expo-router';
import { useGet, useSend } from '../../src/lib/hooks';
import { Body, Button, Card, Chip, Empty, ErrorBox, Field, inr, Loading, Muted, Row, Screen } from '../../src/ui/kit';

const TONE: Record<string, 'ok' | 'warn' | 'danger' | undefined> = { completed: 'ok', awaiting_payment: 'warn', payment_submitted: 'warn', failed: 'danger', cancelled: 'danger' };

/** Onboarding requests awaiting the subscription fee: record the UPI reference, or cancel. The admin confirms the money. */
export default function OnboardingRequests() {
  const q = useGet<any>('/staff/onboarding');
  const [utr, setUtr] = useState<Record<number, string>>({});
  const submitUtr = useSend<{ id: number; utr: string }>((b) => `/staff/onboarding/${b.id}/utr`, { invalidate: ['/staff/onboarding'], onDone: () => Alert.alert('Sent', 'The admin will confirm the payment.') });
  const cancel = useSend<{ id: number }>((b) => `/staff/onboarding/${b.id}/cancel`, { invalidate: ['/staff/onboarding'] });
  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      <Stack.Screen options={{ headerShown: true, title: 'Payment requests', headerStyle: { backgroundColor: '#04203F' }, headerTintColor: '#fff' }} />
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : !q.data.requests.length ? <Empty text="No onboarding requests" /> :
        q.data.requests.map((r: any) => (
          <Card key={r.id}>
            <Row style={{ justifyContent: 'space-between' }}><Body style={{ fontWeight: '700' }}>{r.business_name}</Body><Chip label={r.status.replace('_', ' ')} tone={TONE[r.status]} /></Row>
            <Muted>{r.owner_name} · {r.phone} · {r.plan_name} {r.days}d · {inr(r.amount)}</Muted>
            {r.error && <Muted style={{ color: '#D93A55' }}>{r.error}</Muted>}
            {r.status === 'awaiting_payment' && r.method === 'upi' && <>
              {r.pay_to && <Button small variant="ghost" title={`Pay ${inr(r.amount)} to ${r.pay_to.upi_id}`} onPress={() => Linking.openURL(r.pay_to.uri)} />}
              <Field label="UTR / reference (8-30 letters or digits)" value={utr[r.id] ?? ''} onChangeText={(t) => setUtr({ ...utr, [r.id]: t })} autoCapitalize="characters" />
              <Row><Button small title="Submit UTR" onPress={() => submitUtr.mutate({ id: r.id, utr: (utr[r.id] ?? '').trim() })} /><Button small variant="danger" title="Cancel" onPress={() => cancel.mutate({ id: r.id })} /></Row>
            </>}
            {r.checkout_url && <Button small variant="ghost" title="Open payment link" onPress={() => Linking.openURL(r.checkout_url)} />}
          </Card>
        ))}
    </Screen>
  );
}
