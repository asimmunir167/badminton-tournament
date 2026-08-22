import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useApiClient } from '../../lib/auth-context';
import { colors, radius, spacing, typography } from '../../lib/theme';
import { Card, NavyButton, Screen } from '../../components/ui';

interface Registration {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
  reviewedAt: string | null;
  partnerConfirmedAt: string | null;
  drawPublished: boolean;
  category: { name: string; type: 'SINGLES' | 'DOUBLES' } | null;
  tournament: { name: string } | null;
  partner: { fullName: string } | null;
}

type StepState = 'done' | 'active' | 'pending' | 'rejected';

interface Step {
  label: string;
  detail: string;
  state: StepState;
}

function buildSteps(reg: Registration): Step[] {
  const steps: Step[] = [
    {
      label: 'Application Submitted',
      detail: new Date(reg.submittedAt).toLocaleString(),
      state: 'done',
    },
  ];

  if (reg.category?.type === 'DOUBLES') {
    steps.push({
      label: 'Partner Confirmation',
      detail: reg.partnerConfirmedAt
        ? `Confirmed by ${reg.partner?.fullName ?? 'partner'}`
        : `Waiting on ${reg.partner?.fullName ?? 'your partner'}`,
      state: reg.partnerConfirmedAt ? 'done' : 'active',
    });
  }

  if (reg.status === 'REJECTED') {
    steps.push({
      label: 'Admin Verification',
      detail: reg.reviewedAt ? `Rejected on ${new Date(reg.reviewedAt).toLocaleDateString()}` : 'Rejected',
      state: 'rejected',
    });
    return steps;
  }

  const verificationReady = reg.category?.type !== 'DOUBLES' || !!reg.partnerConfirmedAt;
  steps.push({
    label: 'Admin Verification & Approval',
    detail:
      reg.status === 'APPROVED'
        ? `Approved on ${reg.reviewedAt ? new Date(reg.reviewedAt).toLocaleDateString() : ''}`
        : verificationReady
          ? 'Pending organizer review'
          : 'Waiting on partner confirmation',
    state: reg.status === 'APPROVED' ? 'done' : verificationReady ? 'active' : 'pending',
  });

  steps.push({
    label: 'Draw & Announcement',
    detail: reg.drawPublished ? 'Fixtures published — check the tournament draw' : 'Not yet published',
    state: reg.drawPublished ? 'done' : reg.status === 'APPROVED' ? 'active' : 'pending',
  });

  return steps;
}

function StepDot({ state }: { state: StepState }) {
  if (state === 'done') return <View style={[styles.dot, styles.dotDone]}><Text style={styles.dotCheck}>✓</Text></View>;
  if (state === 'rejected') return <View style={[styles.dot, styles.dotRejected]}><Text style={styles.dotCheck}>✕</Text></View>;
  if (state === 'active') return <View style={[styles.dot, styles.dotActive]} />;
  return <View style={[styles.dot, styles.dotPending]} />;
}

export default function ApplicationStatusScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const api = useApiClient();
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<Registration>(`/api/registrations/${id}`)
      .then((data) => {
        if (!cancelled) setRegistration(data);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load your application status.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api, id]);

  if (loading) {
    return (
      <Screen>
        <View style={styles.centered}>
          <ActivityIndicator color="#fff" />
        </View>
      </Screen>
    );
  }

  if (error || !registration) {
    return (
      <Screen>
        <View style={styles.centered}>
          <Text style={styles.error}>{error ?? 'Application not found.'}</Text>
        </View>
      </Screen>
    );
  }

  const steps = buildSteps(registration);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>{registration.category?.name}</Text>
        <Text style={styles.subtitle}>{registration.tournament?.name}</Text>
      </View>

      <Card style={styles.timelineCard}>
        {steps.map((step, i) => (
          <View key={step.label} style={styles.stepRow}>
            <View style={styles.stepIndicator}>
              <StepDot state={step.state} />
              {i < steps.length - 1 && (
                <View style={[styles.connector, step.state === 'done' && styles.connectorDone]} />
              )}
            </View>
            <View style={styles.stepText}>
              <Text style={styles.stepLabel}>{step.label}</Text>
              <Text style={styles.stepDetail}>{step.detail}</Text>
            </View>
          </View>
        ))}
      </Card>

      <View style={styles.buttonWrap}>
        <NavyButton label="Back to Tournament" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  error: { color: '#ffb4b4', fontSize: 14, textAlign: 'center' },
  header: { padding: spacing.lg, paddingBottom: spacing.sm },
  title: { ...typography.title, color: '#fff' },
  subtitle: { color: colors.textOnDarkMuted, fontSize: 13, marginTop: 4 },
  timelineCard: { marginHorizontal: spacing.lg },
  stepRow: { flexDirection: 'row' },
  stepIndicator: { alignItems: 'center', width: 28 },
  dot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dotDone: { backgroundColor: colors.green },
  dotActive: { backgroundColor: colors.gold },
  dotPending: { backgroundColor: colors.border },
  dotRejected: { backgroundColor: colors.red },
  dotCheck: { color: '#fff', fontSize: 12, fontWeight: '800' },
  connector: { width: 2, flex: 1, minHeight: 24, backgroundColor: colors.border },
  connectorDone: { backgroundColor: colors.green },
  stepText: { flex: 1, paddingBottom: spacing.lg, paddingLeft: spacing.sm },
  stepLabel: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  stepDetail: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  buttonWrap: { padding: spacing.lg },
});
