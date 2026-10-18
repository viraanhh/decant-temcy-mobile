import apiClient from "./apiClient";

export async function getCart() {
  const response = await apiClient.get("/cart");
  return response.data;
}

export async function addCartItem(productId, sizeMl, quantity) {
  const response = await apiClient.post("/cart", {
    product_id: productId,
    size_ml: sizeMl,
    quantity,
  });
  return response.data;
}

export async function updateCartItem(cartItemId, quantity) {
  const response = await apiClient.put(`/cart/${cartItemId}`, { quantity });
  return response.data;
}

export async function removeCartItem(cartItemId) {
  const response = await apiClient.delete(`/cart/${cartItemId}`);
  return response.data;
}