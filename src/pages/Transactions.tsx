import { useMemo, useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { Search } from 'lucide-react';

export default function Transactions() {
  const { state, dispatch } = useFinance();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterAccount, setFilterAccount] = useState<string>('all');

  const filteredTransactions = useMemo(() => {
    return state.transactions
      .filter(t => {
        if (search) {
          const searchLower = search.toLowerCase();
          if (!t.description.toLowerCase().includes(searchLower)) {
            return false;
          }
        }
        if (filterType !== 'all' && t.type !== filterType) return false;
        if (filterAccount !== 'all' && t.accountId !== filterAccount) return false;
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [state.transactions, search, filterType, filterAccount]);

  const handleCategoryChange = (transactionId: string, categoryId: string) => {
    dispatch({
      type: 'UPDATE_TRANSACTION',
      id: transactionId,
      updates: { categoryId },
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'INCOME': return 'bg-success/10 text-success border-success/20';
      case 'EXPENSE': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'TRANSFER': return 'bg-accent/10 text-accent border-accent/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Transactions</h1>
        <p className="text-muted-foreground mt-1">View and categorize your transactions</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search descriptions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="INCOME">Income</SelectItem>
              <SelectItem value="EXPENSE">Expense</SelectItem>
              <SelectItem value="TRANSFER">Transfer</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterAccount} onValueChange={setFilterAccount}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Account" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Accounts</SelectItem>
              {state.accounts.map(account => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      No transactions found. Import a CSV to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map(transaction => {
                    const account = state.accounts.find(a => a.id === transaction.accountId);
                    const category = state.categories.find(c => c.id === transaction.categoryId);

                    return (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-mono text-sm">
                          {format(new Date(transaction.date), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {transaction.description}
                        </TableCell>
                        <TableCell>
                          {account && (
                            <div className="flex items-center gap-2">
                              <div
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: account.color }}
                              />
                              <span className="text-sm">{account.name}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getTypeColor(transaction.type)}>
                            {transaction.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={transaction.categoryId || 'uncategorized'}
                            onValueChange={(value) => handleCategoryChange(transaction.id, value)}
                          >
                            <SelectTrigger className="w-[180px] h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="uncategorized">Uncategorized</SelectItem>
                              {state.categories
                                .filter(c => c.type === transaction.type)
                                .map(cat => (
                                  <SelectItem key={cat.id} value={cat.id}>
                                    {cat.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className={`text-right font-mono font-semibold ${
                          transaction.amount >= 0 ? 'text-success' : 'text-destructive'
                        }`}>
                          {transaction.amount >= 0 ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground">
        Showing {filteredTransactions.length} of {state.transactions.length} transactions
      </div>
    </div>
  );
}
