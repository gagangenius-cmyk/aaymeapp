import React from 'react';
import { RoleTabs } from '../../src/ui/RoleTabs';

export default function DistributorLayout() {
  return (
    <RoleTabs
      tabs={[
        { name: 'index', title: 'Orders', icon: 'receipt' },
        { name: 'catalog', title: 'Products', icon: 'cube' },
        { name: 'retailers', title: 'Retailers', icon: 'storefront' },
        { name: 'team', title: 'Team', icon: 'people' },
        { name: 'more', title: 'More', icon: 'menu' },
      ]}
      hidden={['retailer-new', 'employee-new', 'offers']}
    />
  );
}
