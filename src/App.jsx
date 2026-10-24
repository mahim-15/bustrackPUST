import { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext.jsx';
import { useAuth } from './context/useAuth.js';
import Navbar from './components/Navbar.jsx';
import Home from './pages/Home.jsx';
import RoutesList from './pages/RoutesList.jsx';
import Login from './pages/Login.jsx';
import BusTracking from './pages/BusTracking.jsx';

const AdminPanel = lazy(() => import('./pages/AdminPanel.jsx'));

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  return user ? children : <Navigate to="/login" replace state={{ from: location }} />;
}

function AdminRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return user.role === 'admin' ? children : <Navigate to="/routes" replace />;
}

function Layout({ darkMode, setDarkMode }) {
  return (
    <div className="min-h-screen bg-bg text-fg">
      <Navbar darkMode={darkMode} setDarkMode={setDarkMode} />
      <Outlet />
    </div>
  );
}

function AppRoutes({ darkMode, setDarkMode }) {
  return (
    <Routes>
      <Route element={<Layout darkMode={darkMode} setDarkMode={setDarkMode} />}>
        <Route path="/" element={<Home />} />
        <Route path="/routes" element={<RoutesList />} />
        <Route path="/login" element={<Login />} />
        <Route path="/track/:busId" element={<ProtectedRoute><BusTracking /></ProtectedRoute>} />
        <Route path="/contribute/:busId" element={<ProtectedRoute><BusTracking shareMode /></ProtectedRoute>} />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <Suspense fallback={<p className="p-8 text-sm text-fg-muted">Loading admin panel…</p>}>
                <AdminPanel />
              </Suspense>
            </AdminRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  return (
    <AuthProvider>
      <AppRoutes darkMode={darkMode} setDarkMode={setDarkMode} />
    </AuthProvider>
  );
}