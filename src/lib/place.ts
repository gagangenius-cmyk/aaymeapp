import * as Location from 'expo-location';

export interface Place { lat: number; lng: number }

/** The phone's current position, or null when permission is refused or the position cannot be read. */
export async function currentPlace(): Promise<Place | null> {
  try {
    const p = await Location.requestForegroundPermissionsAsync();
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
