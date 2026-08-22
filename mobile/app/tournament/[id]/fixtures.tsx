import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useApiClient } from '../../../lib/auth-context';
import { colors, radius, spacing, typography } from '../../../lib/theme';
import { Badge, Card, Screen } from '../../../components/ui';

interface EntryPlayer {
  id: string;
  fullName: string;
}

interface Entry {
  id: string;
  player1: EntryPlayer;
  player2: EntryPlayer | null;
}

interface Match {
  id: string;
  round: number;
  matchNumber: number;
  status: string;
  entry1: Entry | null;
  entry2: Entry | null;
  winnerEntryId: string | null;
  category: { name: string };
  court: { name: string } | null;
}

interface Category {
  id: string;
  name: string;
}

function entryLabel(entry: Entry | null): string {
  if (!entry) return 'TBD';
  return entry.player2 ? `${entry.player1.fullName} / ${entry.player2.fullName}` : entry.player1.fullName;
}

function roundLabel(round: number, totalRounds: number): string {
  const fromFinal = totalRounds - round;
  if (fromFinal === 0) return 'Final';
  if (fromFinal === 1) return 'Semi Final';
  if (fromFinal === 2) return 'Quarter Final';
  return `Round ${round}`;
}

export default function FixturesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const api = useApiClient();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<Category[]>(`/api/tournaments/${id}/categories`)
      .then((cats) => {
        if (cancelled) return;
        setCategories(cats);
        if (cats.length > 0) setCategoryId(cats[0].id);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load categories.');
      });
    return () => {
      cancelled = true;
    };
  }, [api, id]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api<Match[]>(`/api/tournaments/${id}/matches`)
      .then((data) => {
        if (!cancelled) setMatches(data);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load fixtures.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api, id]);

  const rounds = useMemo(() => {
    const filtered = matches.filter((m) => !categoryId || m.category.name === categories.find((c) => c.id === categoryId)?.name);
    const totalRounds = filtered.reduce((max, m) => Math.max(max, m.round), 0);
    const grouped = new Map<number, Match[]>();
    for (const m of filtered) {
      if (!grouped.has(m.round)) grouped.set(m.round, []);
      grouped.get(m.round)!.push(m);
    }
    return Array.from(grouped.entries())
      .sort(([a], [b]) => a - b)
      .map(([round, list]) => ({
        round,
        label: roundLabel(round, totalRounds),
        matches: list.sort((a, b) => a.matchNumber - b.matchNumber),
      }));
  }, [matches, categoryId, categories]);

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
        <Text style={styles.title}>Fixtures</Text>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {categories.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryTabs} contentContainerStyle={styles.categoryTabsContent}>
          {categories.map((c) => (
            <Pressable
              key={c.id}
              style={[styles.categoryChip, categoryId === c.id && styles.categoryChipActive]}
              onPress={() => setCategoryId(c.id)}
            >
              <Text style={[styles.categoryChipText, categoryId === c.id && styles.categoryChipTextActive]}>
                {c.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {rounds.length === 0 ? (
        <Text style={styles.emptyText}>No bracket generated yet.</Text>
      ) : (
        <ScrollView horizontal contentContainerStyle={styles.bracket} showsHorizontalScrollIndicator={false}>
          {rounds.map((r) => (
            <View key={r.round} style={styles.column}>
              <Text style={styles.columnHeader}>{r.label}</Text>
              {r.matches.map((m) => (
                <Pressable key={m.id} onPress={() => router.push(`/match/${m.id}`)}>
                  <Card style={styles.matchCard}>
                    <View style={styles.matchRow}>
                      <Text
                        style={[
                          styles.entryText,
                          m.winnerEntryId && m.entry1 && m.winnerEntryId === m.entry1.id && styles.entryWinner,
                        ]}
                        numberOfLines={1}
                      >
                        {entryLabel(m.entry1)}
                      </Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.matchRow}>
                      <Text
                        style={[
                          styles.entryText,
                          m.winnerEntryId && m.entry2 && m.winnerEntryId === m.entry2.id && styles.entryWinner,
                        ]}
                        numberOfLines={1}
                      >
                        {entryLabel(m.entry2)}
                      </Text>
                    </View>
                    <View style={styles.matchMeta}>
                      <Badge label={m.status} tone={m.status === 'LIVE' ? 'red' : m.status === 'COMPLETED' ? 'green' : 'neutral'} />
                      {m.court && <Text style={styles.courtText}>{m.court.name}</Text>}
                    </View>
                  </Card>
                </Pressable>
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  title: { ...typography.title, color: '#fff' },
  error: { color: '#ffb4b4', fontSize: 14, textAlign: 'center', paddingVertical: spacing.sm },
  categoryTabs: { flexGrow: 0, marginBottom: spacing.sm },
  categoryTabsContent: { paddingHorizontal: spacing.lg, gap: spacing.xs },
  categoryChip: {
    borderWidth: 1,
    borderColor: colors.navyLight,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: spacing.xs,
  },
  categoryChipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  categoryChipText: { fontSize: 12, fontWeight: '700', color: colors.textOnDarkMuted },
  categoryChipTextActive: { color: colors.navy },
  emptyText: { color: colors.textOnDarkMuted, fontSize: 14, textAlign: 'center', paddingTop: spacing.xl },
  bracket: { padding: spacing.lg, gap: spacing.md, alignItems: 'flex-start' },
  column: { width: 200, gap: spacing.md, marginRight: spacing.md },
  columnHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textOnDarkMuted,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  matchCard: { paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, gap: 4 },
  matchRow: { paddingVertical: 4 },
  entryText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  entryWinner: { color: colors.textPrimary, fontWeight: '800' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  matchMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs },
  courtText: { fontSize: 11, color: colors.textSecondary },
});
