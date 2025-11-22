export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

export type Bank = 'CBA' | 'STGEORGE' | 'OTHER';

export interface Transaction {
  id: string;
  date: string; // ISO date string
  description: string;
  amount: number;
  currency: string;
  categoryId: string | null;
  accountId: string;
  type: TransactionType;
  isManualEntry: boolean;
  notes?: string;
  originalData?: Record<string, string>; // Raw CSV row for debugging
}

export interface Account {
  id: string;
  name: string;
  color: string;
  balance?: number;
  institution?: string;
  bankId?: Bank; // Bank identifier for CSV parsing
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  color?: string;
  icon?: string;
  rules: CategoryRule[];
}

export interface CategoryRule {
  id: string;
  matchType: 'contains' | 'regex';
  pattern: string;
  categoryId: string;
  targetType: TransactionType;
  caseSensitive?: boolean;
}

export interface AppState {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  version: string;
  lastModified: string;
}

export interface CSVColumnMapping {
  dateColumn: string | null;
  descriptionColumn: string | null;
  amountColumn: string | null;
  debitColumn: string | null;
  creditColumn: string | null;
  balanceColumn: string | null;
}

export interface ImportedTransaction {
  date: string;
  description: string;
  amount: number;
  rawData: Record<string, string>;
}

export interface DuplicateMatch {
  existingTransaction: Transaction;
  newTransaction: ImportedTransaction;
  confidence: number;
}

export interface PotentialDuplicate {
  existingTransaction: Transaction;
  newTransaction: ImportedTransaction;
  newTransactionIndex: number;
}
