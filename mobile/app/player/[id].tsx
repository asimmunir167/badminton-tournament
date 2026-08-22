import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useApiClient } from '../../lib/auth-context';
import { colors, spacing, typography } from '../../lib/theme';
import { AvatarPicker, Card, GoldButton, InfoRow, Screen, StatTile } from '../../components/ui';
import { ApiError } from '../../lib/api';
import { calculateAge } from '../../lib/format';

interface PlayerProfile {
  id: string;
  fullName: string;
  playingLevel: string | null;
  preferredCategoryType: string | null;
  preferredCategoryGender: string | null;
  district: { name: string } | null;
  dob: string | null;
  photoUrl: string | null;
}

interface PlayerStats {
  matches: number;
  wins: number;
  losses: number;
  rating: number | null;
}

function categoryLabel(p: PlayerProfile): string {
  if (!p.preferredCategoryGender) return 'Not set';
  const g = { MEN: "Men's", WOMEN: "Women's", MIXED: 'Mixed' }[p.preferredCategoryGender] ?? p.preferredCategoryGender;
  return `${g} ${p.preferredCategoryType === 'DOUBLES' ? 'Doubles' : 'Singles'}`;
}

export default function PartnerProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const api = useApiClient();
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api<PlayerProfile>(`/api/players/${id}`), api<PlayerStats>(`/api/players/${id}/stats`)])
      .then(([p, s]) => {
        if (!cancelled) {
          setPlayer(p);
          setStats(s);
        }
      })
      .catch(() => {
        if (!cancelled) setError('Could not load this player.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api, id]);

  async function sendRequest() {
    setError(null);
    setSending(true);
    try {
      await api('/api/pairs', { method: 'POST', body: { partnerPlayerId: id } });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send partnership request.');
    } finally {
      setSending(false);
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

  if (!player) {
    return (
      <Screen>
        <View style={styles.centered}>
          <Text style={styles.error}>{error ?? 'Player not found.'}</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <AvatarPicker
          photoUrl={player.photoUrl}
          fallbackText={player.fullName.charAt(0).toUpperCase()}
          accessToken={null}
          editable={false}
          onUploaded={() => {}}
        />
        <Text style={styles.name}>{player.fullName}</Text>
        <Text style={styles.district}>{player.district?.name ?? 'Unknown district'}</Text>

        <Card style={styles.card}>
          {stats && (
            <View style={styles.statsRow}>
              <StatTile label="Matches" value={stats.matches} />
              <StatTile label="Wins" value={stats.wins} />
              <StatTile label="Losses" value={stats.losses} />
            </View>
          )}

          <InfoRow label="Age" value={player.dob ? `${calculateAge(player.dob)} years` : 'Not set'} />
          <InfoRow label="Playing Category" value={categoryLabel(player)} />
          <InfoRow label="Playing Level" value={player.playingLevel ?? 'Not set'} />
          <InfoRow label="Rating" value={stats?.rating ? `${stats.rating} / 5` : 'New Player'} />
        </Card>

        {error && <Text style={styles.error}>{error}</Text>}

        {sent ? (
          <Text style={styles.sentText}>✅ Partnership request sent.</Text>
        ) : (
          <View style={styles.buttonWrap}>
            <GoldButton label="Send Partnership Request" onPress={sendRequest} loading={sending} />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, alignItems: 'center' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  name: { ...typography.title, color: '#fff', marginTop: spacing.md },
  district: { color: colors.textOnDarkMuted, fontSize: 13, marginTop: 2, marginBottom: spacing.lg },
  card: { width: '100%' },
  statsRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
    marginBottom: spacing.xs,
  },
  error: { color: '#ffb4b4', textAlign: 'center', marginTop: spacing.md },
  sentText: { color: colors.green, fontWeight: '700', marginTop: spacing.lg, fontSize: 15 },
  buttonWrap: { width: '100%', marginTop: spacing.lg },
});
