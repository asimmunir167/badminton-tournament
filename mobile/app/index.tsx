import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTournaments } from '../context/TournamentsContext';
import { Tournament } from '../lib/types';

export default function TournamentListScreen() {
  const router = useRouter();
  const { tournaments, loading, deleteTournament } = useTournaments();

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={tournaments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={tournaments.length === 0 && styles.centered}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No tournaments yet. Create one to get started.</Text>
        }
        renderItem={({ item }) => (
          <TournamentRow
            tournament={item}
            onPress={() => router.push(`/tournament/${item.id}`)}
            onDelete={() => deleteTournament(item.id)}
          />
        )}
      />
      <Pressable style={styles.fab} onPress={() => router.push('/tournament/new')}>
        <Text style={styles.fabText}>+ New Tournament</Text>
      </Pressable>
    </View>
  );
}

function TournamentRow({
  tournament,
  onPress,
  onDelete,
}: {
  tournament: Tournament;
  onPress: () => void;
  onDelete: () => void;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.rowInfo}>
        <Text style={styles.rowTitle}>{tournament.name}</Text>
        <Text style={styles.rowSubtitle}>
          {tournament.players.length} players ·{' '}
          {tournament.status === 'completed' ? 'Completed' : 'In progress'}
        </Text>
      </View>
      <Pressable hitSlop={12} onPress={onDelete}>
        <Text style={styles.deleteText}>Delete</Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#666', fontSize: 15, textAlign: 'center', paddingHorizontal: 32 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  rowInfo: { flex: 1 },
  rowTitle: { fontSize: 17, fontWeight: '600' },
  rowSubtitle: { fontSize: 13, color: '#666', marginTop: 2 },
  deleteText: { color: '#c0392b', fontSize: 14 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 32,
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 28,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  fabText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
