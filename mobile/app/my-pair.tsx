import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useApiClient } from '../lib/auth-context';
import { colors, radius, spacing, typography } from '../lib/theme';
import { Badge, Card, NavyButton, Screen } from '../components/ui';

interface PairPlayer {
  id: string;
  fullName: string;
  districtId: string;
}

interface Pair {
  id: string;
  pairCode: string;
  status: 'PENDING' | 'ACTIVE' | 'DECLINED';
  player1: PairPlayer;
  player2: PairPlayer;
}

export default function MyPairScreen() {
  const router = useRouter();
  const api = useApiClient();
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [me, data] = await Promise.all([
        api<{ id: string }>('/api/players/me'),
        api<Pair[]>('/api/pairs/mine'),
      ]);
      setMyPlayerId(me.id);
      setPairs(data);
    } catch {
      setError('Could not load your pairs.');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

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
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      >
        {error && <Text style={styles.error}>{error}</Text>}
        {pairs.length === 0 && !error && (
          <Text style={styles.emptyText}>You don&apos;t have a pair yet. Find a partner to get started.</Text>
        )}

        {pairs.some((p) => p.status === 'ACTIVE') && (
          <Text style={styles.infoText}>
            You have an active pair. While you are paired, other players cannot send you new partner requests, and you
            cannot request someone else.
          </Text>
        )}

        {pairs.map((pair) => {
          const otherPlayerId = pair.player1.id === myPlayerId ? pair.player2.id : pair.player1.id;
          return (
            <Card key={pair.id} style={styles.card}>
              {pair.status === 'ACTIVE' && <Badge label="Pair Created" tone="green" />}
              {pair.status === 'PENDING' && <Badge label="Pending" tone="gold" />}
              {pair.status === 'DECLINED' && <Badge label="Declined" tone="red" />}

              <View style={styles.pairRow}>
                <View style={styles.avatarPair}>
                  <Text style={styles.avatarText}>{pair.player1.fullName.charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={styles.handshake}>🤝</Text>
                <View style={styles.avatarPair}>
                  <Text style={styles.avatarText}>{pair.player2.fullName.charAt(0).toUpperCase()}</Text>
                </View>
              </View>

              <View style={styles.namesRow}>
                <Text style={styles.nameText}>{pair.player1.fullName}</Text>
                <Text style={styles.nameText}>{pair.player2.fullName}</Text>
              </View>

              <View style={styles.metaBox}>
                <Text style={styles.metaLabel}>Pair ID</Text>
                <Text style={styles.metaValue}>{pair.pairCode}</Text>
              </View>

              {pair.status === 'ACTIVE' && (
                <NavyButton label="View Pair Profile" onPress={() => router.push(`/player/${otherPlayerId}`)} />
              )}
            </Card>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error: { color: '#ffb4b4', textAlign: 'center' },
  emptyText: { color: colors.textOnDarkMuted, textAlign: 'center', marginTop: spacing.xl },
  infoText: {
    color: colors.textOnDarkMuted,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  card: { gap: spacing.sm },
  pairRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md, marginTop: spacing.sm },
  avatarPair: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 20 },
  handshake: { fontSize: 22 },
  namesRow: { flexDirection: 'row', justifyContent: 'space-around' },
  nameText: { ...typography.body, fontWeight: '700', color: colors.textPrimary },
  metaBox: {
    backgroundColor: colors.cardMuted,
    borderRadius: radius.sm,
    padding: spacing.sm,
    alignItems: 'center',
  },
  metaLabel: { fontSize: 11, color: colors.textSecondary },
  metaValue: { fontSize: 15, fontWeight: '800', color: colors.textPrimary, letterSpacing: 0.5 },
});
