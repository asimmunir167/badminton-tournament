import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { useApiClient } from '../../../lib/auth-context';
import { colors, radius, spacing, typography } from '../../../lib/theme';
import { Badge, Card } from '../../../components/ui';

interface Tournament {
  id: string;
  name: string;
  venue: string;
  startDate: string;
  endDate: string;
  status: string;
}

interface Category {
  id: string;
  name: string;
  type: string;
  gender: string;
}

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
  category: { name: string };
  court: { name: string } | null;
}

function entryLabel(entry: Entry | null): string {
  if (!entry) return 'TBD';
  return entry.player2 ? `${entry.player1.fullName} / ${entry.player2.fullName}` : entry.player1.fullName;
}

type Section = { title: string; data: Match[] };

export default function TournamentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const api = useApiClient();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [t, cats, m] = await Promise.all([
          api<Tournament>(`/api/tournaments/${id}`),
          api<Category[]>(`/api/tournaments/${id}/categories`),
          api<Match[]>(`/api/tournaments/${id}/matches`),
        ]);
        if (cancelled) return;
        setTournament(t);
        setCategories(cats);
        setMatches(m);
      } catch {
        if (!cancelled) setError('Could not load tournament details.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [api, id]);

  if (loading) {
    return (
      <View style={[styles.centered, styles.screen]}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  if (error || !tournament) {
    return (
      <View style={[styles.centered, styles.screen]}>
        <Text style={styles.error}>{error ?? 'Tournament not found.'}</Text>
      </View>
    );
  }

  const sections: Section[] = Object.values(
    matches.reduce<Record<number, Section>>((acc, match) => {
      const key = match.round;
      if (!acc[key]) acc[key] = { title: `Round ${key}`, data: [] };
      acc[key].data.push(match);
      return acc;
    }, {}),
  ).sort((a, b) => a.data[0].round - b.data[0].round);

  return (
    <SectionList
      style={styles.screen}
      sections={sections}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View style={styles.header}>
          <Card style={styles.headerCard}>
            <Text style={styles.headerIcon}>🏸</Text>
            <Text style={styles.title}>{tournament.name}</Text>
            <Text style={styles.subtitle}>
              {new Date(tournament.startDate).toLocaleDateString()} –{' '}
              {new Date(tournament.endDate).toLocaleDateString()}
            </Text>
            <Text style={styles.venue}>{tournament.venue}</Text>
          </Card>

          {categories.length > 0 && (
            <>
              <Text style={styles.categoryHint}>Categories — tap to apply</Text>
              <View style={styles.categoryRow}>
                {categories.map((c) => (
                  <Pressable
                    key={c.id}
                    style={styles.categoryChip}
                    onPress={() => router.push(`/category/${c.id}/apply`)}
                  >
                    <Text style={styles.categoryChipText}>{c.name}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          <View style={styles.linkRow}>
            <Pressable style={styles.rankingsLink} onPress={() => router.push(`/tournament/${id}/fixtures`)}>
              <Text style={styles.rankingsLinkText}>View Full Bracket →</Text>
            </Pressable>
            <Pressable style={styles.rankingsLink} onPress={() => router.push(`/tournament/${id}/rankings`)}>
              <Text style={styles.rankingsLinkText}>View Rankings →</Text>
            </Pressable>
          </View>

          <Text style={styles.sectionHeaderTop}>Fixtures</Text>
        </View>
      }
      renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>}
      ListEmptyComponent={<Text style={styles.emptyText}>No fixtures yet.</Text>}
      renderItem={({ item }) => (
        <Pressable onPress={() => router.push(`/match/${item.id}`)}>
          <Card style={styles.matchRow}>
            <View style={styles.matchInfo}>
              <Text style={styles.matchEntries}>
                {entryLabel(item.entry1)} vs {entryLabel(item.entry2)}
              </Text>
              <Text style={styles.matchMeta}>
                {item.category.name}
                {item.court ? ` · ${item.court.name}` : ''}
              </Text>
            </View>
            <Badge label={item.status} tone={item.status === 'LIVE' ? 'red' : 'neutral'} />
          </Card>
        </Pressable>
      )}
      contentContainerStyle={{ paddingBottom: spacing.xl }}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centered: { alignItems: 'center', justifyContent: 'center' },
  error: { color: '#ffb4b4', fontSize: 14, textAlign: 'center', paddingHorizontal: spacing.lg },
  header: { padding: spacing.lg },
  headerCard: { alignItems: 'center' },
  headerIcon: { fontSize: 32, marginBottom: spacing.xs },
  title: { ...typography.heading, color: colors.textPrimary, textAlign: 'center' },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  venue: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  categoryHint: { fontSize: 12, color: colors.textOnDarkMuted, marginTop: spacing.lg, marginBottom: spacing.sm },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  categoryChip: { backgroundColor: colors.gold, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  categoryChipText: { fontSize: 12, fontWeight: '700', color: colors.navy },
  linkRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
  rankingsLink: {},
  rankingsLinkText: { fontSize: 14, fontWeight: '700', color: colors.gold },
  sectionHeaderTop: { fontSize: 16, fontWeight: '700', color: '#fff', marginTop: spacing.lg },
  sectionHeader: {
    backgroundColor: colors.background,
    fontSize: 12,
    fontWeight: '700',
    color: colors.textOnDarkMuted,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    textTransform: 'uppercase',
  },
  emptyText: { color: colors.textOnDarkMuted, fontSize: 14, textAlign: 'center', paddingVertical: spacing.lg },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm,
  },
  matchInfo: { flex: 1, marginRight: spacing.sm },
  matchEntries: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  matchMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
});
