import { ReactNode, useState } from 'react';
import { NavLink } from '@/components/NavLink';
import { LayoutDashboard, ListFilter, Settings, Tags, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/transactions', icon: ListFilter, label: 'Transactions' },
    { to: '/categories', icon: Tags, label: 'Categories' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 z-10",
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
        isCollapsed ? "ml-16" : "ml-64"
      )}>
        {children}
      </main>
    </div>
  );
}
