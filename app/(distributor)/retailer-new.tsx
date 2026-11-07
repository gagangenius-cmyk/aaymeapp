import React from 'react';
import { Stack } from 'expo-router';
import { RetailerForm } from '../../src/ui/RetailerScreens';

export default function NewRetailer() {
  return (<>
    <Stack.Screen options={{ headerShown: true, title: 'New retailer', headerStyle: { backgroundColor: '#2874F0' }, headerTintColor: '#fff' }} />
    <RetailerForm />
  </>);
}
