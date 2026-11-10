import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAccount } from './account-context';

function PersonIcon({ color = '#1766ef', large = false }: { color?: string; large?: boolean }) {
  return <View accessibilityElementsHidden style={{ width: large ? 42 : 24, height: large ? 44 : 26, alignItems: 'center', justifyContent: 'center', gap: 3 }}><View style={{ width: large ? 15 : 9, height: large ? 15 : 9, borderRadius: 12, borderWidth: 2, borderColor: color }}/><View style={{ width: large ? 32 : 19, height: large ? 17 : 11, borderWidth: 2, borderColor: color, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderBottomWidth: 0 }}/></View>;
}
function LockIcon() {
  return <View accessibilityElementsHidden style={{width:24,height:26,alignItems:'center',justifyContent:'flex-end'}}><View style={{position:'absolute',top:0,width:12,height:14,borderWidth:2,borderColor:'#1766ef',borderRadius:7}}/><View style={{width:21,height:17,borderWidth:2,borderColor:'#1766ef',borderRadius:4,backgroundColor:'#fff',alignItems:'center',justifyContent:'center'}}><View style={{width:3,height:6,borderRadius:2,backgroundColor:'#1766ef'}}/></View></View>;
}
export function Page({ children }: React.PropsWithChildren) {
  return <SafeAreaView style={s.safe}><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.page}><View style={s.card}><View pointerEvents="none" style={s.bottomWave}/><View pointerEvents="none" style={s.bottomWaveLight}/>{children}</View></ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
export function Button({ title, onPress, disabled = false }: { title: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [s.button, { opacity: disabled || pressed ? 0.6 : 1 }]}>{title !== 'Thêm người dùng' && <Text style={s.buttonIcon}>{title.includes('Lưu') ? '▣' : title.includes('Chỉnh') ? '✎' : '⇥'}</Text>}<Text style={s.buttonText}>{title}</Text></Pressable>;
}
export function Field({ label, secret, ...props }: TextInputProps & { label: string; secret?: boolean }) {
  const [show, setShow] = useState(false);
  return <View style={s.group}><Text style={s.label}>{label}</Text><View style={s.field}>{secret ? <LockIcon/> : label === 'Email' ? <Text style={s.fieldIcon}>✉</Text> : <PersonIcon/>}<TextInput {...props} accessibilityLabel={label} style={s.input} secureTextEntry={secret && !show} placeholderTextColor="#8290a5"/>{secret && <Pressable accessibilityRole="button" accessibilityLabel={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} style={s.eyeButton} onPress={() => setShow(!show)}><Text style={s.link}>{show ? 'Ẩn' : 'Hiện'}</Text></Pressable>}</View></View>;
}
export function AvatarPicker({ value, onChange, onError, disabled }: { value: string; onChange: (value: string) => void; onError: (value: string) => void; disabled: boolean }) {
  async function choose() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7, base64: true });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (Platform.OS === 'web' && asset.file) {
        if (asset.file.size > 2 * 1024 * 1024 || !['image/jpeg','image/png','image/webp'].includes(asset.file.type)) throw new Error('Chọn ảnh JPG, PNG hoặc WebP tối đa 2 MB.');
        const data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error('Không đọc được ảnh.'));
          reader.readAsDataURL(asset.file!);
        });
        onChange(data); onError(''); return;
      }
      if (!asset.base64 || asset.base64.length > 2796204) throw new Error('Chọn ảnh JPG, PNG hoặc WebP tối đa 2 MB.');
      const mime = Platform.OS === 'web' ? (asset.mimeType || 'image/jpeg') : 'image/jpeg';
      if (!['image/jpeg','image/png','image/webp'].includes(mime)) throw new Error('Vui lòng chọn ảnh JPG, PNG hoặc WebP.');
      onChange(`data:${mime};base64,${asset.base64}`); onError('');
    } catch (e) { onError(e instanceof Error ? e.message : 'Không thể chọn ảnh.'); }
  }
  return <View style={s.avatarGroup}><Pressable disabled={disabled} accessibilityRole="button" accessibilityLabel="Chọn ảnh đại diện từ thiết bị" onPress={() => void choose()}>{value ? <Image source={{ uri: value }} style={s.avatar}/> : <View style={[s.avatar, s.placeholder]}><PersonIcon large color="#397ee9"/></View>}<View style={s.cameraBadge}><Text style={s.cameraIcon}>▣</Text></View></Pressable><Pressable disabled={disabled} accessibilityRole="button" onPress={() => void choose()}><Text style={s.link}>Chọn ảnh từ thiết bị</Text></Pressable><Text style={s.muted}>JPG, PNG, WebP · Tối đa 2 MB</Text>{!!value && <Pressable disabled={disabled} onPress={() => onChange('')}><Text style={s.muted}>Bỏ ảnh đã chọn</Text></Pressable>}</View>;
}
export function AuthScreen({ register = false }: { register?: boolean }) {
  const { authenticate } = useAccount();
  const [hoten, setHoten] = useState(''), [email, setEmail] = useState(''), [matkhau, setMatkhau] = useState(''), [confirm, setConfirm] = useState(''), [hinhanh, setHinhanh] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function submit() {
    if (busy) return;
    if ((register && !hoten.trim()) || !/^\S+@\S+\.\S+$/.test(email.trim()) || matkhau.length < 6 || matkhau.length > 128) { setError('Nhập họ tên, email hợp lệ và mật khẩu từ 6 đến 128 ký tự.'); return; }
    if (register && matkhau !== confirm) { setError('Mật khẩu xác nhận chưa khớp.'); return; }
    setBusy(true); setError('');
    try { await authenticate(register, { hoten, email, matkhau, hinhanh }); }
    catch (e) { setError(e instanceof Error ? e.message : 'Không thể kết nối máy chủ.'); }
    finally { setBusy(false); }
  }
  return <Page><View style={s.hero}><View style={s.heroGlow}/><View style={s.brandRow}><View style={s.logo}><PersonIcon large color="#fff"/></View><View><Text style={s.brand}>CRUDEXAM</Text><Text style={s.brandCaption}>Quản lý người dùng</Text></View></View><Text style={s.heroTitle}>{register ? 'Đăng ký tài khoản' : 'Đăng nhập'}</Text><Text style={s.heroSubtitle}>{register ? 'Tạo hồ sơ và thêm ảnh đại diện của bạn' : 'Vui lòng đăng nhập để xem thông tin của bạn'}</Text><View style={s.heroWave}/></View><View style={s.authBody}>{register && <AvatarPicker value={hinhanh} onChange={setHinhanh} onError={setError} disabled={busy}/>}<View style={s.fields}>{register && <Field label="Họ và tên" value={hoten} onChangeText={setHoten} maxLength={100} editable={!busy} placeholder="Nguyễn Văn An"/>}<Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" maxLength={150} editable={!busy} placeholder="ban@example.com"/><Field label="Mật khẩu" value={matkhau} onChangeText={setMatkhau} autoCapitalize="none" secret maxLength={128} editable={!busy} placeholder="Ít nhất 6 ký tự"/>{register && <Field label="Xác nhận mật khẩu" value={confirm} onChangeText={setConfirm} secret autoCapitalize="none" maxLength={128} editable={!busy}/>}</View>{!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}<Button disabled={busy} title={busy ? 'Đang xử lý…' : register ? 'Đăng ký' : 'Đăng nhập'} onPress={() => void submit()}/><Pressable disabled={busy} style={s.footer} onPress={() => register ? router.replace('/') : router.push('/register')}><Text style={s.muted}>{register ? 'Đã có tài khoản? ' : 'Chưa có tài khoản? '}<Text style={s.link}>{register ? 'Đăng nhập' : 'Đăng ký ngay'}</Text></Text></Pressable></View></Page>;
}
export function ProfileScreen() {
  const { user, update, logout } = useAccount();
  const [editing, setEditing] = useState(false);
  const [hoten, setHoten] = useState(user?.hoten || ''), [hinhanh, setHinhanh] = useState(user?.hinhanh || '');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  async function save() {
    if (busy) return; setBusy(true); setError(''); setMessage('');
    try { await update(hoten, hinhanh); setEditing(false); setMessage('Đã lưu thông tin của bạn.'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Không thể lưu thông tin.'); }
    finally { setBusy(false); }
  }
  async function signOut() {
    if (busy) return; setBusy(true); setError('');
    try { await logout(); } catch (e) { setError(e instanceof Error ? e.message : 'Không thể đăng xuất.'); } finally { setBusy(false); }
  }
  function cancelEdit() { setHoten(user?.hoten || ''); setHinhanh(user?.hinhanh || ''); setEditing(false); setError(''); }
  return <Page><View style={s.toolbar}><Pressable accessibilityRole="button" accessibilityLabel={editing ? 'Hủy chỉnh sửa' : 'Quay lại danh sách'} disabled={busy} onPress={() => editing ? cancelEdit() : user?.isAdmin ? router.replace('/users') : router.canGoBack() ? router.back() : undefined} style={s.toolbarAction}><Text style={s.toolbarIcon}>‹</Text></Pressable><Text style={s.toolbarTitle}>{editing ? 'Chỉnh sửa thông tin' : 'Thông tin người dùng'}</Text><Pressable accessibilityRole="button" accessibilityLabel="Đăng xuất" disabled={busy} onPress={() => void signOut()} style={s.toolbarAction}><Text style={s.toolbarIcon}>⇥</Text></Pressable></View><View style={s.profileBody}>{editing ? <AvatarPicker value={hinhanh} onChange={value => { setHinhanh(value); setMessage(''); }} onError={setError} disabled={busy}/> : <View style={s.identity}><Pressable accessibilityRole="button" accessibilityLabel="Chỉnh sửa ảnh đại diện" onPress={() => setEditing(true)}>{user?.hinhanh ? <Image source={{uri:user.hinhanh}} style={s.avatar}/> : <View style={[s.avatar,s.placeholder]}><PersonIcon large color="#397ee9"/></View>}<View style={s.cameraBadge}><Text style={s.cameraIcon}>▣</Text></View></Pressable><Text style={s.profileName}>{user?.hoten}</Text><Text selectable style={s.profileEmail}>{user?.email}</Text></View>}
  {editing ? <View style={s.fields}><Field label="Họ và tên *" value={hoten} onChangeText={setHoten} maxLength={100} editable={!busy}/><View style={s.group}><Text style={s.label}>Email</Text><View style={[s.field,s.readOnly]}><Text style={s.fieldIcon}>✉</Text><Text selectable style={s.readOnlyEmail}>{user?.email}</Text></View><Text style={s.muted}>Email đăng nhập không thể thay đổi.</Text></View></View> : <View style={s.details}><View style={s.detailRow}><PersonIcon/><Text style={s.detailLabel}>Họ và tên</Text><Text selectable style={s.detailValue}>{user?.hoten}</Text></View><View style={s.detailRow}><Text style={s.detailIcon}>✉</Text><Text style={s.detailLabel}>Email</Text><Text selectable style={s.detailValue}>{user?.email}</Text></View><View style={[s.detailRow,{borderBottomWidth:0}]}><Text style={s.detailIcon}>♧</Text><Text style={s.detailLabel}>Mật khẩu</Text><Text style={s.detailValue}>••••••••</Text></View></View>}
  {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}{!!message && <Text accessibilityLiveRegion="polite" style={s.success}>{message}</Text>}
  <View style={s.profileActions}>{user?.isAdmin && !editing && <Button title="Quản lý người dùng" onPress={() => router.push('/users')}/>}{editing ? <><Button disabled={busy || !hoten.trim()} title={busy ? 'Đang xử lý…' : 'Lưu thay đổi'} onPress={() => void save()}/><Pressable disabled={busy} style={s.outlineButton} onPress={cancelEdit}><Text style={s.link}>Hủy chỉnh sửa</Text></Pressable></> : <><Button disabled={busy} title="Chỉnh sửa thông tin" onPress={() => {setMessage('');setEditing(true);}}/><Pressable disabled={busy} style={s.outlineButton} onPress={() => void signOut()}><Text style={s.link}>⇥   Đăng xuất</Text></Pressable></>}</View></View></Page>;
}
const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:'#eff4fc'},
  page:{flexGrow:1,alignItems:'center',padding:0},
  card:{width:'100%',maxWidth:440,minHeight:'100%',backgroundColor:'#fbfcff',overflow:'hidden',position:'relative',boxShadow:'0 4px 24px rgba(27,67,135,0.08)'},
  hero:{backgroundColor:'#0758df',paddingTop:62,paddingHorizontal:24,paddingBottom:72,overflow:'hidden',alignItems:'center'},
  heroGlow:{position:'absolute',width:420,height:420,borderRadius:210,backgroundColor:'#216ce8',left:-180,top:-180,opacity:0.6},
  brandRow:{flexDirection:'row',alignItems:'center',gap:16,marginBottom:46},
  logo:{height:64,width:64,borderRadius:20,backgroundColor:'#2680ff',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#5b9aff'},
  logoText:{fontSize:42,color:'#fff'},brand:{fontSize:26,fontWeight:'800',color:'#fff',letterSpacing:0.3},brandCaption:{color:'#e4edff',fontSize:14,marginTop:4},
  heroTitle:{color:'#fff',fontSize:26,fontWeight:'800',textAlign:'center'},heroSubtitle:{color:'#fff',fontSize:14,lineHeight:22,textAlign:'center',marginTop:10},
  heroWave:{position:'absolute',bottom:-47,left:-35,width:540,height:80,borderRadius:100,backgroundColor:'#fbfcff',transform:[{rotate:'-5deg'}]},
  authBody:{paddingHorizontal:24,paddingTop:24,paddingBottom:100,gap:22},
  bottomWave:{position:'absolute',bottom:-100,left:-100,width:480,height:170,borderRadius:160,backgroundColor:'#dfedff',transform:[{rotate:'15deg'}]},
  bottomWaveLight:{position:'absolute',bottom:-125,right:-130,width:470,height:180,borderRadius:150,backgroundColor:'#c9e1ff',transform:[{rotate:'-16deg'}]},
  fields:{gap:20},group:{gap:8},label:{color:'#101b39',fontSize:15,fontWeight:'600'},
  field:{flexDirection:'row',alignItems:'center',gap:12,borderWidth:1,borderColor:'#c9d5ed',borderRadius:12,paddingHorizontal:14,minHeight:54,backgroundColor:'#fff'},
  fieldIcon:{fontSize:23,color:'#1766ef',width:24,textAlign:'center'},input:{flex:1,minWidth:0,color:'#14203d',fontSize:16,paddingVertical:15},eyeButton:{minHeight:44,justifyContent:'center'},
  button:{backgroundColor:'#075cf2',borderWidth:1,borderColor:'#004ce3',borderRadius:13,minHeight:54,flexDirection:'row',gap:12,alignItems:'center',justifyContent:'center',padding:13},buttonIcon:{color:'#fff',fontSize:25},buttonText:{color:'#fff',fontSize:17,fontWeight:'700'},
  link:{color:'#075cf2',fontWeight:'600',fontSize:14},muted:{color:'#65738e',fontSize:12,lineHeight:19},footer:{paddingVertical:8,alignItems:'center'},error:{color:'#c52b40',lineHeight:21},success:{color:'#187448',backgroundColor:'#e9f9ef',padding:12,borderRadius:10},
  toolbar:{minHeight:82,paddingTop:12,paddingHorizontal:10,backgroundColor:'#0758df',flexDirection:'row',alignItems:'center',justifyContent:'space-between'},toolbarAction:{width:46,height:46,alignItems:'center',justifyContent:'center'},toolbarIcon:{color:'#fff',fontSize:30},toolbarTitle:{color:'#fff',fontSize:17,fontWeight:'700'},
  profileBody:{flex:1,borderTopLeftRadius:22,borderTopRightRadius:22,backgroundColor:'#fbfcff',marginTop:-4,paddingHorizontal:20,paddingTop:28,paddingBottom:28,gap:24,minHeight:650},
  identity:{alignItems:'center',gap:8},profileName:{fontSize:24,fontWeight:'800',color:'#0c1733',textAlign:'center',marginTop:5},profileEmail:{fontSize:16,color:'#1b2947',textAlign:'center'},
  avatarGroup:{alignItems:'center',gap:10,paddingVertical:0},avatar:{width:124,height:124,borderRadius:62,backgroundColor:'#e1ecff',borderWidth:3,borderColor:'#fff'},placeholder:{justifyContent:'center',alignItems:'center'},avatarText:{fontSize:64,color:'#397ee9'},
  cameraBadge:{position:'absolute',right:0,bottom:2,height:36,width:36,borderRadius:18,borderWidth:3,borderColor:'#fff',backgroundColor:'#0864ff',justifyContent:'center',alignItems:'center'},cameraIcon:{color:'#fff',fontSize:22},
  details:{borderWidth:1,borderColor:'#d4dff2',borderRadius:14,backgroundColor:'#fff',paddingHorizontal:14},detailRow:{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:18,borderBottomWidth:1,borderColor:'#e9eef9'},detailIcon:{fontSize:22,color:'#1266ff',width:22,textAlign:'center'},detailLabel:{fontSize:13,color:'#55617e',width:70},detailValue:{flex:1,minWidth:0,fontSize:14,color:'#14203d',fontWeight:'500'},
  profileActions:{marginTop:'auto',gap:12,paddingTop:30},outlineButton:{minHeight:48,borderWidth:1,borderColor:'#b9ccef',borderRadius:12,alignItems:'center',justifyContent:'center',backgroundColor:'#fff'},readOnly:{backgroundColor:'#f2f6fd'},readOnlyEmail:{flex:1,fontSize:15,color:'#536482'},
});
