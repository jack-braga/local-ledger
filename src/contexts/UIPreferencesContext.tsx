import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { TransactionFilters } from '@/components/TransactionFilters';

const STORAGE_KEY = 'localledger-ui-prefs';

interface SerializedFilters {
  dateRange: {
    startDate: string | null;
    endDate: string | null;
  };
  transactionTypes: string[];
  accountIds: string[];
  categoryIds: string[];
}

interface StoredPreferences {
  isCompressed: boolean;
  filters: SerializedFilters;
}

const DEFAULT_FILTERS: TransactionFilters = {
  dateRange: { startDate: null, endDate: null },
  transactionTypes: ['all'],
  accountIds: [],
  categoryIds: [],
};

function serializeFilters(filters: TransactionFilters): SerializedFilters {
  return {
    ...filters,
    dateRange: {
      startDate: filters.dateRange.startDate?.toISOString() ?? null,
      endDate: filters.dateRange.endDate?.toISOString() ?? null,
    },
  };
}

function deserializeFilters(stored: SerializedFilters): TransactionFilters {
  return {
    ...stored,
    dateRange: {
      startDate: stored.dateRange.startDate ? new Date(stored.dateRange.startDate) : null,
      endDate: stored.dateRange.endDate ? new Date(stored.dateRange.endDate) : null,
    },
  };
}

function loadPreferences(): { isCompressed: boolean; filters: TransactionFilters } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { isCompressed: false, filters: DEFAULT_FILTERS };
    const stored: StoredPreferences = JSON.parse(raw);
    return {
      isCompressed: stored.isCompressed ?? false,
      filters: stored.filters ? deserializeFilters(stored.filters) : DEFAULT_FILTERS,
    };
  } catch {
    return { isCompressed: false, filters: DEFAULT_FILTERS };
  }
}

function savePreferences(isCompressed: boolean, filters: TransactionFilters) {
  try {
    const data: StoredPreferences = {
      isCompressed,
      filters: serializeFilters(filters),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage unavailable — silently ignore
  }
}

interface UIPreferencesContextType {
  isCompressed: boolean;
  setIsCompressed: (value: boolean) => void;
  filters: TransactionFilters;
  setFilters: (filters: TransactionFilters) => void;
}

const UIPreferencesContext = createContext<UIPreferencesContextType | null>(null);

export function UIPreferencesProvider({ children }: { children: ReactNode }) {
  const initial = loadPreferences();
  const [isCompressed, setIsCompressedRaw] = useState(initial.isCompressed);
  const [filters, setFiltersRaw] = useState(initial.filters);

  // Persist on change
  useEffect(() => {
    savePreferences(isCompressed, filters);
  }, [isCompressed, filters]);

  const setIsCompressed = useCallback((value: boolean) => {
    setIsCompressedRaw(value);
  }, []);

  const setFilters = useCallback((newFilters: TransactionFilters) => {
    setFiltersRaw(newFilters);
  }, []);

  return (
    <UIPreferencesContext.Provider value={{ isCompressed, setIsCompressed, filters, setFilters }}>
      {children}
    </UIPreferencesContext.Provider>
  );
}

export function useUIPreferences() {
  const context = useContext(UIPreferencesContext);
  if (!context) {
    throw new Error('useUIPreferences must be used within a UIPreferencesProvider');
  }
  return context;
}
