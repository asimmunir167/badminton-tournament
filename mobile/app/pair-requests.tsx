import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useApiClient } from '../lib/auth-context';
import { colors, radius, spacing, typography } from '../lib/theme';
import { Card, Screen } from '../components/ui';
import { ApiError } from '../lib/api';

interface PairRequest {
  id: string;
  pairCode: string;
  player1: { fullName: string };
}

export default function PairRequestsScreen() {
  const api = useApiClient();
  const [requests, setRequests] = useState<PairRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api<PairRequest[]>('/api/pairs/requests/mine');
      setRequests(data);
    } catch {
      setError('Could not load pair requests.');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  async function respond(id: string, action: 'accept' | 'decline') {
    setError(null);
    setBusyId(id);
    try {
      await api(`/api/pairs/${id}/${action}`, { method: 'POST' });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not respond to this request.');
    } finally {
      setBusyId(null);
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

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      >
        {error && <Text style={styles.error}>{error}</Text>}
        {requests.length === 0 && !error && <Text style={styles.emptyText}>No pending pair requests.</Text>}

        {requests.map((r) => (
          <Card key={r.id} style={styles.card}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{r.player1.fullName.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.message}>{r.player1.fullName} wants to become your tournament partner.</Text>

            <Pressable
              style={[styles.acceptButton, busyId === r.id && styles.disabled]}
              onPress={() => respond(r.id, 'accept')}
              disabled={busyId === r.id}
            >
              <Text style={styles.acceptText}>Accept</Text>
            </Pressable>
            <Pressable
              style={[styles.declineButton, busyId === r.id && styles.disabled]}
              onPress={() => respond(r.id, 'decline')}
              disabled={busyId === r.id}
            >
              <Text style={styles.declineText}>Reject</Text>
            </Pressable>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error: { color: '#ffb4b4', textAlign: 'center' },
  emptyText: { color: colors.textOnDarkMuted, textAlign: 'center', marginTop: spacing.xl },
  card: { alignItems: 'center', gap: spacing.sm },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 26 },
  message: { ...typography.body, color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.xs },
  acceptButton: {
    width: '100%',
    backgroundColor: colors.green,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  acceptText: { color: '#fff', fontWeight: '700' },
  declineButton: {
    width: '100%',
    borderWidth: 1,
    borderColor: colors.navy,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  declineText: { color: colors.navy, fontWeight: '700' },
  disabled: { opacity: 0.5 },
});
