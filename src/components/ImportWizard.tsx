import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { useFinance } from '@/contexts/FinanceContext';
import { Account, Transaction } from '@/types/finance';
import { parseCSV, detectColumns, findDuplicates } from '@/utils/csvParser';
import { inferTransactionType, autoCategorizeTransaction } from '@/utils/categoryMatcher';
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'upload' | 'account' | 'processing'>('upload');

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

    try {
      // Read CSV headers
      const text = await file.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

      // Auto-detect columns
      const columnMapping = detectColumns(headers);

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
      const importedTransactions = await parseCSV(file, columnMapping);

      // Check for duplicates
      const duplicates = findDuplicates(state.transactions, importedTransactions);

      // Convert to Transaction objects
      const newTransactions: Transaction[] = [];
      
      for (let i = 0; i < importedTransactions.length; i++) {
        const imported = importedTransactions[i];
        const key = `new-${i}`;
        
        // Skip if duplicate detected (for now, simple approach)
        if (duplicates.has(key)) {
          continue;
        }

        const type = inferTransactionType(imported.amount, imported.description);
        
        const transaction: Transaction = {
          id: `txn-${Date.now()}-${i}`,
          date: imported.date,
          description: imported.description,
          amount: imported.amount,
          currency: 'AUD',
          accountId,
          type,
          categoryId: null,
          isManualEntry: false,
          originalData: imported.rawData,
        };

        // Auto-categorize
        const categoryId = autoCategorizeTransaction(transaction, state.categories);
        if (categoryId) {
          transaction.categoryId = categoryId;
        }

        newTransactions.push(transaction);
      }

      dispatch({ type: 'ADD_TRANSACTIONS', transactions: newTransactions });

      toast({
        title: 'Import successful',
        description: `Imported ${newTransactions.length} transactions${duplicates.size > 0 ? `, skipped ${duplicates.size} duplicates` : ''}.`,
      });

      onOpenChange(false);
      resetWizard();
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'An error occurred during import.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetWizard = () => {
    setFile(null);
    setSelectedAccountId('');
    setNewAccountName('');
    setStep('upload');
    setIsProcessing(false);
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
                    Supports CBA, St.George, and other bank formats
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
                          {account.name}
                        </div>
                      </SelectItem>
                    ))}
                    <SelectItem value="new">+ Create New Account</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedAccountId === 'new' && (
                <div className="space-y-2">
                  <Label>New Account Name</Label>
                  <Input
                    value={newAccountName}
                    onChange={(e) => setNewAccountName(e.target.value)}
                    placeholder="e.g., CBA Everyday"
                  />
                </div>
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
    </Dialog>
  );
}
