import React from 'react';
import { Linking, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, radius } from '../lib/theme';
import { AppText as Text } from './AppText';
import { Button, Chip, Muted, Row } from './kit';

const SOCIAL: [string, keyof typeof Ionicons.glyphMap, string][] = [['whatsapp_url', 'logo-whatsapp', '#25D366'], ['facebook_url', 'logo-facebook', '#1877F2'], ['instagram_url', 'logo-instagram', '#E1306C'], ['youtube_url', 'logo-youtube', '#FF0000']];

/** A store as a customer sees it in a list: name, address, distance, delivery time, open now, social links and a Store button. */
export function StoreCard({ s, pinned }: { s: any; pinned?: boolean }) {
  const router = useRouter();
  const open = () => router.push({ pathname: '/customer/store', params: { id: String(s.id) } });
  return (
    <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={s.name}
      style={{ backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: pinned ? colors.primary : colors.border, padding: 14, gap: 8 }}>
      <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, gap: 2 }}>
          {pinned && <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 0.6 }}>YOUR STORE</Text>}
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>{s.name}</Text>
          {!!s.address && <Muted numberOfLines={2}>{s.address}{s.pincode ? `, ${s.pincode}` : ''}</Muted>}
        </View>
        <Ionicons name="storefront" size={30} color={colors.primary} />
      </Row>
      <Row>
        {s.distance_km != null && <Chip label={`${s.distance_km} km`} />}
        {s.delivery_minutes && <Chip label={`${s.delivery_minutes.min}-${s.delivery_minutes.max} min`} />}
        <Chip label={s.open_now ? 'Open now' : 'Closed'} tone={s.open_now ? 'ok' : 'danger'} />
      </Row>
      <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
        <Row style={{ gap: 14 }}>
          {SOCIAL.filter(([k]) => !!s[k]).map(([k, icon, color]) => (
            <Pressable key={k} hitSlop={8} onPress={() => Linking.openURL(s[k]).catch(() => {})} accessibilityLabel={k.replace('_url', '')}><Ionicons name={icon} size={24} color={color} /></Pressable>
          ))}
        </Row>
        <View style={{ minWidth: 120 }}><Button small title="Store" onPress={open} /></View>
      </Row>
    </Pressable>
  );
}
