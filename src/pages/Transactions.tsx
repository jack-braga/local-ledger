import { useMemo, useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { Search, MoreVertical, Plus, Edit, Trash2, Upload, X } from 'lucide-react';
import { Transaction } from '@/types/finance';
import { getTransactionType } from '@/utils/categoryMatcher';
import { ImportWizard } from '@/components/ImportWizard';
import { TransactionFiltersComponent, TransactionFilters, applyTransactionFilters } from '@/components/TransactionFilters';

export default function Transactions() {
  const { state, dispatch } = useFinance();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<TransactionFilters>({
    dateRange: {
      startDate: null,
      endDate: null,
    },
    transactionTypes: ['all'],
    accountIds: [],
    categoryIds: [],
  });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBulkCategorizeDialogOpen, setIsBulkCategorizeDialogOpen] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkCategoryId, setBulkCategoryId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Transaction>>({});
  const [newTransaction, setNewTransaction] = useState<Partial<Transaction>>({
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    currency: 'USD',
    accountId: state.accounts[0]?.id || '',
    categoryId: null,
    isManualEntry: true,
  });

  const filteredTransactions = useMemo(() => {
    let filtered = applyTransactionFilters(state.transactions, filters);
    
    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(searchLower)
      );
    }
    
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [state.transactions, filters, search]);

  // Lookup maps for O(1) access instead of O(n) .find() calls
  const accountsMap = useMemo(() => {
    return new Map(state.accounts.map(a => [a.id, a]));
  }, [state.accounts]);

  const categoriesMap = useMemo(() => {
    return new Map(state.categories.map(c => [c.id, c]));
  }, [state.categories]);

  // Selection helper functions
  const isAllSelected = useMemo(() => {
    return filteredTransactions.length > 0 && filteredTransactions.every(t => selectedIds.has(t.id));
  }, [filteredTransactions, selectedIds]);

  const isIndeterminate = useMemo(() => {
    const selectedCount = filteredTransactions.filter(t => selectedIds.has(t.id)).length;
    return selectedCount > 0 && selectedCount < filteredTransactions.length;
  }, [filteredTransactions, selectedIds]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const newSelectedIds = new Set(selectedIds);
      filteredTransactions.forEach(t => newSelectedIds.add(t.id));
      setSelectedIds(newSelectedIds);
    } else {
      const newSelectedIds = new Set(selectedIds);
      filteredTransactions.forEach(t => newSelectedIds.delete(t.id));
      setSelectedIds(newSelectedIds);
    }
  };

  const handleSelectTransaction = (transactionId: string) => {
    const newSelectedIds = new Set(selectedIds);
    if (newSelectedIds.has(transactionId)) {
      newSelectedIds.delete(transactionId);
    } else {
      newSelectedIds.add(transactionId);
    }
    setSelectedIds(newSelectedIds);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleCategoryChange = (transactionId: string, categoryId: string) => {
    dispatch({
      type: 'UPDATE_TRANSACTION',
      id: transactionId,
      updates: { categoryId },
    });
  };

  const handleEdit = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    const dateStr = transaction.date.includes('T') 
      ? transaction.date.split('T')[0] 
      : new Date(transaction.date).toISOString().split('T')[0];
    setEditFormData({
      date: dateStr,
      description: transaction.description,
      amount: transaction.amount,
      accountId: transaction.accountId,
      categoryId: transaction.categoryId,
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedTransaction) {
      dispatch({ type: 'DELETE_TRANSACTION', id: selectedTransaction.id });
      setIsDeleteDialogOpen(false);
      setSelectedTransaction(null);
    }
  };

  const saveEdit = () => {
    if (selectedTransaction && editFormData) {
      const dateValue = editFormData.date as string;
      const updates: Partial<Transaction> = {
        ...editFormData,
        date: dateValue ? new Date(dateValue + 'T00:00:00').toISOString() : selectedTransaction.date,
      };
      dispatch({
        type: 'UPDATE_TRANSACTION',
        id: selectedTransaction.id,
        updates,
      });
      setIsEditDialogOpen(false);
      setSelectedTransaction(null);
      setEditFormData({});
    }
  };

  const saveNewTransaction = () => {
    if (newTransaction.date && newTransaction.description && newTransaction.accountId) {
      const dateStr = newTransaction.date as string;
      const transaction: Transaction = {
        id: crypto.randomUUID(),
        date: new Date(dateStr + 'T00:00:00').toISOString(),
        description: newTransaction.description || '',
        amount: newTransaction.amount || 0,
        currency: newTransaction.currency || 'USD',
        accountId: newTransaction.accountId,
        categoryId: newTransaction.categoryId || null,
        isManualEntry: true,
      };
      dispatch({ type: 'ADD_TRANSACTIONS', transactions: [transaction] });
      setIsAddDialogOpen(false);
      setNewTransaction({
        date: new Date().toISOString().split('T')[0],
        amount: 0,
        currency: 'USD',
        accountId: state.accounts[0]?.id || '',
        categoryId: null,
        isManualEntry: true,
      });
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'INCOME': return 'bg-success/10 text-success border-success/20';
      case 'EXPENSE': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleBulkCategorize = () => {
    selectedIds.forEach(id => {
      dispatch({
        type: 'UPDATE_TRANSACTION',
        id,
        updates: { categoryId: bulkCategoryId === 'uncategorized' || bulkCategoryId === null ? null : bulkCategoryId },
      });
    });
    clearSelection();
    setIsBulkCategorizeDialogOpen(false);
    setBulkCategoryId(null);
  };

  const handleBulkDelete = () => {
    selectedIds.forEach(id => {
      dispatch({ type: 'DELETE_TRANSACTION', id });
    });
    clearSelection();
    setIsBulkDeleteDialogOpen(false);
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Transactions</h1>
          <p className="text-muted-foreground mt-1">View and categorize your transactions</p>
        </div>
        <Button onClick={() => setImportOpen(true)} className={state.transactions.length === 0 ? "animate-wiggle" : ""}>
          <Upload className="h-4 w-4 mr-2" />
          Import CSV
        </Button>
      </div>

      {/* Filters */}
      <TransactionFiltersComponent filters={filters} onFiltersChange={setFilters} />

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search descriptions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="px-3 py-1">
                {selectedIds.size} selected
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={clearSelection}
              >
                <X className="h-4 w-4 mr-2" />
                Clear Selection
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsBulkCategorizeDialogOpen(true)}
              >
                Bulk Categorize
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsBulkDeleteDialogOpen(true)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Transactions</CardTitle>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Transaction
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={isIndeterminate ? 'indeterminate' : isAllSelected}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      No transactions found. Import a CSV or add a transaction to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map(transaction => {
                    const account = accountsMap.get(transaction.accountId);
                    const category = transaction.categoryId ? categoriesMap.get(transaction.categoryId) : undefined;

                    return (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(transaction.id)}
                            onCheckedChange={() => handleSelectTransaction(transaction.id)}
                          />
                        </TableCell>
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
                          <Badge variant="outline" className={getTypeColor(getTransactionType(transaction.amount))}>
                            {getTransactionType(transaction.amount)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={transaction.categoryId || 'uncategorized'}
                            onValueChange={(value) => handleCategoryChange(transaction.id, value)}
                          >
                            <SelectTrigger className="w-[180px] h-8">
                              <SelectValue>
                                {transaction.categoryId ? (() => {
                                  const cat = categoriesMap.get(transaction.categoryId);
                                  return cat ? (
                                    <div className="flex items-center gap-2">
                                      <div
                                        className="h-3 w-3 rounded-full"
                                        style={{ backgroundColor: cat.color || '#64748b' }}
                                      />
                                      <span>{cat.name}</span>
                                    </div>
                                  ) : '-';
                                })() : '-'}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="uncategorized">-</SelectItem>
                              {state.categories.map(cat => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="h-3 w-3 rounded-full"
                                      style={{ backgroundColor: cat.color || '#64748b' }}
                                    />
                                    <span>{cat.name}</span>
                                  </div>
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
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(transaction)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDelete(transaction)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      {/* Add Transaction Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
            <DialogDescription>
              Add a new transaction manually
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-date">Date</Label>
              <Input
                id="new-date"
                type="date"
                value={newTransaction.date || ''}
                onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-description">Description</Label>
              <Input
                id="new-description"
                value={newTransaction.description || ''}
                onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                placeholder="Transaction description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-amount">Amount</Label>
              <Input
                id="new-amount"
                type="number"
                step="0.01"
                value={newTransaction.amount || 0}
                onChange={(e) => setNewTransaction({ ...newTransaction, amount: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-account">Account</Label>
              <Select
                value={newTransaction.accountId || ''}
                onValueChange={(value) => setNewTransaction({ ...newTransaction, accountId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {state.accounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-category">Category (Optional)</Label>
              <Select
                value={newTransaction.categoryId || 'none'}
                onValueChange={(value) => setNewTransaction({ ...newTransaction, categoryId: value === 'none' ? null : value })}
              >
                <SelectTrigger>
                  <SelectValue>
                    {newTransaction.categoryId ? (() => {
                      const cat = categoriesMap.get(newTransaction.categoryId);
                      return cat ? (
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: cat.color || '#64748b' }}
                          />
                          <span>{cat.name}</span>
                        </div>
                      ) : 'None';
                    })() : 'None'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {state.categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: cat.color || '#64748b' }}
                        />
                        <span>{cat.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveNewTransaction}>
              Add Transaction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Transaction Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
            <DialogDescription>
              Update transaction details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-date">Date</Label>
              <Input
                id="edit-date"
                type="date"
                value={editFormData.date || ''}
                onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={editFormData.description || ''}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                placeholder="Transaction description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-amount">Amount</Label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                value={editFormData.amount || 0}
                onChange={(e) => setEditFormData({ ...editFormData, amount: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-account">Account</Label>
              <Select
                value={editFormData.accountId || ''}
                onValueChange={(value) => setEditFormData({ ...editFormData, accountId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {state.accounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category">Category (Optional)</Label>
              <Select
                value={editFormData.categoryId || 'none'}
                onValueChange={(value) => setEditFormData({ ...editFormData, categoryId: value === 'none' ? null : value })}
              >
                <SelectTrigger>
                  <SelectValue>
                    {editFormData.categoryId ? (() => {
                      const cat = categoriesMap.get(editFormData.categoryId);
                      return cat ? (
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: cat.color || '#64748b' }}
                          />
                          <span>{cat.name}</span>
                        </div>
                      ) : 'None';
                    })() : 'None'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {state.categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: cat.color || '#64748b' }}
                        />
                        <span>{cat.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the transaction
              {selectedTransaction && ` "${selectedTransaction.description}"`}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Categorize Dialog */}
      <Dialog open={isBulkCategorizeDialogOpen} onOpenChange={setIsBulkCategorizeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Categorize Transactions</DialogTitle>
            <DialogDescription>
              Select a category to apply to {selectedIds.size} selected transactions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bulk-category">Category</Label>
              <Select
                value={bulkCategoryId || 'uncategorized'}
                onValueChange={(value) => setBulkCategoryId(value === 'uncategorized' ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue>
                    {bulkCategoryId ? (() => {
                      const cat = categoriesMap.get(bulkCategoryId);
                      return cat ? (
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: cat.color || '#64748b' }}
                          />
                          <span>{cat.name}</span>
                        </div>
                      ) : '-';
                    })() : '-'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="uncategorized">-</SelectItem>
                  {state.categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: cat.color || '#64748b' }}
                        />
                        <span>{cat.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkCategorizeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkCategorize}>
              Apply Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Transactions?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedIds.size} transactions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ImportWizard open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
