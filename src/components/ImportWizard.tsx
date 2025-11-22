import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { useFinance } from '@/contexts/FinanceContext';
import { Account, Transaction, ImportedTransaction, PotentialDuplicate, Bank, CSVColumnMapping } from '@/types/finance';
import { parseCSV, detectColumns, getBankColumnMapping, findPotentialDuplicates } from '@/utils/csvParser';
import { inferTransactionType, autoCategorizeTransaction } from '@/utils/categoryMatcher';
import { MergeTransactionDialog } from '@/components/MergeTransactionDialog';
import { toast } from '@/hooks/use-toast';

interface ImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportWizard({ open, onOpenChange }: ImportWizardProps) {
  const { state, dispatch } = useFinance();
  const [file, setFile] = useState<File | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountBank, setNewAccountBank] = useState<Bank>('OTHER');
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'upload' | 'account' | 'processing' | 'merging'>('upload');
  
  // Merge dialog state
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [currentMerge, setCurrentMerge] = useState<PotentialDuplicate | null>(null);
  const [pendingDuplicates, setPendingDuplicates] = useState<PotentialDuplicate[]>([]);
  const [processedIndices, setProcessedIndices] = useState<Set<number>>(new Set());
  const [importedTransactions, setImportedTransactions] = useState<ImportedTransaction[]>([]);
  const [currentAccountId, setCurrentAccountId] = useState<string>('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setStep('account');
    } else {
      toast({
        title: 'Invalid file type',
        description: 'Please select a CSV file.',
        variant: 'destructive',
      });
    }
  };

  const handleImport = async () => {
    if (!file) return;

    let accountId = selectedAccountId;

    // Create new account if needed
    if (selectedAccountId === 'new' && newAccountName.trim()) {
      const newAccount: Account = {
        id: `acc-${Date.now()}`,
        name: newAccountName.trim(),
        color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
        bankId: newAccountBank,
      };
      dispatch({ type: 'ADD_ACCOUNT', account: newAccount });
      accountId = newAccount.id;
    } else if (!selectedAccountId || selectedAccountId === 'new') {
      toast({
        title: 'Account required',
        description: 'Please select or create an account.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    setStep('processing');
    setCurrentAccountId(accountId);

    try {
      // Get the selected account to determine bank
      const selectedAccount = state.accounts.find(acc => acc.id === accountId);
      const bankId = selectedAccount?.bankId || 'OTHER';

      // Read CSV headers (or first line if headerless)
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim() !== '');
      console.log('[ImportWizard] CSV file read. Total lines:', lines.length);
      console.log('[ImportWizard] First line:', lines[0]);
      
      // Try to parse headers - split by comma, handling quoted values
      const firstLine = lines[0] || '';
      const headers = firstLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      console.log('[ImportWizard] Parsed headers:', headers);

      // Use bank-specific column mapping if bank is specified
      let columnMapping: CSVColumnMapping | null = null;
      
      if (bankId !== 'OTHER') {
        columnMapping = getBankColumnMapping(bankId, headers);
        console.log('[ImportWizard] Bank-specific mapping result:', columnMapping);
        if (!columnMapping) {
          toast({
            title: 'CSV format mismatch',
            description: `Could not parse CSV for ${bankId}. Please check the file format matches the bank's standard format.`,
            variant: 'destructive',
          });
          setIsProcessing(false);
          return;
        }
      } else {
        // Fall back to auto-detection for OTHER banks
        columnMapping = detectColumns(headers);
        console.log('[ImportWizard] Auto-detected mapping:', columnMapping);
      }

      if (!columnMapping.dateColumn || !columnMapping.descriptionColumn) {
        toast({
          title: 'Unable to parse CSV',
          description: 'Could not detect required columns (Date, Description).',
          variant: 'destructive',
        });
        setIsProcessing(false);
        return;
      }

      if (!columnMapping.amountColumn && (!columnMapping.debitColumn || !columnMapping.creditColumn)) {
        toast({
          title: 'Unable to parse CSV',
          description: 'Could not detect amount columns.',
          variant: 'destructive',
        });
        setIsProcessing(false);
        return;
      }

      // Parse CSV
      const imported = await parseCSV(file, columnMapping);
      setImportedTransactions(imported);

      // Find potential duplicates
      const duplicates = findPotentialDuplicates(state.transactions, imported, accountId);
      setPendingDuplicates(duplicates);
      setProcessedIndices(new Set());

      // If there are duplicates, show merge dialog
      if (duplicates.length > 0) {
        setStep('merging');
        setCurrentMerge(duplicates[0]);
        setMergeDialogOpen(true);
      } else {
        // No duplicates, proceed with import
        processRemainingTransactions(imported, accountId, new Set());
      }
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'An error occurred during import.',
        variant: 'destructive',
      });
      setIsProcessing(false);
    }
  };

  const processRemainingTransactions = (
    imported: ImportedTransaction[],
    accountId: string,
    skippedIndices: Set<number>
  ) => {
    const newTransactions: Transaction[] = [];
    
    for (let i = 0; i < imported.length; i++) {
      // Skip if this index was processed (merged or skipped)
      if (skippedIndices.has(i)) {
        continue;
      }

      const importedTxn = imported[i];
      const type = inferTransactionType(importedTxn.amount, importedTxn.description);
      
      const transaction: Transaction = {
        id: `txn-${Date.now()}-${i}`,
        date: importedTxn.date,
        description: importedTxn.description,
        amount: importedTxn.amount,
        currency: 'AUD',
        accountId,
        type,
        categoryId: null,
        isManualEntry: false,
        originalData: importedTxn.rawData,
      };

      // Auto-categorize using top-level rules
      const categoryId = autoCategorizeTransaction(transaction, state.rules);
      if (categoryId) {
        transaction.categoryId = categoryId;
      }

      newTransactions.push(transaction);
    }

    dispatch({ type: 'ADD_TRANSACTIONS', transactions: newTransactions });

    toast({
      title: 'Import successful',
      description: `Imported ${newTransactions.length} transaction${newTransactions.length !== 1 ? 's' : ''}.`,
    });

    onOpenChange(false);
    resetWizard();
  };

  const handleMerge = () => {
    if (!currentMerge) return;

    // Merge: Update Date and Description from CSV, preserve Category/Notes
    dispatch({
      type: 'MERGE_TRANSACTION',
      id: currentMerge.existingTransaction.id,
      csvData: {
        date: currentMerge.newTransaction.date,
        description: currentMerge.newTransaction.description,
      },
    });

    // Mark this index as processed
    const newProcessed = new Set(processedIndices);
    newProcessed.add(currentMerge.newTransactionIndex);
    setProcessedIndices(newProcessed);

    // Move to next duplicate or finish
    processNextDuplicate(newProcessed);
  };

  const handleKeepExisting = () => {
    if (!currentMerge) return;

    // Mark this index as processed (skipped)
    const newProcessed = new Set(processedIndices);
    newProcessed.add(currentMerge.newTransactionIndex);
    setProcessedIndices(newProcessed);

    // Move to next duplicate or finish
    processNextDuplicate(newProcessed);
  };

  const handleAddAsNew = () => {
    if (!currentMerge) return;

    // Don't mark as processed - let it be added as new transaction
    // Move to next duplicate or finish
    processNextDuplicate(processedIndices);
  };

  const processNextDuplicate = (processed: Set<number>) => {
    setMergeDialogOpen(false);
    
    // Find next unprocessed duplicate
    const nextDuplicate = pendingDuplicates.find(
      dup => !processed.has(dup.newTransactionIndex)
    );

    if (nextDuplicate) {
      // Small delay to allow dialog to close before opening next one
      setTimeout(() => {
        setCurrentMerge(nextDuplicate);
        setMergeDialogOpen(true);
      }, 100);
    } else {
      // All duplicates processed, finish import
      setIsProcessing(false);
      processRemainingTransactions(importedTransactions, currentAccountId, processed);
    }
  };

  const resetWizard = () => {
    setFile(null);
    setSelectedAccountId('');
    setNewAccountName('');
    setNewAccountBank('OTHER');
    setStep('upload');
    setIsProcessing(false);
    setMergeDialogOpen(false);
    setCurrentMerge(null);
    setPendingDuplicates([]);
    setProcessedIndices(new Set());
    setImportedTransactions([]);
    setCurrentAccountId('');
  };

  return (
    <Dialog open={open} onOpenChange={(open) => { onOpenChange(open); if (!open) resetWizard(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {step === 'upload' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-accent transition-colors">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="csv-upload"
                />
                <label htmlFor="csv-upload" className="cursor-pointer">
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-sm font-medium mb-1">Click to upload CSV</p>
                  <p className="text-xs text-muted-foreground">
                    CSV format is automatically detected based on the selected account's bank
                  </p>
                </label>
              </div>

              {file && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <FileText className="h-5 w-5 text-accent" />
                  <span className="text-sm flex-1">{file.name}</span>
                  <CheckCircle2 className="h-5 w-5 text-success" />
                </div>
              )}
            </div>
          )}

          {step === 'account' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <FileText className="h-5 w-5 text-accent" />
                <span className="text-sm">{file?.name}</span>
              </div>

              <div className="space-y-2">
                <Label>Select Account</Label>
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an account" />
                  </SelectTrigger>
                  <SelectContent>
                    {state.accounts.map(account => (
                      <SelectItem key={account.id} value={account.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: account.color }}
                          />
                          <span>{account.name}</span>
                          {account.bankId && account.bankId !== 'OTHER' && (
                            <span className="text-xs text-muted-foreground">
                              ({account.bankId === 'CBA' ? 'CBA' : account.bankId === 'STGEORGE' ? 'St.George' : account.bankId})
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                    <SelectItem value="new">+ Create New Account</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedAccountId === 'new' && (
                <>
                  <div className="space-y-2">
                    <Label>New Account Name</Label>
                    <Input
                      value={newAccountName}
                      onChange={(e) => setNewAccountName(e.target.value)}
                      placeholder="e.g., CBA Everyday"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bank</Label>
                    <Select value={newAccountBank} onValueChange={(value) => setNewAccountBank(value as Bank)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select bank" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CBA">Commonwealth Bank (CBA)</SelectItem>
                        <SelectItem value="STGEORGE">St.George</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      This determines the CSV format for this account
                    </p>
                  </div>
                </>
              )}

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setStep('upload')} className="flex-1">
                  Back
                </Button>
                <Button onClick={handleImport} className="flex-1">
                  Import
                </Button>
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div className="py-8 text-center space-y-4">
              <div className="animate-spin mx-auto h-12 w-12 border-4 border-primary border-t-transparent rounded-full" />
              <p className="text-sm text-muted-foreground">Processing CSV...</p>
            </div>
          )}
        </div>
      </DialogContent>

      {/* Merge Dialog - Separate from main dialog */}
      {currentMerge && (
        <MergeTransactionDialog
          open={mergeDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              // If dialog is closed without action, treat as "Keep Existing"
              handleKeepExisting();
            } else {
              setMergeDialogOpen(open);
            }
          }}
          existingTransaction={currentMerge.existingTransaction}
          newTransaction={currentMerge.newTransaction}
          onKeepExisting={handleKeepExisting}
          onAddAsNew={handleAddAsNew}
          onMerge={handleMerge}
        />
      )}
    </Dialog>
  );
}
