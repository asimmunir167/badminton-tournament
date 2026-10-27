import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useApiClient, useAuth } from '../lib/auth-context';
import { ApiError, uploadFile } from '../lib/api';
import { colors, radius, spacing, typography } from '../lib/theme';
import { GoldButton } from '../components/ui';
import { calculateAge, formatCnicInput, isValidCnic, isValidDob } from '../lib/format';
import { PUNJAB_DISTRICTS, tehsilsForDistrictCode } from '../lib/punjab-locations';
import { PickerField } from '../components/picker-field';

interface ApiDistrict {
  id: string;
  name: string;
  code: string;
}

interface PickedPhoto {
  uri: string;
  name: string;
  mimeType: string;
}

export default function CreateProfileScreen() {
  const router = useRouter();
  const api = useApiClient();
  const { user, accessToken } = useAuth();
  const [apiDistricts, setApiDistricts] = useState<ApiDistrict[]>([]);
  const [districtCode, setDistrictCode] = useState('');
  const [tehsilName, setTehsilName] = useState('');
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [fatherName, setFatherName] = useState('');
  const [dob, setDob] = useState('');
  const [cnic, setCnic] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE'>('MALE');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [loadingDistricts, setLoadingDistricts] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api<ApiDistrict[]>('/api/districts')
      .then(setApiDistricts)
      .catch(() => setError('Could not load districts from server.'))
      .finally(() => setLoadingDistricts(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const districtOptions = useMemo(
    () => PUNJAB_DISTRICTS.map((d) => ({ value: d.code, label: d.name })),
    [],
  );

  const tehsilOptions = useMemo(() => {
    if (!districtCode) return [];
    const district = PUNJAB_DISTRICTS.find((d) => d.code === districtCode);
    return tehsilsForDistrictCode(districtCode, district?.name).map((name) => ({
      value: name,
      label: name,
    }));
  }, [districtCode]);

  function onDistrictChange(code: string) {
    setDistrictCode(code);
    setTehsilName('');
  }

  async function pickPhoto() {
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
    setPhoto({ uri: asset.uri, name: asset.fileName ?? 'photo.jpg', mimeType: asset.mimeType ?? 'image/jpeg' });
  }

  async function onSubmit() {
    setError(null);
    if (!districtCode) {
      setError('Please select a district.');
      return;
    }
    if (!tehsilName) {
      setError('Please select your tehsil.');
      return;
    }
    const district = apiDistricts.find((d) => d.code === districtCode);
    if (!district) {
      const label = PUNJAB_DISTRICTS.find((d) => d.code === districtCode)?.name ?? 'This district';
      setError(`${label} is not open for registration yet. Ask the admin to add it first.`);
      return;
    }
    if (!isValidDob(dob)) {
      setError('Please enter a valid Date of Birth (YYYY-MM-DD).');
      return;
    }
    if (!isValidCnic(cnic)) {
      setError('Please enter a valid CNIC (12345-1234567-1).');
      return;
    }
    setSubmitting(true);
    try {
      await api(`/api/districts/${district.id}/players`, {
        method: 'POST',
        body: {
          fullName: fullName.trim(),
          fatherName: fatherName.trim() || undefined,
          dob: new Date(dob).toISOString(),
          cnic,
          gender,
          phone: phone.trim() || undefined,
          tehsilName,
        },
      });

      if (photo) {
        try {
          await uploadFile('/api/players/me/photo', {
            token: accessToken,
            fieldName: 'photo',
            uri: photo.uri,
            name: photo.name,
            mimeType: photo.mimeType,
          });
        } catch {
          // profile created; photo optional
        }
      }

      router.replace('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create your player profile.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingDistricts) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.title}>Complete Your Player Profile</Text>
          <Text style={styles.subtitle}>Select your district and tehsil for tournament placement.</Text>

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable style={styles.photoPicker} onPress={pickPhoto}>
            {photo ? (
              <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoPlaceholderText}>Add Photo</Text>
              </View>
            )}
          </Pressable>

          <Text style={styles.label}>Full Name</Text>
          <TextInput style={styles.input} value={fullName} onChangeText={setFullName} />

          <Text style={styles.label}>Father&apos;s Name (optional)</Text>
          <TextInput style={styles.input} value={fatherName} onChangeText={setFatherName} />

          <Text style={styles.label}>Date of Birth (YYYY-MM-DD)</Text>
          <TextInput style={styles.input} placeholder="2005-03-14" value={dob} onChangeText={setDob} />
          {isValidDob(dob) && <Text style={styles.hint}>Age: {calculateAge(dob)} years</Text>}

          <Text style={styles.label}>CNIC</Text>
          <TextInput
            style={styles.input}
            placeholder="12345-1234567-1"
            keyboardType="number-pad"
            maxLength={15}
            value={cnic}
            onChangeText={(text) => setCnic(formatCnicInput(text))}
          />

          <Text style={styles.label}>Gender</Text>
          <View style={styles.pillRow}>
            {(['MALE', 'FEMALE'] as const).map((g) => (
              <Pressable key={g} style={[styles.pill, gender === g && styles.pillActive]} onPress={() => setGender(g)}>
                <Text style={[styles.pillText, gender === g && styles.pillTextActive]}>
                  {g === 'MALE' ? 'Male' : 'Female'}
                </Text>
              </Pressable>
            ))}
          </View>

          <PickerField
            label="District"
            value={districtCode}
            options={districtOptions}
            onChange={onDistrictChange}
            placeholder="Select your district"
          />

          <PickerField
            label="Tehsil"
            value={tehsilName}
            options={tehsilOptions}
            onChange={setTehsilName}
            placeholder={districtCode ? 'Select your tehsil' : 'Select district first'}
            disabled={!districtCode}
          />

          <Text style={styles.label}>Phone (optional)</Text>
          <TextInput style={styles.input} keyboardType="phone-pad" value={phone} onChangeText={setPhone} />

          <View style={styles.buttonWrap}>
            <GoldButton label="Save Profile" onPress={onSubmit} loading={submitting} />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xl },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg },
  title: { ...typography.heading, color: colors.textPrimary },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 4, marginBottom: spacing.lg },
  error: { color: colors.red, fontSize: 14, marginBottom: spacing.sm, textAlign: 'center' },
  photoPicker: { alignSelf: 'center', marginBottom: spacing.md },
  photoPreview: { width: 88, height: 88, borderRadius: 44 },
  photoPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.cardMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderText: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, textAlign: 'center' },
  label: { fontSize: 13, color: colors.textSecondary, marginTop: spacing.sm, marginBottom: 4 },
  hint: { fontSize: 12, color: colors.goldDark, marginTop: 4, fontWeight: '600' },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
  },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  pill: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pillActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  pillText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  pillTextActive: { color: '#fff' },
  buttonWrap: { marginTop: spacing.lg },
});
