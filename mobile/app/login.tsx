import { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../lib/auth-context';
import { ApiError } from '../lib/api';
import { colors, radius, spacing } from '../lib/theme';

export default function LoginScreen() {
  const { loginWithPassword } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await loginWithPassword(email.trim(), password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.brand}>🏸 Badminton Tournament</Text>

      <View style={styles.card}>
        <View style={styles.tabs}>
          <View style={[styles.tab, styles.tabActive]}>
            <Text style={styles.tabTextActive}>Login</Text>
          </View>
          <Pressable style={styles.tab} onPress={() => router.replace('/register')}>
            <Text style={styles.tabText}>Register</Text>
          </Pressable>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput style={styles.input} secureTextEntry value={password} onChangeText={setPassword} />

        <Pressable
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={onSubmit}
          disabled={submitting}
        >
          {submitting ? <ActivityIndicator color={colors.navy} /> : <Text style={styles.buttonText}>Sign In</Text>}
        </Pressable>

        <Pressable style={styles.linkButton} onPress={() => router.push('/register')}>
          <Text style={styles.linkText}>Don&apos;t have an account? Register</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: spacing.lg },
  brand: { color: '#fff', fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: spacing.lg },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg },
  tabs: { flexDirection: 'row', backgroundColor: colors.cardMuted, borderRadius: radius.md, padding: 4, marginBottom: spacing.lg },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.sm },
  tabActive: { backgroundColor: colors.navy },
  tabText: { color: colors.textSecondary, fontWeight: '700', fontSize: 13 },
  tabTextActive: { color: '#fff', fontWeight: '700', fontSize: 13 },
  error: { color: colors.red, fontSize: 14, marginBottom: spacing.sm, textAlign: 'center' },
  label: { fontSize: 13, color: colors.textSecondary, marginTop: spacing.sm, marginBottom: 4 },
  linkButton: { marginTop: spacing.md, alignItems: 'center' },
  linkText: { color: colors.navy, fontSize: 13, fontWeight: '600' },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
  },
  button: {
    marginTop: spacing.lg,
    backgroundColor: colors.gold,
    borderRadius: radius.sm,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.navy, fontWeight: '800', fontSize: 15 },
});
