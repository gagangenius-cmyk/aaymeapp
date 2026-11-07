import React from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../lib/auth';
import { useGet } from '../lib/hooks';
import { useLang } from '../lib/i18n';
import { Row, Chip, H2 } from './kit';
import { Body, Button, Card, ErrorBox, H1, Loading, MenuLink, Muted, Screen } from './kit';
import { Logo } from './Logo';

/** Profile + sign-out, shared by every role (GET /me). */
export function AccountScreen({ children }: { children?: React.ReactNode }) {
  const { signOut } = useAuth();
  const router = useRouter();
  const { lang, setLang } = useLang();
  const me = useGet<any>('/me');
  return (
    <Screen onRefresh={me.refetch} refreshing={me.isRefetching}>
      <H1>Account</H1>
      {me.isLoading ? <Loading /> : me.error ? <ErrorBox error={me.error} retry={me.refetch} /> : (
        <Card>
          <Body style={{ fontWeight: '700', fontSize: 18 }}>{me.data.name}</Body>
          <Muted>{String(me.data.role).replace('_', ' ')} · {me.data.phone}</Muted>
          {!!me.data.email && <Muted>{me.data.email}{me.data.email_verified ? ' (verified)' : ' (not verified)'}</Muted>}
        </Card>
      )}
      {children}
      <H2>Language</H2>
      <Row><Chip label="English" active={lang === 'en'} onPress={() => setLang('en')} /><Chip label="हिन्दी" active={lang === 'hi'} onPress={() => setLang('hi')} /></Row>
      <MenuLink icon="lock-closed" label="Security & privacy" onPress={() => router.push('/security')} />
      <Button title="Sign out" variant="ghost" onPress={signOut} />
      <Logo size={56} tagline={false} />
    </Screen>
  );
}
