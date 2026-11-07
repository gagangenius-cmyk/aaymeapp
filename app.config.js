// Dynamic config on top of app.json. The one thing that must differ between builds:
// plain-HTTP traffic is allowed ONLY when ALLOW_CLEARTEXT=1 (dev/preview builds that talk to a LAN server).
// A Play Store build never has it: the API must be https, and Play flags cleartext apps.
module.exports = ({ config }) => {
  const cleartext = process.env.ALLOW_CLEARTEXT === '1';
  const plugins = (config.plugins ?? []).filter((p) => (Array.isArray(p) ? p[0] : p) !== 'expo-build-properties');
  plugins.push(['expo-build-properties', { android: { usesCleartextTraffic: cleartext } }]);
  // the API address baked into the app: explicit variable first; otherwise the live API (https), or the emulator address for cleartext dev builds
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || (cleartext ? 'http://10.0.2.2:4000' : 'https://amapi-sage.vercel.app');
  return { ...config, plugins, extra: { ...(config.extra ?? {}), apiUrl } };
};
