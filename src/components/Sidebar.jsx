import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/useAuth.js';

const navItems = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/routes', label: 'Live Tracking', icon: '📡' },
  { to: '/routes', label: 'Search by route', icon: '🔎' },
  { to: '/login', label: 'Student login', icon: '🎓' },
  { to: '/routes', label: 'Tracked buses', icon: '🚌' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const visibleNavItems = user
    ? navItems.filter((item) => item.label !== 'Student login')
    : navItems;

  return (
    <aside className="hidden w-[240px] shrink-0 border-r border-[#dfeae4] bg-[#f7faf8] md:flex md:flex-col md:min-h-screen dark:border-[#18342d] dark:bg-[#0a1513]">
      <div className="flex items-center justify-between border-b border-[#dfeae4] px-5 py-5 dark:border-[#18342d]">
        <NavLink to="/" className="flex flex-1 items-center gap-3 text-left no-underline">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#0B5D3B] to-[#1AA66B] text-lg text-white shadow-[0_8px_18px_rgba(11,93,59,0.25)]">
            🚌
          </span>
          <span>
            <span className="block text-lg font-semibold leading-none text-[#0f1d15] dark:text-white">PUST Bus Tracker</span>
            <span className="block pt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-[#557066] dark:text-[#9fe0be]">
              Live Bus Location
            </span>
          </span>
        </NavLink>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {visibleNavItems.map((item) => (
          <NavLink
            key={item.to + item.label}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#e7f3ea] text-[#0b5d3b] dark:bg-[#102922] dark:text-[#9fe0be]'
                  : 'text-[#49635b] hover:bg-white hover:text-[#123528] dark:text-[#b4c7be] dark:hover:bg-[#0f201d] dark:hover:text-white'
              }`
            }
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {user && (
        <div className="m-3 rounded-2xl border border-[#dfeae4] bg-white/70 p-4 shadow-sm dark:border-[#18342d] dark:bg-[#0f1d1a]">
          <p className="truncate text-sm font-semibold text-[#123528] dark:text-[#dff4e8]">{user.name}</p>
          <p className="mt-1 text-xs text-[#557066] dark:text-[#9bb6ae]">Signed in</p>
          <button
            type="button"
            onClick={logout}
            className="mt-3 text-sm font-medium text-[#0b5d3b] hover:underline dark:text-[#9fe0be]"
          >
            Log out
          </button>
        </div>
      )}

      <div className="m-3 rounded-2xl border border-[#dfeae4] bg-white/70 p-4 shadow-sm dark:border-[#18342d] dark:bg-[#0f1d1a]">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0b5d3b] dark:text-[#9fe0be]">
          <span className="h-2 w-2 rounded-full bg-[#14b870] animate-pulse" />
          Live Data
        </div>
        <p className="mt-2 text-sm text-[#4f635d] dark:text-[#cfe6dc]">Updated by campus trackers and drivers</p>
      </div>
    </aside>
  );
}