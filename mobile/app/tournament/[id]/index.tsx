import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useTournaments } from '../../../context/TournamentsContext';
import { Match, Player, Round } from '../../../lib/types';

function roundLabel(roundIndex: number, totalRounds: number): string {
  const fromEnd = totalRounds - roundIndex;
  if (fromEnd === 1) return 'Final';
  if (fromEnd === 2) return 'Semifinal';
  if (fromEnd === 3) return 'Quarterfinal';
  return `Round ${roundIndex + 1}`;
}

export default function BracketScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { tournaments } = useTournaments();
  const tournament = tournaments.find((t) => t.id === id);

  if (!tournament) {
    return (
      <View style={styles.centered}>
        <Text>Tournament not found.</Text>
      </View>
    );
  }

  const playersById = new Map<string, Player>(tournament.players.map((p) => [p.id, p]));
  const champion = tournament.championId ? playersById.get(tournament.championId) : undefined;

  return (
    <View style={styles.flex}>
      <Stack.Screen options={{ title: tournament.name }} />
      {champion && (
        <View style={styles.championBanner}>
          <Text style={styles.championText}>🏆 Champion: {champion.name}</Text>
        </View>
      )}
      <ScrollView horizontal contentContainerStyle={styles.roundsRow}>
        {tournament.rounds.map((round: Round, index: number) => (
          <View key={round.round} style={styles.roundColumn}>
            <Text style={styles.roundTitle}>
              {roundLabel(index, tournament.rounds.length)}
            </Text>
            {round.matches.map((match: Match) => {
              const p1 = match.player1Id ? playersById.get(match.player1Id) : undefined;
              const p2 = match.player2Id ? playersById.get(match.player2Id) : undefined;
              const canOpen = !!p1 && !!p2 && !match.winnerId;
              return (
                <Pressable
                  key={match.id}
                  style={[styles.matchCard, !canOpen && styles.matchCardLocked]}
                  disabled={!canOpen}
                  onPress={() =>
                    router.push(`/tournament/${tournament.id}/match/${match.id}`)
                  }
                >
                  <PlayerLine name={p1?.name} isWinner={match.winnerId === match.player1Id} />
                  <View style={styles.divider} />
                  <PlayerLine name={p2?.name} isWinner={match.winnerId === match.player2Id} />
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function PlayerLine({ name, isWinner }: { name?: string; isWinner: boolean }) {
  return (
    <Text style={[styles.playerText, isWinner && styles.winnerText]} numberOfLines={1}>
      {name ?? 'TBD'}
    </Text>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  championBanner: {
    backgroundColor: '#fef3c7',
    paddingVertical: 12,
    alignItems: 'center',
  },
  championText: { fontWeight: '700', fontSize: 15, color: '#92400e' },
  roundsRow: { flexDirection: 'row', padding: 16 },
  roundColumn: { width: 160, marginRight: 24, justifyContent: 'space-around' },
  roundTitle: { fontWeight: '700', fontSize: 13, color: '#444', marginBottom: 12 },
  matchCard: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    backgroundColor: '#fafafa',
  },
  matchCardLocked: { opacity: 0.85 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#ccc', marginVertical: 6 },
  playerText: { fontSize: 14, color: '#333' },
  winnerText: { fontWeight: '700', color: '#15803d' },
});
