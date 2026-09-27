import { useAuth } from '../context/useAuth.js';
import { Link } from 'react-router-dom';

const today = new Date().toLocaleDateString(undefined, {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

export default function TopBar({ title, subtitle, darkMode, setDarkMode }) {
  const { user, logout } = useAuth();

  return (
    <header className="flex items-center justify-between border-b border-[#dfeae4] bg-white/80 px-8 py-6 backdrop-blur-sm dark:border-[#18342d] dark:bg-[#0d1715]/70">
      <div>
        <h1 className="text-2xl font-semibold text-[#112219] dark:text-white">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-[#5b6e67] dark:text-[#bfe1d1]">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-xl border border-[#dfeae4] bg-[#f7faf8] px-3 py-2 text-sm text-[#49635b] shadow-sm md:flex dark:border-[#18342d] dark:bg-[#102620] dark:text-[#dff4e8]">
          📅 {today}
        </div>

        <button
          onClick={() => setDarkMode(!darkMode)}
          aria-label="Toggle theme"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#dfeae4] bg-[#f7faf8] text-neutral-700 shadow-sm transition hover:bg-[#edf7f0] dark:border-[#18342d] dark:bg-[#102620] dark:text-[#dff4e8]"
        >
          {darkMode ? '☀️' : '🌙'}
        </button>

        {user ? (
          <button onClick={logout} className="px-3 py-2 text-sm text-[#49635b] hover:text-[#123528] dark:text-[#dff4e8] dark:hover:text-white">
            Log out
          </button>
        ) : (
          <Link to="/login" className="rounded-lg bg-[#0b5d3b] px-3 py-2 text-sm font-medium text-white shadow-[0_10px_24px_rgba(11,93,59,0.2)]">
            Student login
          </Link>
        )}
      </div>
    </header>
  );
}