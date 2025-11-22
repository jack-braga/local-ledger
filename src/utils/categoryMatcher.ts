import { CategoryRule, Transaction, TransactionType } from '@/types/finance';

export function matchCategory(
  description: string,
  rules: CategoryRule[],
  type: TransactionType
): string | null {
  // Iterate through rules in order (first match wins)
  // Filter rules by target type
  const relevantRules = rules.filter(r => r.targetType === type);

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
  // Use standard category matching with top-level rules
  return matchCategory(transaction.description, rules, transaction.type);
}

export function inferTransactionType(amount: number, description: string): TransactionType {
  // Positive amounts are typically income or refunds
  if (amount > 0) {
    // Check for transfer keywords
    const transferKeywords = ['transfer', 'xfer', 'payment sent'];
    if (transferKeywords.some(kw => description.toLowerCase().includes(kw))) {
      return 'TRANSFER';
    }
    return 'INCOME';
  } else {
    // Negative amounts are expenses or transfers
    const transferKeywords = ['transfer', 'xfer', 'payment received'];
    if (transferKeywords.some(kw => description.toLowerCase().includes(kw))) {
      return 'TRANSFER';
    }
    return 'EXPENSE';
  }
}
