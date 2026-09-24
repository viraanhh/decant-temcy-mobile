import apiClient from "./apiClient";

/**
 * Get current user's cart from backend.
 *
 * Backend response:
 * {
 *   cart: {
 *     cart_id,
 *     user_id,
 *     items: [...]
 *   }
 * }
 */
export async function getCart() {
  const response = await apiClient.get("/cart");
  return response.data;
}

/**
 * Add product variant to cart.
 *
 * Backend:
 * POST /api/cart
 *
 * Body:
 * {
 *   product_id,
 *   size_ml,
 *   quantity
 * }
 */
export async function addCartItem(productId, sizeMl, quantity) {
  const response = await apiClient.post("/cart", {
    product_id: productId,
    size_ml: sizeMl,
    quantity,
  });

  return response.data;
}

/**
 * Update cart item quantity.
 *
 * Backend:
 * PUT /api/cart/:itemId
 *
 * Body:
 * {
 *   quantity
 * }
 */
export async function updateCartItem(cartItemId, quantity) {
  const response = await apiClient.put(`/cart/${cartItemId}`, {
    quantity,
  });

  return response.data;
}

/**
 * Remove one cart item.
 *
 * Backend:
 * DELETE /api/cart/:itemId
 */
export async function removeCartItem(cartItemId) {
  const response = await apiClient.delete(`/cart/${cartItemId}`);

  return response.data;
}