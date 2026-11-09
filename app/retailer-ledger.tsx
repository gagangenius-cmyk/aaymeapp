import React, { useRef, useState } from 'react';
import { Alert } from '../src/ui/alert';
import { useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { api, newKey } from '../src/lib/api';
import { useAuth } from '../src/lib/auth';
import { useGet, useSend } from '../src/lib/hooks';
import { Bills } from '../src/ui/Bills';
import { Body, Button, Card, Chip, ErrorBox, Field, H2, inr, Loading, Muted, Row, Screen } from '../src/ui/kit';

const NOTES = [2000, 500, 200, 100, 50, 20, 10, 5, 2, 1];
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
  const [mode, setMode] = useState<'cash' | 'upi'>('cash');                 // how a payment was received
  const [counts, setCounts] = useState<Record<number, string>>({});          // notes counted, by value
  const [receipt, setReceipt] = useState('');                                 // the number on the paper receipt given
  const [upiRef, setUpiRef] = useState('');
  const [busy, setBusy] = useState(false);
  const key = useRef(newKey());
  const refresh = () => { qc.invalidateQueries({ queryKey: ['/ledger/statement'] }); qc.invalidateQueries({ queryKey: ['/collections/receivables'] }); };
  const reverse = useSend<{ id: number }>((b) => `/ledger/transaction/${b.id}/reverse`, { idempotent: true, invalidate: ['/ledger/statement'] });

  async function post() {
    setBusy(true);
    try {
      const cash = type === 'payment_cash' && mode === 'cash';
      const denominations = Object.fromEntries(NOTES.filter((n) => Number(counts[n]) > 0).map((n) => [String(n), Number(counts[n])]));
      await api('/ledger/transaction', { body: {
        retailer_id: rid, transaction_type: type, amount: cash ? String(counted) : amount, ...(notes ? { notes } : {}),
        ...(type === 'payment_cash' ? { payment_mode: mode, ...(cash ? { cash_denominations: denominations } : { upi_ref: upiRef.trim() }), ...(receipt.trim() ? { receipt_no: receipt.trim() } : {}) } : {}),
      }, idempotent: key.current });
      key.current = newKey(); setAmount(''); setNotes(''); setCounts({}); setReceipt(''); setUpiRef(''); refresh();
    } catch (e: any) { Alert.alert('Not recorded', e.message); } finally { setBusy(false); }
  }
  const types = role === 'employee' ? TYPES.slice(0, 1) : TYPES;
  const counted = NOTES.reduce((sum, n) => sum + n * (Number(counts[n]) || 0), 0);
  const cashMode = type === 'payment_cash' && mode === 'cash';
  const ready = cashMode ? counted > 0 : !!Number(amount) && (type !== 'payment_cash' || upiRef.trim().length >= 4);

  return (
    <Screen onRefresh={st.refetch} refreshing={st.isRefetching}>
      <H2>{name ?? `Retailer #${rid}`}</H2>
      {st.isLoading ? <Loading /> : st.error ? <ErrorBox error={st.error} retry={st.refetch} /> : (<>
        <Card><Muted>Balance due</Muted><H2>{inr(st.data.balance_due)}</H2></Card>
        <Card>
          <Row>{types.map(([k, l]) => <Chip key={k} label={l} active={type === k} onPress={() => setType(k)} />)}</Row>
          {type === 'payment_cash' && <Row><Chip label="Cash" active={mode === 'cash'} onPress={() => setMode('cash')} /><Chip label="UPI" active={mode === 'upi'} onPress={() => setMode('upi')} /></Row>}
          {cashMode ? (<>
            <Muted>How many notes / coins did you collect?</Muted>
            <Row>{NOTES.map((n) => <Field key={n} label={`₹${n}`} value={counts[n] ?? ''} onChangeText={(v) => setCounts({ ...counts, [n]: v.replace(/\D/g, '') })} keyboardType="number-pad" style={{ minWidth: 64 }} />)}</Row>
            <Body style={{ fontWeight: '800' }}>Cash collected: {inr(counted)}</Body>
          </>) : (<>
            <Field label="Amount (INR)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
            {type === 'payment_cash' && <Field label="UPI reference / UTR" value={upiRef} onChangeText={setUpiRef} autoCapitalize="characters" />}
          </>)}
          {type === 'payment_cash' && <Field label="Receipt number (optional)" value={receipt} onChangeText={setReceipt} autoCapitalize="characters" />}
          <Field label="Note (optional)" value={notes} onChangeText={setNotes} />
          <Button title="Record" onPress={post} loading={busy} disabled={!ready} />
        </Card>
        <Bills query={{ retailer_id: rid }} />
        <H2>All entries</H2>
        {st.data.transactions.map((t: any) => (
          <Card key={t.id}>
            <Row style={{ justifyContent: 'space-between' }}><Body style={{ fontWeight: '700' }}>{t.type.replace(/_/g, ' ')}</Body><Body>{inr(t.amount)}</Body></Row>
            <Muted>{new Date(t.created_at).toLocaleString()} · balance {inr(t.balance_after)}{t.order_id ? ` · order #${t.order_id}` : ''}{t.payment_mode === 'upi' ? ` · UPI ${t.upi_ref ?? ''}` : t.payment_mode === 'cash' ? ' · cash' : ''}{t.receipt_no ? ` · receipt ${t.receipt_no}` : ''}{t.notes ? ` · ${t.notes}` : ''}</Muted>
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
