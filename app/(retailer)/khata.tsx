import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { useGet, useSend } from '../../src/lib/hooks';
import { Bills } from '../../src/ui/Bills';
import { PromptModal, usePrompt } from '../../src/ui/PromptModal';
import { Body, Button, Card, Chip, Empty, ErrorBox, H1, H2, inr, Loading, Muted, Row, Screen } from '../../src/ui/kit';

/** Account ledger with each distributor: what is owed and every invoice / payment entry. */
export default function Khata() {
  const router = useRouter();
  const prompt = usePrompt();
  const dispute = useSend<{ id: number; reason: string }>((b) => `/ledger/transaction/${b.id}/dispute`, { invalidate: ['/ledger/statement'] });
  const list = useGet<any>('/retailer/distributors');
  const [sel, setSel] = useState<number | null>(null);
  const id = sel ?? list.data?.distributors?.[0]?.id;
  const st = useGet<any>('/ledger/statement', { distributor_id: id, limit: 50 }, !!id);
  return (
    <Screen onRefresh={() => { list.refetch(); st.refetch(); }} refreshing={st.isRefetching}>
      <H1>Khata</H1>
      {list.isLoading ? <Loading /> : list.error ? <ErrorBox error={list.error} retry={list.refetch} /> : !list.data.distributors.length ? <Empty text="No account with any distributor yet" /> : (<>
        <Row>{list.data.distributors.map((d: any) => <Chip key={d.id} label={`${d.business_name} · ${inr(d.balance_due)}`} active={id === d.id} onPress={() => setSel(d.id)} />)}</Row>
        {st.data && <Card><Muted>Balance due</Muted><H2>{inr(st.data.balance_due)}</H2><Button small title="Pay now" onPress={() => router.push({ pathname: '/pay', params: { distributor_id: String(id), due: String(st.data.balance_due) } })} /></Card>}
        {!!id && <Bills query={{ distributor_id: id }} />}
        <H2>All entries</H2>
        {st.data?.transactions.map((t: any) => (
          <Card key={t.id}>
            <Row style={{ justifyContent: 'space-between' }}><Body style={{ fontWeight: '700' }}>{t.type.replace(/_/g, ' ')}</Body><Body>{inr(t.amount)}</Body></Row>
            <Muted>{new Date(t.created_at).toLocaleString()}{t.order_id ? ` · order #${t.order_id}` : ''} · balance {inr(t.balance_after)}</Muted>
            {t.dispute ? <Chip label={`Dispute ${t.dispute.status}`} tone="warn" /> : <Button small variant="ghost" title="Dispute" onPress={() => prompt.ask({ title: 'Dispute this entry', label: 'What is wrong?', minLength: 3, onSubmit: (reason) => dispute.mutate({ id: t.id, reason }) })} />}
          </Card>
        ))}
      </>)}
      <PromptModal {...prompt.props} />
    </Screen>
  );
}
