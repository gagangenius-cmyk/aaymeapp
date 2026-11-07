import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Screen } from '../../src/ui/kit';
import { StoreView } from '../../src/ui/StoreView';

export default function StorePage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Screen><StoreView id={Number(id)} /></Screen>;
}
