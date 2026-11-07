import React, { useState } from 'react';
import { AppText as Text } from '../../src/ui/AppText';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGet, useSend } from '../../src/lib/hooks';
import { colors } from '../../src/lib/theme';
import { Body, Button, Card, ErrorBox, Loading, Muted, Screen } from '../../src/ui/kit';
import { SearchBar } from '../../src/ui/SearchBar';
import { StoreView } from '../../src/ui/StoreView';

/**
 * The retailer's home. The distributor who first added them (pinned) is shown on top, with its store open.
 * Every other distributor is in a dropdown; picking one opens that store, with all its social links.
 */
export default function RetailerHome() {
  const stores = useGet<any>('/retailer/stores');
  const requests = useGet<any>('/retailer/link-requests');
  const [picked, setPicked] = useState<{ id: number; name: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  if (stores.isLoading) return <Loading />;
  if (stores.error) return <ErrorBox error={stores.error} retry={stores.refetch} />;
  const { primary_distributor: primary, linked_distributors: linked, nearby_distributors: nearby } = stores.data;
  const options = [
    ...(primary ? [{ id: primary.id, name: primary.business_name, tag: 'Your distributor' }] : []),
    ...linked.map((d: any) => ({ id: d.id, name: d.business_name, tag: 'Connected' })),
    ...nearby.map((d: any) => ({ id: d.id, name: d.business_name, tag: 'Near you' })),
  ];
  const current = picked ?? (primary ? { id: primary.id, name: primary.business_name } : null);

  return (
    <Screen onRefresh={() => { stores.refetch(); requests.refetch(); }} refreshing={stores.isRefetching}>
      <View style={{ backgroundColor: colors.navy, marginHorizontal: -16, marginTop: -16, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, gap: 12, zIndex: 10 }}>
        <Pressable onPress={() => options.length > 0 && setOpen(!open)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFFFFF1F', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="storefront" size={20} color={colors.gold} /></View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#FFFFFFAA', fontSize: 12 }}>Deliver from</Text>
            <Text numberOfLines={1} style={{ color: '#fff', fontSize: 17, fontWeight: '800' }}>{current?.name ?? 'Choose a distributor'}</Text>
          </View>
          {options.length > 0 && <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color="#fff" />}
        </Pressable>
        {open && (
          <View style={{ backgroundColor: colors.surface, borderRadius: 14, overflow: 'hidden' }}>
            {options.map((o) => (
              <Pressable key={o.id} onPress={() => { setPicked({ id: o.id, name: o.name }); setOpen(false); }} style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.text }}>{o.name}</Text><Text style={{ color: colors.muted, fontSize: 12 }}>{o.tag}</Text>
              </Pressable>
            ))}
          </View>
        )}
        {current && <SearchBar value={query} onChange={setQuery} placeholder="Search for products, brands and more" scan />}
      </View>

      {!!requests.data?.requests?.length && requests.data.requests.map((r: any) => <RequestCard key={r.id} r={r} onDone={() => { requests.refetch(); stores.refetch(); }} />)}

      {current ? <StoreView key={current.id} id={current.id} query={query} onQuery={setQuery} /> : (
        <Card><Body>No distributor yet</Body><Muted>Ask your distributor to add you, or enable your pincode so nearby distributors appear here.</Muted></Card>
      )}
    </Screen>
  );
}

function RequestCard({ r, onDone }: { r: any; onDone: () => void }) {
  const send = useSend<{ what: 'accept' | 'decline' }>((x) => `/retailer/link-requests/${r.id}/${x.what}`, { success: 'Done', onDone });
  const act = (what: 'accept' | 'decline') => send.mutate({ what });
  return (
    <Card style={{ borderColor: colors.cyan }}>
      <Body style={{ fontWeight: '700' }}>{r.business_name} wants to supply you</Body>
      <View style={{ flexDirection: 'row', gap: 8 }}><Button small title="Accept" onPress={() => act('accept')} /><Button small variant="ghost" title="Decline" onPress={() => act('decline')} /></View>
    </Card>
  );
}
