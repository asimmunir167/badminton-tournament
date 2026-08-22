import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useApiClient } from '../lib/auth-context';
import { colors, radius, spacing, typography } from '../lib/theme';
import { Card, Screen } from '../components/ui';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: { matchId?: string; registrationId?: string } | null;
  isRead: boolean;
  sentAt: string;
}

const ICONS: Record<string, string> = {
  REGISTRATION_APPROVED: '✅',
  REGISTRATION_REJECTED: '❌',
  MATCH_SCHEDULED: '📅',
  MATCH_STARTING_SOON: '⏰',
  COURT_CHANGED: '🏟️',
  MATCH_LIVE: '🔴',
  MATCH_RESULT: '🏆',
  PLAYER_QUALIFIED: '🎉',
  SEMI_FINAL: '🥈',
  FINAL: '🥇',
  TOURNAMENT_CHAMPION: '👑',
};

export default function NotificationsScreen() {
  const router = useRouter();
  const api = useApiClient();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api<Notification[]>('/api/notifications/mine');
      setNotifications(data);
    } catch {
      setError('Could not load notifications.');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  async function onPress(n: Notification) {
    if (!n.isRead) {
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      api(`/api/notifications/${n.id}/read`, { method: 'POST' }).catch(() => {});
    }
    if (n.data?.matchId) {
      router.push(`/match/${n.data.matchId}`);
    } else if (n.data?.registrationId) {
      router.push(`/registration/${n.data.registrationId}`);
    }
  }

  async function onMarkAllRead() {
    setNotifications((prev) => prev.map((x) => ({ ...x, isRead: true })));
    api('/api/notifications/read-all', { method: 'POST' }).catch(() => {});
  }

  const hasUnread = notifications.some((n) => !n.isRead);

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
        <Text style={styles.title}>🔔 Notifications</Text>
        {hasUnread && (
          <Pressable onPress={onMarkAllRead}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </Pressable>
        )}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={notifications}
        keyExtractor={(n) => n.id}
        onRefresh={load}
        refreshing={loading}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.emptyText}>No notifications yet.</Text>}
        renderItem={({ item }) => (
          <Pressable onPress={() => onPress(item)}>
            <Card style={[styles.card, !item.isRead && styles.cardUnread]}>
              <Text style={styles.icon}>{ICONS[item.type] ?? '🔔'}</Text>
              <View style={styles.textCol}>
                <Text style={styles.notifTitle}>{item.title}</Text>
                <Text style={styles.notifBody}>{item.body}</Text>
                <Text style={styles.notifTime}>{new Date(item.sentAt).toLocaleString()}</Text>
              </View>
              {!item.isRead && <View style={styles.unreadDot} />}
            </Card>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: { ...typography.title, color: '#fff' },
  markAllText: { fontSize: 13, color: colors.gold, fontWeight: '700' },
  error: { color: '#ffb4b4', fontSize: 14, textAlign: 'center', paddingVertical: spacing.md },
  list: { padding: spacing.lg, gap: spacing.sm },
  card: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  cardUnread: { borderWidth: 1, borderColor: colors.gold },
  icon: { fontSize: 22 },
  textCol: { flex: 1 },
  notifTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  notifBody: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  notifTime: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold, marginTop: 4 },
  emptyText: { color: colors.textOnDarkMuted, fontSize: 14, textAlign: 'center', paddingTop: spacing.xl },
});
