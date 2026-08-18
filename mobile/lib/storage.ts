import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tournament } from './types';

const STORAGE_KEY = 'tournaments';

export async function loadTournaments(): Promise<Tournament[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Tournament[];
  } catch {
    return [];
  }
}

export async function saveTournaments(tournaments: Tournament[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tournaments));
}
