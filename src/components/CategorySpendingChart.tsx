import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Transaction, Category } from '@/types/finance';

interface CategorySpendingChartProps {
  transactions: Transaction[];
  categories: Category[];
  excludeTransfers: boolean;
}

export function CategorySpendingChart({
  transactions,
  categories,
  excludeTransfers,
}: CategorySpendingChartProps) {
  const chartData = useMemo(() => {
    // Filter transactions: only EXPENSE type, exclude TRANSFER if toggle is on
    let filtered = transactions.filter(t => {
      // Only include EXPENSE transactions
      if (t.type !== 'EXPENSE') return false;
      // If excludeTransfers is enabled, also exclude TRANSFER type (though EXPENSE and TRANSFER are mutually exclusive)
      if (excludeTransfers && t.type === 'TRANSFER') return false;
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
  }, [transactions, categories, excludeTransfers]);

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
          formatter={(value: number, payload: any) => {
            if (!payload || !payload[0]) return [`$${value.toFixed(2)}`, 'Spending'];
            const data = payload[0].payload;
            const netTotal = data.netTotal;
            const isNegative = netTotal < 0;
            return [
              `$${Math.abs(netTotal).toFixed(2)} ${isNegative ? '(Net Expense)' : '(Net Refund)'}`,
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

