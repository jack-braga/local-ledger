import { ReactNode, useState } from 'react';
import { NavLink } from '@/components/NavLink';
import { LayoutDashboard, ListFilter, Settings, Tags, ChevronLeft, ChevronRight, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useFinance } from '@/contexts/FinanceContext';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { isLoading } = useFinance();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/transactions', icon: ListFilter, label: 'Transactions' },
    { to: '/categories', icon: Tags, label: 'Categories' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  const NavContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className="flex items-center gap-3 px-3 py-3 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          onClick={onNavigate}
        >
          <Icon className="h-5 w-5 flex-shrink-0" />
          <span>{label}</span>
        </NavLink>
      ))}
    </>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <img
            src={`${import.meta.env.BASE_URL}localLedgerLogo.png`}
            alt="LocalLedger"
            className="h-16 w-16 animate-pulse"
          />
          <p className="text-muted-foreground text-sm">Loading your data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-sidebar border-b border-sidebar-border flex items-center justify-between px-4 z-20 md:hidden">
        <div className="flex items-center gap-3">
          <img
            src={`${import.meta.env.BASE_URL}localLedgerLogo.png`}
            alt="LocalLedger Logo"
            className="h-8 w-8"
          />
          <h1 className="text-lg font-bold text-sidebar-foreground">LocalLedger</h1>
        </div>
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-sidebar-foreground">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-64 bg-sidebar border-l border-sidebar-border p-0">
            <div className="p-6 border-b border-sidebar-border">
              <div className="flex items-center gap-3">
                <img
                  src={`${import.meta.env.BASE_URL}localLedgerLogo.png`}
                  alt="LocalLedger Logo"
                  className="h-10 w-10"
                />
                <div>
                  <h1 className="text-xl font-bold text-sidebar-foreground">LocalLedger</h1>
                  <p className="text-xs text-sidebar-foreground/60 mt-1">Local-First Finance</p>
                </div>
              </div>
            </div>
            <nav className="p-4 space-y-1">
              <NavContent onNavigate={() => setMobileMenuOpen(false)} />
            </nav>
          </SheetContent>
        </Sheet>
      </header>

      {/* Desktop Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border flex-col transition-all duration-300 z-10 hidden md:flex",
        isCollapsed ? "w-16" : "w-64"
      )}>
        <div className={cn(
          "border-b border-sidebar-border transition-all duration-300 flex-shrink-0",
          isCollapsed ? "p-4" : "p-6"
        )}>
          <div className={cn(
            "flex items-center gap-3",
            isCollapsed ? "justify-center" : ""
          )}>
            <img
              src={`${import.meta.env.BASE_URL}localLedgerLogo.png`}
              alt="LocalLedger Logo"
              className={cn(
                "flex-shrink-0",
                isCollapsed ? "h-8 w-8" : "h-10 w-10"
              )}
            />
            {!isCollapsed && (
              <div>
                <h1 className="text-xl font-bold text-sidebar-foreground">LocalLedger</h1>
                <p className="text-xs text-sidebar-foreground/60 mt-1">Local-First Finance</p>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => {
            const navLink = (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={cn(
                  "flex items-center rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors",
                  isCollapsed ? "justify-center px-2 py-2" : "gap-3 px-3 py-2"
                )}
                activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && <span>{label}</span>}
              </NavLink>
            );

            if (isCollapsed) {
              return (
                <Tooltip key={to}>
                  <TooltipTrigger asChild>
                    {navLink}
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{label}</p>
                  </TooltipContent>
                </Tooltip>
              );
            }

            return navLink;
          })}
        </nav>

        {/* Collapse button */}
        <div className="p-4 border-t border-sidebar-border flex-shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-full text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                onClick={() => setIsCollapsed(!isCollapsed)}
              >
                {isCollapsed ? (
                  <ChevronRight className="h-5 w-5" />
                ) : (
                  <ChevronLeft className="h-5 w-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </aside>

      {/* Main content */}
      <main className={cn(
        "overflow-auto transition-all duration-300",
        "pt-14 md:pt-0",
        isCollapsed ? "md:ml-16" : "md:ml-64"
      )}>
        {children}
      </main>
    </div>
  );
}
