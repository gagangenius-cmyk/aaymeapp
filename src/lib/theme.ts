// Marketplace look (Flipkart / Amazon): blue header and primary actions, orange call-to-action, yellow add-to-cart,
// green reserved for savings and success, light-grey canvas with white cards.
// The old key names (blue/cyan/violet/magenta) are kept so every screen picks the new palette up without edits.
export const colors = {
  bg: '#F1F3F6',
  surface: '#FFFFFF',
  surface2: '#F0F2F5',
  border: '#E0E0E0',
  text: '#212121',
  muted: '#717478',
  navy: '#2874F0',      // header / hero blue
  primary: '#2874F0',   // links, selected states, stepper
  cta: '#FB641B',       // place order, buy now, sign in
  green: '#388E3C',     // discounts and savings only
  gold: '#FFC200',      // add to cart / view cart
  blue: '#2874F0',
  cyan: '#2874F0',
  violet: '#2874F0',
  magenta: '#FB641B',
  ok: '#388E3C',
  warn: '#C77700',
  danger: '#D93A55',
};
export const gradient = [colors.cta, colors.cta] as const;
export const radius = { sm: 4, md: 8, lg: 12 };
export const space = (n: number) => n * 4;
