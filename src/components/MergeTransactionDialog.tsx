import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Transaction, ImportedTransaction } from '@/types/finance';
import { format } from 'date-fns';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

interface MergeTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingTransaction: Transaction;
  newTransaction: ImportedTransaction;
  onKeepExisting: () => void;
  onAddAsNew: () => void;
  onMerge: () => void;
}

export function MergeTransactionDialog({
  open,
  onOpenChange,
  existingTransaction,
  newTransaction,
  onKeepExisting,
  onAddAsNew,
  onMerge,
}: MergeTransactionDialogProps) {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'INCOME': return 'bg-success/10 text-success border-success/20';
      case 'EXPENSE': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'TRANSFER': return 'bg-accent/10 text-accent border-accent/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Potential Duplicate Transaction</DialogTitle>
          <DialogDescription>
            We found a transaction that might be a duplicate. Choose how to proceed.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          {/* Left: Existing Transaction */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Existing Transaction</h3>
            </div>
            
            <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Date</div>
                <div className="font-mono text-sm">
                  {format(new Date(existingTransaction.date), 'dd/MM/yyyy')}
                </div>
              </div>
              
              <div>
                <div className="text-xs text-muted-foreground mb-1">Description</div>
                <div className="text-sm">{existingTransaction.description}</div>
              </div>
              
              <div>
                <div className="text-xs text-muted-foreground mb-1">Amount</div>
                <div className={`font-mono font-semibold ${
                  existingTransaction.amount >= 0 ? 'text-success' : 'text-destructive'
                }`}>
                  {existingTransaction.amount >= 0 ? '+' : ''}${Math.abs(existingTransaction.amount).toFixed(2)}
                </div>
              </div>
              
              <Separator />
              
              <div>
                <div className="text-xs text-muted-foreground mb-1">Category</div>
                <Badge variant="outline" className="text-xs">
                  {existingTransaction.categoryId ? 'Categorized' : 'Uncategorized'}
                </Badge>
              </div>
              
              {existingTransaction.notes && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Notes</div>
                  <div className="text-sm text-muted-foreground">{existingTransaction.notes}</div>
                </div>
              )}
            </div>
          </div>

          {/* Right: New CSV Transaction */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-accent" />
              <h3 className="font-semibold">New from CSV</h3>
            </div>
            
            <div className="space-y-3 p-4 border rounded-lg border-accent/50">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Date</div>
                <div className="font-mono text-sm">
                  {format(new Date(newTransaction.date), 'dd/MM/yyyy')}
                </div>
              </div>
              
              <div>
                <div className="text-xs text-muted-foreground mb-1">Description</div>
                <div className="text-sm">{newTransaction.description}</div>
              </div>
              
              <div>
                <div className="text-xs text-muted-foreground mb-1">Amount</div>
                <div className={`font-mono font-semibold ${
                  newTransaction.amount >= 0 ? 'text-success' : 'text-destructive'
                }`}>
                  {newTransaction.amount >= 0 ? '+' : ''}${Math.abs(newTransaction.amount).toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-4">
          <Button onClick={onMerge} className="w-full">
            Merge & Update
            <span className="ml-2 text-xs opacity-70">
              (Update Date/Description from CSV, keep Category/Notes)
            </span>
          </Button>
          
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={onKeepExisting} className="w-full">
              Keep Existing
            </Button>
            <Button variant="outline" onClick={onAddAsNew} className="w-full">
              Add as New
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

