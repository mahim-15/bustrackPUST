import { useCallback, useState } from 'react';
import { api } from '../api/client.js';
import { resetSocket } from '../api/socket.js';
import { AuthContext } from './authContext.js';

function readStoredUser() {
  try {
    const raw = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    localStorage.removeItem('pust_demo_users');
    if (token === 'pust-demo-token') {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      return null;
    }
    return raw && token ? JSON.parse(raw) : null;
  } catch {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    return readStoredUser();
  });

  const register = useCallback(async ({ fullName, studentId, email, password }) => {
    const normalized = email.trim().toLowerCase();
    return api.register({
      name: fullName,
      studentId,
      email: normalized,
      password,
    });
  }, []);

  const requestEmailOtp = useCallback(async (email) => {
    return api.requestEmailOtp(email.trim().toLowerCase());
  }, []);

  const verifyEmailOtp = useCallback(async (email, otp) => {
    return api.verifyEmailOtp(email.trim().toLowerCase(), otp.trim());
  }, []);

  const login = useCallback(async (email, password) => {
    const normalized = email.trim().toLowerCase();
    const { token, user: loggedInUser } = await api.login(normalized, password);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(loggedInUser));
    resetSocket();
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    resetSocket();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, requestEmailOtp, verifyEmailOtp, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
