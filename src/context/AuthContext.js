import { createContext, useContext, useState, useEffect } from "react";
import * as authService from "../services/authService";
import { getMyProfile } from "../services/userService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Saat app dibuka, cek apakah ada sesi login tersimpan
    authService.getStoredSession().then(({ user }) => {
      setUser(user);
      setIsLoading(false);
    });
  }, []);

  const login = async (email, password) => {
    const { token, user } = await authService.login(email, password);
    await authService.saveSession(token, user);
    setUser(user);
    return user; // dibutuhkan LoginScreen.js untuk cek role setelah login
  };

  const loginWithGoogleToken = async (token) => {
    const { user } = await authService.completeGoogleLogin(token);
    setUser(user);
    return user; // dibutuhkan GoogleLoginScreen.js untuk cek role
  };

  // Sengaja TIDAK return user — akun baru dari Register selalu diarahkan
  // ke PreferenceOnboarding, tidak perlu cek role di titik ini.
  const register = async (name, email, phone, password) => {
    const { token, user } = await authService.register(name, email, phone, password);
    await authService.saveSession(token, user);
    setUser(user);
  };

  const logout = async () => {
    await authService.clearSession();
    setUser(null);
  };

  // Simpan APA ADANYA hasil getMyProfile() (bentuk raw backend), sama
  // persis seperti bentuk yang di-set login/register/loginWithGoogleToken.
  // (Dulu fungsi ini me-remap ke { id, name, ... } yang beda nama field dari
  // { user_id, full_name, ... } yang dipakai login/register, dan field
  // preferensi ikut hilang — itu sudah diperbaiki di sini.)
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