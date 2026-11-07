import React, { useEffect, useState } from 'react';
import { toast } from '../../src/ui/Toast';
import { Alert } from '../../src/ui/alert';
import { fieldErrors, useGet, useSend } from '../../src/lib/hooks';
import { Button, Card, ErrorBox, Field, H2, Loading, Muted, Screen, Toggle } from '../../src/ui/kit';

/** Admin: where distributors pay the company, and the two-person rule for commission payouts. */
export default function AdminSettings() {
  const q = useGet<any>('/admin/settings');
  const [upi, setUpi] = useState('');
  const [payee, setPayee] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dual, setDual] = useState(false);
  const cs = useGet<any>('/admin/commission/settlements');
  useEffect(() => { if (q.data) { setUpi(q.data.upi_id ?? ''); setPayee(q.data.payee ?? ''); } }, [q.data]);
  useEffect(() => { if (cs.data) setDual(!!cs.data.dual_control); }, [cs.data]);
  const save = useSend<any>('/admin/settings', { method: 'PUT', invalidate: ['/admin/settings'], onDone: () => toast.success('Saved') });
  const dc = useSend<{ settlement_dual_control: boolean }>('/admin/commission/settings', { method: 'PUT', invalidate: ['/admin/commission/settlements'] });

  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} retry={q.refetch} />;
  return (
    <Screen>
      <Card>
        <H2>Company UPI</H2>
        <Muted>Distributors pay subscription fees here. Check every UTR against this account.</Muted>
        <Field label="UPI id" value={upi} onChangeText={setUpi} placeholder="company@bank" error={errors.company_upi_id} />
        <Field label="Payee name" value={payee} onChangeText={setPayee} error={errors.company_payee} />
        <Button title="Save" loading={save.isPending} onPress={() => { setErrors({}); save.mutate({ company_upi_id: upi, ...(payee ? { company_payee: payee } : {}) }, { onError: (e) => setErrors(fieldErrors(e)) }); }} />
      </Card>
      <Card>
        <H2>Commission payouts</H2>
        <Toggle label="Two-person rule" help="A different admin must confirm that a settlement was paid." value={dual} onChange={(v) => { setDual(v); dc.mutate({ settlement_dual_control: v }); }} />
      </Card>
    </Screen>
  );
}
