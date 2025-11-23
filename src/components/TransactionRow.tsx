import { memo, useMemo } from 'react';
import { format } from 'date-fns';
import { CSSProperties } from 'react';
import { Transaction, Account, Category } from '@/types/finance';
import { getTransactionType } from '@/utils/categoryMatcher';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Edit, Trash2, MoreVertical } from 'lucide-react';

interface TransactionRowProps {
  transaction: Transaction;
  account: Account | undefined;
  category: Category | undefined;
  isSelected: boolean;
  isCompressed: boolean;
  style: CSSProperties;
  gridTemplateColumns: string;
  onSelect: (id: string) => void;
  onCategoryChange: (transactionId: string, categoryId: string) => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  categories: Category[];
  getTypeColor: (type: string) => string;
}

export const TransactionRow = memo(({
  transaction,
  account,
  category,
  isSelected,
  isCompressed,
  style,
  gridTemplateColumns,
  onSelect,
  onCategoryChange,
  onEdit,
  onDelete,
  categories,
  getTypeColor,
}: TransactionRowProps) => {
  // Pre-compute formatted values for performance
  const formattedDate = useMemo(
    () => format(new Date(transaction.date), 'dd/MM/yyyy'),
    [transaction.date]
  );

  const transactionType = useMemo(
    () => getTransactionType(transaction.amount),
    [transaction.amount]
  );

  const formattedAmount = useMemo(
    () => `${transaction.amount >= 0 ? '+' : ''}$${Math.abs(transaction.amount).toFixed(2)}`,
    [transaction.amount]
  );

  const cellPadding = isCompressed ? 'p-2' : 'p-5';
  const rowHeight = isCompressed ? 'h-[40px]' : '';

  return (
    <div
      className={`grid border-b transition-colors hover:bg-muted/50 text-sm ${rowHeight}`}
      style={{
        ...style,
        gridTemplateColumns,
      }}
    >
      {/* Checkbox Column */}
      <div className={`${cellPadding} px-4 flex items-center [&:has([role=checkbox])]:pr-0`}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onSelect(transaction.id)}
        />
      </div>

      {/* Date Column */}
      <div className={`${cellPadding} px-4 font-mono text-sm align-middle`}>
        {formattedDate}
      </div>

      {/* Description Column */}
      <div className={`${cellPadding} px-4 align-middle truncate`}>
        {transaction.description}
      </div>

      {/* Account Column */}
      <div className={`${cellPadding} px-4 align-middle`}>
        {account && (
          <div className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: account.color }}
            />
            <span className="text-sm">{account.name}</span>
          </div>
        )}
      </div>

      {/* Type Column */}
      <div className={`${cellPadding} px-4 align-middle`}>
        <Badge variant="outline" className={getTypeColor(transactionType)}>
          {transactionType}
        </Badge>
      </div>

      {/* Category Column */}
      <div className={`${isCompressed ? 'p-1' : 'p-4'} px-4 align-middle`}>
        <Select
          value={transaction.categoryId || 'uncategorized'}
          onValueChange={(value) => onCategoryChange(transaction.id, value)}
        >
          <SelectTrigger className="min-w-[150px] w-full h-8">
            <SelectValue>
              {category ? (
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: category.color || '#64748b' }}
                  />
                  <span>{category.name}</span>
                </div>
              ) : '-'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="uncategorized">-</SelectItem>
            {categories.map(cat => (
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

      {/* Amount Column */}
      <div className={`${cellPadding} px-4 text-right font-mono font-semibold align-middle ${
        transaction.amount >= 0 ? 'text-success' : 'text-destructive'
      }`}>
        {formattedAmount}
      </div>

      {/* Actions Column */}
      <div className={`${isCompressed ? 'p-1' : 'p-4'} px-4 align-middle [&:has([role=checkbox])]:pr-0`}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(transaction)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onDelete(transaction)}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for memoization
  return (
    prevProps.transaction.id === nextProps.transaction.id &&
    prevProps.transaction.categoryId === nextProps.transaction.categoryId &&
    prevProps.transaction.description === nextProps.transaction.description &&
    prevProps.transaction.amount === nextProps.transaction.amount &&
    prevProps.transaction.date === nextProps.transaction.date &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isCompressed === nextProps.isCompressed &&
    prevProps.account?.id === nextProps.account?.id &&
    prevProps.category?.id === nextProps.category?.id &&
    prevProps.style.top === nextProps.style.top &&
    prevProps.style.height === nextProps.style.height
  );
});

TransactionRow.displayName = 'TransactionRow';

