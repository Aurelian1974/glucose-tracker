import { Outlet } from 'react-router';
import BottomNav from './BottomNav';

export default function AppShell() {
  return (
    <div className="min-h-screen bg-gt-bg flex flex-col max-w-[720px] mx-auto relative">
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
