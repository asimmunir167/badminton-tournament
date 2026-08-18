import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTournaments } from '../../../../context/TournamentsContext';

export default function MatchDetailScreen() {
  const { id, matchId } = useLocalSearchParams<{ id: string; matchId: string }>();
  const router = useRouter();
  const { tournaments, recordWinner } = useTournaments();
  const tournament = tournaments.find((t) => t.id === id);
  const match = tournament?.rounds.flatMap((r) => r.matches).find((m) => m.id === matchId);

  if (!tournament || !match) {
    return (
      <View style={styles.centered}>
        <Text>Match not found.</Text>
      </View>
    );
  }

  const playersById = new Map(tournament.players.map((p) => [p.id, p]));
  const p1 = match.player1Id ? playersById.get(match.player1Id) : undefined;
  const p2 = match.player2Id ? playersById.get(match.player2Id) : undefined;

  const chooseWinner = (winnerId: string) => {
    recordWinner(tournament.id, match.id, winnerId);
    router.back();
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Select Winner' }} />
      <Text style={styles.prompt}>Who won this match?</Text>
      {p1 && (
        <Pressable style={styles.option} onPress={() => chooseWinner(p1.id)}>
          <Text style={styles.optionText}>{p1.name}</Text>
        </Pressable>
      )}
      {p2 && (
        <Pressable style={styles.option} onPress={() => chooseWinner(p2.id)}>
          <Text style={styles.optionText}>{p2.name}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  prompt: { fontSize: 15, color: '#444', marginBottom: 20, fontWeight: '600' },
  option: {
    borderWidth: 1,
    borderColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  optionText: { fontSize: 17, fontWeight: '600', color: '#2563eb' },
});
