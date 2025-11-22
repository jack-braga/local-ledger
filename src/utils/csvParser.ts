import Papa from 'papaparse';
import { parse, isValid, differenceInDays } from 'date-fns';
import { CSVColumnMapping, ImportedTransaction, Transaction, PotentialDuplicate, Bank } from '@/types/finance';

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

/**
 * Get hardcoded column mapping for a specific bank
 * Returns mapping with column indices (for CSVs without headers) or column names (for CSVs with headers)
 */
export function getBankColumnMapping(bankId: Bank, headers: string[]): CSVColumnMapping | null {
  console.log('[CSV Parser] getBankColumnMapping called for bank:', bankId);
  console.log('[CSV Parser] Headers received:', headers);
  console.log('[CSV Parser] Headers length:', headers.length);
  
  // Check if CSV has headers or is headerless
  // Headers are considered valid if they contain recognizable column names
  const hasValidHeaders = headers.length > 0 && headers.some(h => {
    const normalized = h.trim().toLowerCase();
    return normalized && (
      normalized.includes('date') || 
      normalized.includes('amount') || 
      normalized.includes('description') ||
      normalized.includes('debit') ||
      normalized.includes('credit')
    );
  });
  const isHeaderless = !hasValidHeaders || headers.length === 0 || headers.every(h => !h || h.trim() === '');
  
  console.log('[CSV Parser] CSV has valid headers:', hasValidHeaders, 'is headerless:', isHeaderless);
  
  const normalizedHeaders = headers.map(h => h.trim().toLowerCase());
  
  switch (bankId) {
    case 'CBA': {
      // CBA format: Date, Amount (signed), Description, Balance
      // Column 0: Date (e.g., 31/01/2025)
      // Column 1: Amount (negative for debits, positive for credits, e.g., -5.26, +212.62)
      // Column 2: Description
      // Column 3: Balance
      
      // If headerless, use column indices
      if (isHeaderless || headers.length === 0) {
        console.log('[CSV Parser] CBA: Using column indices (headerless CSV)');
        return {
          dateColumn: '0', // Column index as string
          descriptionColumn: '2',
          amountColumn: '1',
          debitColumn: null,
          creditColumn: null,
          balanceColumn: '3',
        };
      }
      
      // Try to find headers
      const dateCol = normalizedHeaders.findIndex(h => 
        h === 'date' || h === 'transaction date' || h.includes('date')
      );
      const amountCol = normalizedHeaders.findIndex(h => 
        h === 'amount' || h === 'transaction amount' || h.includes('amount')
      );
      const descCol = normalizedHeaders.findIndex(h => 
        h === 'description' || h === 'details' || h.includes('description')
      );
      const balanceCol = normalizedHeaders.findIndex(h => 
        h === 'balance' || h.includes('balance')
      );

      console.log('[CSV Parser] CBA: Found columns - date:', dateCol, 'amount:', amountCol, 'desc:', descCol, 'balance:', balanceCol);

      // If we can't find headers, fall back to column indices
      if (dateCol === -1 || amountCol === -1 || descCol === -1) {
        console.log('[CSV Parser] CBA: Headers not found, falling back to column indices');
        return {
          dateColumn: '0',
          descriptionColumn: '2',
          amountColumn: '1',
          debitColumn: null,
          creditColumn: null,
          balanceColumn: '3',
        };
      }

      return {
        dateColumn: headers[dateCol],
        descriptionColumn: headers[descCol],
        amountColumn: headers[amountCol],
        debitColumn: null,
        creditColumn: null,
        balanceColumn: balanceCol !== -1 ? headers[balanceCol] : null,
      };
    }
    
    case 'STGEORGE': {
      // St.George format: Similar to CBA, typically Date, Description, Debit, Credit, Balance
      const dateCol = normalizedHeaders.findIndex(h => 
        h === 'date' || h === 'transaction date' || h === 'value date' || h.includes('date')
      );
      const descCol = normalizedHeaders.findIndex(h => 
        h === 'description' || h === 'narrative' || h === 'details' || h.includes('description')
      );
      const debitCol = normalizedHeaders.findIndex(h => 
        h === 'debit' || h === 'withdrawal' || h.includes('debit')
      );
      const creditCol = normalizedHeaders.findIndex(h => 
        h === 'credit' || h === 'deposit' || h.includes('credit')
      );
      const balanceCol = normalizedHeaders.findIndex(h => 
        h === 'balance' || h.includes('balance')
      );

      if (dateCol === -1 || descCol === -1 || (debitCol === -1 && creditCol === -1)) {
        return null;
      }

      return {
        dateColumn: headers[dateCol],
        descriptionColumn: headers[descCol],
        amountColumn: null,
        debitColumn: debitCol !== -1 ? headers[debitCol] : null,
        creditColumn: creditCol !== -1 ? headers[creditCol] : null,
        balanceColumn: balanceCol !== -1 ? headers[balanceCol] : null,
      };
    }
    
    case 'OTHER':
    default:
      // Fall back to auto-detection
      return detectColumns(headers);
  }
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
  console.log('[CSV Parser] parseCSV called with columnMapping:', columnMapping);
  
  return new Promise((resolve, reject) => {
    // Check if we're using column indices (headerless CSV)
    const isUsingIndices = columnMapping.dateColumn && /^\d+$/.test(columnMapping.dateColumn);
    const useHeader = !isUsingIndices;
    
    console.log('[CSV Parser] Using header mode:', useHeader, 'isUsingIndices:', isUsingIndices);
    
    Papa.parse(file, {
      header: useHeader,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          console.log('[CSV Parser] Papa.parse complete. Rows:', results.data.length);
          console.log('[CSV Parser] First row sample:', results.data[0]);
          
          const transactions: ImportedTransaction[] = [];
          let skippedRows = 0;

          for (let i = 0; i < results.data.length; i++) {
            const row = results.data[i] as Record<string, string> | string[];
            try {
              // Helper to get value from row (handles both object and array)
              const getValue = (columnName: string | null): string | null => {
                if (!columnName) return null;
                
                if (isUsingIndices) {
                  // Column indices - row is an array
                  const index = parseInt(columnName, 10);
                  if (isNaN(index)) return null;
                  const rowArray = row as string[];
                  return rowArray[index] || null;
                } else {
                  // Column names - row is an object
                  const rowObj = row as Record<string, string>;
                  return rowObj[columnName] || null;
                }
              };

              // Extract date
              const dateStr = getValue(columnMapping.dateColumn);
              console.log(`[CSV Parser] Row ${i}: dateStr =`, dateStr);
              
              if (!dateStr || typeof dateStr !== 'string' || dateStr.trim() === '') {
                console.log(`[CSV Parser] Row ${i}: Skipping - no date`);
                skippedRows++;
                continue;
              }
              
              const date = parseDate(dateStr);
              if (!date) {
                console.log(`[CSV Parser] Row ${i}: Skipping - could not parse date:`, dateStr);
                skippedRows++;
                continue;
              }
              console.log(`[CSV Parser] Row ${i}: Parsed date:`, date);

              // Extract description
              const description = getValue(columnMapping.descriptionColumn) || 'Unknown';
              console.log(`[CSV Parser] Row ${i}: description =`, description);

              // Extract amount
              let amount = 0;
              
              if (columnMapping.amountColumn) {
                // Scenario A: Single amount column
                const amountStr = getValue(columnMapping.amountColumn);
                console.log(`[CSV Parser] Row ${i}: amountStr =`, amountStr);
                
                if (amountStr && typeof amountStr === 'string') {
                  amount = parseAmount(amountStr);
                  console.log(`[CSV Parser] Row ${i}: Parsed amount:`, amount);
                } else {
                  console.log(`[CSV Parser] Row ${i}: Skipping - invalid amount string`);
                  skippedRows++;
                  continue; // Skip if amount is invalid
                }
              } else if (columnMapping.debitColumn && columnMapping.creditColumn) {
                // Scenario B: Separate debit/credit columns
                const debitStr = getValue(columnMapping.debitColumn) || '0';
                const creditStr = getValue(columnMapping.creditColumn) || '0';
                const debit = parseAmount(debitStr);
                const credit = parseAmount(creditStr);
                amount = credit - debit; // Credit is positive, debit is negative
                console.log(`[CSV Parser] Row ${i}: debit:`, debit, 'credit:', credit, 'amount:', amount);
              } else {
                console.log(`[CSV Parser] Row ${i}: Skipping - cannot determine amount`);
                skippedRows++;
                continue; // Cannot determine amount
              }

              // Validate amount is a valid number
              if (isNaN(amount) || !isFinite(amount)) {
                console.log(`[CSV Parser] Row ${i}: Skipping - invalid amount value:`, amount);
                skippedRows++;
                continue; // Skip invalid amounts
              }

              transactions.push({
                date,
                description: description.trim(),
                amount,
                rawData: isUsingIndices ? {} : (row as Record<string, string>),
              });
              
              console.log(`[CSV Parser] Row ${i}: Successfully parsed transaction`);
            } catch (error) {
              // Skip malformed rows instead of crashing
              console.warn(`[CSV Parser] Row ${i}: Error parsing row:`, error, row);
              skippedRows++;
              continue;
            }
          }

          console.log(`[CSV Parser] Parsing complete. Successfully parsed: ${transactions.length}, Skipped: ${skippedRows}`);
          resolve(transactions);
        } catch (error) {
          console.error('[CSV Parser] Error in parseCSV complete handler:', error);
          reject(error);
        }
      },
      error: (error) => {
        console.error('[CSV Parser] Papa.parse error:', error);
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
