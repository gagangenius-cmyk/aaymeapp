import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeOutUp, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../lib/theme';
import { AppText } from './AppText';
import { tap } from './motion';

type Kind = 'success' | 'error' | 'info';
interface Item { id: number; text: string; kind: Kind }

let push: (text: string, kind?: Kind) => void = () => {};
/** Show a short message from anywhere (also outside React). */
export const toast = {
  success: (t: string) => { tap('success'); push(t, 'success'); },
  error: (t: string) => { tap('error'); push(t, 'error'); },
  info: (t: string) => push(t, 'info'),
};

const ICON: Record<Kind, { name: keyof typeof Ionicons.glyphMap; color: string }> = {
  success: { name: 'checkmark-circle', color: colors.ok }, error: { name: 'alert-circle', color: colors.danger }, info: { name: 'information-circle', color: colors.cyan },
};

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<Item[]>([]);
  const seq = useRef(0);
  const add = useCallback((text: string, kind: Kind = 'info') => {
    const id = ++seq.current;
    setItems((l) => (l.some((x) => x.text === text) ? l : [...l.slice(-2), { id, text, kind }]));
    setTimeout(() => setItems((l) => l.filter((x) => x.id !== id)), kind === 'error' ? 4500 : 2600);
  }, []);
  useEffect(() => { push = add; return () => { push = () => {}; }; }, [add]);

  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: insets.top + 8, left: 16, right: 16, gap: 8, zIndex: 100 }}>
      {items.map((t) => (
        <Animated.View key={t.id} entering={FadeInUp.springify().damping(18)} exiting={FadeOutUp.duration(200)} layout={LinearTransition.springify()}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface2, borderColor: ICON[t.kind].color + '66', borderWidth: 1, borderRadius: radius.lg, paddingVertical: 12, paddingHorizontal: 14, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8 }}>
          <Ionicons name={ICON[t.kind].name} size={20} color={ICON[t.kind].color} />
          <AppText style={{ color: colors.text, flex: 1, fontWeight: '500' }}>{t.text}</AppText>
        </Animated.View>
      ))}
    </View>
  );
}
