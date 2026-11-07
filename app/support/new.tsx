import React, { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { fieldErrors, useGet, useSend } from '../../src/lib/hooks';
import { Button, Chip, ErrorBox, Field, H2, Loading, Row, Screen } from '../../src/ui/kit';

export default function SupportNew() {
  const { order_id } = useLocalSearchParams<{ order_id?: string }>();
  const router = useRouter();
  const meta = useGet<any>('/support/meta');
  const [cat, setCat] = useState<number | null>(null);
  const [priority, setPriority] = useState<string>('normal');
  const [f, setF] = useState({ subject: '', body: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const create = useSend<any>('/support/tickets', { invalidate: ['/support/tickets'], onDone: (r) => router.replace({ pathname: '/support/[id]', params: { id: String(r.ticket.id) } }) });

  if (meta.isLoading) return <Loading />;
  if (meta.error) return <ErrorBox error={meta.error} retry={meta.refetch} />;
  const submit = () => { setErrors({}); create.mutate({ subject: f.subject, body: f.body, category_id: cat, priority, ...(order_id ? { order_id: Number(order_id) } : {}) }, { onError: (e) => setErrors(fieldErrors(e)) }); };

  return (
    <Screen>
      <H2>Category</H2>
      <Row>{meta.data.categories.map((c: any) => <Chip key={c.id} label={c.name} active={cat === c.id} onPress={() => setCat(c.id)} />)}</Row>
      <H2>Priority</H2>
      <Row>{meta.data.priorities.map((p: string) => <Chip key={p} label={p} active={priority === p} onPress={() => setPriority(p)} />)}</Row>
      <Field label="Subject" value={f.subject} onChangeText={(v) => setF({ ...f, subject: v })} autoCapitalize="sentences" error={errors.subject} />
      <Field label="Describe the problem" value={f.body} onChangeText={(v) => setF({ ...f, body: v })} multiline style={{ minHeight: 100 }} autoCapitalize="sentences" error={errors.body} />
      <Button title="Submit ticket" onPress={submit} loading={create.isPending} disabled={!cat} />
    </Screen>
  );
}
