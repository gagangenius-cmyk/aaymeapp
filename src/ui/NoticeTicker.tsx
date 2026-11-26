import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../lib/theme';
import { AppText as Text } from './AppText';

/** A line of news from the store that scrolls across, like the ticker at the bottom of a news channel. */
export function NoticeTicker({ text }: { text: string }) {
  const x = useRef(new Animated.Value(0)).current;
  const [box, setBox] = useState(0);
  const [line, setLine] = useState(0);
  useEffect(() => {
    if (!box || !line) return;
    x.setValue(box);
    const loop = Animated.loop(Animated.timing(x, { toValue: -line, duration: Math.max(6000, (box + line) * 22), easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [box, line, text, x]);
  return (
    <View accessible accessibilityLabel={`Notice from the store: ${text}`} style={{ flexDirection: 'row', alignItems: 'stretch', borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.primary }}>
      <View style={{ backgroundColor: colors.cta, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4 }}>
        <Ionicons name="megaphone" size={16} color="#fff" /><Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>NOTICE</Text>
      </View>
      <View style={{ flex: 1, height: 36, justifyContent: 'center', overflow: 'hidden' }} onLayout={(e) => setBox(e.nativeEvent.layout.width)}>
        <Animated.View style={{ position: 'absolute', width: 6000, flexDirection: 'row', transform: [{ translateX: x }] }}>
          <Text onLayout={(e) => setLine(e.nativeEvent.layout.width)} style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>{text.replace(/\s+/g, ' ')}</Text>
        </Animated.View>
      </View>
    </View>
  );
}
