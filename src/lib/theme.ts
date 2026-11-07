// Light theme: soft grey-blue canvas, white cards, deep navy headers, green primary actions, gold highlights.
// The old key names (blue/cyan/violet/magenta) are kept so every screen picks the new palette up without edits.
export const colors = {
  bg: '#F4F6FA',
  surface: '#FFFFFF',
  surface2: '#EEF2F7',
  border: '#E1E7EF',
  text: '#0B1F3A',
  muted: '#5B6B80',
  navy: '#04203F',
  green: '#0A8F4D',
  gold: '#F5B400',
  blue: '#0A8F4D',
  cyan: '#0A8F4D',
  violet: '#04203F',
  magenta: '#F5B400',
  ok: '#0A8F4D',
  warn: '#C77700',
  danger: '#D93A55',
};
export const gradient = [colors.green, '#0C9E56'] as const;
export const radius = { sm: 10, md: 14, lg: 20 };
export const space = (n: number) => n * 4;
