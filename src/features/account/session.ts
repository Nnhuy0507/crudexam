import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
const key = 'crud-account-session';
export async function readSession() { return Platform.OS === 'web' ? (typeof window === 'undefined' ? null : window.sessionStorage.getItem(key)) : SecureStore.getItemAsync(key); }
export async function writeSession(token: string | null) {
  if (Platform.OS === 'web') { if (token) window.sessionStorage.setItem(key, token); else window.sessionStorage.removeItem(key); }
  else if (token) await SecureStore.setItemAsync(key, token);
  else await SecureStore.deleteItemAsync(key);
}
