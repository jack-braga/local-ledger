import { useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { useUIPreferences } from '@/contexts/UIPreferencesContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, CreditCard } from 'lucide-react';
import { NetWorthChart } from '@/components/NetWorthChart';
import { CategorySpendingChart } from '@/components/CategorySpendingChart';
import { getTransactionType } from '@/utils/categoryMatcher';
import { TransactionFiltersComponent, applyTransactionFilters } from '@/components/TransactionFilters';

export default function Dashboard() {
  const { state } = useFinance();
  const { filters, setFilters } = useUIPreferences();

  // Apply filters to transactions
  const filteredTransactions = useMemo(() => {
    return applyTransactionFilters(state.transactions, filters);
  }, [state.transactions, filters]);

  // Calculate stats with proper refund handling
  const stats = useMemo(() => {
    let incomeTransactions = filteredTransactions.filter(t => getTransactionType(t.amount) === 'INCOME');
    let expenseTransactions = filteredTransactions.filter(t => getTransactionType(t.amount) === 'EXPENSE');

    // Income: sum all positive amounts
    const income = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);

    // Expenses: sum all amounts (negative expenses + positive refunds)
    // Refunds are positive amounts in EXPENSE category, so they reduce the total
    const expenses = expenseTransactions.reduce((sum, t) => {
      // For expenses: amount is negative, so we add it (which subtracts)
      // For refunds: amount is positive, so we add it (which reduces the expense total)
      return sum + t.amount;
    }, 0);

    // Net worth: sum of ALL transactions (all accounts)
    const netWorth = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);

    // Determine date range for projection
    // Priority: Use explicit filter dates if set, otherwise derive from transaction span
    const getDateRangeForProjection = (): { start: Date | null; end: Date | null } => {
      // Helper to get earliest/latest transaction dates
      const getTransactionDateBounds = () => {
        if (filteredTransactions.length === 0) return { earliest: null, latest: null };

        let earliest = new Date(filteredTransactions[0].date);
        let latest = new Date(filteredTransactions[0].date);
        for (const t of filteredTransactions) {
          const tDate = new Date(t.date);
          if (tDate < earliest) earliest = tDate;
          if (tDate > latest) latest = tDate;
        }
        return { earliest, latest };
      };

      // If BOTH dates are explicitly set, use them directly
      if (filters.dateRange.startDate && filters.dateRange.endDate) {
        return {
          start: filters.dateRange.startDate,
          end: filters.dateRange.endDate
        };
      }

      // If only START date is set, derive end from transactions
      if (filters.dateRange.startDate && !filters.dateRange.endDate) {
        const { latest } = getTransactionDateBounds();
        return {
          start: filters.dateRange.startDate,
          end: latest
        };
      }

      // If only END date is set, derive start from transactions
      if (!filters.dateRange.startDate && filters.dateRange.endDate) {
        const { earliest } = getTransactionDateBounds();
        return {
          start: earliest,
          end: filters.dateRange.endDate
        };
      }

      // No date filter set - derive full range from transaction dates
      const { earliest, latest } = getTransactionDateBounds();
      return { start: earliest, end: latest };
    };

    const dateRange = getDateRangeForProjection();

    // Calculate days in range (inclusive)
    const daysInRange = (() => {
      if (!dateRange.start || !dateRange.end) return 0;
      const diffTime = Math.abs(dateRange.end.getTime() - dateRange.start.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    })();

    // Net value and 30-day projection
    const netValue = income + expenses; // expenses is already negative
    const thirtyDayProjection = daysInRange > 0 ? (netValue / daysInRange) * 30 : 0;

    // Savings rate: (Income - Expenses) / Income * 100
    const savingsRate = income > 0 ? ((income + expenses) / income) * 100 : 0; // expenses is negative, so income + expenses = income - |expenses|

    return {
      income,
      expenses: Math.abs(expenses), // For display, show absolute value
      expensesRaw: expenses, // Keep raw for calculations
      netWorth,
      thirtyDayProjection,
      daysInRange,
      savingsRate,
      totalTransactions: filteredTransactions.length,
      uncategorized: filteredTransactions.filter(t => !t.categoryId).length,
    };
  }, [filteredTransactions, filters.dateRange]);

  // Income vs Expense data for donut chart
  const incomeExpenseData = useMemo(() => {
    let incomeTransactions = filteredTransactions.filter(t => getTransactionType(t.amount) === 'INCOME');
    let expenseTransactions = filteredTransactions.filter(t => getTransactionType(t.amount) === 'EXPENSE');

    // Income: sum all positive amounts
    const income = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);

    // Expenses: sum all amounts (negative expenses + positive refunds)
    // Refunds are positive amounts in EXPENSE category, so they reduce the expense total
    const expenses = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);

    return [
      {
        name: 'Income',
        value: income,
        color: '#10b981', // success color
      },
      {
        name: 'Expenses',
        value: Math.abs(expenses), // Convert to positive for visualization
        color: '#ef4444', // destructive color
      },
    ].filter(item => item.value > 0);
  }, [filteredTransactions]);

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">Your financial overview</p>
      </div>

      {/* Getting Started */}
      {filteredTransactions.length === 0 && state.transactions.length > 0 && (
        <Card className="border-accent/50 bg-accent/5">
          <CardHeader>
            <CardTitle>No Transactions Match Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Try adjusting your filters to see transactions.</p>
          </CardContent>
        </Card>
      )}

      {state.transactions.length === 0 && (
        <Card className="border-accent/50 bg-accent/5">
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Welcome to your finance dashboard! Here's how to get started:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Click "Settings" in the sidebar to configure your accounts</li>
              <li>Click "Categories" in the sidebar to add your categories, and set rules for how new transactions should be categorised</li>
              <li>Click "Transactions" in the sidebar, and then click "Import CSV" to import your transactions from your bank</li>
              <li>Review and adjust categories in the Transactions page</li>
              <li>Click "Dashboard" in the sidebar to see your financial overview (which is where you are now!)</li>
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <TransactionFiltersComponent filters={filters} onFiltersChange={setFilters} />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Net Worth</CardTitle>
            <DollarSign className="h-4 w-4 text-primary hidden sm:block" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className={`text-lg md:text-2xl font-bold font-mono ${stats.netWorth >= 0 ? 'text-success' : 'text-destructive'}`}>
              ${stats.netWorth.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
              30-Day Projection
            </CardTitle>
            {stats.thirtyDayProjection >= 0 ? (
              <TrendingUp className="h-4 w-4 text-success hidden sm:block" />
            ) : (
              <TrendingDown className="h-4 w-4 text-destructive hidden sm:block" />
            )}
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className={`text-lg md:text-2xl font-bold font-mono ${
              stats.thirtyDayProjection >= 0 ? 'text-success' : 'text-destructive'
            }`}>
              {stats.thirtyDayProjection >= 0 ? '+' : ''}
              ${stats.thirtyDayProjection.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1 hidden md:block">
              {stats.daysInRange > 0
                ? `Based on ${stats.daysInRange} day${stats.daysInRange !== 1 ? 's' : ''}`
                : 'No data available'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Savings Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-success hidden sm:block" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className={`text-lg md:text-2xl font-bold font-mono ${stats.savingsRate >= 0 ? 'text-success' : 'text-destructive'}`}>
              {stats.savingsRate.toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Transactions</CardTitle>
            <CreditCard className="h-4 w-4 text-accent hidden sm:block" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-lg md:text-2xl font-bold font-mono">{stats.totalTransactions}</div>
            {stats.uncategorized > 0 && (
              <p className="text-xs text-warning mt-1">{stats.uncategorized} uncategorized</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Net Worth Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Net Worth Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <NetWorthChart transactions={filteredTransactions} />
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Totals by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <CategorySpendingChart
              transactions={filteredTransactions}
              categories={state.categories}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Income vs Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            {incomeExpenseData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={incomeExpenseData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(entry) => `${entry.name}: $${entry.value.toFixed(0)}`}
                  >
                    {incomeExpenseData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.5rem',
                    }}
                    formatter={(value: number) => `$${value.toLocaleString('en-AU', { minimumFractionDigits: 2 })}`}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
