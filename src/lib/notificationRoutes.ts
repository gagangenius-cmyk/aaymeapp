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
    case 'subscription_sale': return '/sales/history';                 // a distributor: a sale was confirmed, refunded or paid out
    case 'subscription_sale_admin': return '/console/subscription-sales';   // the admin: a payment is waiting to be confirmed
    case 'my_plan': return '/my-plan';                                 // a retailer: their plan is active
    case 'store_order': return '/store/orders';                        // a retailer: a customer ordered or cancelled
    case 'store_customer': return '/store/customers';                  // a retailer: someone joined the store
    case 'customer_order': return id ? `/customer/order?id=${id}` : '/(customer)/orders';   // a customer: their order moved on
    default: return null;
  }
}
