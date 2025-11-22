import { ReactNode, useState } from 'react';
import { NavLink } from '@/components/NavLink';
import { LayoutDashboard, CreditCard, ListFilter, Settings, Upload, Download, FileJson, Tags } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ImportWizard } from '@/components/ImportWizard';
import { useFinance } from '@/contexts/FinanceContext';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [importOpen, setImportOpen] = useState(false);
  const { exportState } = useFinance();

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/accounts', icon: Settings, label: 'Settings' },
    { to: '/transactions', icon: ListFilter, label: 'Transactions' },
    { to: '/categories', icon: Tags, label: 'Categories' },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="p-6 border-b border-sidebar-border">
          <h1 className="text-xl font-bold text-sidebar-foreground">FinanceTracker</h1>
          <p className="text-xs text-sidebar-foreground/60 mt-1">Local-First Finance</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
              activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-sidebar-border space-y-2">
          <Button
            onClick={() => setImportOpen(true)}
            className="w-full justify-start"
            variant="default"
            size="sm"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          <Button
            onClick={exportState}
            className="w-full justify-start"
            variant="outline"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>

      <ImportWizard open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
