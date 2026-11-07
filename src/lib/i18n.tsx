import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { HI_MORE } from './hi-more';

export type Lang = 'en' | 'hi';

/**
 * English text is the key. Anything not listed shows in English, so the app is never broken by a missing translation,
 * and a new screen works in both languages the moment its words are added here.
 */
const HI: Record<string, string> = {
  // navigation
  Orders: 'ऑर्डर', Products: 'प्रोडक्ट', Retailers: 'रिटेलर', Team: 'टीम', More: 'और', Store: 'स्टोर', Khata: 'खाता', Offers: 'ऑफर', Account: 'अकाउंट',
  Dashboard: 'डैशबोर्ड', Employees: 'कर्मचारी', Users: 'यूज़र', Distributors: 'डिस्ट्रीब्यूटर', Reports: 'रिपोर्ट', Review: 'रिव्यू', Deliveries: 'डिलीवरी', Route: 'रूट',
  // auth
  'Sign in': 'साइन इन', Phone: 'फ़ोन', Password: 'पासवर्ड', 'Create an account': 'अकाउंट बनाएं', Register: 'रजिस्टर करें', 'Create account': 'अकाउंट बनाएं',
  'Use an emailed code instead': 'ईमेल कोड से लॉगिन करें', 'Use password instead': 'पासवर्ड से लॉगिन करें', 'Email me a code': 'मुझे ईमेल पर कोड भेजें',
  'Verify & sign in': 'वेरिफ़ाई करके साइन इन करें', 'Verify code': 'कोड वेरिफ़ाई करें', 'Sign out': 'साइन आउट', 'New retailer or distributor?': 'नए रिटेलर या डिस्ट्रीब्यूटर?',
  'Already registered?': 'पहले से रजिस्टर हैं?', 'Your name': 'आपका नाम', 'Shop name': 'दुकान का नाम', 'Business name': 'बिज़नेस का नाम', Pincode: 'पिनकोड', Email: 'ईमेल',
  // actions
  Save: 'सेव करें', Cancel: 'रद्द करें', Confirm: 'पक्का करें', Back: 'वापस', Delete: 'हटाएं', Edit: 'बदलें', Add: 'जोड़ें', Send: 'भेजें', Search: 'खोजें', Approve: 'मंज़ूर करें',
  Reject: 'अस्वीकार करें', Accept: 'स्वीकार करें', Decline: 'मना करें', 'Try again': 'दोबारा कोशिश करें', Done: 'हो गया', Close: 'बंद करें', Next: 'आगे', Reload: 'रीलोड करें',
  'Place order': 'ऑर्डर दें', 'Pay now': 'अभी भुगतान करें', 'Add product': 'प्रोडक्ट जोड़ें', 'Add retailer': 'रिटेलर जोड़ें', 'Add new retailer': 'नया रिटेलर जोड़ें', 'Create retailer': 'रिटेलर बनाएं',
  'Add employee': 'कर्मचारी जोड़ें', 'Create employee': 'कर्मचारी बनाएं', 'Send offer': 'ऑफर भेजें', 'Mark delivered': 'डिलीवर हुआ', 'Mark dispatched': 'भेज दिया',
  'Out for delivery': 'डिलीवरी के लिए निकला', 'Accept all': 'सब स्वीकार करें', 'Return items': 'सामान वापस करें', 'Get help': 'मदद लें', Invoice: 'इनवॉइस', Invite: 'आमंत्रित करें',
  // statuses
  placed: 'ऑर्डर मिला', accepted: 'स्वीकृत', dispatched: 'भेजा गया', 'out for delivery': 'डिलीवरी के लिए निकला', delivered: 'डिलीवर हुआ', rejected: 'अस्वीकृत', cancelled: 'रद्द',
  pending: 'लंबित', confirmed: 'पुष्ट', approved: 'मंज़ूर', paid: 'चुकाया', All: 'सभी', Active: 'चालू', Hidden: 'छिपा', 'Out of stock': 'स्टॉक खत्म', 'Low stock': 'कम स्टॉक',
  // screens
  Collections: 'वसूली', Returns: 'वापसी', Support: 'सहायता', Chat: 'चैट', Payments: 'भुगतान', Subscription: 'सब्सक्रिप्शन', Inventory: 'इन्वेंटरी', 'Price lists': 'प्राइस लिस्ट',
  'Business summary': 'बिज़नेस सारांश', 'Security & privacy': 'सुरक्षा और गोपनीयता', 'Expiring stock': 'एक्सपायरी स्टॉक', 'Khata disputes': 'खाता विवाद',
  'Payments to confirm': 'पुष्टि के लिए भुगतान', 'Collections & dues': 'वसूली और बकाया', 'Inventory & warehouses': 'इन्वेंटरी और गोदाम', 'Import products (CSV)': 'प्रोडक्ट इम्पोर्ट (CSV)',
  'Send offers to retailers': 'रिटेलर को ऑफर भेजें', 'Chat with retailers': 'रिटेलर से चैट', 'Chat with distributors': 'डिस्ट्रीब्यूटर से चैट', 'My returns': 'मेरी वापसी',
  'Shop location & visit QR': 'दुकान की लोकेशन और विज़िट QR', 'Business profile, UPI & store links': 'बिज़नेस प्रोफ़ाइल, UPI और स्टोर लिंक', 'Total due': 'कुल बकाया', Overdue: 'अतिदेय',
  'Balance due': 'बकाया राशि', 'Your distributor': 'आपका डिस्ट्रीब्यूटर', 'My orders': 'मेरे ऑर्डर', 'My deliveries': 'मेरी डिलीवरी', 'Search products': 'प्रोडक्ट खोजें',
  'No orders yet': 'अभी कोई ऑर्डर नहीं', 'No products': 'कोई प्रोडक्ट नहीं', 'No retailers yet': 'अभी कोई रिटेलर नहीं', 'No offers right now': 'अभी कोई ऑफर नहीं', Loading: 'लोड हो रहा है',
  'Something went wrong': 'कुछ गड़बड़ हो गई', 'You are offline. Showing saved data; changes will wait for a connection.': 'आप ऑफ़लाइन हैं। सेव किया डेटा दिख रहा है; बदलाव इंटरनेट आने पर होंगे।',
  Language: 'भाषा', Items: 'आइटम', History: 'इतिहास', Stock: 'स्टॉक', Price: 'कीमत', Quantity: 'मात्रा', Category: 'श्रेणी', Brand: 'ब्रांड', Unit: 'यूनिट', Name: 'नाम',
  'Cash on delivery': 'डिलीवरी पर नकद', 'Khata (credit)': 'खाता (उधार)',
};

Object.assign(HI, HI_MORE, { ...HI }); // entries written by hand in HI above win over the second list

let current: Lang = 'en';
/** Translate an English UI string into the current language (unknown strings pass through). */
export const tr = (s: string): string => (current === 'hi' ? HI[s] ?? HI[s.toLowerCase()] ?? s : s);

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: 'en', setLang: () => {} });
export const useLang = () => useContext(Ctx);

const KEY = 'lang';
const read = async () => (Platform.OS === 'web' ? localStorage.getItem(KEY) : SecureStore.getItemAsync(KEY));
const write = async (v: string) => (Platform.OS === 'web' ? localStorage.setItem(KEY, v) : SecureStore.setItemAsync(KEY, v));

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');
  useEffect(() => { read().then((v) => { if (v === 'hi' || v === 'en') { current = v; setLangState(v); } }).catch(() => {}); }, []);
  const setLang = useCallback((l: Lang) => { current = l; setLangState(l); write(l).catch(() => {}); }, []);
  const value = useMemo(() => ({ lang, setLang }), [lang, setLang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
