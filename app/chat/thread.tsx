import React, { useRef, useState } from 'react';
import { AppText as Text } from '../../src/ui/AppText';
import { FlatList, KeyboardAvoidingView, Platform, TextInput, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, newKey } from '../../src/lib/api';
import { isSocketConnected } from '../../src/lib/socket';
import { useAuth } from '../../src/lib/auth';
import { colors } from '../../src/lib/theme';
import { Button } from '../../src/ui/kit';

/** One conversation. Refreshes every few seconds; each message carries a client_id so a retry never posts it twice. */
export default function Thread() {
  const { distributor_id, retailer_id, name } = useLocalSearchParams<{ distributor_id: string; retailer_id: string; name?: string }>();
  const { session } = useAuth();
  const qc = useQueryClient();
  const pair = { distributor_id: Number(distributor_id), retailer_id: Number(retailer_id) };
  const key = ['/chat/messages', pair];
  const q = useQuery({ queryKey: key, queryFn: () => api<any>('/chat/messages', { query: pair }), refetchInterval: () => (isSocketConnected() ? 60_000 : 4000) });
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const list = useRef<FlatList>(null);

  async function send() {
    const body = text.trim(); if (!body) return;
    setSending(true);
    try { await api('/chat/messages', { body: { ...pair, body, client_id: newKey() } }); setText(''); await qc.invalidateQueries({ queryKey: key }); }
    finally { setSending(false); }
  }

  const msgs = q.data?.messages ?? [];
  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: name ?? 'Chat' }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <FlatList ref={list} data={msgs} keyExtractor={(m: any) => String(m.id)} contentContainerStyle={{ padding: 12, gap: 8 }}
          onContentSizeChange={() => list.current?.scrollToEnd({ animated: false })}
          renderItem={({ item: m }: any) => {
            const mine = m.sender_id === session?.id;
            const seen = mine && q.data?.peer_last_read_id >= m.id;
            return (
              <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '80%', backgroundColor: mine ? colors.blue : colors.surface2, borderRadius: 14, padding: 10 }}>
                <Text style={{ color: colors.text }}>{m.body}</Text>
                <Text style={{ color: '#ffffff99', fontSize: 10, alignSelf: 'flex-end' }}>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{mine ? (seen ? ' ✓✓' : ' ✓') : ''}</Text>
              </View>
            );
          }} />
        <View style={{ flexDirection: 'row', gap: 8, padding: 10, alignItems: 'flex-end' }}>
          <TextInput value={text} onChangeText={setText} placeholder="Message" placeholderTextColor="#8A97A8" multiline
            style={{ flex: 1, backgroundColor: colors.surface2, color: colors.text, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, maxHeight: 100 }} />
          <Button small title="Send" onPress={send} loading={sending} disabled={!text.trim()} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
