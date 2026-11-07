import React from 'react';
import { AppText as Text } from './AppText';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { colors } from '../lib/theme';

/** The AAYME mark: navy "A" crossed by a green->gold swoosh. Drawn in SVG so it stays sharp at any size. */
export function LogoMark({ size = 96 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="sw" x1="0" y1="1" x2="1" y2="0">
          <Stop offset="0" stopColor={colors.blue} />
          <Stop offset="0.5" stopColor={colors.green} />
          <Stop offset="1" stopColor={colors.magenta} />
        </LinearGradient>
        <LinearGradient id="a" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#04203F" />
          <Stop offset="1" stopColor="#0B3A6B" />
        </LinearGradient>
      </Defs>
      <Path d="M44 8 Q50 3 56 8 L88 80 Q90 87 83 87 H69 Q64 87 62 82 L50 54 L36 87 H17 Q10 87 13 80 Z" fill="url(#a)" />
      <Path d="M20 80 Q42 44 92 28 Q60 44 44 74 Q34 88 20 80 Z" fill="url(#sw)" />
    </Svg>
  );
}

export function Logo({ size = 96, tagline = true }: { size?: number; tagline?: boolean }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <LogoMark size={size} />
      <Text style={{ color: colors.text, fontSize: size * 0.32, fontWeight: '900', letterSpacing: 3, marginTop: 6 }}>AAYME</Text>
      {tagline && <Text style={{ color: colors.muted, fontSize: size * 0.11, letterSpacing: 4, marginTop: 2 }}>B2B E-COMMERCE</Text>}
    </View>
  );
}
