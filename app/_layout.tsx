import React from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold, useFonts } from '@expo-google-fonts/inter';
import { LanguageProvider } from '../src/lib/i18n';
import { AccessContext, AuthProvider, homeFor, useAuth } from '../src/lib/auth';
import { colors } from '../src/lib/theme';
import { Logo } from '../src/ui/Logo';
import { AppLockGate } from '../src/ui/AppLock';
import { ErrorBoundary, OfflineBanner } from '../src/ui/Resilience';
import { ToastHost } from '../src/ui/Toast';
import { CartBarHost } from '../src/ui/CartBar';

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    // data stays instantly available while it refreshes quietly in the background: lists never flash empty
    queries: { retry: 1, staleTime: 15_000, gcTime: 10 * 60_000, refetchOnReconnect: true, networkMode: 'offlineFirst' },
    mutations: { networkMode: 'online' },
  },
});

const GROUP = { admin: '(admin)', company_employee: '(staff)', distributor: '(distributor)', employee: '(employee)', retailer: '(retailer)' } as const;
const GROUPS: string[] = Object.values(GROUP);

/** Sends signed-out people to login, and signed-in people to the area for their role. */
function Gate({ children }: { children: React.ReactNode }) {
  const { ready, role } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const first = String(segments[0] ?? '');

  React.useEffect(() => {
    if (!ready) return;
    if (!role) { if (first !== '(auth)') router.replace('/(auth)/login'); return; }
    // wrong area (login screen, or another role's tabs): go home. Shared screens (order, store...) are fine anywhere.
    if (first === '(auth)' || first === '' || (GROUPS.includes(first) && first !== GROUP[role])) router.replace(homeFor(role) as any);
  }, [ready, role, first]);

  const splash = <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}><Logo /></View>;
  if (!ready) return splash;
  // allowed = signed out on the login screens, or signed in on a screen that belongs to their role (shared screens like order/store are fine anywhere)
  const allowed = role ? !(first === '(auth)' || first === '' || (GROUPS.includes(first) && first !== GROUP[role])) : first === '(auth)';
  return (
    <AccessContext.Provider value={allowed}>
      {children}
      {!allowed && <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}><Logo /></View>}
    </AccessContext.Provider>
  );
}

const TITLES: Record<string, string> = {
  'order/[id]': 'Order', 'store/[id]': 'Store', pay: 'Pay distributor', 'return-new': 'Return items', returns: 'Returns',
  'support/index': 'Support', 'support/new': 'New ticket', 'support/[id]': 'Ticket', 'chat/index': 'Chat', 'chat/thread': 'Chat',
  payments: 'Payments', collections: 'Collections', 'product-form': 'Product', subscription: 'Subscription', security: 'Security & privacy',
  'desk/index': 'Support desk', 'desk/[id]': 'Ticket', 'staff-commissions': 'Commission report', 'pricing/index': 'Price lists', 'pricing/[id]': 'Price list',
  'inventory/index': 'Inventory', 'inventory/move': 'Stock move', 'inventory/movements': 'Stock movements', 'retailer-ledger': 'Khata', disputes: 'Disputes',
  import: 'Import products', expiring: 'Expiring stock', commission: 'Platform commission', einvoice: 'GST e-invoice',
  'field/index': 'Field', 'field/shop': 'Shop location', 'field/today': "Today's route", 'field/log': 'Record at shop', 'field/records': 'Field records',
  'console/sub-payments': 'Subscription payments', 'console/onboarding': 'Onboarding payments', 'console/plans': 'Plans', 'console/settings': 'Company settings',
  'console/audit': 'Audit trail', 'console/visits': 'Visit history', 'console/roles': 'Roles', 'console/distributors': 'Distributors', 'console/taxonomy': 'Categories & brands',
  'console/commission': 'Commission', 'console/reconciliation': 'Reconciliation', 'business-profile': 'Business profile', 'retailer-manage': 'Retailer',
  'reports-export': 'Export reports', 'business-summary': 'Business summary', 'desk/stats': 'Support performance', 'desk/settings': 'SLA & categories', recon: 'Reconciliation', 'console/products': 'Product approvals', 'console/user-edit': 'Edit details', 'console/distributor-admin': 'Distributor settings', 'console/commission-rules': 'Commission rules', 'console/settlement': 'Settlement', 'console/commission-entries': 'Commission entries', 'product-audience': 'Product visibility',
};

export default function Root() {
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold });
  const onLayout = React.useCallback(() => { if (fontsLoaded) SplashScreen.hideAsync().catch(() => {}); }, [fontsLoaded]);
  if (!fontsLoaded) return null; // the native splash stays up until the fonts are ready, so text never flashes in a different font

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }} onLayout={onLayout}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <LanguageProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <StatusBar style="light" />
              <Gate>
                <Stack
                  screenOptions={({ route }) => ({
                    title: TITLES[route.name],
                    headerStyle: { backgroundColor: colors.navy },
                    headerTintColor: '#fff',
                    headerTitleStyle: { fontFamily: 'Inter_700Bold', fontSize: 17 },
                    headerShadowVisible: false,
                    headerBackButtonDisplayMode: 'minimal',
                    contentStyle: { backgroundColor: colors.bg },
                    animation: 'slide_from_right',
                    gestureEnabled: true,
                    fullScreenGestureEnabled: true,
                  })}>
                  {['(auth)', ...GROUPS].map((g) => <Stack.Screen key={g} name={g} options={{ headerShown: false, animation: 'fade' }} />)}
                </Stack>
              </Gate>
              <OfflineBanner />
              <AppLockGate />
              <CartBarHost />
              <ToastHost />
            </AuthProvider>
          </QueryClientProvider>
          </LanguageProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
