import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useApiClient } from '../lib/auth-context';
import { ApiError } from '../lib/api';

interface PartnerRequest {
  id: string;
  submittedAt: string;
  player: { fullName: string } | null;
  category: { name: string } | null;
  tournament: { name: string } | null;
}

export default function PartnerRequestsScreen() {
  const api = useApiClient();
  const [requests, setRequests] = useState<PartnerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api<PartnerRequest[]>('/api/registrations/partner-requests/mine');
      setRequests(data);
    } catch {
      setError('Could not load partner requests.');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  async function respond(id: string, action: 'confirm' | 'decline') {
    setActionError(null);
    setBusyId(id);
    try {
      await api(`/api/registrations/${id}/${action}-partner`, { method: 'POST' });
      await load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not respond to this request.');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
    >
      <Text style={styles.title}>Partner Requests</Text>
      <Text style={styles.subtitle}>Other players who want to team up with you for a doubles category.</Text>

      {error && <Text style={styles.error}>{error}</Text>}
      {actionError && <Text style={styles.error}>{actionError}</Text>}

      {requests.length === 0 && !error && <Text style={styles.emptyText}>No pending requests.</Text>}

      {requests.map((r) => (
        <View key={r.id} style={styles.card}>
          <Text style={styles.cardTitle}>{r.player?.fullName ?? 'A player'} wants to partner with you</Text>
          <Text style={styles.cardMeta}>
            {r.category?.name} · {r.tournament?.name}
          </Text>
          <View style={styles.actionRow}>
            <Pressable
              style={[styles.declineButton, busyId === r.id && styles.disabled]}
              onPress={() => respond(r.id, 'decline')}
              disabled={busyId === r.id}
            >
              <Text style={styles.declineText}>Decline</Text>
            </Pressable>
            <Pressable
              style={[styles.acceptButton, busyId === r.id && styles.disabled]}
              onPress={() => respond(r.id, 'confirm')}
              disabled={busyId === r.id}
            >
              <Text style={styles.acceptText}>Accept</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 4, marginBottom: 20 },
  error: { color: '#c0392b', fontSize: 14, marginBottom: 16, textAlign: 'center' },
  emptyText: { color: '#888', fontSize: 14, textAlign: 'center', marginTop: 24 },
  card: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardMeta: { fontSize: 13, color: '#666', marginTop: 4 },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 14 },
  declineButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#c0392b',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  declineText: { color: '#c0392b', fontWeight: '700', fontSize: 13 },
  acceptButton: { flex: 1, backgroundColor: '#16a34a', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  acceptText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  disabled: { opacity: 0.5 },
});
