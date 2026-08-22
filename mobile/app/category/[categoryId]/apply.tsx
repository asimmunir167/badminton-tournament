import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useApiClient } from '../../../lib/auth-context';
import { ApiError } from '../../../lib/api';
import { colors, radius, spacing, typography } from '../../../lib/theme';
import { Card, GoldButton, NavyButton, Screen } from '../../../components/ui';

interface Category {
  id: string;
  name: string;
  type: 'SINGLES' | 'DOUBLES';
  gender: string;
  tournamentId: string;
}

interface MyPlayer {
  id: string;
}

interface PairPlayer {
  id: string;
  fullName: string;
}

interface Pair {
  id: string;
  pairCode: string;
  status: 'PENDING' | 'ACTIVE' | 'DECLINED';
  player1: PairPlayer;
  player2: PairPlayer;
}

export default function ApplyToCategoryScreen() {
  const { categoryId } = useLocalSearchParams<{ categoryId: string }>();
  const router = useRouter();
  const api = useApiClient();

  const [category, setCategory] = useState<Category | null>(null);
  const [myPlayer, setMyPlayer] = useState<MyPlayer | null>(null);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [activePairs, setActivePairs] = useState<Pair[]>([]);
  const [selectedPairId, setSelectedPairId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const cat = await api<Category>(`/api/categories/${categoryId}`);
        if (cancelled) return;
        setCategory(cat);

        let player: MyPlayer;
        try {
          player = await api<MyPlayer>('/api/players/me');
        } catch (err) {
          if (err instanceof ApiError && err.status === 404) {
            if (!cancelled) setNeedsProfile(true);
            return;
          }
          throw err;
        }
        if (cancelled) return;
        setMyPlayer(player);

        if (cat.type === 'DOUBLES') {
          const pairs = await api<Pair[]>('/api/pairs/mine');
          const active = pairs.filter((p) => p.status === 'ACTIVE');
          if (!cancelled) {
            setActivePairs(active);
            if (active.length > 0) setSelectedPairId(active[0].id);
          }
        }
      } catch {
        if (!cancelled) setError('Could not load this category.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [api, categoryId]);

  async function onApply() {
    if (!category || !myPlayer) return;
    if (category.type === 'DOUBLES' && !selectedPairId) {
      setError('Please select your pair.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const registration = await api<{ id: string }>(`/api/tournaments/${category.tournamentId}/registrations`, {
        method: 'POST',
        body: {
          playerId: myPlayer.id,
          categoryId: category.id,
          ...(category.type === 'DOUBLES' ? { pairId: selectedPairId } : {}),
        },
      });
      router.replace(`/registration/${registration.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not submit your application.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <View style={styles.centered}>
          <ActivityIndicator color="#fff" />
        </View>
      </Screen>
    );
  }

  if (needsProfile) {
    return (
      <Screen>
        <View style={styles.centered}>
          <Text style={styles.infoText}>You need to complete your player profile before applying.</Text>
          <NavyButton label="Complete Profile" onPress={() => router.push('/create-profile')} />
        </View>
      </Screen>
    );
  }

  if (error && !category) {
    return (
      <Screen>
        <View style={styles.centered}>
          <Text style={styles.error}>{error}</Text>
        </View>
      </Screen>
    );
  }

  const needsPair = category?.type === 'DOUBLES' && activePairs.length === 0;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{category?.name}</Text>
        <Text style={styles.subtitle}>
          {category?.type} · {category?.gender}
        </Text>

        {error && <Text style={styles.error}>{error}</Text>}

        {needsPair && (
          <Card style={styles.noticeCard}>
            <Text style={styles.noticeText}>
              This is a doubles category and you don&apos;t have an active pair yet.
            </Text>
            <NavyButton label="Find a Partner" onPress={() => router.push('/find-partner')} />
          </Card>
        )}

        {category?.type === 'DOUBLES' && activePairs.length > 0 && (
          <View style={styles.pairSection}>
            <Text style={styles.label}>Apply with pair</Text>
            {activePairs.map((p) => (
              <Pressable
                key={p.id}
                style={[styles.pairOption, selectedPairId === p.id && styles.pairOptionActive]}
                onPress={() => setSelectedPairId(p.id)}
              >
                <Text style={[styles.pairText, selectedPairId === p.id && styles.pairTextActive]}>
                  {p.player1.fullName} + {p.player2.fullName} ({p.pairCode})
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {!needsPair && (
          <View style={styles.buttonWrap}>
            <GoldButton label="Apply for Tournament" onPress={onApply} loading={submitting} />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.md },
  title: { ...typography.title, color: '#fff' },
  subtitle: { color: colors.textOnDarkMuted, fontSize: 13, marginTop: 4, marginBottom: spacing.lg },
  error: { color: '#ffb4b4', textAlign: 'center', marginBottom: spacing.md },
  infoText: { fontSize: 15, color: '#fff', textAlign: 'center' },
  label: { fontSize: 13, color: colors.textOnDarkMuted, marginBottom: spacing.sm, fontWeight: '700' },
  noticeCard: { gap: spacing.md, alignItems: 'center', marginBottom: spacing.lg },
  noticeText: { fontSize: 14, color: colors.textPrimary, textAlign: 'center' },
  pairSection: { marginBottom: spacing.xl },
  pairOption: {
    borderWidth: 1,
    borderColor: colors.navyLight,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  pairOptionActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  pairText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  pairTextActive: { color: colors.navy },
  buttonWrap: { marginTop: spacing.sm },
});
