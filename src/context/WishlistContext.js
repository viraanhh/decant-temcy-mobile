import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";
import * as wishlistService from "../services/wishlistService";

const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState([]); // [{ productId, product }]
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(() => {
    if (!user) {
      setFavorites([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    wishlistService.getFavorites()
      .then(setFavorites)
      .catch(() => setFavorites([]))
      .finally(() => setIsLoading(false));
  }, [user]);

  // Fetch ulang tiap kali status login berubah (login/logout/ganti akun)
  useEffect(() => {
    refresh();
  }, [refresh]);

  const wishlistIds = favorites.map((f) => f.productId);
  const isWishlisted = (productId) => wishlistIds.includes(productId);

  const toggleWishlist = async (productId) => {
    const wasWishlisted = isWishlisted(productId);

    // Optimistic update dulu supaya ikon ❤️ langsung berubah tanpa nunggu network
    if (wasWishlisted) {
      setFavorites((prev) => prev.filter((f) => f.productId !== productId));
    } else {
      setFavorites((prev) => [...prev, { productId, product: null }]);
    }

    try {
      await wishlistService.toggleFavorite(productId);
      // Refresh penuh supaya WishlistScreen dapat data produk lengkap
      // (bukan cuma id) untuk item yang baru ditambahkan.
      refresh();
    } catch (err) {
      // Gagal → batalkan optimistic update, sinkron ulang ke kondisi asli server
      refresh();
    }
  };

  return (
    <WishlistContext.Provider value={{ favorites, wishlistIds, isLoading, isWishlisted, toggleWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}