import React, { useContext, useEffect } from 'react';
import { Pressable, RefreshControl, StyleProp, Switch, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeaderHeightContext } from 'expo-router/react-navigation';
import { TabInsetContext } from './tabInset';
import Animated, { FadeIn, FadeInDown, LinearTransition, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { colors, gradient, radius } from '../lib/theme';
import { AppText } from './AppText';
import { tr } from '../lib/i18n';
import { tap, useFocusBorder, usePressScale } from './motion';

const APressable = Animated.createAnimatedComponent(Pressable);
const ATextInput = Animated.createAnimatedComponent(TextInput);

/**
 * Page container. Scrolls smoothly with bounce, pull-to-refresh, and leaves room for whatever is at the bottom:
 * the floating tab bar when inside tabs, the home indicator otherwise. Under a native header it does not add the status-bar gap twice.
 */
export function Screen({ children, scroll = true, onRefresh, refreshing = false }: { children: React.ReactNode; scroll?: boolean; onRefresh?: () => void; refreshing?: boolean }) {
  const insets = useSafeAreaInsets();
  const header = useContext(HeaderHeightContext);
  const tabBar = useContext(TabInsetContext);
  const top = 0;
  const bottom = tabBar + 28 + (tabBar ? 0 : insets.bottom);
  const inner = { padding: 16, gap: 12, paddingTop: 16 + top, paddingBottom: bottom };
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {!header && insets.top > 0 && <View style={{ height: insets.top, backgroundColor: colors.navy }} />}
      {scroll ? (
        <Animated.ScrollView
          contentContainerStyle={inner} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false} overScrollMode="always" bounces decelerationRate="normal" scrollEventThrottle={16}
          refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={() => { tap('light'); onRefresh(); }} tintColor={colors.cyan} colors={[colors.cyan]} progressBackgroundColor={colors.surface2} progressViewOffset={top} /> : undefined}>
          {children}
        </Animated.ScrollView>
      ) : <View style={[{ flex: 1 }, inner]}>{children}</View>}
    </View>
  );
}

export const H1 = ({ children }: { children: React.ReactNode }) => (
  <Animated.View entering={FadeInDown.duration(320)}><AppText style={{ color: colors.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 }}>{children}</AppText></Animated.View>
);
export const H2 = ({ children }: { children: React.ReactNode }) => <AppText style={{ color: colors.text, fontSize: 17, fontWeight: '700', marginTop: 6, letterSpacing: -0.2 }}>{children}</AppText>;
export const Muted = ({ children, style, numberOfLines }: { children: React.ReactNode; style?: any; numberOfLines?: number }) => <AppText numberOfLines={numberOfLines} style={[{ color: colors.muted, fontSize: 13, lineHeight: 19 }, style]}>{children}</AppText>;
export const Body = ({ children, style, selectable }: { children: React.ReactNode; style?: any; selectable?: boolean }) => <AppText selectable={selectable} style={[{ color: colors.text, fontSize: 15, lineHeight: 21 }, style]}>{children}</AppText>;

/** Raised surface. Fades up when it appears, glides when neighbours change, springs when pressed. */
export function Card({ children, style, onPress }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const press = usePressScale(0.98);
  const base: StyleProp<ViewStyle> = [{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg, padding: 16, gap: 6, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 }, style];
  if (!onPress) return <Animated.View entering={FadeInDown.duration(300).springify().damping(20)} layout={LinearTransition.springify().damping(20)} style={base}>{children}</Animated.View>;
  return (
    <Animated.View entering={FadeInDown.duration(300).springify().damping(20)} layout={LinearTransition.springify().damping(20)}>
      <APressable onPress={() => { tap('light'); onPress(); }} {...press.handlers} style={[base, press.style]}>{children}</APressable>
    </Animated.View>
  );
}

export function Button({ title, onPress, loading, variant = 'primary', disabled, small }: { title: string; onPress: () => void; loading?: boolean; variant?: 'primary' | 'ghost' | 'danger'; disabled?: boolean; small?: boolean }) {
  const off = disabled || loading;
  const press = usePressScale(0.96);
  const box: ViewStyle = { paddingVertical: small ? 9 : 15, paddingHorizontal: small ? 16 : 20, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, minHeight: small ? 36 : 50, flexDirection: 'row', gap: 8 };
  const color = variant === 'danger' ? colors.danger : '#fff';
  const label = (
    <>
      {loading && <Spinner color={color} />}
      <AppText style={{ color: variant === 'ghost' ? colors.text : color, fontWeight: '700', fontSize: small ? 13 : 16 }}>{title}</AppText>
    </>
  );
  const go = () => { tap(variant === 'danger' ? 'medium' : 'light'); onPress(); };
  const a11y = { accessibilityRole: 'button' as const, accessibilityState: { disabled: !!off, busy: !!loading }, accessibilityLabel: title };
  if (variant === 'primary') return (
    <APressable onPress={go} disabled={off} {...press.handlers} {...a11y} style={[{ opacity: off ? 0.5 : 1 }, press.style]}>
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[box, { shadowColor: colors.green, shadowOpacity: 0.25, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 4 }]}>{label}</LinearGradient>
    </APressable>
  );
  return (
    <APressable onPress={go} disabled={off} {...press.handlers} {...a11y}
      style={[box, { opacity: off ? 0.5 : 1, borderWidth: 1, borderColor: variant === 'danger' ? colors.danger + 'AA' : colors.border, backgroundColor: variant === 'danger' ? colors.danger + '14' : colors.surface2 }, press.style]}>
      {label}
    </APressable>
  );
}

/** Tiny rotating arc: lighter than ActivityIndicator and themeable. */
function Spinner({ color }: { color: string }) {
  const r = useSharedValue(0);
  useEffect(() => { r.value = withRepeat(withTiming(360, { duration: 800 }), -1, false); }, [r]);
  const s = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value}deg` }] }));
  return <Animated.View style={[{ width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: color + '55', borderTopColor: color }, s]} />;
}

export function Field({ label, error, ...p }: TextInputProps & { label: string; error?: string }) {
  const focus = useFocusBorder(colors.border, colors.cyan, !!error);
  return (
    <View style={{ gap: 6 }}>
      <AppText style={{ color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 }}>{tr(label).toUpperCase()}</AppText>
      <ATextInput placeholderTextColor="#8A97A8" autoCapitalize="none" selectionColor={colors.cyan} accessibilityLabel={tr(label)} {...p} value={p.value ?? ''} placeholder={p.placeholder ? tr(p.placeholder) : undefined}
        onFocus={(e) => { focus.onFocus(); p.onFocus?.(e); }} onBlur={(e) => { focus.onBlur(); p.onBlur?.(e); }}
        style={[{ backgroundColor: colors.surface2, color: colors.text, borderRadius: radius.md, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, fontFamily: 'Inter_400Regular' }, focus.style, p.style as any]} />
      {!!error && <Animated.View entering={FadeIn.duration(200)}><AppText style={{ color: colors.danger, fontSize: 12 }}>{error}</AppText></Animated.View>}
    </View>
  );
}

export function Toggle({ label, help, value, onChange, disabled }: { label: string; help?: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, opacity: disabled ? 0.45 : 1 }}>
      <View style={{ flex: 1 }}>
        <Body>{label}</Body>
        {!!help && <Muted>{help}</Muted>}
      </View>
      <Switch value={value} onValueChange={(v) => { tap('light'); onChange(v); }} disabled={disabled} trackColor={{ true: colors.blue, false: colors.border }} thumbColor="#fff" ios_backgroundColor={colors.border} />
    </View>
  );
}

export function Chip({ label, active, onPress, tone }: { label: string; active?: boolean; onPress?: () => void; tone?: 'ok' | 'warn' | 'danger' }) {
  const press = usePressScale(0.94);
  const c = tone ? colors[tone] : active ? colors.cyan : colors.border;
  const body = (
    <AppText style={{ color: tone ? colors[tone] : active ? colors.green : colors.muted, fontSize: 12.5, fontWeight: active || tone ? '700' : '500' }}>{label}</AppText>
  );
  const box: ViewStyle = { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 99, borderWidth: 1, borderColor: c, backgroundColor: tone ? colors[tone] + '1A' : active ? colors.green + '1F' : 'transparent' };
  if (!onPress) return <View style={box}>{body}</View>;
  return <APressable onPress={() => { tap('light'); onPress(); }} {...press.handlers} accessibilityRole="button" accessibilityState={{ selected: !!active }} style={[box, press.style]}>{body}</APressable>;
}

export const Row = ({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) => <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }, style]}>{children}</View>;

export function Stat({ label, value, tone }: { label: string; value: string | number; tone?: 'ok' | 'warn' | 'danger' }) {
  return (
    <Card style={{ flex: 1, minWidth: 140 }}>
      <Muted>{label}</Muted>
      <AppText style={{ color: tone ? colors[tone] : colors.text, fontSize: 23, fontWeight: '800', letterSpacing: -0.4 }}>{value}</AppText>
    </Card>
  );
}

export const Empty = ({ text }: { text: string }) => (
  <Animated.View entering={FadeIn.duration(400)} style={{ padding: 40, alignItems: 'center', gap: 10 }}>
    <Ionicons name="file-tray-outline" size={36} color={colors.border} />
    <Muted>{text}</Muted>
  </Animated.View>
);

/** Shimmering placeholder cards while data loads: the layout is already there, so nothing jumps. */
export function Loading() {
  const o = useSharedValue(0.45);
  useEffect(() => { o.value = withRepeat(withSequence(withTiming(1, { duration: 700 }), withTiming(0.45, { duration: 700 })), -1, false); }, [o]);
  const s = useAnimatedStyle(() => ({ opacity: o.value }));
  const bar = (w: string, h = 12) => <View style={{ width: w as any, height: h, borderRadius: 6, backgroundColor: colors.surface2 }} />;
  return (
    <View style={{ gap: 12 }} accessibilityLabel="Loading" accessibilityRole="progressbar">
      {[0, 1, 2].map((i) => (
        <Animated.View key={i} style={[{ backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 10 }, s]}>
          {bar('55%', 15)}{bar('85%')}{bar('40%')}
        </Animated.View>
      ))}
    </View>
  );
}

export const ErrorBox = ({ error, retry }: { error: unknown; retry?: () => void }) => (
  <Animated.View entering={FadeInDown.duration(260)}>
    <Card style={{ borderColor: colors.danger + '88' }}>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <Ionicons name="alert-circle" size={20} color={colors.danger} />
        <AppText style={{ color: colors.danger, flex: 1 }}>{(error as Error)?.message ?? 'Something went wrong'}</AppText>
      </View>
      {retry && <Button title="Try again" variant="ghost" small onPress={retry} />}
    </Card>
  </Animated.View>
);

export const inr = (v: string | number | null | undefined) => '₹' + Number(v ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function MenuLink({ icon, label, onPress, badge }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; badge?: number }) {
  const press = usePressScale(0.98);
  return (
    <Animated.View entering={FadeInDown.duration(280)}>
      <APressable onPress={() => { tap('light'); onPress(); }} {...press.handlers} accessibilityRole="button" accessibilityLabel={label}
        style={[{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg, padding: 14 }, press.style]}>
        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.blue + '22', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={icon} size={19} color={colors.cyan} />
        </View>
        <AppText style={{ color: colors.text, fontSize: 15, flex: 1, fontWeight: '500' }}>{label}</AppText>
        {!!badge && <AppText style={{ color: '#fff', backgroundColor: colors.danger, borderRadius: 99, paddingHorizontal: 8, fontSize: 12, fontWeight: '700', overflow: 'hidden' }}>{badge}</AppText>}
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </APressable>
    </Animated.View>
  );
}
