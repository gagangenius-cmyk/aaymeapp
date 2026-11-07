import React, { useRef, useState } from 'react';
import { Alert } from '../src/ui/alert';
import { useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { api, newKey } from '../src/lib/api';
import { useAuth } from '../src/lib/auth';
import { useGet, useSend } from '../src/lib/hooks';
import { Bills } from '../src/ui/Bills';
import { Body, Button, Card, Chip, ErrorBox, Field, H2, inr, Loading, Muted, Row, Screen } from '../src/ui/kit';

const TYPES = [['payment_cash', 'Cash received'], ['credit_note', 'Credit note'], ['debit_note', 'Debit note']] as const;

/** Distributor / employee: one retailer's khata. Record cash collected (employees: cash only), or adjust with a note. Nothing is ever edited: mistakes are reversed. */
export default function RetailerLedger() {
  const { retailer_id, name } = useLocalSearchParams<{ retailer_id: string; name?: string }>();
  const { role } = useAuth();
  const qc = useQueryClient();
  const rid = Number(retailer_id);
  const st = useGet<any>('/ledger/statement', { retailer_id: rid, limit: 50 });
  const [type, setType] = useState<(typeof TYPES)[number][0]>('payment_cash');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const key = useRef(newKey());
  const refresh = () => { qc.invalidateQueries({ queryKey: ['/ledger/statement'] }); qc.invalidateQueries({ queryKey: ['/collections/receivables'] }); };
  const reverse = useSend<{ id: number }>((b) => `/ledger/transaction/${b.id}/reverse`, { idempotent: true, invalidate: ['/ledger/statement'] });

  async function post() {
    setBusy(true);
    try {
      await api('/ledger/transaction', { body: { retailer_id: rid, transaction_type: type, amount, ...(notes ? { notes } : {}) }, idempotent: key.current });
      key.current = newKey(); setAmount(''); setNotes(''); refresh();
    } catch (e: any) { Alert.alert('Not recorded', e.message); } finally { setBusy(false); }
  }
  const types = role === 'employee' ? TYPES.slice(0, 1) : TYPES;

  return (
    <Screen onRefresh={st.refetch} refreshing={st.isRefetching}>
      <H2>{name ?? `Retailer #${rid}`}</H2>
      {st.isLoading ? <Loading /> : st.error ? <ErrorBox error={st.error} retry={st.refetch} /> : (<>
        <Card><Muted>Balance due</Muted><H2>{inr(st.data.balance_due)}</H2></Card>
        <Card>
          <Row>{types.map(([k, l]) => <Chip key={k} label={l} active={type === k} onPress={() => setType(k)} />)}</Row>
          <Field label="Amount (INR)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
          <Field label="Note (optional)" value={notes} onChangeText={setNotes} />
          <Button title="Record" onPress={post} loading={busy} disabled={!Number(amount)} />
        </Card>
        <Bills query={{ retailer_id: rid }} />
        <H2>All entries</H2>
        {st.data.transactions.map((t: any) => (
          <Card key={t.id}>
            <Row style={{ justifyContent: 'space-between' }}><Body style={{ fontWeight: '700' }}>{t.type.replace(/_/g, ' ')}</Body><Body>{inr(t.amount)}</Body></Row>
            <Muted>{new Date(t.created_at).toLocaleString()} · balance {inr(t.balance_after)}{t.order_id ? ` · order #${t.order_id}` : ''}{t.notes ? ` · ${t.notes}` : ''}</Muted>
            {t.dispute && <Chip label={`Dispute ${t.dispute.status}: ${t.dispute.reason}`} tone="warn" />}
            {role === 'distributor' && !t.reversal_of && t.type !== 'reversal' && t.type !== 'invoice' && (
              <Button small variant="ghost" title="Reverse" onPress={() => Alert.alert('Reverse this entry?', 'A reversing entry is added; the original stays on record.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Reverse', style: 'destructive', onPress: () => reverse.mutate({ id: t.id }) }])} />
            )}
          </Card>
        ))}
      </>)}
    </Screen>
  );
}
