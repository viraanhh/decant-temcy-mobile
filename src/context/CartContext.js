import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { getCart, addCartItem, updateCartItem, removeCartItem } from "../services/cartService";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const mapBackendCartItems = useCallback((backendItems = []) => {
    return backendItems.map((item) => {
      const product = item.product || {};
      const sizeMl = Number(item.size_ml);
      const priceField = `price_${sizeMl}ml`;
      const price = Number(product[priceField] ?? 0);
      const stockMl = Number(product.stock_ml ?? 0);
      const variant = { size_ml: sizeMl, price, stock: stockMl, in_stock: stockMl >= sizeMl };

      return {
        cartItemId: item.cart_item_id ?? item.id,
        productId: item.product_id ?? product.id,
        variantSizeMl: sizeMl,
        product,
        variant,
        quantity: Number(item.quantity),
      };
    });
  }, []);

  const refreshCart = useCallback(async () => {
    if (!user) {
      setItems([]);
      return { success: true, items: [] };
    }
    setLoading(true);
    setError(null);
    try {
      const response = await getCart();
      const mappedItems = mapBackendCartItems(response?.cart?.items || []);
      setItems(mappedItems);
      return { success: true, items: mappedItems };
    } catch (err) {
      console.error("Failed to fetch cart:", err);
      const message = err?.response?.data?.message || "Gagal mengambil data keranjang.";
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, [user, mapBackendCartItems]);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const addToCart = async (product, variant, quantity = 1) => {
    if (!user) return { success: false, message: "Silakan login terlebih dahulu untuk menambahkan produk ke keranjang." };
    if (!product || !variant) return { success: false, message: "Data produk tidak valid." };

    const productId = product.id;
    const sizeMl = Number(variant.size_ml);
    const requestedQuantity = Number(quantity);

    if (!Number.isInteger(requestedQuantity) || requestedQuantity <= 0) {
      return { success: false, message: "Jumlah produk tidak valid." };
    }

    const existingItem = items.find((item) => Number(item.productId) === Number(productId) && Number(item.variantSizeMl) === sizeMl);
    const currentQty = existingItem ? Number(existingItem.quantity) : 0;
    
    // Stok sekarang langsung berdasarkan ketersediaan per varian
    const maxStock = Number(variant.stock ?? 0);
    const desiredQty = currentQty + requestedQuantity;

    if (maxStock <= 0) {
      return { success: false, message: "Stok tidak mencukupi untuk ukuran ini." };
    }
    if (desiredQty > maxStock) {
      return { success: false, message: `Jumlah melebihi stok yang tersedia. Maksimal ${maxStock} item.` };
    }

    setLoading(true);
    setError(null);
    try {
      await addCartItem(productId, sizeMl, requestedQuantity);
      await refreshCart();
      return { success: true, message: "Produk berhasil ditambahkan ke keranjang." };
    } catch (err) {
      console.error("Failed to add cart item:", err);
      const message = err?.response?.data?.message || "Gagal menambahkan produk ke keranjang.";
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (cartItemId, quantity) => {
    const newQuantity = Number(quantity);
    if (newQuantity <= 0) return removeFromCart(cartItemId);

    const target = items.find((item) => Number(item.cartItemId) === Number(cartItemId));
    if (!target) return { success: false, message: "Item keranjang tidak ditemukan." };

    const maxStock = Number(target.variant?.stock ?? 0);

    if (newQuantity > maxStock) {
      return { success: false, message: `Jumlah melebihi stok yang tersedia. Maksimal ${maxStock} item.` };
    }

    setLoading(true);
    setError(null);
    try {
      await updateCartItem(cartItemId, newQuantity);
      await refreshCart();
      return { success: true, message: "" };
    } catch (err) {
      console.error("Failed to update cart item:", err);
      const message = err?.response?.data?.message || "Gagal memperbarui jumlah produk.";
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = async (cartItemId) => {
    const target = items.find((item) => Number(item.cartItemId) === Number(cartItemId));
    if (!target) return { success: false, message: "Item keranjang tidak ditemukan." };

    setLoading(true);
    setError(null);
    try {
      await removeCartItem(cartItemId);
      await refreshCart();
      return { success: true, message: "Produk dihapus dari keranjang." };
    } catch (err) {
      console.error("Failed to remove cart item:", err);
      const message = err?.response?.data?.message || "Gagal menghapus produk dari keranjang.";
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const clearCart = async () => refreshCart();

  const totalItems = items.reduce((sum, item) => sum + Number(item.quantity), 0);
  const subtotal = items.reduce((sum, item) => sum + Number(item.variant?.price ?? 0) * Number(item.quantity), 0);

  return (
    <CartContext.Provider value={{ items, loading, error, refreshCart, addToCart, updateQuantity, removeFromCart, clearCart, totalItems, subtotal }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}