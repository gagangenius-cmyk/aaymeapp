import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../lib/theme';
import { tr } from '../lib/i18n';
import { AppText } from './AppText';
import { tap } from './motion';

export interface Option { value: string | number; label: string; hint?: string }

/**
 * A dropdown: looks like a field with a chevron; tapping it opens a bottom sheet with the choices (searchable when there are many),
 * a tick on the current one, and, when `allowNew` is set, a box to type a value that is not in the list.
 */
export function Select({ label, value, options, onChange, placeholder = 'Choose', allowNew = false, newLabel = 'Add new', clearLabel, error, disabled, style }: {
  label: string; value: string | number | null | undefined; options: Option[]; onChange: (v: string | number | null) => void; placeholder?: string;
  allowNew?: boolean; newLabel?: string; clearLabel?: string; error?: string; disabled?: boolean; style?: any;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [typed, setTyped] = useState('');
  const insets = useSafeAreaInsets();
  const current = options.find((o) => o.value === value);
  const shown = current?.label ?? (value ? String(value) : '');
  const list = useMemo(() => { const t = text.trim().toLowerCase(); return t ? options.filter((o) => o.label.toLowerCase().includes(t)) : options; }, [options, text]);
  const close = () => { setOpen(false); setText(''); setTyped(''); };
  const pick = (v: string | number | null) => { tap('light'); onChange(v); close(); };

  return (
    <View style={[{ gap: 6 }, style]}>
      <AppText style={{ color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 }}>{tr(label).toUpperCase()}</AppText>
      <Pressable onPress={() => { if (!disabled) { tap('light'); setOpen(true); } }} accessibilityRole="button" accessibilityLabel={`${tr(label)}: ${shown || tr(placeholder)}`} accessibilityState={{ disabled }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface2, borderRadius: radius.md, borderWidth: 1.5, borderColor: error ? colors.danger : colors.border, paddingHorizontal: 14, minHeight: 50, opacity: disabled ? 0.5 : 1 }}>
        <AppText numberOfLines={1} style={{ flex: 1, fontSize: 16, color: shown ? colors.text : '#8A97A8' }}>{shown || placeholder}</AppText>
        <Ionicons name="chevron-down" size={20} color={colors.muted} />
      </Pressable>
      {!!error && <AppText style={{ color: colors.danger, fontSize: 12 }}>{error}</AppText>}

      <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
        <View style={{ flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' }}>
          <Pressable style={{ flex: 1 }} onPress={close} accessibilityLabel="Close" />
          <View style={{ backgroundColor: colors.bg, borderTopLeftRadius: 18, borderTopRightRadius: 18, maxHeight: '75%', paddingBottom: 12 + insets.bottom }}>
            <View style={{ alignItems: 'center', paddingTop: 8 }}><View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border }} /></View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 }}>
              <AppText style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>{tr(label)}</AppText>
              <Pressable onPress={close} hitSlop={10} accessibilityLabel="Close"><Ionicons name="close" size={24} color={colors.text} /></Pressable>
            </View>
            {options.length > 8 && (
              <View style={{ marginHorizontal: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderRadius: 22, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12 }}>
                <Ionicons name="search" size={18} color={colors.muted} />
                <TextInput value={text} onChangeText={setText} placeholder={tr('Search')} placeholderTextColor="#8A97A8" style={{ flex: 1, paddingVertical: 10, fontSize: 15, color: colors.text }} />
              </View>
            )}
            <FlatList
              data={list} keyExtractor={(o) => String(o.value)} keyboardShouldPersistTaps="handled"
              ListHeaderComponent={clearLabel && value ? (
                <Pressable onPress={() => pick(null)} style={{ paddingHorizontal: 16, paddingVertical: 14 }}><AppText style={{ color: colors.danger, fontSize: 15, fontWeight: '600' }}>{clearLabel}</AppText></Pressable>
              ) : undefined}
              ListEmptyComponent={<AppText style={{ color: colors.muted, textAlign: 'center', padding: 24 }}>{tr('Nothing found')}</AppText>}
              renderItem={({ item }) => {
                const on = item.value === value;
                return (
                  <Pressable onPress={() => pick(item.value)} accessibilityRole="button" accessibilityState={{ selected: on }}
                    style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: pressed ? colors.surface2 : on ? colors.primary + '12' : colors.surface, borderTopWidth: 1, borderTopColor: colors.border })}>
                    <View style={{ flex: 1 }}>
                      <AppText style={{ color: on ? colors.primary : colors.text, fontSize: 16, fontWeight: on ? '700' : '500' }}>{item.label}</AppText>
                      {!!item.hint && <AppText style={{ color: colors.muted, fontSize: 12 }}>{item.hint}</AppText>}
                    </View>
                    {on && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
                  </Pressable>
                );
              }}
            />
            {allowNew && (
              <View style={{ paddingHorizontal: 16, paddingTop: 10, gap: 6, borderTopWidth: 1, borderTopColor: colors.border }}>
                <AppText style={{ color: colors.muted, fontSize: 12, fontWeight: '700' }}>{tr(newLabel).toUpperCase()}</AppText>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput value={typed} onChangeText={setTyped} placeholder={tr('Type a new one')} placeholderTextColor="#8A97A8" autoCapitalize="words"
                    style={{ flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: colors.text }} />
                  <Pressable onPress={() => typed.trim() && pick(typed.trim())} disabled={!typed.trim()} style={{ backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: 18, justifyContent: 'center', opacity: typed.trim() ? 1 : 0.4 }}>
                    <AppText style={{ color: '#fff', fontWeight: '700' }}>{tr('Use')}</AppText>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
