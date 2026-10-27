import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
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
import { useAuth } from '../lib/auth-context';
import { apiFetch, uploadFile, ApiError } from '../lib/api';
import { colors, radius, spacing } from '../lib/theme';
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

export default function RegisterScreen() {
  const { registerWithPassword } = useAuth();
  const router = useRouter();
  const [apiDistricts, setApiDistricts] = useState<ApiDistrict[]>([]);
  const [districtCode, setDistrictCode] = useState('');
  const [tehsilName, setTehsilName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [dob, setDob] = useState('');
  const [cnic, setCnic] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE'>('MALE');
  const [categoryGender, setCategoryGender] = useState<'MEN' | 'WOMEN' | 'MIXED'>('MEN');
  const [categoryType, setCategoryType] = useState<'SINGLES' | 'DOUBLES'>('SINGLES');
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<ApiDistrict[]>('/api/districts')
      .then(setApiDistricts)
      .catch(() => {});
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
      const result = await registerWithPassword(fullName.trim(), email.trim(), password);

      // Create the player profile right away using the freshly-issued token
      // (the auth context hasn't re-rendered yet, so we call apiFetch
      // directly with result.accessToken rather than the stale useApiClient
      // hook). If this fails, the account still exists — create-profile.tsx
      // remains available as a fallback to finish this step later.
      try {
        await apiFetch(`/api/districts/${district.id}/players`, {
          method: 'POST',
          token: result.accessToken,
          body: {
            fullName: fullName.trim(),
            gender,
            dob: new Date(dob).toISOString(),
            cnic,
            phone: mobileNumber.trim() || undefined,
            tehsilName,
            preferredCategoryGender: categoryGender,
            preferredCategoryType: categoryType,
          },
        });

        if (photo) {
          try {
            await uploadFile('/api/players/me/photo', {
              token: result.accessToken,
              fieldName: 'photo',
              uri: photo.uri,
              name: photo.name,
              mimeType: photo.mimeType,
            });
          } catch {
            // profile is already created; photo can be added later from the Profile screen
          }
        }
      } catch (profileErr) {
        // Account creation succeeded; profile creation can be retried from
        // the Profile screen, so don't block navigation — but the failure
        // reason (e.g. a duplicate CNIC) is worth surfacing since it's easy
        // to fix by editing the profile.
        Alert.alert(
          'Profile Setup Incomplete',
          profileErr instanceof ApiError
            ? profileErr.message
            : 'Your account was created, but the player profile could not be set up. You can finish it from the Profile screen.',
        );
      }

      router.replace('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>🏸 Badminton Tournament</Text>

        <View style={styles.card}>
          <View style={styles.tabs}>
            <Pressable style={styles.tab} onPress={() => router.replace('/login')}>
              <Text style={styles.tabText}>Login</Text>
            </Pressable>
            <View style={[styles.tab, styles.tabActive]}>
              <Text style={styles.tabTextActive}>Register</Text>
            </View>
          </View>

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

          <Text style={styles.label}>Mobile Number</Text>
          <TextInput style={styles.input} keyboardType="phone-pad" value={mobileNumber} onChangeText={setMobileNumber} />

          <Text style={styles.label}>Email (used to sign in)</Text>
          <TextInput
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput style={styles.input} secureTextEntry value={password} onChangeText={setPassword} />

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

          <Text style={styles.label}>Playing Category</Text>
          <View style={styles.pillRow}>
            {(['MEN', 'WOMEN', 'MIXED'] as const).map((g) => (
              <Pressable
                key={g}
                style={[styles.pill, categoryGender === g && styles.pillActive]}
                onPress={() => setCategoryGender(g)}
              >
                <Text style={[styles.pillText, categoryGender === g && styles.pillTextActive]}>
                  {{ MEN: "Men's", WOMEN: "Women's", MIXED: 'Mixed' }[g]}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.radioRow}>
            {(['SINGLES', 'DOUBLES'] as const).map((t) => (
              <Pressable key={t} style={styles.radioOption} onPress={() => setCategoryType(t)}>
                <View style={[styles.radioDot, categoryType === t && styles.radioDotActive]} />
                <Text style={styles.radioLabel}>{t === 'SINGLES' ? 'Singles' : 'Doubles'}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            style={[styles.button, submitting && styles.buttonDisabled]}
            onPress={onSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={colors.navy} />
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </Pressable>

          <Pressable style={styles.linkButton} onPress={() => router.replace('/login')}>
            <Text style={styles.linkText}>Already have an account? Login</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xl },
  brand: { color: '#fff', fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: spacing.lg },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg },
  tabs: { flexDirection: 'row', backgroundColor: colors.cardMuted, borderRadius: radius.md, padding: 4, marginBottom: spacing.lg },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.sm },
  tabActive: { backgroundColor: colors.navy },
  tabText: { color: colors.textSecondary, fontWeight: '700', fontSize: 13 },
  tabTextActive: { color: '#fff', fontWeight: '700', fontSize: 13 },
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
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pillActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  pillText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  pillTextActive: { color: '#fff' },
  radioRow: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md },
  radioOption: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  radioDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.border },
  radioDotActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  radioLabel: { fontSize: 14, color: colors.textPrimary, fontWeight: '600' },
  button: {
    marginTop: spacing.lg,
    backgroundColor: colors.gold,
    borderRadius: radius.sm,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.navy, fontWeight: '800', fontSize: 15 },
  linkButton: { marginTop: spacing.md, alignItems: 'center' },
  linkText: { color: colors.navy, fontSize: 13, fontWeight: '600' },
});
