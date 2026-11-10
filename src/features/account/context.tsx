import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { readSession, writeSession } from './session';
import { AccountContext as Context, type User, type Credentials } from './account-context';
const apiUrl = (process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:3002' : 'http://localhost:3002')).replace(/\/$/, '');
export function AccountProvider({ children }: React.PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null), [ready, setReady] = useState(false);
  const token = useRef<string | null>(null);
  const [logoutOpen, setLogoutOpen] = useState(false), [loggingOut, setLoggingOut] = useState(false), [logoutError, setLogoutError] = useState('');
  const logoutPending = useRef(false);
  const request = useCallback(async (path: string, method = 'GET', body?: unknown, bearer = token.current) => {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(`${apiUrl}${path}`, { method, signal: controller.signal, headers: { 'Content-Type': 'application/json', ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      const data = response.status === 204 ? null : await response.json();
      if (!response.ok) { if (response.status === 401 && bearer) { token.current = null; setUser(null); await writeSession(null); } throw new Error(data?.message || 'Yêu cầu không thành công.'); }
      return data;
    } catch (e) { if (e instanceof Error && e.name === 'AbortError') throw new Error('Kết nối quá thời gian. Vui lòng thử lại.'); throw e; }
    finally { clearTimeout(timer); }
  }, []);
  useEffect(() => {
    let active = true;
    async function restore() {
      try { const saved = await readSession(); if (saved) { const me = await request('/api/auth/me', 'GET', undefined, saved); if (active) { token.current = saved; setUser(me); } } }
      catch { /* Keep the session available when the server is temporarily offline. */ }
      finally { if (active) setReady(true); }
    }
    void restore(); return () => { active = false; };
  }, [request]);
  async function authenticate(register: boolean, data: Credentials) { const session = await request(`/api/auth/${register ? 'register' : 'login'}`, 'POST', data, null); await writeSession(session.token); token.current = session.token; setUser(session.user); }
  async function update(hoten: string, hinhanh: string) { setUser(await request('/api/auth/me', 'PUT', { hoten, hinhanh })); }
  async function logout() { setLogoutError(''); setLogoutOpen(true); }
  function cancelLogout() { if (!logoutPending.current) setLogoutOpen(false); }
  async function confirmLogout() {
    if (logoutPending.current) return;
    logoutPending.current = true; setLoggingOut(true); setLogoutError('');
    try { await request('/api/auth/logout', 'POST'); await writeSession(null); token.current = null; setUser(null); setLogoutOpen(false); }
    catch (error) { setLogoutError(error instanceof Error ? error.message : 'Không thể đăng xuất. Vui lòng thử lại.'); }
    finally { logoutPending.current = false; setLoggingOut(false); }
  }
  return <Context.Provider value={{ user, ready, authenticate, update, logout, api: request }}>{children}{logoutOpen && <Modal transparent animationType="fade" onRequestClose={cancelLogout}><View style={s.overlay}><View accessibilityViewIsModal style={s.dialog}><Text style={s.title}>Xác nhận đăng xuất</Text><Text style={s.message}>Bạn có chắc muốn đăng xuất khỏi ứng dụng?</Text>{!!logoutError && <Text accessibilityRole="alert" style={s.error}>{logoutError}</Text>}<View style={s.actions}><Pressable accessibilityRole="button" disabled={loggingOut} onPress={cancelLogout} style={s.cancel}><Text style={s.cancelText}>Hủy</Text></Pressable><Pressable accessibilityRole="button" disabled={loggingOut} onPress={() => void confirmLogout()} style={[s.confirm, loggingOut && {opacity:0.6}]}><Text style={s.confirmText}>{loggingOut ? 'Đang đăng xuất…' : 'Đăng xuất'}</Text></Pressable></View></View></View></Modal>}</Context.Provider>;
}
const s = StyleSheet.create({
  overlay:{flex:1,backgroundColor:'rgba(12,25,54,0.45)',justifyContent:'center',alignItems:'center',padding:24},
  dialog:{width:'100%',maxWidth:380,backgroundColor:'#fff',borderRadius:20,padding:24,gap:18},
  title:{fontSize:21,fontWeight:'700',color:'#14203d'},message:{fontSize:15,lineHeight:23,color:'#62708a'},error:{color:'#c3263e',lineHeight:21},
  actions:{flexDirection:'row',gap:12},cancel:{flex:1,minHeight:48,borderWidth:1,borderColor:'#cad7f0',borderRadius:12,alignItems:'center',justifyContent:'center'},
  confirm:{flex:1,minHeight:48,paddingHorizontal:8,backgroundColor:'#075cf2',borderRadius:12,alignItems:'center',justifyContent:'center'},
  cancelText:{color:'#536482',fontWeight:'600'},confirmText:{color:'#fff',fontWeight:'700'},
});
