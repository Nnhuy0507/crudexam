import { createContext, useContext } from 'react';

export type User = { id: string; email: string; hoten: string; hinhanh: string; isAdmin?: boolean };
export type Credentials = { email: string; matkhau: string; hoten: string; hinhanh: string };
type Account = {
  user: User | null;
  ready: boolean;
  authenticate: (register: boolean, data: Credentials) => Promise<void>;
  update: (hoten: string, hinhanh: string) => Promise<void>;
  logout: () => Promise<void>;
  api: (path: string, method?: string, body?: unknown) => Promise<unknown>;
};
// Keep context identity outside the provider's Fast Refresh boundary.
export const AccountContext = createContext<Account | null>(null);
export function useAccount() {
  const value = useContext(AccountContext);
  if (!value) throw new Error('AccountProvider is required');
  return value;
}
