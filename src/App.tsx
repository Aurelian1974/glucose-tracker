import { createBrowserRouter, RouterProvider, Navigate } from 'react-router';
import { useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import Dashboard from '@/pages/Dashboard';
import AddReading from '@/pages/AddReading';
import History from '@/pages/History';
import Charts from '@/pages/Charts';
import Settings from '@/pages/Settings';
import { initializeDB } from '@/db/db';

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/',         element: <Dashboard /> },
      { path: '/add',      element: <AddReading /> },
      { path: '/history',  element: <History /> },
      { path: '/charts',   element: <Charts /> },
      { path: '/settings', element: <Settings /> },
      { path: '*',         element: <Navigate to="/" replace /> },
    ],
  },
]);

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initializeDB().then(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-gt-bg">
        <span className="font-mono text-sm text-gt-accent tracking-[0.1em]">
          SE INIȚIALIZEAZĂ...
        </span>
      </div>
    );
  }

  return <RouterProvider router={router} />;
}
