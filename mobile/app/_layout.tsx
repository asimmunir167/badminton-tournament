import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../lib/auth-context';

function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerTitleStyle: { fontWeight: '600' } }}>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={!!user}>
        <Stack.Screen name="index" options={{ title: 'Tournaments' }} />
        <Stack.Screen name="tournament/[id]" options={{ title: 'Tournament' }} />
        <Stack.Screen name="tournament/[id]/rankings" options={{ title: 'Rankings' }} />
        <Stack.Screen name="tournament/[id]/fixtures" options={{ title: 'Fixtures' }} />
        <Stack.Screen name="match/[id]" options={{ title: 'Match' }} />
        <Stack.Screen name="profile" options={{ title: 'Profile' }} />
        <Stack.Screen name="create-profile" options={{ title: 'Player Profile' }} />
        <Stack.Screen name="category/[categoryId]/apply" options={{ title: 'Apply' }} />
        <Stack.Screen name="registration/[id]" options={{ title: 'Application Status' }} />
        <Stack.Screen name="partner-requests" options={{ title: 'Partner Requests' }} />
        <Stack.Screen name="find-partner" options={{ title: 'Find Your Partner' }} />
        <Stack.Screen name="player/[id]" options={{ title: 'Partner Profile' }} />
        <Stack.Screen name="my-pair" options={{ title: 'My Pair' }} />
        <Stack.Screen name="pair-requests" options={{ title: 'Partner Requests' }} />
        <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
        <StatusBar style="auto" />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
