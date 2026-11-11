import React from 'react';
import { useRouter } from 'expo-router';
import { AccountScreen } from '../../src/ui/AccountScreen';
import { Card, MenuLink, Toggle } from '../../src/ui/kit';
import { useSend } from '../../src/lib/hooks';

/** Delivery staff: switch yourself on leave (your distributor stops assigning you orders), plus quick field tools. */
export default function EmployeeAccount() {
  const router = useRouter();
  const setAvail = useSend<{ is_available: boolean }>('/distributor/me/availability', { method: 'PUT', success: 'Updated' });
  const [available, setAvailable] = React.useState(true);
  return (
    <AccountScreen>
      <Card>
        <Toggle label="I am available for deliveries" help="Switch off when you are on leave: new orders will not be assigned to you." value={available}
          onChange={(v) => { setAvailable(v); setAvail.mutate({ is_available: v }, { onError: () => setAvailable(!v) }); }} />
      </Card>
      <MenuLink icon="person-add" label="Add a retailer" onPress={() => router.push('/(employee)/retailer-new')} />
      <MenuLink icon="map" label="Shops near me" onPress={() => router.push('/field')} />
      <MenuLink icon="images" label="Field records & photos" onPress={() => router.push('/field/records')} />
      <MenuLink icon="wallet" label="Record a cash collection" onPress={() => router.push('/(employee)/retailers')} />
    </AccountScreen>
  );
}
