import { Transaction } from '@/types/finance';

/**
 * Detects orphaned transfer transactions - transfers that don't have a matching pair
 * in another account (same date range + inverted amount).
 * 
 * @param transactions - All transactions to check
 * @param dateToleranceDays - Number of days to allow for date matching (default: 7)
 * @param amountTolerance - Amount tolerance for matching (default: 0.01)
 * @returns Array of orphaned transfer transaction IDs
 */
export function detectOrphanTransfers(
  transactions: Transaction[],
  dateToleranceDays: number = 7,
  amountTolerance: number = 0.01
): string[] {
  const transferTransactions = transactions.filter(t => t.type === 'TRANSFER');
  const orphanedIds: string[] = [];

  for (const transfer of transferTransactions) {
    const transferDate = new Date(transfer.date);
    const transferAmount = transfer.amount;
    const transferAccountId = transfer.accountId;

    // Look for a matching transfer in a different account
    // Match criteria: different account, inverted amount, date within tolerance
    const hasMatch = transactions.some(other => {
      // Must be a transfer
      if (other.type !== 'TRANSFER') return false;
      
      // Must be in a different account
      if (other.accountId === transferAccountId) return false;
      
      // Must have inverted amount (within tolerance)
      const amountMatch = Math.abs(other.amount + transferAmount) < amountTolerance;
      if (!amountMatch) return false;
      
      // Must be within date tolerance
      const otherDate = new Date(other.date);
      const dateDiff = Math.abs(transferDate.getTime() - otherDate.getTime());
      const dateDiffDays = dateDiff / (1000 * 60 * 60 * 24);
      
      if (dateDiffDays > dateToleranceDays) return false;
      
      return true;
    });

    if (!hasMatch) {
      orphanedIds.push(transfer.id);
    }
  }

  return orphanedIds;
}

/**
 * Gets all orphaned transfer transactions (not just IDs)
 * 
 * @param transactions - All transactions to check
 * @param dateToleranceDays - Number of days to allow for date matching (default: 7)
 * @param amountTolerance - Amount tolerance for matching (default: 0.01)
 * @returns Array of orphaned transfer transactions
 */
export function getOrphanTransfers(
  transactions: Transaction[],
  dateToleranceDays: number = 7,
  amountTolerance: number = 0.01
): Transaction[] {
  const orphanedIds = detectOrphanTransfers(transactions, dateToleranceDays, amountTolerance);
  return transactions.filter(t => orphanedIds.includes(t.id));
}

