import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../lib/theme';
import { tr } from '../lib/i18n';
import { PRODUCT_CODES, Scanner } from './Scanner';

/** Search box, the way shopping apps show it. With `scan`, a barcode icon opens the camera and searches for the scanned code. */
export function SearchBar({ value, onChange, placeholder = 'Search products', scan }: { value: string; onChange: (v: string) => void; placeholder?: string; scan?: boolean }) {
  const [scanning, setScanning] = useState(false);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 4, paddingHorizontal: 12 }}>
      <Ionicons name="search" size={18} color={colors.muted} />
      <TextInput value={value} onChangeText={onChange} placeholder={tr(placeholder)} placeholderTextColor="#8A97A8" autoCapitalize="none" selectionColor={colors.primary} accessibilityLabel={tr(placeholder)}
        style={{ flex: 1, paddingVertical: 11, fontSize: 15, color: colors.text, fontFamily: 'Inter_400Regular' }} />
      {!!value && <Pressable onPress={() => onChange('')} hitSlop={10}><Ionicons name="close-circle" size={18} color={colors.muted} /></Pressable>}
      {scan && <Pressable onPress={() => setScanning(true)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Scan barcode"><Ionicons name="barcode-outline" size={24} color={colors.text} /></Pressable>}
      {scan && <Scanner visible={scanning} types={PRODUCT_CODES} title="Scan the product barcode" onClose={() => setScanning(false)} onCode={(c) => { setScanning(false); onChange(c.trim()); }} />}
    </View>
  );
}
