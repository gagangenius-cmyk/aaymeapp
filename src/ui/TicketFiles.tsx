import React, { useState } from 'react';
import { Linking, Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { useQueryClient } from '@tanstack/react-query';
import { API } from '../lib/config';
import { getSession, uploadRaw } from '../lib/api';
import { Alert } from './alert';
import { toast } from './Toast';
import { Body, Button, Card, H2, Muted, Row } from './kit';

interface Att { id: number; name: string; mime: string; size: number }

/** Photos and PDFs attached to a ticket (evidence for a complaint). Up to 5 files of 5 MB; customer and support staff both see them. */
export function TicketFiles({ ticketId, attachments, canAdd, refreshKeys }: { ticketId: number; attachments: Att[]; canAdd: boolean; refreshKeys: string[] }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const refresh = () => refreshKeys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  async function send(uri: string, mime: string, name: string) {
    setBusy(true);
    try { await uploadRaw(`/support/tickets/${ticketId}/attachments?name=${encodeURIComponent(name)}`, uri, mime); toast.success('File attached'); refresh(); }
    catch (e: any) { Alert.alert('Not attached', e.message); } finally { setBusy(false); }
  }
  async function photo() {
    const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!p.granted) return Alert.alert('Permission needed', 'Allow photo access to attach a picture.');
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (!r.canceled) await send(r.assets[0].uri, r.assets[0].mimeType ?? 'image/jpeg', r.assets[0].fileName ?? 'photo.jpg');
  }
  async function pdf() {
    const r = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
    if (!r.canceled) await send(r.assets[0].uri, r.assets[0].mimeType ?? 'application/pdf', r.assets[0].name);
  }
  // files need the login token, so they are fetched with it and then opened or shared
  async function open(a: Att) {
    try {
      const url = `${API}/support/tickets/${ticketId}/attachments/${a.id}`;
      if (Platform.OS === 'web') return void Linking.openURL(url);
      const dest = `${FileSystem.cacheDirectory}${a.id}-${a.name.replace(/[^\w.\-]/g, '_')}`;
      const r = await FileSystem.downloadAsync(url, dest, { headers: { Authorization: `Bearer ${getSession()?.access_token}` } });
      if (r.status !== 200) throw new Error('The file is no longer available');
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(r.uri, { mimeType: a.mime });
    } catch (e: any) { Alert.alert('Could not open', e.message); }
  }

  if (!attachments.length && !canAdd) return null;
  return (
    <Card>
      <H2>Files ({attachments.length}/5)</H2>
      {attachments.map((a) => (
        <Row key={a.id} style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
          <Body style={{ flex: 1 }} >{a.name}</Body><Muted>{Math.max(1, Math.round(a.size / 1024))} KB</Muted>
          <Button small variant="ghost" title="Open" onPress={() => open(a)} />
        </Row>
      ))}
      {canAdd && attachments.length < 5 && <Row><Button small variant="ghost" title="Attach photo" loading={busy} onPress={photo} /><Button small variant="ghost" title="Attach PDF / file" loading={busy} onPress={pdf} /></Row>}
    </Card>
  );
}
