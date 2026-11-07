import React from 'react';
import { RoleTabs } from '../../src/ui/RoleTabs';

export default function StaffLayout() {
  return (
    <RoleTabs
      tabs={[
        { name: 'index', title: 'Distributors', icon: 'business' },
        { name: 'reports', title: 'Reports', icon: 'bar-chart' },
        { name: 'review', title: 'Review', icon: 'checkmark-done' },
        { name: 'account', title: 'Account', icon: 'person-circle' },
      ]}
      hidden={['onboard', 'onboarding', 'distributor-edit']}
    />
  );
}
