import React, { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../lib/theme';
import { AppText } from './AppText';
import { tr } from '../lib/i18n';
import { tap } from './motion';
import { TabInsetContext } from './tabInset';

interface BarProps { state: { index: number; routes: { key: string; name: string }[] }; emitter: { emit: (e: { type: string; target: string; canPreventDefault?: boolean }) => { defaultPrevented: boolean } }; navigateToTab: (routeKey: string) => void }

export interface TabDef { name: string; title: string; icon: keyof typeof Ionicons.glyphMap }

function TabButton({ def, focused, onPress, onLongPress }: { def: TabDef; focused: boolean; onPress: () => void; onLongPress: () => void }) {
  const p = useSharedValue(focused ? 1 : 0);
  useEffect(() => { p.value = withSpring(focused ? 1 : 0, { damping: 15, stiffness: 220 }); }, [focused, p]);
  const pill = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ scaleX: 0.4 + 0.6 * p.value }] }));
  const icon = useAnimatedStyle(() => ({ transform: [{ translateY: -2 * p.value }, { scale: 1 + 0.12 * p.value }] }));
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} accessibilityRole="tab" accessibilityLabel={tr(def.title)} accessibilityState={{ selected: focused }}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 }}>
      <Animated.View style={[{ position: 'absolute', top: 4, width: 52, height: 30, borderRadius: 15, backgroundColor: colors.primary + '22' }, pill]} />
      <Animated.View style={icon}><Ionicons name={focused ? def.icon : (`${def.icon}-outline` as any)} size={22} color={focused ? colors.primary : colors.muted} /></Animated.View>
      <AppText numberOfLines={1} style={{ fontSize: 10.5, marginTop: 3, color: focused ? colors.primary : colors.muted, fontWeight: focused ? '700' : '500' }}>{def.title}</AppText>
    </Pressable>
  );
}

/** Flat full-width bottom navigation, the way Flipkart and Amazon draw it: white bar, hairline top border, tinted active icon. */
function FloatingTabBar({ state, emitter, navigateToTab, tabs }: BarProps & { tabs: TabDef[] }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, paddingBottom: insets.bottom, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: -2 }, elevation: 12 }}>
      <View style={{ flexDirection: 'row' }}>
        {state.routes.map((route, i) => {
          const def = tabs.find((t) => t.name === route.name);
          if (!def) return null;
          const focused = state.index === i;
          const go = () => {
            const e = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !e.defaultPrevented) { tap('light'); navigateToTab(route.key); }
          };
          return <TabButton key={route.key} def={def} focused={focused} onPress={go} onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })} />;
        })}
      </View>
    </View>
  );
}

/** One bottom-tab bar per role. `hidden` routes exist (create/detail screens) but get no tab. */
export function RoleTabs({ tabs, hidden = [] }: { tabs: TabDef[]; hidden?: string[] }) {
  const insets = useSafeAreaInsets();
  return (
    <TabInsetContext.Provider value={56 + insets.bottom}>
    <Tabs
      tabBar={(p: any) => <FloatingTabBar {...p} tabs={tabs} />}
      screenOptions={{ headerShown: false, animation: 'shift', sceneStyle: { backgroundColor: colors.bg } }}>
      {tabs.map((t) => <Tabs.Screen key={t.name} name={t.name} options={{ title: t.title }} />)}
      {hidden.map((h) => <Tabs.Screen key={h} name={h} options={{ title: h }} />)}
    </Tabs>
    </TabInsetContext.Provider>
  );
}
