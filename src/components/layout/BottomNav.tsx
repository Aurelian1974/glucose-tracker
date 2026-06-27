import { NavLink } from 'react-router';
import { LayoutDashboard, Plus, History, BarChart2 } from 'lucide-react';
import { cn } from '@/utils/cn';

const NAV_ITEMS = [
  { to: '/',        icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/add',     icon: Plus,            label: 'Adaugă' },
  { to: '/history', icon: History,         label: 'Istoric' },
  { to: '/charts',  icon: BarChart2,       label: 'Grafice' },
] as const;

export default function BottomNav() {
  return (
    <nav className="no-print fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[720px] bg-gt-surface border-t border-gt-border flex">
      {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end
          className={({ isActive }) =>
            cn(
              'flex-1 flex flex-col items-center gap-1 py-3 text-[11px] font-medium transition-colors uppercase tracking-[0.06em]',
              isActive ? 'text-gt-accent' : 'text-gt-secondary hover:text-gt-text',
            )
          }
        >
          <Icon className="w-5 h-5" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
