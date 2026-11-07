import React from 'react';
import { RoleTabs } from '../../src/ui/RoleTabs';

export default function RetailerLayout() {
  return (
    <RoleTabs
      tabs={[
        { name: 'index', title: 'Store', icon: 'storefront' },
        { name: 'orders', title: 'Orders', icon: 'receipt' },
        { name: 'khata', title: 'Khata', icon: 'wallet' },
        { name: 'offers', title: 'Offers', icon: 'pricetag' },
        { name: 'account', title: 'Account', icon: 'person-circle' },
      ]}
    />
  );
}
