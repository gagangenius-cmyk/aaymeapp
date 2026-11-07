import React, { useState } from 'react';
import { Image, StyleProp, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../lib/theme';

/** A product photo that always occupies its box: the picture when there is one (and it loads), a neutral placeholder otherwise. */
export function ProductImage({ uri, size, style }: { uri?: string | null; size?: number; style?: StyleProp<ViewStyle> }) {
  const [failed, setFailed] = useState(false);
  const box: ViewStyle = size ? { width: size, height: size } : { width: '100%', aspectRatio: 1 };
  return (
    <View style={[box, { borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }, style]}>
      {uri && !failed
        ? <Image source={{ uri }} resizeMode="cover" onError={() => setFailed(true)} style={{ width: '100%', height: '100%' }} />
        : <Ionicons name="image-outline" size={size ? size * 0.45 : 40} color={colors.muted} />}
    </View>
  );
}
