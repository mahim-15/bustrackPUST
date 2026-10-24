import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth.js';
import Sidebar from './Sidebar.jsx';

const iconButton =
  'grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface text-lg transition hover:bg-surface-2';

export default function Navbar({ darkMode, setDarkMode }) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-surface/90 px-4 py-3 backdrop-blur md:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={open}
            aria-controls="app-drawer"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand transition hover:opacity-90"
          >
            <span className="flex flex-col gap-1">
              <span className="block h-0.5 w-5 rounded bg-white" />
              <span className="block h-0.5 w-5 rounded bg-white" />
              <span className="block h-0.5 w-5 rounded bg-white" />
            </span>
          </button>
          <Link to="/" className="truncate text-base font-bold md:text-lg">
            PUST Bus Tracker
          </Link>
        </div>

        <nav className="flex items-center gap-2 md:gap-3">
          <Link
            to="/routes"
            className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-fg-muted transition hover:bg-surface-2 hover:text-fg sm:block"
          >
            Routes
          </Link>
          {user?.role === 'admin' && (
            <Link to="/admin" className="rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90">
              Admin
            </Link>
          )}
          <button type="button" onClick={() => setDarkMode(!darkMode)} aria-label="Toggle dark mode" className={iconButton}>
            {darkMode ? '☀️' : '🌙'}
          </button>
          {user ? (
            <>
              <span className="hidden text-sm font-semibold md:inline">{user.name}</span>
              <button
                type="button"
                onClick={logout}
                className="rounded-xl border border-line px-3 py-2 text-sm font-semibold text-fg-muted transition hover:bg-surface-2 hover:text-fg"
              >
                Log out
              </button>
            </>
          ) : (
            <Link to="/login" className="rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90">
              Student login
            </Link>
          )}
        </nav>
      </header>

      {open && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/50"
        />
      )}
      <div
        id="app-drawer"
        inert={!open}
        className={`fixed inset-y-0 left-0 z-50 w-64 overflow-y-auto transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar drawer onNavigate={() => setOpen(false)} />
      </div>
    </>
  );
}