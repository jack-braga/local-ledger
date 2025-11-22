import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { AppState, Transaction, Account, Category, CategoryRule, TransactionType } from '@/types/finance';

type Action =
  | { type: 'ADD_TRANSACTIONS'; transactions: Transaction[] }
  | { type: 'UPDATE_TRANSACTION'; id: string; updates: Partial<Transaction> }
  | { type: 'DELETE_TRANSACTION'; id: string }
  | { type: 'MERGE_TRANSACTION'; id: string; csvData: { date: string; description: string } }
  | { type: 'ADD_ACCOUNT'; account: Account }
  | { type: 'UPDATE_ACCOUNT'; id: string; updates: Partial<Account> }
  | { type: 'DELETE_ACCOUNT'; id: string }
  | { type: 'ADD_CATEGORY'; category: Category }
  | { type: 'UPDATE_CATEGORY'; id: string; updates: Partial<Category> }
  | { type: 'DELETE_CATEGORY'; id: string }
  | { type: 'ADD_RULE'; rule: CategoryRule }
  | { type: 'UPDATE_RULE'; id: string; updates: Partial<CategoryRule> }
  | { type: 'DELETE_RULE'; id: string }
  | { type: 'REORDER_RULES'; ruleIds: string[] }
  | { type: 'IMPORT_STATE'; state: AppState }
  | { type: 'RESET_STATE' };

const initialState: AppState = {
  transactions: [],
  accounts: [],
  categories: [],
  rules: [],
  version: '1.0.0',
  lastModified: new Date().toISOString(),
};

function financeReducer(state: AppState, action: Action): AppState {
  const newState = (() => {
    switch (action.type) {
      case 'ADD_TRANSACTIONS':
        return {
          ...state,
          transactions: [...state.transactions, ...action.transactions],
        };
      
      case 'UPDATE_TRANSACTION':
        return {
          ...state,
          transactions: state.transactions.map(t =>
            t.id === action.id ? { ...t, ...action.updates } : t
          ),
        };
      
      case 'MERGE_TRANSACTION': {
        return {
          ...state,
          transactions: state.transactions.map(t => {
            if (t.id === action.id) {
              // Update Date and Description from CSV (source of truth)
              // PRESERVE Category, Notes, and other user-entered data
              const updated: Transaction = {
                ...t,
                date: action.csvData.date,
                description: action.csvData.description,
              };
              
              return updated;
            }
            return t;
          }),
        };
      }
      
      case 'DELETE_TRANSACTION':
        return {
          ...state,
          transactions: state.transactions.filter(t => t.id !== action.id),
        };
      
      case 'ADD_ACCOUNT':
        return {
          ...state,
          accounts: [...state.accounts, action.account],
        };
      
      case 'UPDATE_ACCOUNT':
        return {
          ...state,
          accounts: state.accounts.map(a =>
            a.id === action.id ? { ...a, ...action.updates } : a
          ),
        };
      
      case 'DELETE_ACCOUNT':
        return {
          ...state,
          accounts: state.accounts.filter(a => a.id !== action.id),
        };
      
      case 'ADD_CATEGORY':
        return {
          ...state,
          categories: [...state.categories, action.category],
        };
      
      case 'UPDATE_CATEGORY':
        return {
          ...state,
          categories: state.categories.map(c =>
            c.id === action.id ? { ...c, ...action.updates } : c
          ),
        };
      
      case 'DELETE_CATEGORY':
        return {
          ...state,
          categories: state.categories.filter(c => c.id !== action.id),
          // Cascade delete: remove all rules associated with this category
          rules: state.rules.filter(r => r.categoryId !== action.id),
        };
      
      case 'ADD_RULE':
        return {
          ...state,
          rules: [...state.rules, action.rule],
        };
      
      case 'UPDATE_RULE':
        return {
          ...state,
          rules: state.rules.map(r =>
            r.id === action.id ? { ...r, ...action.updates } : r
          ),
        };
      
      case 'DELETE_RULE':
        return {
          ...state,
          rules: state.rules.filter(r => r.id !== action.id),
        };
      
      case 'REORDER_RULES':
        // Reorder rules based on the provided array of rule IDs
        const ruleMap = new Map(state.rules.map(r => [r.id, r]));
        const reorderedRules = action.ruleIds
          .map(id => ruleMap.get(id))
          .filter((rule): rule is CategoryRule => rule !== undefined);
        // Add any rules that weren't in the reorder list (shouldn't happen, but safety)
        const remainingRules = state.rules.filter(r => !action.ruleIds.includes(r.id));
        return {
          ...state,
          rules: [...reorderedRules, ...remainingRules],
        };
      
      case 'IMPORT_STATE':
        return {
          ...action.state,
          lastModified: new Date().toISOString(),
        };
      
      case 'RESET_STATE':
        return {
          ...initialState,
          lastModified: new Date().toISOString(),
        };
      
      default:
        return state;
    }
  })();

  return {
    ...newState,
    lastModified: new Date().toISOString(),
  };
}

interface FinanceContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  exportState: () => void;
  importState: (file: File) => Promise<void>;
}

const FinanceContext = createContext<FinanceContextValue | undefined>(undefined);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(financeReducer, initialState);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('financeAppState');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        dispatch({ type: 'IMPORT_STATE', state: parsed });
      } catch (error) {
        console.error('Failed to load state from localStorage:', error);
      }
    }
  }, []);

  // Save to localStorage on state change
  useEffect(() => {
    localStorage.setItem('financeAppState', JSON.stringify(state));
  }, [state]);

  const exportState = () => {
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `finance-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importState = async (file: File) => {
    const text = await file.text();
    const parsed = JSON.parse(text) as AppState;
    dispatch({ type: 'IMPORT_STATE', state: parsed });
  };

  return (
    <FinanceContext.Provider value={{ state, dispatch, exportState, importState }}>
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
}
