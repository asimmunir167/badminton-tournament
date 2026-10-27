import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useApiClient } from '../lib/auth-context';
import { colors, radius, spacing, typography } from '../lib/theme';
import { Card, Screen } from '../components/ui';

interface District {
  id: string;
  name: string;
}

interface SearchPlayer {
  id: string;
  fullName: string;
  playingLevel: string | null;
  preferredCategoryType: string | null;
  preferredCategoryGender: string | null;
  district: { id: string; name: string } | null;
}

const GENDERS: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'MEN', label: "Men's" },
  { value: 'WOMEN', label: "Women's" },
  { value: 'MIXED', label: 'Mixed' },
];

export default function FindPartnerScreen() {
  const router = useRouter();
  const api = useApiClient();
  const [districts, setDistricts] = useState<District[]>([]);
  const [districtId, setDistrictId] = useState('');
  const [categoryGender, setCategoryGender] = useState('');
  const [search, setSearch] = useState('');
  const [players, setPlayers] = useState<SearchPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<District[]>('/api/districts').then(setDistricts).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runSearch() {
    setLoading(true);
    setError(null);
    try {
      const data = await api<SearchPlayer[]>('/api/players/search', {
        query: {
          districtId: districtId || undefined,
          categoryGender: categoryGender || undefined,
          search: search || undefined,
        },
      });
      setPlayers(data);
    } catch {
      setError('Could not load players.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [districtId, categoryGender]);

  function categoryLabel(p: SearchPlayer): string {
    if (!p.preferredCategoryGender) return 'No category set';
    const g = GENDERS.find((x) => x.value === p.preferredCategoryGender)?.label ?? p.preferredCategoryGender;
    return `${g} ${p.preferredCategoryType === 'DOUBLES' ? 'Doubles' : 'Singles'}`;
  }

  return (
    <Screen>
      <View style={styles.header}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search Partner..."
          placeholderTextColor={colors.textOnDarkMuted}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={runSearch}
          returnKeyType="search"
        />
        <Text style={styles.hint}>
          Players who already have an active pair are hidden — they can only play with their current partner.
        </Text>

        <View style={styles.filterRow}>
          <FilterPill
            label={districts.find((d) => d.id === districtId)?.name ?? 'District'}
            active={!!districtId}
            onPress={() => setDistrictId(districtId ? '' : (districts[0]?.id ?? ''))}
          />
          {GENDERS.map((g) => (
            <FilterPill
              key={g.value}
              label={g.label}
              active={categoryGender === g.value && g.value !== ''}
              onPress={() => setCategoryGender(g.value)}
            />
          ))}
        </View>
      </View>

      {loading && (
        <View style={styles.centered}>
          <ActivityIndicator color="#fff" />
        </View>
      )}
      {error && <Text style={styles.error}>{error}</Text>}

      {!loading && !error && (
        <FlatList
          data={players}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>No players found.</Text>}
          renderItem={({ item }) => (
            <Card style={styles.playerCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.fullName.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.playerInfo}>
                <Text style={styles.playerName}>{item.fullName}</Text>
                <Text style={styles.playerMeta}>
                  {item.district?.name ?? 'Unknown district'} · {categoryLabel(item)}
                </Text>
              </View>
              <Pressable style={styles.viewButton} onPress={() => router.push(`/player/${item.id}`)}>
                <Text style={styles.viewButtonText}>View Profile</Text>
              </Pressable>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}

function FilterPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.pill, active && styles.pillActive]} onPress={onPress}>
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { padding: spacing.lg, gap: spacing.sm },
  hint: { color: colors.textOnDarkMuted, fontSize: 12, lineHeight: 16 },
  searchInput: {
    backgroundColor: colors.navyLight,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 14,
  },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  pill: {
    borderWidth: 1,
    borderColor: colors.navyLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
  },
  pillActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  pillText: { color: colors.textOnDarkMuted, fontSize: 12, fontWeight: '600' },
  pillTextActive: { color: colors.navy },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error: { color: '#ffb4b4', textAlign: 'center', padding: spacing.md },
  emptyText: { color: colors.textOnDarkMuted, textAlign: 'center', marginTop: spacing.lg },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.sm },
  playerCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  playerInfo: { flex: 1 },
  playerName: { ...typography.body, fontWeight: '700', color: colors.textPrimary },
  playerMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  viewButton: { backgroundColor: colors.navy, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 8 },
  viewButtonText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
