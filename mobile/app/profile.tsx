import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useApiClient, useAuth } from '../lib/auth-context';
import { ApiError } from '../lib/api';
import { colors, spacing, typography } from '../lib/theme';
import { AvatarPicker, Card, GoldButton, InfoRow, NavyButton, Screen, StatTile } from '../components/ui';
import { calculateAge } from '../lib/format';

interface PlayerProfile {
  id: string;
  playingLevel: string | null;
  preferredCategoryType: string | null;
  preferredCategoryGender: string | null;
  district: { name: string } | null;
  createdAt: string;
  dob: string | null;
  photoUrl: string | null;
  cnic: string | null;
}

interface PlayerStats {
  matches: number;
  wins: number;
  losses: number;
  rating: number | null;
}

interface RankingRow {
  entityId: string;
  rank: number;
}

function categoryLabel(p: PlayerProfile): string {
  if (!p.preferredCategoryGender) return 'Not set';
  const g = { MEN: "Men's", WOMEN: "Women's", MIXED: 'Mixed' }[p.preferredCategoryGender] ?? p.preferredCategoryGender;
  return `${g} ${p.preferredCategoryType === 'DOUBLES' ? 'Doubles' : 'Singles'}`;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, accessToken, logout } = useAuth();
  const api = useApiClient();
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [rank, setRank] = useState<number | null>(null);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const me = await api<PlayerProfile & { id: string }>('/api/players/me');
        if (cancelled) return;
        setPlayer(me);

        const [s, rankings] = await Promise.all([
          api<PlayerStats>(`/api/players/${me.id}/stats`),
          api<RankingRow[]>('/api/rankings', { query: { entityType: 'PLAYER' } }).catch(() => []),
        ]);
        if (cancelled) return;
        setStats(s);
        const mine = rankings.find((r) => r.entityId === me.id);
        setRank(mine?.rank ?? null);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          if (!cancelled) setNeedsProfile(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [api]);

  if (!user) return null;

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
      <ScrollView contentContainerStyle={styles.container}>
        <AvatarPicker
          photoUrl={player?.photoUrl}
          fallbackText={user.fullName.charAt(0).toUpperCase()}
          accessToken={accessToken}
          editable={!needsProfile}
          onUploaded={(photoUrl) => setPlayer((prev) => (prev ? { ...prev, photoUrl } : prev))}
        />
        <Text style={styles.name}>{user.fullName}</Text>
        <Text style={styles.district}>{player?.district?.name ?? user.role.replace('_', ' ')}</Text>

        {needsProfile ? (
          <Card style={styles.card}>
            <Text style={styles.noticeText}>You haven&apos;t completed your player profile yet.</Text>
            <NavyButton label="Complete Profile" onPress={() => router.push('/create-profile')} />
          </Card>
        ) : (
          <>
            <Card style={styles.card}>
              {stats && (
                <View style={styles.statsRow}>
                  <StatTile label="Matches" value={stats.matches} />
                  <StatTile label="Wins" value={stats.wins} />
                  <StatTile label="Losses" value={stats.losses} />
                </View>
              )}
              {player && (
                <>
                  <InfoRow label="Age" value={player.dob ? `${calculateAge(player.dob)} years` : 'Not set'} />
                  <InfoRow label="CNIC" value={player.cnic ?? 'Not set'} />
                  <InfoRow label="Playing Category" value={categoryLabel(player)} />
                  <InfoRow label="Playing Level" value={player.playingLevel ?? 'Not set'} />
                  <InfoRow label="Ranking" value={rank ? `#${rank}` : 'Unranked'} />
                  <InfoRow label="Member Since" value={new Date(player.createdAt).toLocaleDateString()} />
                </>
              )}
            </Card>

            <View style={styles.buttonWrap}>
              <GoldButton label="Find Partner" onPress={() => router.push('/find-partner')} />
            </View>
          </>
        )}

        <View style={styles.linkRow}>
          <NavyButton label="My Pair" onPress={() => router.push('/my-pair')} />
        </View>
        <View style={styles.linkRow}>
          <NavyButton label="Pair Requests" onPress={() => router.push('/pair-requests')} />
        </View>

        <Text style={styles.logout} onPress={() => logout()}>
          Log Out
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: spacing.lg, paddingBottom: spacing.xl },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  name: { ...typography.title, color: '#fff', marginTop: spacing.md },
  district: { color: colors.textOnDarkMuted, fontSize: 13, marginTop: 2, marginBottom: spacing.lg },
  card: { width: '100%', gap: spacing.xs },
  noticeText: { fontSize: 14, color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.sm },
  statsRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
    marginBottom: spacing.xs,
  },
  buttonWrap: { width: '100%', marginTop: spacing.lg },
  linkRow: { width: '100%', marginTop: spacing.sm },
  logout: { color: '#ffb4b4', fontWeight: '700', marginTop: spacing.xl, fontSize: 14 },
});
