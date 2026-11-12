import { Alert as NativeAlert, Platform } from 'react-native';

// React Native Web's Alert is a no-op. The app uses notices and confirmations
// with one action plus Cancel, which map to the browser's accessible dialogs.
export const Alert = {
  alert: (...args) => {
    if (Platform.OS !== 'web') return NativeAlert.alert(...args);
    if (typeof window === 'undefined') return;

    const [title, message, buttons] = args;
    const text = [title, message].filter((part) => part !== undefined && part !== null && part !== '').join('\n\n');
    const choices = Array.isArray(buttons) ? buttons : [];

    if (choices.length > 2) {
      // Do not drop actions or choose an action implicitly if a future screen
      // needs more choices. That screen must provide a full dialog instead.
      throw new RangeError('Web alerts support up to two buttons. Use a dialog for additional choices.');
    }

    if (choices.length < 2) {
      window.alert(text);
      return choices[0]?.onPress?.();
    }

    const cancel = choices.find((button) => button.style === 'cancel') || choices[0];
    const action = choices.find((button) => button !== cancel);
    return (window.confirm(text) ? action : cancel)?.onPress?.();
  },
};
