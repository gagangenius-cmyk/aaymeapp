import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export interface Place { lat: number; lng: number }

const ASKED = 'loc_asked';
/**
 * The phone's current position, or null when permission is refused or the position cannot be read.
 * `quiet` is for screens that look up the position by themselves on opening: they ask for permission only once ever
 * (not on every launch), and use the position only while permission is already given.
 */
export async function currentPlace(opts: { quiet?: boolean } = {}): Promise<Place | null> {
  try {
    let p = await Location.getForegroundPermissionsAsync();
    if (!p.granted) {
      if (opts.quiet) {
        if (!p.canAskAgain || Platform.OS === 'web') return null;
        if (await SecureStore.getItemAsync(ASKED).catch(() => null)) return null;
        await SecureStore.setItemAsync(ASKED, '1').catch(() => {});
      }
      p = await Location.requestForegroundPermissionsAsync();
    }
    if (!p.granted) return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: Number(pos.coords.latitude.toFixed(6)), lng: Number(pos.coords.longitude.toFixed(6)) };
  } catch { return null; }
}

/** An address line and pincode for a position (best effort; empty when the phone cannot name the place). */
export async function describePlace(pl: Place): Promise<{ address: string; pincode: string }> {
  try {
    const r = (await Location.reverseGeocodeAsync({ latitude: pl.lat, longitude: pl.lng }))[0];
    if (!r) return { address: '', pincode: '' };
    return { address: [r.name, r.street, r.district, r.city, r.region].filter((x, i, a) => x && a.indexOf(x) === i).join(', '), pincode: /^\d{6}$/.test(r.postalCode ?? '') ? r.postalCode! : '' };
  } catch { return { address: '', pincode: '' }; }
}
