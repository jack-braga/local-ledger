import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Transaction, Category } from '@/types/finance';
import { getTransactionType } from '@/utils/categoryMatcher';

interface CategorySpendingChartProps {
  transactions: Transaction[];
  categories: Category[];
}

export function CategorySpendingChart({
  transactions,
  categories,
}: CategorySpendingChartProps) {
  const chartData = useMemo(() => {
    // Filter transactions: only EXPENSE type (negative amounts)
    let filtered = transactions.filter(t => {
      // Only include EXPENSE transactions (negative amounts)
      if (getTransactionType(t.amount) !== 'EXPENSE') return false;
      return true;
    });

    // Group by category and calculate net total
    const categoryTotals = new Map<string, { name: string; total: number; color: string }>();

    for (const transaction of filtered) {
      const categoryId = transaction.categoryId || 'uncategorized';
      const category = categories.find(c => c.id === categoryId);
      
      // Calculate net total: Sum(Expenses) + Sum(Refunds)
      // Refunds are positive amounts in EXPENSE category, so they reduce the total
      const currentTotal = categoryTotals.get(categoryId)?.total || 0;
      const newTotal = currentTotal + transaction.amount; // amount is negative for expenses, positive for refunds
      
      categoryTotals.set(categoryId, {
        name: category?.name || 'Uncategorized',
        total: newTotal,
        color: category?.color || '#64748b',
      });
    }

    // Convert to array, convert to positive absolute value for visualization, and sort
    const data = Array.from(categoryTotals.values())
      .map(item => ({
        name: item.name,
        value: Math.abs(item.total), // Convert to positive absolute value for bars pointing UP
        color: item.color,
        netTotal: item.total, // Keep original for tooltip
      }))
      .filter(item => item.value > 0) // Only show categories with spending
      .sort((a, b) => b.value - a.value) // Sort by highest spending
      .slice(0, 10); // Top 10 categories

    return data;
  }, [transactions, categories]);

  if (chartData.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        No expense data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="name"
          tick={{ fill: 'hsl(var(--foreground))' }}
          angle={-45}
          textAnchor="end"
          height={100}
        />
        <YAxis
          tick={{ fill: 'hsl(var(--foreground))' }}
          tickFormatter={(value) => `$${value.toLocaleString()}`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '0.5rem',
          }}
          formatter={(value: number, name: string, item: any) => {
            // Defensive check: Ensure the payload item exists
            if (!item || !item.payload) return [value, name];

            // Safely access the data
            const data = item.payload;
            const originalAmount = data.netTotal ?? value; // Fallback to value if netTotal is missing
            const isNegative = originalAmount < 0;
            return [
              `$${Math.abs(originalAmount).toFixed(2)} ${isNegative ? '(Net Expense)' : '(Net Refund)'}`,
              'Net Total',
            ];
          }}
        />
        <Bar
          dataKey="value"
          fill="hsl(var(--primary))"
          radius={[8, 8, 0, 0]}
        >
          {chartData.map((entry, index) => (
            <Cell key={index} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

