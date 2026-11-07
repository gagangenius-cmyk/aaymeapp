import React from 'react';
import { RoleTabs } from '../../src/ui/RoleTabs';

export default function AdminLayout() {
  return (
    <RoleTabs
      tabs={[
        { name: 'index', title: 'Dashboard', icon: 'speedometer' },
        { name: 'staff', title: 'Employees', icon: 'people' },
        { name: 'users', title: 'Users', icon: 'search' },
        { name: 'more', title: 'More', icon: 'menu' },
      ]}
      hidden={['staff-form']}
    />
  );
}
