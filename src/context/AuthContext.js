import { createContext, useContext, useState, useEffect } from "react";
import * as authService from "../services/authService";
import { getMyProfile } from "../services/userService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    authService.getStoredSession().then(({ user }) => {
      setUser(user);
      setIsLoading(false);
    });
  }, []);

  const login = async (email, password) => {
    const { token, user } = await authService.login(email, password);
    await authService.saveSession(token, user);
    setUser(user);
    return user;
  };

  const loginWithGoogleToken = async (token) => {
    const { user } = await authService.completeGoogleLogin(token);
    setUser(user);
    return user;
  };

  const register = async (name, email, phone, password) => {
    const { token, user } = await authService.register(name, email, phone, password);
    await authService.saveSession(token, user);
    setUser(user);
  };

  const logout = async () => {
    await authService.clearSession();
    setUser(null);
  };

  const refreshUser = async () => {
    const backendUser = await getMyProfile();
    const { token } = await authService.getStoredSession();
    await authService.saveSession(token, backendUser);
    setUser(backendUser);
    return backendUser;
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, refreshUser, loginWithGoogleToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}