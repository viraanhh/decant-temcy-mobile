import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "../constants/api";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

// Setiap request otomatis disisipi token, kalau ada
apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("authToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const serverMessage = error.response.data?.message;
      if (serverMessage) error.message = serverMessage;
    } else if (error.code === "ECONNABORTED") {
      error.message = "Koneksi timeout, coba lagi";
    } else {
      error.message = "Tidak dapat terhubung ke server. Periksa koneksi Anda";
    }
    return Promise.reject(error);
  }
);

export default apiClient;