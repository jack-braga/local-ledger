import { openDB, DBSchema } from 'idb';
import { AppState } from '@/types/finance';

interface LocalLedgerDB extends DBSchema {
  appState: {
    key: string;
    value: AppState;
  };
}

const DB_NAME = 'localledger';
const DB_VERSION = 1;
const STORE_NAME = 'appState' as const;
const STATE_KEY = 'financeAppState';

function getDB() {
  return openDB<LocalLedgerDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });
}

export async function loadState(): Promise<AppState | null> {
  try {
    const db = await getDB();
    const state = await db.get(STORE_NAME, STATE_KEY);
    if (state) return state;

    // Migration path: check localStorage for existing data
    const stored = localStorage.getItem('financeAppState');
    if (stored) {
      const parsed = JSON.parse(stored) as AppState;
      await saveState(parsed);
      localStorage.removeItem('financeAppState');
      return parsed;
    }

    return null;
  } catch (error) {
    console.error('Failed to load from IndexedDB, falling back to localStorage:', error);
    const stored = localStorage.getItem('financeAppState');
    if (stored) {
      return JSON.parse(stored) as AppState;
    }
    return null;
  }
}

export async function saveState(state: AppState): Promise<void> {
  try {
    const db = await getDB();
    await db.put(STORE_NAME, state, STATE_KEY);
  } catch (error) {
    console.error('Failed to save to IndexedDB, falling back to localStorage:', error);
    localStorage.setItem('financeAppState', JSON.stringify(state));
  }
}

export async function clearState(): Promise<void> {
  try {
    const db = await getDB();
    await db.delete(STORE_NAME, STATE_KEY);
  } catch (error) {
    console.error('Failed to clear IndexedDB:', error);
  }
  localStorage.removeItem('financeAppState');
}
