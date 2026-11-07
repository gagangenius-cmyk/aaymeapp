import { useCallback } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Easing, interpolateColor, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

/** Light tap feedback on real devices (no-op on web). Never throws: haptics are a nicety. */
export const tap = (kind: 'light' | 'medium' | 'success' | 'error' = 'light') => {
  if (Platform.OS === 'web') return;
  try {
    if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else if (kind === 'error') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    else Haptics.impactAsync(kind === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
  } catch { /* ignore */ }
};

/** A springy "press in" scale. Spread `handlers` on a Pressable and `style` on an Animated view. */
export function usePressScale(to = 0.97) {
  const s = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  const onPressIn = useCallback(() => { s.value = withSpring(to, { damping: 18, stiffness: 420 }); }, [s, to]);
  const onPressOut = useCallback(() => { s.value = withSpring(1, { damping: 14, stiffness: 320 }); }, [s]);
  return { style, handlers: { onPressIn, onPressOut } };
}

/** Border colour that eases between idle and focused. */
export function useFocusBorder(idle: string, focus: string, error?: boolean, errorColor = '#D93A55') {
  const f = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ borderColor: error ? errorColor : interpolateColor(f.value, [0, 1], [idle, focus]) }));
  return {
    style,
    onFocus: () => { f.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.cubic) }); },
    onBlur: () => { f.value = withTiming(0, { duration: 180, easing: Easing.out(Easing.cubic) }); },
  };
}
