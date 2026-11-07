jest.mock('expo-secure-store', () => ({ getItemAsync: async () => null, setItemAsync: async () => {}, deleteItemAsync: async () => {} }));
import { HI_MORE } from '../src/lib/hi-more';

describe('Hindi dictionary', () => {
  it('has a non-empty translation for every entry', () => {
    for (const [en, hi] of Object.entries(HI_MORE)) { expect(hi.trim().length).toBeGreaterThan(0); expect(en.trim().length).toBeGreaterThan(0); }
  });
  it('keeps placeholders and punctuation of technical terms intact', () => {
    expect(HI_MORE['Valid until (YYYY-MM-DD, optional)']).toContain('YYYY-MM-DD');
    expect(HI_MORE['Then record the UTR from "Payment requests".']).toContain('UTR');
    expect(HI_MORE['I have paid: submit UTR']).toContain('UTR');
  });
  it('translates the strings the retailer sees most', () => {
    for (const k of ['Pay by UPI', 'Your recent payments', 'Shop location', 'Biggest dues', 'Orders by status']) expect(HI_MORE[k]).toBeTruthy();
  });
});
