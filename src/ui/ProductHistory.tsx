import React, { useState } from 'react';
import { useGet } from '../lib/hooks';
import { Body, Button, Card, Chip, Muted, Row } from './kit';

/** Every change made to a product (price, stock, visibility...), newest first, with who did it. Works for the distributor and, via `base`, for the admin. */
export function ProductHistory({ productId, base = '/catalog' }: { productId: number; base?: string }) {
  const [open, setOpen] = useState(false);
  const q = useGet<any>(`${base}/${productId}/versions`, undefined, open);
  const fmt = (v: any) => (v && typeof v === 'object' ? JSON.stringify(v) : String(v));
  return (
    <>
      <Button small variant="ghost" title={open ? 'Hide history' : 'Price & change history'} onPress={() => setOpen(!open)} />
      {open && (q.data?.versions ?? []).map((v: any) => (
        <Card key={v.version}>
          <Row style={{ justifyContent: 'space-between' }}><Body style={{ fontWeight: '700' }}>Version {v.version}</Body><Chip label={String(v.change_type).replace(/_/g, ' ')} /></Row>
          <Muted>{new Date(v.at).toLocaleString()}{v.by ? ` · ${v.by}` : ''}</Muted>
          {Object.entries(v.changes ?? {}).slice(0, 8).map(([k, c]: any) => (
            <Muted key={k}>{k.replace(/_/g, ' ')}: {c && typeof c === 'object' && 'from' in c ? `${fmt(c.from)} → ${fmt(c.to)}` : fmt(c)}</Muted>
          ))}
        </Card>
      ))}
      {open && q.isLoading && <Muted>Loading history…</Muted>}
    </>
  );
}
