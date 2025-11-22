import { useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2 } from 'lucide-react';

export default function Categories() {
  const { state } = useFinance();

  const incomeCategories = state.categories.filter(c => c.type === 'INCOME');
  const expenseCategories = state.categories.filter(c => c.type === 'EXPENSE');
  const transferCategories = state.categories.filter(c => c.type === 'TRANSFER');

  const getCategoryTransactionCount = (categoryId: string) => {
    return state.transactions.filter(t => t.categoryId === categoryId).length;
  };

  const getCategoryTotal = (categoryId: string) => {
    return state.transactions
      .filter(t => t.categoryId === categoryId)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  };

  const CategoryList = ({ categories, type }: { categories: any[], type: string }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {categories.map(category => {
        const count = getCategoryTransactionCount(category.id);
        const total = getCategoryTotal(category.id);

        return (
          <Card key={category.id} className="group">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: category.color || '#64748b' }}
                  />
                  <CardTitle className="text-base">{category.name}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-xs text-muted-foreground">Total Amount</p>
                <p className="text-xl font-bold font-mono">
                  ${total.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{count} transactions</p>
                <p className="text-xs text-muted-foreground mt-1">{category.rules.length} rules</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Categories</h1>
          <p className="text-muted-foreground mt-1">Manage transaction categories and rules</p>
        </div>
      </div>

      <Tabs defaultValue="expense" className="space-y-6">
        <TabsList>
          <TabsTrigger value="expense">Expenses</TabsTrigger>
          <TabsTrigger value="income">Income</TabsTrigger>
          <TabsTrigger value="transfer">Transfers</TabsTrigger>
        </TabsList>

        <TabsContent value="expense" className="space-y-4">
          <CategoryList categories={expenseCategories} type="EXPENSE" />
        </TabsContent>

        <TabsContent value="income" className="space-y-4">
          <CategoryList categories={incomeCategories} type="INCOME" />
        </TabsContent>

        <TabsContent value="transfer" className="space-y-4">
          <CategoryList categories={transferCategories} type="TRANSFER" />
        </TabsContent>
      </Tabs>

      <Card className="border-accent/50 bg-accent/5">
        <CardHeader>
          <CardTitle>About Categories</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>Categories help organize your transactions into meaningful groups.</p>
          <p>Each category can have multiple rules that automatically categorize transactions based on description patterns.</p>
          <p className="text-muted-foreground text-xs mt-4">
            Custom category creation coming in a future update!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
