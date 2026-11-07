import { Alert as RNAlert, AlertButton, Platform } from 'react-native';

/**
 * Same call as React Native's Alert.alert, but it also works on web (where RN's Alert does nothing, so confirmations never appeared).
 * With a cancel button and another button it asks a yes/no question; otherwise it just informs.
 */
export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButton[]) {
    if (Platform.OS !== 'web') return RNAlert.alert(title, message, buttons);
    const text = message ? `${title}\n\n${message}` : title;
    const action = buttons?.find((b) => b.style !== 'cancel' && b.onPress);
    const hasCancel = buttons?.some((b) => b.style === 'cancel');
    if (action && hasCancel) { if (window.confirm(text)) action.onPress?.(); return; }
    window.alert(text);
    buttons?.find((b) => b.onPress)?.onPress?.();
  },
};
