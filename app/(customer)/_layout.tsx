import React from 'react';
import { RoleTabs } from '../../src/ui/RoleTabs';

export default function CustomerLayout() {
  return (
    <RoleTabs
      tabs={[
        { name: 'index', title: 'Home', icon: 'home' },
        { name: 'search', title: 'Search', icon: 'search' },
        { name: 'orders', title: 'Orders', icon: 'receipt' },
        { name: 'account', title: 'Account', icon: 'person-circle' },
      ]}
    />
  );
}
