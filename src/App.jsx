import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext.jsx';
import { useAuth } from './context/useAuth.js';
import Navbar from './components/Navbar.jsx';
import Home from './pages/Home.jsx';
import RoutesList from './pages/RoutesList.jsx';
import Login from './pages/Login.jsx';
import BusTracking from './pages/BusTracking.jsx';

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function AppRoutes({ darkMode, setDarkMode }) {
  return (
    <Routes>
      <Route path="/" element={<Home darkMode={darkMode} setDarkMode={setDarkMode} />} />

      <Route
        path="/routes"
        element={
          <ProtectedRoute>
            <div className="min-h-screen bg-[#edf4ef] dark:bg-[#07110f]">
              <Navbar darkMode={darkMode} setDarkMode={setDarkMode} />
              <RoutesList />
            </div>
          </ProtectedRoute>
        }
      />

      <Route
        path="/login"
        element={
          <div className="min-h-screen bg-[#edf4ef] dark:bg-[#07110f]">
            <Navbar darkMode={darkMode} setDarkMode={setDarkMode} />
            <Login />
          </div>
        }
      />

      <Route
        path="/track/:busId"
        element={
          <ProtectedRoute>
            <div className="min-h-screen bg-[#edf4ef] dark:bg-[#07110f]">
              <Navbar darkMode={darkMode} setDarkMode={setDarkMode} />
              <BusTracking />
            </div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/contribute/:busId"
        element={
          <ProtectedRoute>
            <div className="min-h-screen bg-[#edf4ef] dark:bg-[#07110f]">
              <Navbar darkMode={darkMode} setDarkMode={setDarkMode} />
              <BusTracking shareMode />
            </div>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  const [darkMode, setDarkMode] = useState(
    () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  return (
    <AuthProvider>
      <AppRoutes darkMode={darkMode} setDarkMode={setDarkMode} />
    </AuthProvider>
  );
}