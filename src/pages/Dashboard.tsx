import { useMemo, useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, CreditCard, AlertTriangle } from 'lucide-react';
import { NetWorthChart } from '@/components/NetWorthChart';
import { CategorySpendingChart } from '@/components/CategorySpendingChart';
import { detectOrphanTransfers } from '@/utils/orphanTransferDetection';

export default function Dashboard() {
  const { state } = useFinance();
  const [excludeTransfers, setExcludeTransfers] = useState(true);

  // Detect orphan transfers
  const orphanTransferCount = useMemo(() => {
    return detectOrphanTransfers(state.transactions).length;
  }, [state.transactions]);

  // Calculate stats with proper refund handling
  const stats = useMemo(() => {
    // Filter transactions based on excludeTransfers toggle
    let filteredTransactions = state.transactions;
    if (excludeTransfers) {
      filteredTransactions = filteredTransactions.filter(t => t.type !== 'TRANSFER');
    }

    let incomeTransactions = filteredTransactions.filter(t => t.type === 'INCOME');
    let expenseTransactions = filteredTransactions.filter(t => t.type === 'EXPENSE');

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
    const netWorth = state.transactions.reduce((sum, t) => sum + t.amount, 0);

    // Calculate monthly spending (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const monthlySpending = expenseTransactions
      .filter(t => new Date(t.date) >= thirtyDaysAgo)
      .reduce((sum, t) => sum + t.amount, 0);

    // Savings rate: (Income - Expenses) / Income * 100
    const savingsRate = income > 0 ? ((income + expenses) / income) * 100 : 0; // expenses is negative, so income + expenses = income - |expenses|

    return {
      income,
      expenses: Math.abs(expenses), // For display, show absolute value
      expensesRaw: expenses, // Keep raw for calculations
      netWorth,
      monthlySpending: Math.abs(monthlySpending),
      savingsRate,
      totalTransactions: state.transactions.length,
      uncategorized: state.transactions.filter(t => !t.categoryId).length,
    };
  }, [state.transactions, excludeTransfers]);

  // Income vs Expense data for donut chart
  const incomeExpenseData = useMemo(() => {
    // Filter transactions based on excludeTransfers toggle
    let filteredTransactions = state.transactions;
    if (excludeTransfers) {
      filteredTransactions = filteredTransactions.filter(t => t.type !== 'TRANSFER');
    }

    let incomeTransactions = filteredTransactions.filter(t => t.type === 'INCOME');
    let expenseTransactions = filteredTransactions.filter(t => t.type === 'EXPENSE');

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
  }, [state.transactions, excludeTransfers]);

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Your financial overview</p>
        </div>

        {/* Exclude Transfers Toggle */}
        <div className="flex items-center gap-2">
          <Switch
            id="exclude-transfers"
            checked={excludeTransfers}
            onCheckedChange={setExcludeTransfers}
          />
          <Label htmlFor="exclude-transfers" className="cursor-pointer">
            Exclude Transfers
          </Label>
        </div>
      </div>

      {/* Orphan Transfer Alert */}
      {orphanTransferCount > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Orphaned Transfers Detected</AlertTitle>
          <AlertDescription>
            {orphanTransferCount} orphaned transfer{orphanTransferCount !== 1 ? 's' : ''} found. 
            Review them to ensure your Net Worth is accurate.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Worth</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold font-mono ${stats.netWorth >= 0 ? 'text-success' : 'text-destructive'}`}>
              ${stats.netWorth.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Spending</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-destructive">
              ${stats.monthlySpending.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Savings Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold font-mono ${stats.savingsRate >= 0 ? 'text-success' : 'text-destructive'}`}>
              {stats.savingsRate.toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Transactions</CardTitle>
            <CreditCard className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{stats.totalTransactions}</div>
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
          <NetWorthChart transactions={state.transactions} />
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <CategorySpendingChart
              transactions={state.transactions}
              categories={state.categories}
              excludeTransfers={excludeTransfers}
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

      {/* Getting Started */}
      {state.transactions.length === 0 && (
        <Card className="border-accent/50 bg-accent/5">
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Welcome to your finance dashboard! Here's how to get started:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Click "Import CSV" in the sidebar to upload bank statements</li>
              <li>The app will automatically detect columns and categorize transactions</li>
              <li>Review and adjust categories in the Transactions page</li>
              <li>Watch your spending insights appear here!</li>
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
