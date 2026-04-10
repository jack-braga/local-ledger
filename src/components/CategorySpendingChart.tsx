import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Transaction, Category } from '@/types/finance';

interface CategorySpendingChartProps {
  transactions: Transaction[];
  categories: Category[];
}

export function CategorySpendingChart({
  transactions,
  categories,
}: CategorySpendingChartProps) {
  const chartData = useMemo(() => {
    // Group by category and calculate net total
    const categoryTotals = new Map<string, { name: string; total: number; color: string }>();

    for (const transaction of transactions) {
      const categoryId = transaction.categoryId || 'uncategorized';
      const category = categories.find(c => c.id === categoryId);

      const currentTotal = categoryTotals.get(categoryId)?.total || 0;
      const newTotal = currentTotal + transaction.amount;

      categoryTotals.set(categoryId, {
        name: category?.name || 'Uncategorized',
        total: newTotal,
        color: category?.color || '#64748b',
      });
    }

    // Convert to array and sort by absolute value
    const data = Array.from(categoryTotals.values())
      .map(item => ({
        name: item.name,
        value: item.total,
        color: item.color,
      }))
      .filter(item => item.value !== 0)
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
      .slice(0, 10);

    return data;
  }, [transactions, categories]);

  if (chartData.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        No transaction data available
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
          tickFormatter={(value) => `${value < 0 ? '-' : ''}$${Math.abs(value).toLocaleString()}`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '0.5rem',
          }}
          formatter={(value: number) => [
            `${value < 0 ? '-' : ''}$${Math.abs(value).toFixed(2)}`,
            'Net Total',
          ]}
        />
        <ReferenceLine y={0} stroke="hsl(var(--border))" />
        <Bar
          dataKey="value"
          fill="hsl(var(--primary))"
        >
          {chartData.map((entry, index) => (
            <Cell
              key={index}
              fill={entry.color}
              radius={entry.value >= 0 ? [8, 8, 0, 0] : [0, 0, 8, 8] as any}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

