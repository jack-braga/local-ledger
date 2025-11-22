import { Category, Transaction, TransactionType } from '@/types/finance';

export function matchCategory(
  description: string,
  categories: Category[],
  type: TransactionType
): string | null {
  // Filter categories by type
  const relevantCategories = categories.filter(c => c.type === type);

  for (const category of relevantCategories) {
    for (const rule of category.rules) {
      if (rule.targetType !== type) continue;

      const descLower = rule.caseSensitive ? description : description.toLowerCase();
      const pattern = rule.caseSensitive ? rule.pattern : rule.pattern.toLowerCase();

      if (rule.matchType === 'contains') {
        if (descLower.includes(pattern)) {
          return category.id;
        }
      } else if (rule.matchType === 'regex') {
        try {
          const regex = new RegExp(pattern, rule.caseSensitive ? '' : 'i');
          if (regex.test(description)) {
            return category.id;
          }
        } catch (error) {
          console.error('Invalid regex pattern:', pattern, error);
        }
      }
    }
  }

  return null;
}

export function autoCategorizeTransaction(
  transaction: Transaction,
  categories: Category[]
): string | null {
  // Check for refunds first (positive amount + refund keywords -> Negative Expense)
  if (transaction.amount > 0) {
    const refundKeywords = ['refund', 'reversal', 'reversed', 'credit', 'return', 'chargeback'];
    const descriptionLower = transaction.description.toLowerCase();
    
    if (refundKeywords.some(keyword => descriptionLower.includes(keyword))) {
      // Find the Refunds category (should be EXPENSE type)
      const refundCategory = categories.find(c => c.id === 'cat-refund' && c.type === 'EXPENSE');
      if (refundCategory) {
        return refundCategory.id;
      }
    }
  }
  
  // Use standard category matching
  return matchCategory(transaction.description, categories, transaction.type);
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
