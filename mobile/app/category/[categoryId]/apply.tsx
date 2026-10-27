import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useApiClient, useAuth } from '../../../lib/auth-context';
import { ApiError, uploadFile } from '../../../lib/api';
import { colors, radius, spacing, typography } from '../../../lib/theme';
import { Card, GoldButton, NavyButton, Screen } from '../../../components/ui';

interface Category {
  id: string;
  name: string;
  type: 'SINGLES' | 'DOUBLES';
  gender: string;
  tournamentId: string;
  entryFee: string | null;
}

interface WalletAccount {
  number: string;
  accountName: string;
}

interface BankAccount {
  bankName: string;
  accountTitle: string;
  accountNumber: string;
  iban?: string;
}

interface PaymentAccounts {
  jazzCash?: WalletAccount;
  easyPaisa?: WalletAccount;
  bank?: BankAccount;
}

interface Tournament {
  paymentInstructions: string | null;
  paymentAccounts: PaymentAccounts | null;
}

type PaymentMethod = 'JAZZCASH' | 'EASYPAISA' | 'BANK_TRANSFER' | 'MANUAL';

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

interface PickedProof {
  uri: string;
  name: string;
  mimeType: string;
}

function methodsFor(accounts: PaymentAccounts | null): { key: PaymentMethod; label: string }[] {
  const methods: { key: PaymentMethod; label: string }[] = [];
  if (accounts?.jazzCash) methods.push({ key: 'JAZZCASH', label: 'JazzCash' });
  if (accounts?.easyPaisa) methods.push({ key: 'EASYPAISA', label: 'Easypaisa' });
  if (accounts?.bank) methods.push({ key: 'BANK_TRANSFER', label: 'Bank Transfer' });
  methods.push({ key: 'MANUAL', label: 'Cash / Other' });
  return methods;
}

function PayToDetails({ method, accounts }: { method: PaymentMethod; accounts: PaymentAccounts | null }) {
  if (method === 'JAZZCASH' && accounts?.jazzCash) {
    return (
      <View style={styles.payToBox}>
        <Text style={styles.payToLabel}>Send JazzCash to</Text>
        <Text selectable style={styles.payToValue}>
          {accounts.jazzCash.number}
        </Text>
        <Text style={styles.payToMeta}>{accounts.jazzCash.accountName}</Text>
      </View>
    );
  }
  if (method === 'EASYPAISA' && accounts?.easyPaisa) {
    return (
      <View style={styles.payToBox}>
        <Text style={styles.payToLabel}>Send Easypaisa to</Text>
        <Text selectable style={styles.payToValue}>
          {accounts.easyPaisa.number}
        </Text>
        <Text style={styles.payToMeta}>{accounts.easyPaisa.accountName}</Text>
      </View>
    );
  }
  if (method === 'BANK_TRANSFER' && accounts?.bank) {
    return (
      <View style={styles.payToBox}>
        <Text style={styles.payToLabel}>Bank transfer to</Text>
        <Text selectable style={styles.payToValue}>
          {accounts.bank.accountNumber}
        </Text>
        <Text style={styles.payToMeta}>
          {accounts.bank.bankName} · {accounts.bank.accountTitle}
          {accounts.bank.iban ? `\nIBAN ${accounts.bank.iban}` : ''}
        </Text>
      </View>
    );
  }
  if (method === 'MANUAL') {
    return (
      <Text style={styles.feeHint}>
        Choose this if you will pay cash at the venue. The organizer must still confirm it before your entry is approved.
      </Text>
    );
  }
  return (
    <Text style={styles.feeHint}>
      The organizer has not published {method === 'JAZZCASH' ? 'JazzCash' : method === 'EASYPAISA' ? 'Easypaisa' : 'bank'}{' '}
      details yet. Use another method or contact them.
    </Text>
  );
}

export default function ApplyToCategoryScreen() {
  const { categoryId } = useLocalSearchParams<{ categoryId: string }>();
  const router = useRouter();
  const api = useApiClient();
  const { accessToken } = useAuth();

  const [category, setCategory] = useState<Category | null>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [myPlayer, setMyPlayer] = useState<MyPlayer | null>(null);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [activePairs, setActivePairs] = useState<Pair[]>([]);
  const [selectedPairId, setSelectedPairId] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('JAZZCASH');
  const [transactionRef, setTransactionRef] = useState('');
  const [proof, setProof] = useState<PickedProof | null>(null);
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

        if (cat.entryFee != null && Number(cat.entryFee) > 0) {
          const t = await api<Tournament>(`/api/tournaments/${cat.tournamentId}`);
          if (cancelled) return;
          setTournament(t);
          const available = methodsFor(t.paymentAccounts);
          setMethod(available[0]?.key ?? 'MANUAL');
        }

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

  async function pickProof() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library permission is required to attach a receipt.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return;
    setProof({ uri: asset.uri, name: asset.fileName ?? 'receipt.jpg', mimeType: asset.mimeType ?? 'image/jpeg' });
  }

  async function onApply() {
    if (!category || !myPlayer) return;
    if (category.type === 'DOUBLES' && !selectedPairId) {
      setError('Please select your pair.');
      return;
    }
    const feeRequired = category.entryFee != null && Number(category.entryFee) > 0;
    if (feeRequired && method !== 'MANUAL' && !transactionRef.trim()) {
      setError('Pay the fee, then enter the transaction / reference number.');
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
          ...(feeRequired ? { method, transactionRef: transactionRef.trim() || undefined } : {}),
        },
      });
      if (feeRequired && proof) {
        await uploadFile(`/api/registrations/${registration.id}/payment/proof`, {
          token: accessToken,
          fieldName: 'proof',
          uri: proof.uri,
          name: proof.name,
          mimeType: proof.mimeType,
        });
      }
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
  const feeRequired = category?.entryFee != null && Number(category.entryFee) > 0;
  const paymentMethods = methodsFor(tournament?.paymentAccounts ?? null);

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
            <Text style={styles.feeHint}>
              One application covers both players. Your partner will also see this registration and cannot be entered
              separately for the same category.
            </Text>
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

        {!needsPair && feeRequired && (
          <Card style={styles.feeCard}>
            <Text style={styles.feeLabel}>Entry Fee</Text>
            <Text style={styles.feeAmount}>PKR {Number(category!.entryFee).toLocaleString()}</Text>
            <Text style={styles.feeHint}>
              Pay this amount in JazzCash, Easypaisa, or online banking using the details below, then enter the
              transaction ID in this app.
            </Text>

            <Text style={[styles.feeCardLabel, { marginTop: spacing.md }]}>Pay with</Text>
            <View style={styles.pillRow}>
              {paymentMethods.map((m) => (
                <Pressable
                  key={m.key}
                  style={[styles.methodPill, method === m.key && styles.methodPillActive]}
                  onPress={() => setMethod(m.key)}
                >
                  <Text style={[styles.methodPillText, method === m.key && styles.methodPillTextActive]}>
                    {m.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <PayToDetails method={method} accounts={tournament?.paymentAccounts ?? null} />

            {tournament?.paymentInstructions ? (
              <Text style={styles.paymentInstructions}>{tournament.paymentInstructions}</Text>
            ) : null}

            {method !== 'MANUAL' && (
              <>
                <Text style={styles.feeCardLabel}>Transaction / TID</Text>
                <TextInput
                  style={styles.input}
                  value={transactionRef}
                  onChangeText={setTransactionRef}
                  placeholder="e.g. 123456789"
                  placeholderTextColor={colors.textSecondary}
                />
              </>
            )}

            <Pressable onPress={pickProof} style={styles.proofButton}>
              <Text style={styles.proofButtonText}>
                {proof ? `Receipt attached: ${proof.name}` : 'Attach payment screenshot (optional)'}
              </Text>
            </Pressable>
          </Card>
        )}

        {!needsPair && (
          <View style={styles.buttonWrap}>
            <GoldButton
              label={feeRequired ? 'Pay & Apply' : 'Apply for Tournament'}
              onPress={onApply}
              loading={submitting}
            />
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
  feeCard: { marginBottom: spacing.lg },
  feeLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '700', textTransform: 'uppercase' },
  feeAmount: { fontSize: 28, fontWeight: '800', color: colors.textPrimary, marginTop: 4 },
  feeCardLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: spacing.xs, fontWeight: '700' },
  paymentInstructions: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    backgroundColor: colors.cardMuted,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  payToBox: {
    backgroundColor: colors.cardMuted,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  payToLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '700', textTransform: 'uppercase' },
  payToValue: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginTop: 4 },
  payToMeta: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
  methodPill: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  methodPillActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  methodPillText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  methodPillTextActive: { color: '#fff' },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  feeHint: { fontSize: 12, color: colors.textSecondary, marginTop: spacing.xs },
  proofButton: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  proofButtonText: { fontSize: 13, color: colors.navy, fontWeight: '600', textAlign: 'center' },
});
