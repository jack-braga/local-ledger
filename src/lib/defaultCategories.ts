import { Category } from '@/types/finance';

export const defaultCategories: Category[] = [
  // Income Categories
  {
    id: 'cat-salary',
    name: 'Salary',
    type: 'INCOME',
    color: '#10b981',
    rules: [],
  },
  {
    id: 'cat-investment',
    name: 'Investment Income',
    type: 'INCOME',
    color: '#3b82f6',
    rules: [],
  },
  {
    id: 'cat-refund',
    name: 'Refunds',
    type: 'EXPENSE',
    color: '#06b6d4',
    rules: [],
  },
  {
    id: 'cat-other-income',
    name: 'Other Income',
    type: 'INCOME',
    color: '#8b5cf6',
    rules: [],
  },

  // Expense Categories
  {
    id: 'cat-groceries',
    name: 'Groceries',
    type: 'EXPENSE',
    color: '#f59e0b',
    rules: [
      {
        id: 'rule-woolworths',
        matchType: 'contains',
        pattern: 'woolworths',
        categoryId: 'cat-groceries',
        targetType: 'EXPENSE',
      },
      {
        id: 'rule-coles',
        matchType: 'contains',
        pattern: 'coles',
        categoryId: 'cat-groceries',
        targetType: 'EXPENSE',
      },
      {
        id: 'rule-aldi',
        matchType: 'contains',
        pattern: 'aldi',
        categoryId: 'cat-groceries',
        targetType: 'EXPENSE',
      },
    ],
  },
  {
    id: 'cat-dining',
    name: 'Dining & Restaurants',
    type: 'EXPENSE',
    color: '#ef4444',
    rules: [
      {
        id: 'rule-restaurant',
        matchType: 'contains',
        pattern: 'restaurant',
        categoryId: 'cat-dining',
        targetType: 'EXPENSE',
      },
      {
        id: 'rule-cafe',
        matchType: 'contains',
        pattern: 'cafe',
        categoryId: 'cat-dining',
        targetType: 'EXPENSE',
      },
    ],
  },
  {
    id: 'cat-transport',
    name: 'Transportation',
    type: 'EXPENSE',
    color: '#6366f1',
    rules: [
      {
        id: 'rule-uber',
        matchType: 'contains',
        pattern: 'uber',
        categoryId: 'cat-transport',
        targetType: 'EXPENSE',
      },
      {
        id: 'rule-fuel',
        matchType: 'contains',
        pattern: 'petrol',
        categoryId: 'cat-transport',
        targetType: 'EXPENSE',
      },
    ],
  },
  {
    id: 'cat-utilities',
    name: 'Utilities',
    type: 'EXPENSE',
    color: '#14b8a6',
    rules: [],
  },
  {
    id: 'cat-entertainment',
    name: 'Entertainment',
    type: 'EXPENSE',
    color: '#ec4899',
    rules: [
      {
        id: 'rule-netflix',
        matchType: 'contains',
        pattern: 'netflix',
        categoryId: 'cat-entertainment',
        targetType: 'EXPENSE',
      },
      {
        id: 'rule-spotify',
        matchType: 'contains',
        pattern: 'spotify',
        categoryId: 'cat-entertainment',
        targetType: 'EXPENSE',
      },
    ],
  },
  {
    id: 'cat-shopping',
    name: 'Shopping',
    type: 'EXPENSE',
    color: '#a855f7',
    rules: [
      {
        id: 'rule-amazon',
        matchType: 'contains',
        pattern: 'amazon',
        categoryId: 'cat-shopping',
        targetType: 'EXPENSE',
      },
    ],
  },
  {
    id: 'cat-health',
    name: 'Health & Medical',
    type: 'EXPENSE',
    color: '#059669',
    rules: [],
  },
  {
    id: 'cat-other-expense',
    name: 'Other Expenses',
    type: 'EXPENSE',
    color: '#64748b',
    rules: [],
  },
  {
    id: 'cat-gifts-loans',
    name: 'Gifts/Loans',
    type: 'EXPENSE',
    color: '#f97316',
    rules: [],
  },

  // Transfer Category
  {
    id: 'cat-transfer',
    name: 'Transfers',
    type: 'TRANSFER',
    color: '#6b7280',
    rules: [],
  },
];
