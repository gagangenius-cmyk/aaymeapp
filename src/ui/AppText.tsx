import React from 'react';
import { StyleSheet, Text, TextProps } from 'react-native';
import { tr, useLang } from '../lib/i18n';

/**
 * Inter, one font file per weight (Android ignores fontWeight on custom fonts). Pass fontWeight in style as usual:
 * it is translated to the right family here, so the rest of the app never thinks about it.
 */
const FAMILY: Record<string, string> = {
  '400': 'Inter_400Regular', normal: 'Inter_400Regular', '500': 'Inter_500Medium', '600': 'Inter_600SemiBold',
  '700': 'Inter_700Bold', bold: 'Inter_700Bold', '800': 'Inter_800ExtraBold', '900': 'Inter_800ExtraBold',
};

export function AppText({ style, children, ...p }: TextProps) {
  useLang(); // re-render when the language changes
  // plain strings are translated from the dictionary; anything dynamic (numbers, names, mixed children) is left as is
  const content = typeof children === 'string' ? tr(children) : children;
  const flat = StyleSheet.flatten(style) ?? {};
  const { fontWeight, ...rest } = flat as any;
  return <Text {...p} style={[{ fontFamily: FAMILY[String(fontWeight ?? '400')] ?? FAMILY['400'] }, rest]}>{content}</Text>;
}
