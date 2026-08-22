import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors, radius, spacing, typography } from '../lib/theme';
import { ApiError, uploadFile } from '../lib/api';

export function Screen({ children }: { children: React.ReactNode }) {
  return <View style={styles.screen}>{children}</View>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function GoldButton({
  label,
  onPress,
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      style={[styles.goldButton, disabled && styles.buttonDisabled]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? <ActivityIndicator color={colors.navy} /> : <Text style={styles.goldButtonText}>{label}</Text>}
    </Pressable>
  );
}

export function NavyButton({
  label,
  onPress,
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      style={[styles.navyButton, disabled && styles.buttonDisabled]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.navyButtonText}>{label}</Text>}
    </Pressable>
  );
}

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'gold' | 'green' | 'red' }) {
  const toneStyle = {
    neutral: { bg: colors.cardMuted, fg: colors.textSecondary },
    gold: { bg: '#fff6d9', fg: colors.goldDark },
    green: { bg: colors.greenLight, fg: colors.green },
    red: { bg: colors.redLight, fg: colors.red },
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: toneStyle.bg }]}>
      <Text style={[styles.badgeText, { color: toneStyle.fg }]}>{label}</Text>
    </View>
  );
}

export function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function AvatarPicker({
  photoUrl,
  fallbackText,
  accessToken,
  size = 88,
  editable = true,
  onUploaded,
}: {
  photoUrl?: string | null;
  fallbackText: string;
  accessToken: string | null;
  size?: number;
  editable?: boolean;
  onUploaded: (photoUrl: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick() {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library permission is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return;

    setUploading(true);
    try {
      const updated = await uploadFile<{ photoUrl: string }>('/api/players/me/photo', {
        token: accessToken,
        fieldName: 'photo',
        uri: asset.uri,
        name: asset.fileName ?? 'photo.jpg',
        mimeType: asset.mimeType ?? 'image/jpeg',
      });
      onUploaded(updated.photoUrl);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not upload photo.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <View style={avatarPickerStyles.wrap}>
      <Pressable onPress={pick} disabled={uploading || !editable}>
        <View style={[avatarPickerStyles.circle, { width: size, height: size, borderRadius: size / 2 }]}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} />
          ) : (
            <Text style={[avatarPickerStyles.fallbackText, { fontSize: size * 0.36 }]}>{fallbackText}</Text>
          )}
          {uploading && (
            <View style={[StyleSheet.absoluteFill, avatarPickerStyles.overlay, { borderRadius: size / 2 }]}>
              <ActivityIndicator color="#fff" />
            </View>
          )}
        </View>
        {editable && (
          <View style={avatarPickerStyles.editBadge}>
            <Text style={avatarPickerStyles.editBadgeText}>✎</Text>
          </View>
        )}
      </Pressable>
      {error && <Text style={avatarPickerStyles.error}>{error}</Text>}
    </View>
  );
}

const avatarPickerStyles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  circle: {
    backgroundColor: colors.navyLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fallbackText: { color: '#fff', fontWeight: '800' },
  overlay: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(10,30,63,0.5)' },
  editBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  editBadgeText: { fontSize: 13, color: colors.navy },
  error: { color: '#ffb4b4', fontSize: 11, marginTop: spacing.xs, textAlign: 'center', maxWidth: 160 },
});

export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  goldButton: {
    backgroundColor: colors.gold,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  goldButtonText: { color: colors.navy, fontWeight: '800', fontSize: 15 },
  navyButton: {
    backgroundColor: colors.navy,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  navyButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  buttonDisabled: { opacity: 0.5 },
  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
  },
  badgeText: { ...typography.caption, textTransform: 'uppercase' },
  statTile: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  infoLabel: { fontSize: 13, color: colors.textSecondary },
  infoValue: { fontSize: 13, color: colors.textPrimary, fontWeight: '700' },
});
