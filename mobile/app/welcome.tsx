import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../lib/theme';

export default function WelcomeScreen() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🏸</Text>
      <Text style={styles.title}>
        District <Text style={styles.titleGold}>Badminton</Text>{'\n'}Tournament
      </Text>
      <Text style={styles.subtitle}>Play • Partner • Compete • Win</Text>

      <Pressable style={styles.primaryButton} onPress={() => router.push('/login')}>
        <Text style={styles.primaryButtonText}>Get Started</Text>
      </Pressable>
      <Pressable style={styles.secondaryButton} onPress={() => router.push('/register')}>
        <Text style={styles.secondaryButtonText}>Create Account</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  emoji: { fontSize: 64, marginBottom: spacing.md },
  title: { fontSize: 30, fontWeight: '800', color: '#fff', textAlign: 'center', lineHeight: 38 },
  titleGold: { color: colors.gold },
  subtitle: { fontSize: 14, color: colors.textOnDarkMuted, textAlign: 'center', marginTop: spacing.sm, marginBottom: 48 },
  primaryButton: {
    backgroundColor: colors.gold,
    borderRadius: radius.md,
    paddingVertical: 16,
    paddingHorizontal: 56,
    marginBottom: spacing.sm,
  },
  primaryButtonText: { color: colors.navy, fontWeight: '800', fontSize: 16 },
  secondaryButton: { paddingVertical: spacing.md, paddingHorizontal: 48 },
  secondaryButtonText: { color: colors.textOnDarkMuted, fontWeight: '600', fontSize: 14 },
});
