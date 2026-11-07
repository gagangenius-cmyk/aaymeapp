import type { useRouter } from 'expo-router';

/**
 * "Back" that never dead-ends. A screen opened straight from a link or notification has no history, so plain router.back()
 * would do nothing and leave the person stuck after saving. Falling back to "/" lets the role gate send them to their home.
 */
export const goBack = (router: ReturnType<typeof useRouter>) => (router.canGoBack() ? router.back() : router.replace('/'));
