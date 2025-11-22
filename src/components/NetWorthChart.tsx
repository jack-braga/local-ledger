import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Transaction } from '@/types/finance';
import { format, startOfDay, differenceInDays, addDays } from 'date-fns';

interface NetWorthChartProps {
  transactions: Transaction[];
}

export function NetWorthChart({ transactions }: NetWorthChartProps) {
  const chartData = useMemo(() => {
    if (transactions.length === 0) return [];

    // Sort transactions by date
    const sorted = [...transactions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Get date range
    const firstDate = new Date(sorted[0].date);
    const lastDate = new Date(sorted[sorted.length - 1].date);
    const daysDiff = differenceInDays(lastDate, firstDate);

    // Use daily snapshots if < 90 days, otherwise weekly
    const snapshotInterval = daysDiff < 90 ? 1 : 7;
    const dataPoints: Array<{ date: string; netWorth: number; dateLabel: string }> = [];

    let runningTotal = 0;
    let transactionIndex = 0;
    const startDate = startOfDay(firstDate);

    // Generate snapshots
    for (let dayOffset = 0; dayOffset <= daysDiff; dayOffset += snapshotInterval) {
      const snapshotDate = addDays(startDate, dayOffset);
      const snapshotDateStr = snapshotDate.toISOString();

      // Add all transactions up to this snapshot date
      while (
        transactionIndex < sorted.length &&
        new Date(sorted[transactionIndex].date) <= snapshotDate
      ) {
        runningTotal += sorted[transactionIndex].amount;
        transactionIndex++;
      }

      dataPoints.push({
        date: snapshotDateStr,
        netWorth: runningTotal,
        dateLabel: format(snapshotDate, daysDiff < 90 ? 'dd/MM' : 'dd/MM/yy'),
      });
    }

    // Ensure we include the last transaction
    while (transactionIndex < sorted.length) {
      runningTotal += sorted[transactionIndex].amount;
      transactionIndex++;
    }

    // Add final point if not already included
    if (dataPoints.length === 0 || dataPoints[dataPoints.length - 1].date !== lastDate.toISOString()) {
      dataPoints.push({
        date: lastDate.toISOString(),
        netWorth: runningTotal,
        dateLabel: format(lastDate, daysDiff < 90 ? 'dd/MM' : 'dd/MM/yy'),
      });
    }

    return dataPoints;
  }, [transactions]);

  if (chartData.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center text-muted-foreground">
        No transaction data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="dateLabel"
          tick={{ fill: 'hsl(var(--foreground))' }}
          angle={-45}
          textAnchor="end"
          height={80}
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
          formatter={(value: number) => [`$${value.toLocaleString('en-AU', { minimumFractionDigits: 2 })}`, 'Net Worth']}
          labelFormatter={(label) => format(new Date(label), 'dd/MM/yyyy')}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="netWorth"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={{ r: 3 }}
          name="Net Worth"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

