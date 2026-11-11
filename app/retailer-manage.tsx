import React, { useEffect, useState } from 'react';
import { toast } from '../src/ui/Toast';
import { Alert } from '../src/ui/alert';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../src/lib/auth';
import { useGet, useSend } from '../src/lib/hooks';
import { CategoryPicker } from '../src/ui/CategoryPicker';
import { Body, Button, Card, Chip, ErrorBox, H2, Loading, Muted, Row, Screen } from '../src/ui/kit';

/** One retailer: open their khata, choose which categories they can buy, reset a wrongly pinned shop location. */
export default function RetailerManage() {
  const { retailer_id, name } = useLocalSearchParams<{ retailer_id: string; name?: string }>();
  const { role } = useAuth();
  const router = useRouter();
  const rid = Number(retailer_id);
  const isOwner = role === 'distributor';
  const cats = useGet<any>(`/distributor/retailers/${rid}/categories`, undefined, isOwner);
  const [sel, setSel] = useState<number[]>([]);
  useEffect(() => { if (cats.data) setSel(cats.data.categories.map((c: any) => c.id)); }, [cats.data]);
  const save = useSend<{ category_ids: number[] }>(`/distributor/retailers/${rid}/categories`, { method: 'PUT', invalidate: [`/distributor/retailers/${rid}/categories`, '/distributor/retailers'], onDone: () => toast.success('Saved') });
  const reset = useSend<any>(`/field/retailers/${rid}/location/reset`, { onDone: () => Alert.alert('Location reset', 'The retailer can pin it again from their shop.') });

  return (
    <Screen>
      <Card><H2>{name ?? `Retailer #${rid}`}</H2>
        <Button small title="Open khata" onPress={() => router.push({ pathname: '/retailer-ledger', params: { retailer_id: String(rid), name } })} />
        {isOwner && <Button small variant="ghost" title="Reset shop location" onPress={() => Alert.alert('Reset location?', 'Use this when the pinned location is wrong.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Reset', onPress: () => reset.mutate({}) }])} />}
      </Card>
      {isOwner && (cats.isLoading ? <Loading /> : cats.error ? <ErrorBox error={cats.error} retry={cats.refetch} /> : (
        <Card>
          <H2>Categories this retailer can buy</H2>
          <Muted>{cats.data.restricted ? 'They see prices for, and can order from, only the chosen categories (a main category includes its sub-categories).' : 'Optional. With none chosen, this retailer sees everything you sell.'}</Muted>
          <CategoryPicker categories={cats.data.offered} selected={sel} onChange={setSel} />
          {cats.data.offered.length > 0 && <Button small title="Save categories" loading={save.isPending} disabled={cats.data.restricted && !sel.length} onPress={() => save.mutate({ category_ids: sel })} />}
        </Card>
      ))}
      {!isOwner && <Body>Ask your distributor to change this retailer's categories.</Body>}
    </Screen>
  );
}
