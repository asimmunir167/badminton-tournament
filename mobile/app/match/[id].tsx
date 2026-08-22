import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useApiClient, useAuth } from '../../lib/auth-context';
import { useMatchState, type Entry } from '../../lib/use-match-state';
import { ApiError } from '../../lib/api';
import { colors, radius, spacing, typography } from '../../lib/theme';
import { Badge, Card } from '../../components/ui';

const OFFICIATE_ROLES = ['super_admin', 'tournament_admin', 'referee'];

interface MatchDetails {
  round: number;
  category: { name: string } | null;
  court: { name: string } | null;
  result: { durationMinutes: number | null } | null;
}

function entryLabel(entry: Entry | null): string {
  if (!entry) return 'TBD';
  return entry.player2 ? `${entry.player1.fullName} / ${entry.player2.fullName}` : entry.player1.fullName;
}

function useElapsedTimer(active: boolean) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!active) return;
    const startedAt = Date.now();
    const interval = setInterval(() => setSeconds(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [active]);
  const hh = Math.floor(seconds / 3600);
  const mm = Math.floor((seconds % 3600) / 60);
  const ss = seconds % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

export default function MatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const api = useApiClient();
  const { user } = useAuth();
  const { state, error } = useMatchState(id);
  const [details, setDetails] = useState<MatchDetails | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [activeGameTab, setActiveGameTab] = useState(0);
  const elapsed = useElapsedTimer(state?.status === 'LIVE' && !state.isPaused);

  useEffect(() => {
    api<MatchDetails>(`/api/matches/${id}`)
      .then(setDetails)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const canOfficiate = !!user && OFFICIATE_ROLES.includes(user.role);

  async function runAction(fn: () => Promise<unknown>) {
    setActionError(null);
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Action failed.');
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }
  if (!state) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  const entry1Label = entryLabel(state.entry1);
  const entry2Label = entryLabel(state.entry2);
  const games = state.games;
  const selectedGame = games[activeGameTab] ?? state.currentGame;

  if (state.status === 'COMPLETED') {
    const winnerLabel = state.winnerEntryId === state.entry1Id ? entry1Label : entry2Label;
    const winnerGames = Math.max(state.gamesWon.entry1, state.gamesWon.entry2);
    const loserGames = Math.min(state.gamesWon.entry1, state.gamesWon.entry2);
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
        <Card style={styles.resultCard}>
          <Text style={styles.trophy}>🏆</Text>
          <Text style={styles.winnerCaption}>Winner</Text>
          <Text style={styles.winnerName}>{winnerLabel}</Text>
          <Text style={styles.finalScore}>
            {winnerGames} - {loserGames}
          </Text>
          <View style={styles.setScoresRow}>
            {games.map((g) => (
              <Text key={g.id} style={styles.setScoreText}>
                {g.entry1Score}-{g.entry2Score}
              </Text>
            ))}
          </View>
          {details?.result?.durationMinutes != null && (
            <Text style={styles.durationText}>{details.result.durationMinutes} min match</Text>
          )}
          <Badge label="Match Completed" tone="green" />
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.topRow}>
        {state.status === 'LIVE' && <Badge label="Live" tone="red" />}
        {details?.court && <Badge label={details.court.name} tone="gold" />}
      </View>

      {details?.category && (
        <Text style={styles.matchTitle}>
          {details.category.name} · Round {details.round}
        </Text>
      )}

      {actionError && <Text style={styles.error}>{actionError}</Text>}

      <View style={styles.scoreRow}>
        <ScoreCard
          label={entry1Label}
          score={state.currentGame?.entry1Score ?? 0}
          gamesWon={state.gamesWon.entry1}
          isWinner={state.winnerEntryId === state.entry1Id}
        />
        <ScoreCard
          label={entry2Label}
          score={state.currentGame?.entry2Score ?? 0}
          gamesWon={state.gamesWon.entry2}
          isWinner={state.winnerEntryId === state.entry2Id}
        />
      </View>

      {games.length > 0 && (
        <>
          <View style={styles.setTabs}>
            {games.map((g, i) => (
              <Pressable
                key={g.id}
                style={[styles.setTab, activeGameTab === i && styles.setTabActive]}
                onPress={() => setActiveGameTab(i)}
              >
                <Text style={[styles.setTabText, activeGameTab === i && styles.setTabTextActive]}>
                  Set {g.gameNumber}
                </Text>
              </Pressable>
            ))}
          </View>
          {selectedGame && (
            <Text style={styles.setDetailScore}>
              {selectedGame.entry1Score} - {selectedGame.entry2Score}
            </Text>
          )}
        </>
      )}

      {state.status === 'LIVE' && <Text style={styles.timer}>{elapsed}</Text>}
      {state.isPaused && <Badge label="Paused" tone="gold" />}

      {!canOfficiate && <Text style={styles.viewOnlyText}>Live view only.</Text>}

      {canOfficiate && (
        <View style={styles.controls}>
          {state.status !== 'LIVE' ? (
            <Pressable
              disabled={busy}
              style={[styles.primaryButton, busy && styles.disabled]}
              onPress={() => runAction(() => api(`/api/matches/${id}/scoring/start`, { method: 'POST' }))}
            >
              <Text style={styles.primaryButtonText}>Start Match</Text>
            </Pressable>
          ) : (
            <>
              <View style={styles.pointRow}>
                <Pressable
                  disabled={busy || state.isPaused}
                  style={[styles.pointButton, (busy || state.isPaused) && styles.disabled]}
                  onPress={() =>
                    runAction(() =>
                      api(`/api/matches/${id}/scoring/point`, {
                        method: 'POST',
                        body: { entryId: state.entry1Id },
                      }),
                    )
                  }
                >
                  <Text style={styles.pointButtonText}>+1{'\n'}{entry1Label}</Text>
                </Pressable>
                <Pressable
                  disabled={busy || state.isPaused}
                  style={[styles.pointButton, (busy || state.isPaused) && styles.disabled]}
                  onPress={() =>
                    runAction(() =>
                      api(`/api/matches/${id}/scoring/point`, {
                        method: 'POST',
                        body: { entryId: state.entry2Id },
                      }),
                    )
                  }
                >
                  <Text style={styles.pointButtonText}>+1{'\n'}{entry2Label}</Text>
                </Pressable>
              </View>

              <View style={styles.secondaryRow}>
                <Pressable
                  disabled={busy}
                  style={[styles.secondaryButton, busy && styles.disabled]}
                  onPress={() => runAction(() => api(`/api/matches/${id}/scoring/undo`, { method: 'POST' }))}
                >
                  <Text style={styles.secondaryButtonText}>Undo</Text>
                </Pressable>
                <Pressable
                  disabled={busy}
                  style={[styles.secondaryButton, busy && styles.disabled]}
                  onPress={() =>
                    runAction(() =>
                      api(`/api/matches/${id}/scoring/${state.isPaused ? 'resume' : 'pause'}`, {
                        method: 'POST',
                      }),
                    )
                  }
                >
                  <Text style={styles.secondaryButtonText}>{state.isPaused ? 'Resume' : 'Pause'}</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      )}
    </ScrollView>
  );
}

function ScoreCard({
  label,
  score,
  gamesWon,
  isWinner,
}: {
  label: string;
  score: number;
  gamesWon: number;
  isWinner: boolean;
}) {
  return (
    <Card style={[styles.scoreCard, isWinner ? styles.scoreCardWinner : undefined]}>
      <Text style={styles.scoreCardLabel} numberOfLines={2}>
        {label}
      </Text>
      <Text style={styles.scoreCardScore}>{score}</Text>
      <Text style={styles.scoreCardGames}>
        {gamesWon} game{gamesWon === 1 ? '' : 's'}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, gap: spacing.md },
  centered: { alignItems: 'center', justifyContent: 'center' },
  error: { color: '#ffb4b4', fontSize: 14, textAlign: 'center' },
  topRow: { flexDirection: 'row', gap: spacing.sm },
  matchTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  scoreRow: { flexDirection: 'row', gap: spacing.sm },
  scoreCard: { flex: 1, alignItems: 'center', paddingVertical: spacing.lg },
  scoreCardWinner: { borderWidth: 2, borderColor: colors.green },
  scoreCardLabel: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.sm },
  scoreCardScore: { fontSize: 44, fontWeight: '800', color: colors.textPrimary },
  scoreCardGames: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },
  setTabs: { flexDirection: 'row', gap: spacing.xs },
  setTab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.sm, backgroundColor: colors.navyLight },
  setTabActive: { backgroundColor: colors.gold },
  setTabText: { color: colors.textOnDarkMuted, fontWeight: '700', fontSize: 12 },
  setTabTextActive: { color: colors.navy },
  setDetailScore: { color: '#fff', fontSize: 20, fontWeight: '800', textAlign: 'center' },
  timer: { color: '#fff', fontSize: 28, fontWeight: '800', textAlign: 'center', letterSpacing: 1 },
  viewOnlyText: { textAlign: 'center', color: colors.textOnDarkMuted, fontSize: 13 },
  controls: { gap: spacing.sm },
  primaryButton: { backgroundColor: colors.green, borderRadius: radius.md, paddingVertical: 16, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  pointRow: { flexDirection: 'row', gap: spacing.sm },
  pointButton: { flex: 1, backgroundColor: colors.navy, borderRadius: radius.md, paddingVertical: 20, alignItems: 'center' },
  pointButtonText: { color: '#fff', fontWeight: '700', fontSize: 16, textAlign: 'center' },
  secondaryRow: { flexDirection: 'row', gap: spacing.sm },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.navyLight,
    borderRadius: radius.sm,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: { color: '#fff', fontWeight: '600' },
  disabled: { opacity: 0.5 },
  resultCard: { alignItems: 'center', gap: spacing.xs, marginTop: spacing.xl },
  trophy: { fontSize: 48 },
  winnerCaption: { fontSize: 13, color: colors.textSecondary, textTransform: 'uppercase', fontWeight: '700' },
  winnerName: { ...typography.title, color: colors.textPrimary },
  finalScore: { fontSize: 32, fontWeight: '800', color: colors.textPrimary, marginTop: spacing.xs },
  setScoresRow: { flexDirection: 'row', gap: spacing.md, marginVertical: spacing.sm },
  setScoreText: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
  durationText: { fontSize: 12, color: colors.textSecondary, marginBottom: spacing.sm },
});
