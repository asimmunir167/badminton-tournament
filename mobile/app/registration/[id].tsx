import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useApiClient, useAuth } from '../../lib/auth-context';
import { ApiError, uploadFile } from '../../lib/api';
import { colors, radius, spacing, typography } from '../../lib/theme';
import { Card, GoldButton, NavyButton, Screen } from '../../components/ui';

interface Registration {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
  reviewedAt: string | null;
  partnerConfirmedAt: string | null;
  drawPublished: boolean;
  category: { name: string; type: 'SINGLES' | 'DOUBLES'; entryFee: string | null } | null;
  tournament: { name: string } | null;
  partner: { fullName: string } | null;
  payment: {
    amount: string;
    status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
    method: string;
    transactionRef: string | null;
    proofUrl: string | null;
  } | null;
}

type StepState = 'done' | 'active' | 'pending' | 'rejected';

interface Step {
  label: string;
  detail: string;
  state: StepState;
}

function buildSteps(reg: Registration): Step[] {
  const feeRequired = reg.category?.entryFee != null && Number(reg.category.entryFee) > 0;

  const steps: Step[] = [
    {
      label: 'Application Submitted',
      detail: new Date(reg.submittedAt).toLocaleString(),
      state: 'done',
    },
  ];

  if (feeRequired) {
    const paymentState: StepState =
      reg.payment?.status === 'PAID' ? 'done' : reg.payment?.status === 'FAILED' ? 'rejected' : 'active';
    steps.push({
      label: 'Entry Fee Payment',
      detail:
        reg.payment?.status === 'PAID'
          ? `Payment of PKR ${Number(reg.payment.amount).toLocaleString()} confirmed`
          : reg.payment?.status === 'FAILED'
            ? 'Payment could not be verified — contact the organizer'
            : `Pending verification — PKR ${reg.payment ? Number(reg.payment.amount).toLocaleString() : Number(reg.category!.entryFee).toLocaleString()} submitted`,
      state: paymentState,
    });
  }

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

  const partnerReady = reg.category?.type !== 'DOUBLES' || !!reg.partnerConfirmedAt;
  const paymentReady = !feeRequired || reg.payment?.status === 'PAID';
  const verificationReady = partnerReady && paymentReady;
  steps.push({
    label: 'Admin Verification & Approval',
    detail:
      reg.status === 'APPROVED'
        ? `Approved on ${reg.reviewedAt ? new Date(reg.reviewedAt).toLocaleDateString() : ''}`
        : verificationReady
          ? 'Pending organizer review'
          : !partnerReady
            ? 'Waiting on partner confirmation'
            : 'Waiting on entry fee payment confirmation',
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
  const { accessToken } = useAuth();
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tid, setTid] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  async function load() {
    const data = await api<Registration>(`/api/registrations/${id}`);
    setRegistration(data);
    setTid(data.payment?.transactionRef ?? '');
  }

  useEffect(() => {
    let cancelled = false;
    api<Registration>(`/api/registrations/${id}`)
      .then((data) => {
        if (!cancelled) {
          setRegistration(data);
          setTid(data.payment?.transactionRef ?? '');
        }
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

  const current = registration;
  const steps = buildSteps(current);
  const feeRequired = current.category?.entryFee != null && Number(current.category.entryFee) > 0;
  const canUpdatePayment =
    feeRequired &&
    current.status !== 'REJECTED' &&
    current.payment?.status !== 'PAID' &&
    current.payment?.status !== 'REFUNDED';

  async function submitTid() {
    if (!tid.trim()) {
      setPaymentError('Enter the JazzCash, Easypaisa, or bank transaction ID.');
      return;
    }
    setPaymentError(null);
    setSavingPayment(true);
    try {
      await api(`/api/registrations/${current.id}/payment/submit`, {
        method: 'POST',
        body: {
          method: current.payment?.method ?? 'JAZZCASH',
          transactionRef: tid.trim(),
        },
      });
      await load();
    } catch (err) {
      setPaymentError(err instanceof ApiError ? err.message : 'Could not submit payment details.');
    } finally {
      setSavingPayment(false);
    }
  }

  async function attachReceipt() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setPaymentError('Photo library permission is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return;
    setPaymentError(null);
    setSavingPayment(true);
    try {
      await uploadFile(`/api/registrations/${current.id}/payment/proof`, {
        token: accessToken,
        fieldName: 'proof',
        uri: asset.uri,
        name: asset.fileName ?? 'receipt.jpg',
        mimeType: asset.mimeType ?? 'image/jpeg',
      });
      await load();
    } catch (err) {
      setPaymentError(err instanceof ApiError ? err.message : 'Could not upload the receipt.');
    } finally {
      setSavingPayment(false);
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>{current.category?.name}</Text>
        <Text style={styles.subtitle}>{current.tournament?.name}</Text>
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

      {canUpdatePayment && (
        <Card style={styles.payCard}>
          <Text style={styles.stepLabel}>Update payment</Text>
          <Text style={styles.stepDetail}>
            If you have sent the fee, enter the transaction ID so the organizer can confirm it.
          </Text>
          <TextInput
            style={styles.input}
            value={tid}
            onChangeText={setTid}
            placeholder="Transaction / TID"
            placeholderTextColor={colors.textSecondary}
          />
          {paymentError && <Text style={styles.payError}>{paymentError}</Text>}
          <GoldButton label="Submit transaction ID" onPress={submitTid} loading={savingPayment} />
          <Pressable onPress={attachReceipt} style={styles.proofLink}>
            <Text style={styles.proofLinkText}>
              {current.payment?.proofUrl ? 'Replace receipt screenshot' : 'Attach receipt screenshot'}
            </Text>
          </Pressable>
        </Card>
      )}

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
  payCard: { marginHorizontal: spacing.lg, marginTop: spacing.md, gap: spacing.sm },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
  },
  payError: { color: colors.red, fontSize: 12 },
  proofLink: { alignItems: 'center', paddingVertical: spacing.xs },
  proofLinkText: { fontSize: 13, fontWeight: '700', color: colors.navy },
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
