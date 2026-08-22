import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useApiClient } from '../../../lib/auth-context';
import { colors, radius, spacing, typography } from '../../../lib/theme';
import { Card, Screen } from '../../../components/ui';

type EntityType = 'DISTRICT' | 'TEAM' | 'PLAYER';

interface RankingRow {
  entityId: string;
  rank: number;
  points: number;
  gold: number;
  silver: number;
  bronze: number;
  entity: { name?: string; fullName?: string } | null;
}

const TABS: { key: EntityType; label: string }[] = [
  { key: 'DISTRICT', label: 'District' },
  { key: 'TEAM', label: 'Team' },
  { key: 'PLAYER', label: 'Player' },
];

const MEDALS = ['🥇', '🥈', '🥉'];

export default function TournamentRankingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const api = useApiClient();
  const [entityType, setEntityType] = useState<EntityType>('DISTRICT');
  const [rows, setRows] = useState<RankingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api<RankingRow[]>(`/api/tournaments/${id}/rankings?entityType=${entityType}`)
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load rankings.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api, id, entityType]);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>🏆 Rankings</Text>
      </View>

      <View style={styles.tabs}>
        {TABS.map((t) => (
          <Pressable
            key={t.key}
            style={[styles.tab, entityType === t.key && styles.tabActive]}
            onPress={() => setEntityType(t.key)}
          >
            <Text style={[styles.tabText, entityType === t.key && styles.tabTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {loading && (
        <View style={styles.centered}>
          <ActivityIndicator color="#fff" />
        </View>
      )}
      {error && <Text style={styles.error}>{error}</Text>}

      {!loading && !error && (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.entityId}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>No rankings computed yet.</Text>}
          renderItem={({ item }) => (
            <Card style={styles.row}>
              <View style={styles.rankBadge}>
                {item.rank <= 3 ? (
                  <Text style={styles.medal}>{MEDALS[item.rank - 1]}</Text>
                ) : (
                  <Text style={styles.rankNumber}>{item.rank}</Text>
                )}
              </View>
              <Text style={styles.name} numberOfLines={1}>
                {item.entity?.name ?? item.entity?.fullName ?? item.entityId}
              </Text>
              <View style={styles.pointsBox}>
                <Text style={styles.points}>{item.points}</Text>
                <Text style={styles.pointsLabel}>pts</Text>
              </View>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  title: { ...typography.title, color: '#fff' },
  centered: { paddingVertical: spacing.xl, alignItems: 'center' },
  error: { color: '#ffb4b4', fontSize: 14, textAlign: 'center', paddingVertical: spacing.xl },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    backgroundColor: colors.navyLight,
    borderRadius: radius.md,
    padding: 4,
    marginBottom: spacing.sm,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radius.sm },
  tabActive: { backgroundColor: colors.gold },
  tabText: { fontSize: 12, fontWeight: '700', color: colors.textOnDarkMuted },
  tabTextActive: { color: colors.navy },
  list: { padding: spacing.lg, gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  rankBadge: { width: 32, alignItems: 'center' },
  medal: { fontSize: 20 },
  rankNumber: { fontSize: 14, fontWeight: '800', color: colors.textSecondary },
  name: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  pointsBox: { alignItems: 'flex-end' },
  points: { fontSize: 16, fontWeight: '800', color: colors.goldDark },
  pointsLabel: { fontSize: 10, color: colors.textSecondary },
  emptyText: { color: colors.textOnDarkMuted, fontSize: 14, textAlign: 'center', paddingVertical: spacing.xl },
});
