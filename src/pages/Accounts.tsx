import { useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { Account, Bank } from '@/types/finance';

export default function Accounts() {
  const { state, dispatch } = useFinance();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountColor, setNewAccountColor] = useState('#3b82f6');
  const [newAccountBank, setNewAccountBank] = useState<Bank>('OTHER');

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
    setDialogOpen(false);
  };

  const handleDeleteAccount = (accountId: string) => {
    if (confirm('Are you sure? This will not delete associated transactions.')) {
      dispatch({ type: 'DELETE_ACCOUNT', id: accountId });
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
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Accounts</h1>
          <p className="text-muted-foreground mt-1">Manage your bank accounts</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {state.accounts.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center text-muted-foreground">
              No accounts yet. Create one to get started.
            </CardContent>
          </Card>
        ) : (
          state.accounts.map(account => {
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
          })
        )}
      </div>
    </div>
  );
}
