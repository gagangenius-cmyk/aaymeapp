import React from 'react';
import { useRouter } from 'expo-router';
import { useGet } from '../../src/lib/hooks';
import { AccountScreen } from '../../src/ui/AccountScreen';
import { MenuLink } from '../../src/ui/kit';

export default function StaffAccount() {
  const router = useRouter();
  const me = useGet<any>('/staff/me');
  const go = (p: string) => () => router.push(p as any);
  const can = (a: string) => me.data?.actions?.includes(a);
  return (
    <AccountScreen>
      {can('handle_support') && <MenuLink icon="headset" label="Support desk" onPress={go('/desk')} />}
      {can('view_team_reports') && <MenuLink icon="download" label="Export team reports" onPress={() => router.push({ pathname: '/reports-export', params: { base: '/staff/team' } })} />}
      {can('view_commissions') && <MenuLink icon="cash" label="Commission report" onPress={go('/staff-commissions')} />}
    </AccountScreen>
  );
}
