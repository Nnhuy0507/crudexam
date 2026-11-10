import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AccountProvider } from '@/features/account/context';
import { useAccount } from '@/features/account/account-context';
import { ActivityIndicator, View } from 'react-native';
function Navigation() {
 const {user,ready}=useAccount();
 if(!ready)return <View style={{flex:1,alignItems:'center',justifyContent:'center'}}><ActivityIndicator /></View>;
 return <Stack screenOptions={{headerShown:false}}><Stack.Protected guard={!user}><Stack.Screen name="index"/><Stack.Screen name="register"/></Stack.Protected><Stack.Protected guard={!!user?.isAdmin}><Stack.Screen name="users"/></Stack.Protected><Stack.Protected guard={!!user}><Stack.Screen name="profile"/></Stack.Protected></Stack>;
}
export default function Layout() { return <SafeAreaProvider><AccountProvider><Navigation/></AccountProvider></SafeAreaProvider>; }
