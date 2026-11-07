/** Where a tapped notification should go. The server sends { type, id }. */
export function routeForNotification(data: any): string | null {
  const id = data?.id;
  switch (data?.type) {
    case 'order': return id ? `/order/${id}` : null;
    case 'support': return id ? `/support/${id}` : null;
    case 'payment': return '/payments';
    case 'catalog': return '/(distributor)/catalog';
    case 'subscription': case 'subscription_payment': return '/subscription';
    case 'commission': return '/commission';
    case 'onboarding': return '/console/onboarding';
    case 'link': return '/(retailer)';
    default: return null;
  }
}
