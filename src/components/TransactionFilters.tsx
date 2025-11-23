import { useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { startOfDay, endOfDay } from 'date-fns';
import { Transaction } from '@/types/finance';
import { getTransactionType } from '@/utils/categoryMatcher';
import { DateRangePicker } from '@/components/DateRangePicker';
import { Badge } from '@/components/ui/badge';

export interface TransactionFilters {
  dateRange: {
    startDate: Date | null;
    endDate: Date | null;
  };
  transactionTypes: string[]; // 'INCOME', 'EXPENSE', or 'all'
  accountIds: string[]; // empty array means all accounts
  categoryIds: string[]; // empty array means all categories
}

interface TransactionFiltersProps {
  filters: TransactionFilters;
  onFiltersChange: (filters: TransactionFilters) => void;
}

export function TransactionFiltersComponent({ filters, onFiltersChange }: TransactionFiltersProps) {
  const { state } = useFinance();
  const [isOpen, setIsOpen] = useState(false);

  const updateFilters = (updates: Partial<TransactionFilters>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  const handleDateRangeUpdate = (values: {
    dateFrom: Date | undefined;
    dateTo: Date | undefined;
    compareFrom?: Date | undefined;
    compareTo?: Date | undefined;
  }) => {
    updateFilters({
      dateRange: {
        startDate: values.dateFrom || null,
        endDate: values.dateTo || null,
      },
    });
  };

  const toggleTransactionType = (type: string) => {
    // If clicking a specific type, remove 'all' if present
    const typesWithoutAll = filters.transactionTypes.filter(t => t !== 'all');
    const newTypes = typesWithoutAll.includes(type)
      ? typesWithoutAll.filter(t => t !== type)
      : [...typesWithoutAll, type];
    updateFilters({ transactionTypes: newTypes.length === 0 ? ['all'] : newTypes });
  };

  const toggleAccount = (accountId: string) => {
    const newAccountIds = filters.accountIds.includes(accountId)
      ? filters.accountIds.filter(id => id !== accountId)
      : [...filters.accountIds, accountId];
    updateFilters({ accountIds: newAccountIds });
  };

  const toggleCategory = (categoryId: string) => {
    const newCategoryIds = filters.categoryIds.includes(categoryId)
      ? filters.categoryIds.filter(id => id !== categoryId)
      : [...filters.categoryIds, categoryId];
    updateFilters({ categoryIds: newCategoryIds });
  };

  const selectAllCategories = () => {
    const allCategoryIds = state.categories.map(category => category.id);
    updateFilters({ categoryIds: allCategoryIds });
  };

  const deselectAllCategories = () => {
    updateFilters({ categoryIds: [] });
  };

  const clearFilters = () => {
    onFiltersChange({
      dateRange: {
        startDate: null,
        endDate: null,
      },
      transactionTypes: ['all'],
      accountIds: [],
      categoryIds: [],
    });
  };

  const hasActiveFilters = 
    filters.dateRange.startDate !== null ||
    filters.dateRange.endDate !== null ||
    (filters.transactionTypes.length > 0 && !filters.transactionTypes.includes('all')) ||
    filters.accountIds.length > 0 ||
    filters.categoryIds.length > 0;

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.dateRange.startDate !== null || filters.dateRange.endDate !== null) count++;
    if (filters.transactionTypes.length > 0 && !filters.transactionTypes.includes('all')) count++;
    if (filters.accountIds.length > 0) count++;
    if (filters.categoryIds.length > 0) count++;
    return count;
  };

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer hover:bg-accent/50 -m-6 p-6 rounded-t-lg transition-colors">
              <div className="flex items-center gap-2">
                <CardTitle>Filters</CardTitle>
                {hasActiveFilters && !isOpen && (
                  <Badge variant="secondary" className="ml-2">
                    {getActiveFilterCount()}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-4">
        {/* Date Range Filter */}
        <div className="space-y-2">
          <Label>Date Range</Label>
          <div className="flex items-center justify-between">
            <DateRangePicker
              onUpdate={handleDateRangeUpdate}
              dateFrom={filters.dateRange.startDate || undefined}
              dateTo={filters.dateRange.endDate || undefined}
              align="start"
              locale="en-US"
              showCompare={false}
            />
            {hasActiveFilters && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearFilters}
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Transaction Types Filter */}
        <div className="space-y-2">
          <Label>Transaction Types</Label>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filters.transactionTypes.includes('all') ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateFilters({ transactionTypes: ['all'] })}
            >
              All
            </Button>
            <Button
              variant={filters.transactionTypes.includes('INCOME') ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleTransactionType('INCOME')}
            >
              Income
            </Button>
            <Button
              variant={filters.transactionTypes.includes('EXPENSE') ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleTransactionType('EXPENSE')}
            >
              Expense
            </Button>
          </div>
        </div>

        {/* Accounts Filter */}
        <div className="space-y-2">
          <Label>Accounts</Label>
          {state.accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No accounts available</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {state.accounts.map((account) => (
                <Button
                  key={account.id}
                  variant={filters.accountIds.includes(account.id) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleAccount(account.id)}
                  className="flex items-center gap-2"
                >
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: account.color }}
                  />
                  {account.name}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Categories Filter */}
        <div className="space-y-2">
          <Label>Categories</Label>
          {state.categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">No categories available</p>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllCategories}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={deselectAllCategories}
                >
                  Deselect All
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {state.categories.map((category) => (
                  <Button
                    key={category.id}
                    variant={filters.categoryIds.includes(category.id) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleCategory(category.id)}
                    className="flex items-center gap-2"
                  >
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: category.color || '#64748b' }}
                    />
                    {category.name}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

/**
 * Utility function to apply filters to transactions
 * Optimized with Set-based lookups for O(1) performance instead of O(n) array.includes()
 */
export function applyTransactionFilters(
  transactions: Transaction[],
  filters: TransactionFilters
): Transaction[] {
  let filtered = [...transactions];

  // Apply date range filter
  const startDate = filters.dateRange.startDate ? startOfDay(filters.dateRange.startDate).getTime() : null;
  const endDate = filters.dateRange.endDate ? endOfDay(filters.dateRange.endDate).getTime() : null;

  if (startDate || endDate) {
    filtered = filtered.filter((t) => {
      const transactionTime = new Date(t.date).getTime();
      if (startDate && transactionTime < startDate) return false;
      if (endDate && transactionTime > endDate) return false;
      return true;
    });
  }

  // Apply transaction types filter - optimized with Set
  if (filters.transactionTypes.length > 0 && !filters.transactionTypes.includes('all')) {
    const transactionTypesSet = new Set(filters.transactionTypes);
    filtered = filtered.filter((t) => {
      const transactionType = getTransactionType(t.amount);
      return transactionTypesSet.has(transactionType);
    });
  }

  // Apply accounts filter - optimized with Set for O(1) lookup
  if (filters.accountIds.length > 0) {
    const accountIdsSet = new Set(filters.accountIds);
    filtered = filtered.filter((t) => accountIdsSet.has(t.accountId));
  }

  // Apply categories filter - optimized with Set for O(1) lookup
  if (filters.categoryIds.length > 0) {
    const categoryIdsSet = new Set(filters.categoryIds);
    filtered = filtered.filter((t) => {
      if (!t.categoryId) return false;
      return categoryIdsSet.has(t.categoryId);
    });
  }

  return filtered;
}

