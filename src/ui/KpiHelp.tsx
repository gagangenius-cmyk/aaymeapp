import React, { useState } from 'react';
import { useGet } from '../lib/hooks';
import { Body, Button, Card, Muted } from './kit';

/** "How is this calculated?": the server's own definition of every figure, so sales, profit and collections are never confused. */
export function KpiHelp({ base }: { base: string }) {
  const [open, setOpen] = useState(false);
  const q = useGet<any>(`${base}/kpi-definitions`, undefined, open);
  return (<>
    <Button small variant="ghost" title={open ? 'Hide definitions' : 'How are these calculated?'} onPress={() => setOpen(!open)} />
    {open && (q.data?.definitions ?? []).map((d: any) => <Card key={d.key}><Body style={{ fontWeight: '700' }}>{d.label}</Body><Muted>{d.definition}</Muted></Card>)}
  </>);
}
