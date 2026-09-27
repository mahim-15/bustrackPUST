import { Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth.js';

export default function Navbar({ darkMode, setDarkMode }) {
  const { user, logout } = useAuth();

  return (
    <nav className="flex items-center justify-between gap-4 px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
      <div className="flex items-center gap-4">
        <Link
          to="/"
          aria-label="Back to home"
          className="inline-flex items-center gap-2 rounded-lg border-2 border-[#0b5d3b] bg-[#0b5d3b] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:border-[#084a2f] hover:bg-[#084a2f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b5d3b]"
        >
          <span aria-hidden="true">←</span>
          <span>Back</span>
        </Link>
        <Link to="/" className="font-semibold text-lg text-neutral-900 dark:text-neutral-100">
          PUST Bus Tracker
        </Link>
      </div>

      <div className="flex items-center gap-6 text-sm text-neutral-600 dark:text-neutral-300">
        <Link to="/routes" className="hover:text-neutral-900 dark:hover:text-white">Routes</Link>

        <button
          onClick={() => setDarkMode(!darkMode)}
          aria-label="Toggle dark mode"
          className="rounded-full w-8 h-8 flex items-center justify-center border border-neutral-300 dark:border-neutral-700"
        >
          {darkMode ? '☀️' : '🌙'}
        </button>

        {user ? (
          <div className="flex items-center gap-3">
            <span>{user.name}</span>
            <button onClick={logout} className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white">
              Log out
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="rounded-md bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-3 py-1.5"
          >
            Student login
          </Link>
        )}
      </div>
    </nav>
  );
}
