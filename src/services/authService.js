import apiClient from "./apiClient";
import * as SecureStore from "expo-secure-store";

const USE_DUMMY_AUTH = false;

const TOKEN_KEY = "authToken";
const USER_KEY = "authUser";

function mapBackendUser(backendUser) {
  return {
    id: backendUser.user_id,
    name: backendUser.full_name,
    email: backendUser.email,
    role: backendUser.role,
    avatar: backendUser.avatar,
  };
}

export async function login(email, password) {
  if (USE_DUMMY_AUTH) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (email === "test@decant.com" && password === "123456") {
      return {
        token: "dummy-token-123",
        user: { id: 1, name: "Vira Nurul Hayati", email },
      };
    }
    throw new Error("Email atau password salah");
  }

  const response = await apiClient.post("/auth/login", { email, password });
  return {
    token: response.data.token,
    user: mapBackendUser(response.data.user),
  };
}

export async function register(name, email, phone, password) {
  if (USE_DUMMY_AUTH) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return {
      token: "dummy-token-123",
      user: { id: 1, name, email },
    };
  }

  await apiClient.post("/auth/register", {
    full_name: name,
    email,
    password,
    phone: phone || undefined,
  });

  return login(email, password);
}

export async function saveSession(token, user) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function getStoredSession() {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  const userRaw = await SecureStore.getItemAsync(USER_KEY);
  return {
    token,
    user: userRaw ? JSON.parse(userRaw) : null,
  };
}

export async function clearSession() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}

export async function completeGoogleLogin(token) {
  await saveSession(token, { id: null, name: "", email: "" });

  const response = await apiClient.get("/auth/me");
  const user = mapBackendUser(response.data.user);

  await saveSession(token, user);
  return { token, user };
}