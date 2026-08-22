import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useApiClient, useAuth } from '../lib/auth-context';
import { colors, radius, spacing, typography } from '../lib/theme';
import { Card, Screen } from '../components/ui';

interface Tournament {
  id: string;
  name: string;
  venue: string;
  startDate: string;
  endDate: string;
  status: string;
}

type Tab = 'UPCOMING' | 'ONGOING' | 'COMPLETED';

function tabForStatus(status: string): Tab {
  if (status === 'ONGOING') return 'ONGOING';
  if (status === 'COMPLETED') return 'COMPLETED';
  return 'UPCOMING'; // DRAFT, PUBLISHED
}

export default function TournamentListScreen() {
  const router = useRouter();
  const api = useApiClient();
  const { user, logout } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [tab, setTab] = useState<Tab>('UPCOMING');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api<Tournament[]>('/api/tournaments');
      setTournaments(data);
    } catch {
      setError('Could not load tournaments. Pull down to retry.');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => tournaments.filter((t) => tabForStatus(t.status) === tab), [tournaments, tab]);

  if (loading) {
    return (
      <Screen>
        <View style={styles.centered}>
          <ActivityIndicator color="#fff" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.push('/profile')}>
          <Text style={styles.headerText}>
            {user?.fullName} · {user?.role.replace('_', ' ')}
          </Text>
        </Pressable>
        <View style={styles.headerActions}>
          <Pressable onPress={() => router.push('/notifications')}>
            <Text style={styles.bellIcon}>🔔</Text>
          </Pressable>
          <Pressable onPress={() => logout()}>
            <Text style={styles.logoutText}>Log out</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.tabs}>
        {(['UPCOMING', 'ONGOING', 'COMPLETED'] as Tab[]).map((t) => (
          <Pressable key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t.charAt(0) + t.slice(1).toLowerCase()}
            </Text>
          </Pressable>
        ))}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        onRefresh={load}
        refreshing={loading}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.emptyText}>No {tab.toLowerCase()} tournaments.</Text>}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/tournament/${item.id}`)}>
            <Card style={styles.card}>
              <Text style={styles.cardIcon}>🏸</Text>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardSubtitle}>
                  {item.venue} · {new Date(item.startDate).toLocaleDateString()}
                </Text>
              </View>
            </Card>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerText: { fontSize: 13, color: colors.textOnDarkMuted },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  bellIcon: { fontSize: 18 },
  logoutText: { fontSize: 13, color: colors.gold, fontWeight: '700' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabs: { flexDirection: 'row', marginHorizontal: spacing.lg, backgroundColor: colors.navyLight, borderRadius: radius.md, padding: 4, marginBottom: spacing.sm },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radius.sm },
  tabActive: { backgroundColor: colors.gold },
  tabText: { fontSize: 12, fontWeight: '700', color: colors.textOnDarkMuted },
  tabTextActive: { color: colors.navy },
  error: { color: '#ffb4b4', fontSize: 13, textAlign: 'center', paddingVertical: spacing.sm },
  emptyText: { color: colors.textOnDarkMuted, fontSize: 14, textAlign: 'center', paddingTop: spacing.xl },
  list: { padding: spacing.lg, gap: spacing.sm },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardIcon: { fontSize: 28 },
  cardInfo: { flex: 1 },
  cardTitle: { ...typography.heading, color: colors.textPrimary },
  cardSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
});
