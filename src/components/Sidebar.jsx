import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/useAuth.js';

const itemClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
    isActive ? 'bg-brand text-white' : 'text-fg-muted hover:bg-surface-2 hover:text-fg'
  }`;

export default function Sidebar({ drawer = false, onNavigate }) {
  const { user, logout } = useAuth();
  const items = [
    { to: '/', label: 'Home', icon: '🏠', end: true },
    { to: '/routes', label: 'Routes and live tracking', icon: '🚌' },
    ...(user?.role === 'admin' ? [{ to: '/admin', label: 'Admin panel', icon: '⚙️' }] : []),
  ];

  return (
    <aside
      className={`flex min-h-screen w-64 flex-col gap-6 border-r border-line bg-surface p-4 ${
        drawer ? 'shadow-2xl' : ''
      }`}
    >
      <div className="px-2 pt-1">
        <p className="text-lg font-bold text-fg">PUST Bus Tracker</p>
        <p className="text-xs text-fg-muted">Live bus location</p>
      </div>

      <nav className="flex flex-col gap-1" onClick={onNavigate}>
        {items.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={itemClass}>
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto space-y-3">
        <div className="rounded-2xl border border-line bg-surface-2 p-4 text-sm">
          <p className="flex items-center gap-2 font-semibold text-fg">
            <span className="h-2 w-2 animate-pulse rounded-full bg-live" />
            Live data
          </p>
          <p className="mt-1 text-fg-muted">Updated by students riding the bus.</p>
        </div>
        {user && (
          <div className="rounded-2xl border border-line bg-surface-2 p-4">
            <p className="font-semibold text-fg">{user.name}</p>
            <p className="text-xs text-fg-muted">Signed in</p>
            <button
              type="button"
              onClick={() => {
                logout();
                onNavigate?.();
              }}
              className="mt-3 text-sm font-semibold text-brand hover:underline dark:text-brand-2"
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}