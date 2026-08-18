import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTournaments } from '../../context/TournamentsContext';

export default function NewTournamentScreen() {
  const router = useRouter();
  const { createTournament } = useTournaments();
  const [name, setName] = useState('');
  const [players, setPlayers] = useState(['', '']);

  const updatePlayer = (index: number, value: string) => {
    setPlayers((prev) => prev.map((p, i) => (i === index ? value : p)));
  };

  const addPlayer = () => setPlayers((prev) => [...prev, '']);

  const removePlayer = (index: number) => {
    setPlayers((prev) => prev.filter((_, i) => i !== index));
  };

  const trimmedPlayers = players.map((p) => p.trim()).filter((p) => p.length > 0);
  const canSubmit = name.trim().length > 0 && trimmedPlayers.length >= 2;

  const handleCreate = () => {
    if (!canSubmit) return;
    const tournament = createTournament(name.trim(), trimmedPlayers);
    router.replace(`/tournament/${tournament.id}`);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Tournament name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Summer Smash"
          autoFocus
        />

        <Text style={[styles.label, styles.playersLabel]}>Players</Text>
        {players.map((player, index) => (
          <View key={index} style={styles.playerRow}>
            <TextInput
              style={[styles.input, styles.playerInput]}
              value={player}
              onChangeText={(value) => updatePlayer(index, value)}
              placeholder={`Player ${index + 1}`}
            />
            {players.length > 2 && (
              <Pressable hitSlop={12} onPress={() => removePlayer(index)}>
                <Text style={styles.removeText}>Remove</Text>
              </Pressable>
            )}
          </View>
        ))}

        <Pressable style={styles.addButton} onPress={addPlayer}>
          <Text style={styles.addButtonText}>+ Add player</Text>
        </Pressable>

        <Pressable
          style={[styles.createButton, !canSubmit && styles.createButtonDisabled]}
          onPress={handleCreate}
          disabled={!canSubmit}
        >
          <Text style={styles.createButtonText}>Create Bracket</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 20, paddingBottom: 48 },
  label: { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 6 },
  playersLabel: { marginTop: 24 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  playerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 10 },
  playerInput: { flex: 1 },
  removeText: { color: '#c0392b', fontSize: 13 },
  addButton: { marginTop: 14, alignSelf: 'flex-start' },
  addButtonText: { color: '#2563eb', fontSize: 15, fontWeight: '500' },
  createButton: {
    marginTop: 36,
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  createButtonDisabled: { backgroundColor: '#9db8e8' },
  createButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
