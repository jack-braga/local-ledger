import { useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Download, Trash, Upload } from 'lucide-react';
import { Account, Bank } from '@/types/finance';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const CURRENCIES = [
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'NZD', name: 'New Zealand Dollar' },
];

export default function Settings() {
  const { state, dispatch, exportState, importState } = useFinance();
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountColor, setNewAccountColor] = useState('#3b82f6');
  const [newAccountBank, setNewAccountBank] = useState<Bank>('OTHER');
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedImportFile, setSelectedImportFile] = useState<File | null>(null);

  const handleCreateAccount = () => {
    if (!newAccountName.trim()) return;

    const newAccount: Account = {
      id: `acc-${Date.now()}`,
      name: newAccountName.trim(),
      color: newAccountColor,
      bankId: newAccountBank,
    };

    dispatch({ type: 'ADD_ACCOUNT', account: newAccount });
    setNewAccountName('');
    setNewAccountColor('#3b82f6');
    setNewAccountBank('OTHER');
    setAccountDialogOpen(false);
  };

  const handleDeleteAccount = (accountId: string) => {
    if (confirm('Are you sure? This will not delete associated transactions.')) {
      dispatch({ type: 'DELETE_ACCOUNT', id: accountId });
    }
  };

  const handleCurrencyChange = (currency: string) => {
    dispatch({ type: 'UPDATE_CURRENCY', currency });
  };

  const handleExportJSON = () => {
    exportState();
  };

  const handleImportJSON = async (file: File) => {
    try {
      await importState(file);
      setImportDialogOpen(false);
      // Show success message
      alert('Data imported successfully! The page will reload.');
      window.location.reload();
    } catch (error) {
      console.error('Import error:', error);
      alert('Failed to import JSON file. Please check the file format and try again.');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        setSelectedImportFile(file);
        setImportDialogOpen(true);
      } else {
        alert('Please select a JSON file.');
      }
    }
    // Reset the input so the same file can be selected again
    e.target.value = '';
  };

  const handleConfirmImport = () => {
    if (selectedImportFile) {
      handleImportJSON(selectedImportFile);
    }
  };

  const handleClearLocalStorage = () => {
    if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      localStorage.removeItem('financeAppState');
      dispatch({ type: 'RESET_STATE' });
      window.location.reload();
    }
  };

  const getAccountBalance = (accountId: string) => {
    return state.transactions
      .filter(t => t.accountId === accountId)
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const getAccountTransactionCount = (accountId: string) => {
    return state.transactions.filter(t => t.accountId === accountId).length;
  };

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your application settings</p>
      </div>

      {/* Accounts Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Accounts</CardTitle>
              <CardDescription>Manage your bank accounts</CardDescription>
            </div>
            <Dialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Account
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Account</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Account Name</Label>
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
                      This determines the CSV format when importing transactions
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Color</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={newAccountColor}
                        onChange={(e) => setNewAccountColor(e.target.value)}
                        className="h-10 w-20 rounded border border-input cursor-pointer"
                      />
                      <Input
                        value={newAccountColor}
                        onChange={(e) => setNewAccountColor(e.target.value)}
                        placeholder="#3b82f6"
                        className="flex-1 font-mono"
                      />
                    </div>
                  </div>
                  <Button onClick={handleCreateAccount} className="w-full">
                    Create Account
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {state.accounts.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No accounts yet. Create one to get started.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {state.accounts.map(account => {
                const balance = getAccountBalance(account.id);
                const transactionCount = getAccountTransactionCount(account.id);

                return (
                  <Card key={account.id} className="relative group">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="h-4 w-4 rounded-full"
                            style={{ backgroundColor: account.color }}
                          />
                          <CardTitle className="text-lg">{account.name}</CardTitle>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeleteAccount(account.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Balance</p>
                        <p className={`text-2xl font-bold font-mono ${balance >= 0 ? 'text-success' : 'text-destructive'}`}>
                          ${balance.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{transactionCount} transactions</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Currency Section */}
      <Card>
        <CardHeader>
          <CardTitle>Currency</CardTitle>
          <CardDescription>Set your default currency</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Default Currency</Label>
            <Select value={state.currency || 'AUD'} onValueChange={handleCurrencyChange}>
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map(currency => (
                  <SelectItem key={currency.code} value={currency.code}>
                    {currency.code} - {currency.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              This will be used as the default currency for new transactions
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Import/Export Section */}
      <Card>
        <CardHeader>
          <CardTitle>Import / Export Data</CardTitle>
          <CardDescription>Import or export your data as a JSON file</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Export Data</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Download all your transactions, accounts, categories, and settings as a JSON file for backup or migration.
              </p>
              <Button onClick={handleExportJSON} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export to JSON
              </Button>
            </div>
            
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-2">Import Data</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Import data from a JSON file. This will <strong className="text-destructive">overwrite all existing data</strong> with the contents of the JSON file.
              </p>
              <div className="space-y-2">
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="json-import-input"
                />
                <Button 
                  variant="outline" 
                  onClick={() => document.getElementById('json-import-input')?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import from JSON
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Import Confirmation Dialog */}
      <AlertDialog open={importDialogOpen} onOpenChange={(open) => {
        setImportDialogOpen(open);
        if (!open) {
          setSelectedImportFile(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will <strong className="text-destructive">permanently overwrite all your current data</strong> with the contents of the JSON file. This includes:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>All transactions</li>
                <li>All accounts</li>
                <li>All categories</li>
                <li>All category rules</li>
                <li>All settings</li>
              </ul>
              <p className="mt-2 font-semibold">This action cannot be undone.</p>
              <p className="mt-2">Make sure you have exported your current data before proceeding.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmImport} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Yes, import and overwrite
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear LocalStorage Section */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>Irreversible and destructive actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-1">Clear All Data</h4>
              <p className="text-sm text-muted-foreground mb-4">
                This will permanently delete all your transactions, accounts, categories, and settings from local storage. This action cannot be undone.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash className="h-4 w-4 mr-2" />
                    Clear LocalStorage
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete all your data including:
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>All transactions</li>
                        <li>All accounts</li>
                        <li>All categories</li>
                        <li>All category rules</li>
                        <li>All settings</li>
                      </ul>
                      Make sure you have exported your data before proceeding.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearLocalStorage} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Yes, clear all data
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

