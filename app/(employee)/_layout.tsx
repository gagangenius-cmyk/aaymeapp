import React from 'react';
import { RoleTabs } from '../../src/ui/RoleTabs';

export default function EmployeeLayout() {
  return (
    <RoleTabs
      tabs={[
        { name: 'index', title: 'Deliveries', icon: 'bicycle' },
        { name: 'route', title: 'Route', icon: 'navigate' },
        { name: 'products', title: 'Products', icon: 'cube' },
        { name: 'retailers', title: 'Retailers', icon: 'storefront' },
        { name: 'account', title: 'Account', icon: 'person-circle' },
      ]}
      hidden={['retailer-new']}
    />
  );
}
