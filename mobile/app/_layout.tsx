import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { TournamentsProvider } from '../context/TournamentsContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <TournamentsProvider>
        <Stack>
          <Stack.Screen name="index" options={{ title: 'Tournaments' }} />
          <Stack.Screen name="tournament/new" options={{ title: 'New Tournament' }} />
          <Stack.Screen name="tournament/[id]/index" options={{ title: 'Bracket' }} />
          <Stack.Screen
            name="tournament/[id]/match/[matchId]"
            options={{ title: 'Match', presentation: 'modal' }}
          />
        </Stack>
        <StatusBar style="auto" />
      </TournamentsProvider>
    </SafeAreaProvider>
  );
}
