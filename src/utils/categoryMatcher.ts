import { CategoryRule, Transaction, TransactionType } from '@/types/finance';

/**
 * Derives transaction type from amount: positive = INCOME, negative = EXPENSE
 */
export function getTransactionType(amount: number): TransactionType {
  return amount >= 0 ? 'INCOME' : 'EXPENSE';
}

export function matchCategory(
  description: string,
  rules: CategoryRule[],
  type: TransactionType
): string | null {
  // Iterate through rules in order (first match wins)
  // Filter rules by target type (include rules with targetType 'ALL' or matching type)
  const relevantRules = rules.filter(r => r.targetType === 'ALL' || r.targetType === type);

  for (const rule of relevantRules) {
    if (rule.matchType === 'contains') {
      // String matching with case sensitivity
      if (rule.caseSensitive) {
        if (description.includes(rule.pattern)) {
          return rule.categoryId;
        }
      } else {
        if (description.toLowerCase().includes(rule.pattern.toLowerCase())) {
          return rule.categoryId;
        }
      }
    } else if (rule.matchType === 'regex') {
      // Regex matching with case sensitivity (using 'i' flag when not case sensitive)
      try {
        const flags = rule.caseSensitive ? '' : 'i';
        const regex = new RegExp(rule.pattern, flags);
        if (regex.test(description)) {
          return rule.categoryId;
        }
      } catch (error) {
        // Invalid regex pattern - skip this rule
        console.error('Invalid regex pattern:', rule.pattern, error);
        continue;
      }
    }
  }

  return null;
}

export function autoCategorizeTransaction(
  transaction: Transaction,
  rules: CategoryRule[]
): string | null {
  // Derive type from amount and use standard category matching
  const type = getTransactionType(transaction.amount);
  return matchCategory(transaction.description, rules, type);
}

