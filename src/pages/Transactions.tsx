import { useMemo, useState, useDeferredValue } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { useFinance } from '@/contexts/FinanceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { format } from 'date-fns';
import { Search, MoreVertical, Plus, Edit, Trash2, Upload, X } from 'lucide-react';
import { Transaction } from '@/types/finance';
import { getTransactionType } from '@/utils/categoryMatcher';
import { ImportWizard } from '@/components/ImportWizard';
import { TransactionFiltersComponent, TransactionFilters, applyTransactionFilters } from '@/components/TransactionFilters';
import { TransactionRow } from '@/components/TransactionRow';

// Column width constants - using minmax for relative sizing with minimums
// Format: minmax(minimum-pixels, relative-size)
const GRID_TEMPLATE_COLUMNS = `
  minmax(50px, 0.25fr)
  minmax(100px, 0.5fr)
  minmax(150px, 3fr)
  minmax(120px, 1fr)
  minmax(80px, 0.5fr)
  minmax(150px, 1fr)
  minmax(100px, 0.75fr)
  minmax(50px, 0.5fr)
`.trim().replace(/\s+/g, ' ');

const SCROLLBAR_WIDTH = 17;

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
  const [isCompressed, setIsCompressed] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Transaction>>({});
  const [newTransaction, setNewTransaction] = useState<Partial<Transaction>>({
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    currency: 'USD',
    accountId: state.accounts[0]?.id || '',
    categoryId: null,
    isManualEntry: true,
  });

  // Defer search value for performance - UI updates immediately, filtering happens after urgent updates
  const deferredSearch = useDeferredValue(search);

  const filteredTransactions = useMemo(() => {
    let filtered = applyTransactionFilters(state.transactions, filters);
    
    // Apply search filter using deferred value
    if (deferredSearch) {
      const searchLower = deferredSearch.toLowerCase();
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(searchLower)
      );
    }
    
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [state.transactions, filters, deferredSearch]);

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
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="compress-toggle" className="text-sm text-muted-foreground">
                Compressed
              </Label>
              <Switch
                id="compress-toggle"
                checked={isCompressed}
                onCheckedChange={setIsCompressed}
              />
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Transaction
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative w-full flex flex-col" style={{ height: 'calc(100vh - 200px)' }}>
            {/* Header - Div-based with same grid template as rows */}
            <div
              className="grid border-b text-sm h-12 bg-muted/50 flex-shrink-0"
              style={{
                gridTemplateColumns: GRID_TEMPLATE_COLUMNS,
                paddingRight: SCROLLBAR_WIDTH,
              }}
            >
              <div className="px-4 flex items-center align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">
                <Checkbox
                  checked={isIndeterminate ? 'indeterminate' : isAllSelected}
                  onCheckedChange={handleSelectAll}
                />
              </div>
              <div className="px-4 flex items-center align-middle font-medium text-muted-foreground">
                Date
              </div>
              <div className="px-4 flex items-center align-middle font-medium text-muted-foreground">
                Description
              </div>
              <div className="px-4 flex items-center align-middle font-medium text-muted-foreground">
                Account
              </div>
              <div className="px-4 flex items-center align-middle font-medium text-muted-foreground">
                Type
              </div>
              <div className="px-4 flex items-center align-middle font-medium text-muted-foreground">
                Category
              </div>
              <div className="px-4 flex items-center align-middle font-medium text-muted-foreground justify-end">
                Amount
              </div>
              <div className="px-4 flex items-center align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">
              </div>
            </div>

            {/* Virtualized Body */}
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm flex-1">
                No transactions found. Import a CSV or add a transaction to get started.
              </div>
            ) : (
              <div className="flex-1">
                <Virtuoso
                  data={filteredTransactions}
                  style={{ height: '100%' }}
                  itemContent={(index, transaction) => {
                    const account = accountsMap.get(transaction.accountId);
                    const category = transaction.categoryId ? categoriesMap.get(transaction.categoryId) : undefined;

                    return (
                      <TransactionRow
                        transaction={transaction}
                        account={account}
                        category={category}
                        isSelected={selectedIds.has(transaction.id)}
                        isCompressed={isCompressed}
                        style={{ paddingRight: SCROLLBAR_WIDTH }} // react-virtuoso handles positioning internally
                        gridTemplateColumns={GRID_TEMPLATE_COLUMNS}
                        onSelect={handleSelectTransaction}
                        onCategoryChange={handleCategoryChange}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        categories={state.categories}
                        getTypeColor={getTypeColor}
                      />
                    );
                  }}
                />
              </div>
            )}
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
