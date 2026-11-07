import React, { useState } from 'react';
import { toast } from '../src/ui/Toast';
import { Share } from 'react-native';
import { Alert } from '../src/ui/alert';
import { api, getSession } from '../src/lib/api';
import { useAuth } from '../src/lib/auth';
import { useGet, useSend } from '../src/lib/hooks';
import { appLock } from '../src/ui/AppLock';
import { Toggle } from '../src/ui/kit';
import { Body, Button, Card, Chip, ErrorBox, Field, H2, Loading, Muted, Row, Screen } from '../src/ui/kit';

/** Account security for every role: email verification, signed-in devices, sign-in history, data export, account deletion. */
export default function Security() {
  const { signOut, role } = useAuth();
  const me = useGet<any>('/me');
  const sessions = useGet<any>('/me/sessions');
  const history = useGet<any>('/me/login-history');
  const [lockOn, setLockOn] = useState(false);
  const [lockOk, setLockOk] = useState(false);
  React.useEffect(() => { appLock.enabled().then(setLockOn); appLock.available().then(setLockOk); }, []);
  const toggleLock = async (v: boolean) => { if (v) { if (await appLock.enable()) setLockOn(true); } else { await appLock.disable(); setLockOn(false); } };
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [delPw, setDelPw] = useState('');
  const sendCode = useSend<any>('/auth/email/send-verification', { onDone: (r) => Alert.alert(r.verified ? 'Already verified' : 'Code sent', r.dev_code ? `Dev code: ${r.dev_code}` : 'Check your inbox.') });
  const verify = useSend<{ code: string }>('/auth/email/verify', { invalidate: ['/me'], onDone: () => { setCode(''); toast.success('Email verified'); } });
  const setMail = useSend<any>('/me/email', { method: 'PUT', invalidate: ['/me'], onDone: () => { setEmail(''); setPw(''); Alert.alert('Email updated', 'Verify it with the code we send.'); } });
  const revoke = useSend<{ id: string }>((b) => `/me/sessions/${b.id}`, { method: 'DELETE', invalidate: ['/me/sessions'] });
  const others = useSend<any>('/me/sessions/revoke-others', { invalidate: ['/me/sessions'] });

  const exportData = async () => {
    try { const d = await api<any>('/me/export'); await Share.share({ message: JSON.stringify(d, null, 2), title: 'AAYME data export' }); }
    catch (e: any) { Alert.alert('Export failed', e.message); }
  };
  const deleteAccount = () => Alert.alert('Delete account?', 'This cannot be undone. Accounts with money owed or owing cannot be deleted.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { try { await api('/me', { method: 'DELETE', body: { password: delPw } }); await signOut(); } catch (e: any) { Alert.alert('Not deleted', e.message); } } },
  ]);

  if (me.isLoading) return <Loading />;
  if (me.error) return <ErrorBox error={me.error} retry={me.refetch} />;
  return (
    <Screen>
      <Card>
        <H2>Email</H2>
        <Body>{me.data.email ?? 'No email on file'}</Body>
        {me.data.email && <Chip label={me.data.email_verified ? 'Verified' : 'Not verified'} tone={me.data.email_verified ? 'ok' : 'warn'} />}
        {me.data.email && !me.data.email_verified && (<>
          <Button small variant="ghost" title="Email me a code" onPress={() => sendCode.mutate({})} />
          <Field label="6-digit code" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} />
          <Button small title="Verify" disabled={code.length !== 6} onPress={() => verify.mutate({ code })} />
        </>)}
        <Field label="New email" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <Field label="Current password" value={pw} onChangeText={setPw} secureTextEntry />
        <Button small variant="ghost" title="Change email" disabled={!email || !pw} onPress={() => setMail.mutate({ email, password: pw })} />
      </Card>

      <Card>
        <H2>App lock</H2>
        <Toggle label="Ask for fingerprint / face / PIN" help={lockOk ? 'Needed when you return to the app after a short while.' : 'Set up a screen lock or fingerprint on this phone first.'} value={lockOn} disabled={!lockOk} onChange={toggleLock} />
      </Card>

      <H2>Signed-in devices</H2>
      {sessions.data?.sessions.map((s: any, i: number) => (
        <Card key={s.id}>
          <Body>{s.device ?? 'Unknown device'}{i === 0 ? ' (most recent)' : ''}</Body>
          <Muted>{s.ip ?? ''} · last active {new Date(s.last_active_at).toLocaleString()}</Muted>
          <Button small variant="danger" title="Sign out this device" onPress={() => revoke.mutate({ id: s.id })} />
        </Card>
      ))}
      {(sessions.data?.sessions.length ?? 0) > 1 && <Button variant="ghost" title="Sign out all other devices" onPress={() => others.mutate({ refresh_token: getSession()?.refresh_token })} />}

      <H2>Recent sign-ins</H2>
      {history.data?.entries.slice(0, 10).map((h: any) => (
        <Row key={h.id} style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}><Muted>{new Date(h.at).toLocaleString()} · {h.ip ?? ''}</Muted><Chip label={h.ok ? 'OK' : h.event.replace('auth.', '').replace(/_/g, ' ')} tone={h.ok ? 'ok' : 'danger'} /></Row>
      ))}

      <H2>Your data</H2>
      <Button variant="ghost" title="Export my data" onPress={exportData} />
      {role !== 'admin' && (<Card>
        <H2>Delete account</H2>
        <Field label="Password" value={delPw} onChangeText={setDelPw} secureTextEntry />
        <Button variant="danger" title="Delete my account" disabled={!delPw} onPress={deleteAccount} />
      </Card>)}
    </Screen>
  );
}
