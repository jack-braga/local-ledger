import Papa from 'papaparse';
import { parse, isValid, differenceInDays } from 'date-fns';
import { CSVColumnMapping, ImportedTransaction, Transaction, PotentialDuplicate } from '@/types/finance';

const DATE_FORMATS = [
  'dd/MM/yyyy',
  'MM/dd/yyyy',
  'yyyy-MM-dd',
  'dd-MM-yyyy',
  'MM-dd-yyyy',
  'd/M/yyyy',
  'M/d/yyyy',
];

function detectDateColumn(headers: string[]): string | null {
  const dateKeywords = ['date', 'transaction date', 'posted date', 'value date'];
  return headers.find(h => 
    dateKeywords.some(keyword => h.toLowerCase().includes(keyword))
  ) || null;
}

function detectDescriptionColumn(headers: string[]): string | null {
  const descKeywords = ['description', 'narrative', 'details', 'merchant', 'payee'];
  return headers.find(h => 
    descKeywords.some(keyword => h.toLowerCase().includes(keyword))
  ) || null;
}

function detectAmountColumn(headers: string[]): string | null {
  const amountKeywords = ['amount', 'value', 'transaction'];
  return headers.find(h => 
    amountKeywords.some(keyword => h.toLowerCase().includes(keyword)) &&
    !h.toLowerCase().includes('balance')
  ) || null;
}

function detectDebitColumn(headers: string[]): string | null {
  const debitKeywords = ['debit', 'withdrawal', 'out'];
  return headers.find(h => 
    debitKeywords.some(keyword => h.toLowerCase().includes(keyword))
  ) || null;
}

function detectCreditColumn(headers: string[]): string | null {
  const creditKeywords = ['credit', 'deposit', 'in'];
  return headers.find(h => 
    creditKeywords.some(keyword => h.toLowerCase().includes(keyword))
  ) || null;
}

function detectBalanceColumn(headers: string[]): string | null {
  const balanceKeywords = ['balance', 'running balance'];
  return headers.find(h => 
    balanceKeywords.some(keyword => h.toLowerCase().includes(keyword))
  ) || null;
}

export function detectColumns(headers: string[]): CSVColumnMapping {
  return {
    dateColumn: detectDateColumn(headers),
    descriptionColumn: detectDescriptionColumn(headers),
    amountColumn: detectAmountColumn(headers),
    debitColumn: detectDebitColumn(headers),
    creditColumn: detectCreditColumn(headers),
    balanceColumn: detectBalanceColumn(headers),
  };
}

function parseDate(dateStr: string): string | null {
  for (const format of DATE_FORMATS) {
    const parsed = parse(dateStr, format, new Date());
    if (isValid(parsed)) {
      return parsed.toISOString();
    }
  }
  return null;
}

function parseAmount(value: string): number {
  // Remove currency symbols, commas, and spaces
  const cleaned = value.replace(/[^0-9.-]/g, '');
  return parseFloat(cleaned) || 0;
}

export async function parseCSV(
  file: File,
  columnMapping: CSVColumnMapping
): Promise<ImportedTransaction[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const transactions: ImportedTransaction[] = [];

          for (const row of results.data as Record<string, string>[]) {
            try {
              // Extract date
              const dateStr = columnMapping.dateColumn ? row[columnMapping.dateColumn] : null;
              if (!dateStr || typeof dateStr !== 'string') continue;
              
              const date = parseDate(dateStr);
              if (!date) continue;

              // Extract description
              const description = columnMapping.descriptionColumn
                ? (row[columnMapping.descriptionColumn] || 'Unknown')
                : 'Unknown';

              // Extract amount
              let amount = 0;
              
              if (columnMapping.amountColumn) {
                // Scenario A: Single amount column
                const amountStr = row[columnMapping.amountColumn];
                if (amountStr && typeof amountStr === 'string') {
                  amount = parseAmount(amountStr);
                } else {
                  continue; // Skip if amount is invalid
                }
              } else if (columnMapping.debitColumn && columnMapping.creditColumn) {
                // Scenario B: Separate debit/credit columns
                const debitStr = row[columnMapping.debitColumn] || '0';
                const creditStr = row[columnMapping.creditColumn] || '0';
                const debit = parseAmount(debitStr);
                const credit = parseAmount(creditStr);
                amount = credit - debit; // Credit is positive, debit is negative
              } else {
                continue; // Cannot determine amount
              }

              // Validate amount is a valid number
              if (isNaN(amount) || !isFinite(amount)) {
                continue; // Skip invalid amounts
              }

              transactions.push({
                date,
                description: description.trim(),
                amount,
                rawData: row,
              });
            } catch (error) {
              // Skip malformed rows instead of crashing
              console.warn('Skipping malformed CSV row:', error, row);
              continue;
            }
          }

          resolve(transactions);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}

/**
 * Enhanced duplicate detection: Finds potential duplicates based on:
 * - Same Amount (within 0.01 tolerance)
 * - Date within ±1 day
 * - Same Account
 */
export function findPotentialDuplicates(
  existingTransactions: Transaction[],
  newTransactions: ImportedTransaction[],
  accountId: string
): PotentialDuplicate[] {
  const potentialDuplicates: PotentialDuplicate[] = [];

  for (let i = 0; i < newTransactions.length; i++) {
    const newTxn = newTransactions[i];
    const newDate = new Date(newTxn.date);

    for (const existingTxn of existingTransactions) {
      // Match criteria: same account, same amount, date within ±1 day
      const sameAccount = existingTxn.accountId === accountId;
      const sameAmount = Math.abs(existingTxn.amount - newTxn.amount) < 0.01;
      
      if (sameAccount && sameAmount) {
        const existingDate = new Date(existingTxn.date);
        const dateDiff = Math.abs(differenceInDays(newDate, existingDate));
        
        // Date within ±1 day
        if (dateDiff <= 1) {
          potentialDuplicates.push({
            existingTransaction: existingTxn,
            newTransaction: newTxn,
            newTransactionIndex: i,
          });
          // Only match to the first potential duplicate found
          break;
        }
      }
    }
  }

  return potentialDuplicates;
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use findPotentialDuplicates instead
 */
export function findDuplicates(
  existingTransactions: any[],
  newTransactions: ImportedTransaction[]
): Map<string, any[]> {
  const duplicates = new Map<string, any[]>();

  for (let i = 0; i < newTransactions.length; i++) {
    const newTxn = newTransactions[i];
    const matches: any[] = [];

    for (const existingTxn of existingTransactions) {
      // Match criteria: same date and amount
      const sameDate = existingTxn.date === newTxn.date;
      const sameAmount = Math.abs(existingTxn.amount - newTxn.amount) < 0.01;
      
      if (sameDate && sameAmount) {
        // Calculate description similarity (simple approach)
        const similarity = calculateSimilarity(
          existingTxn.description.toLowerCase(),
          newTxn.description.toLowerCase()
        );
        
        if (similarity > 0.6) {
          matches.push({
            existing: existingTxn,
            confidence: similarity,
          });
        }
      }
    }

    if (matches.length > 0) {
      duplicates.set(`new-${i}`, matches);
    }
  }

  return duplicates;
}

function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}
