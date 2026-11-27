import React from 'react';
import { Image, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import { mediaUrl } from '../lib/api';
import { colors, radius } from '../lib/theme';
import { AppText as Text } from './AppText';

const BG = ['#7A1F2B', '#0B3D6B', '#1E5B3A'];

/** The offers of the customer's stores as full-width banners, one per page. A retailer's own picture is shown whole (2:1); without one, a coloured card with the whole text. */
export function OfferBanners({ banners }: { banners: any[] }) {
  const router = useRouter();
  const { width: screen } = useWindowDimensions();
  const width = Math.min(screen, 720) - 32;
  if (!banners.length) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={width + 12} decelerationRate="fast" contentContainerStyle={{ gap: 12, alignItems: 'stretch' }} style={{ flexGrow: 0 }}>
      {banners.map((b, i) => (
        <Pressable key={b.id} onPress={() => router.push({ pathname: '/customer/store', params: { id: String(b.retailer_id) } })} accessibilityRole="button" accessibilityLabel={`${b.store_name}: ${b.title}`}
          style={{ width, borderRadius: radius.md, overflow: 'hidden', backgroundColor: b.image_url ? colors.surface : BG[i % BG.length] }}>
          {!!b.image_url && <Image source={{ uri: mediaUrl(b.image_url)! }} resizeMode="contain" style={{ width, height: width / 2, backgroundColor: colors.surface2 }} />}
          <View style={{ padding: b.image_url ? 10 : 18, gap: 6 }}>
            <Text style={{ color: b.image_url ? colors.muted : '#FFFFFFB3', fontSize: 12, fontWeight: '700' }}>{b.store_name}</Text>
            <Text style={{ color: b.image_url ? colors.text : '#fff', fontSize: b.image_url ? 15 : 20, lineHeight: b.image_url ? 20 : 26, fontWeight: '800' }}>{b.title}</Text>
            {!!b.description && <Text style={{ color: b.image_url ? colors.muted : '#FFFFFFCC', fontSize: 13 }}>{b.description}</Text>}
            {!b.image_url && <View style={{ alignSelf: 'flex-start', backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6, marginTop: 4 }}><Text style={{ color: '#7A1F2B', fontWeight: '800', fontSize: 13 }}>Order now</Text></View>}
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}
