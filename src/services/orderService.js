import apiClient from "./apiClient";

const USE_DUMMY_DATA = false;

export const ORDER_STATUS_LABEL = {
  pending: { text: "Menunggu Pembayaran", color: "warning" },
  paid: { text: "Dibayar", color: "primary" },
  processing: { text: "Diproses", color: "primary" },
  shipped: { text: "Dikirim", color: "primary" },
  delivered: { text: "Selesai", color: "success" },
  cancelled: { text: "Dibatalkan", color: "textFaint" },
};

export function getOrderStatusLabel(order) {
  if (order.deliveryMethod === "pickup" && order.status === "shipped") {
    return { text: "Siap Diambil", color: "primary" };
  }
  return ORDER_STATUS_LABEL[order.status] || { text: order.status, color: "textMuted" };
}

function mapOrder(raw) {
  return {
    id: raw.order_id ?? raw.id,
    orderNumber: raw.order_code ?? raw.order_number ?? `#ORDER-${raw.order_id ?? raw.id}`,
    status: raw.status,
    total: Number(raw.total_price ?? raw.total ?? 0),
    shippingName: raw.shipping_name,
    shippingPhone: raw.shipping_phone,
    shippingAddress: raw.shipping_address,
    shippingCity: raw.shipping_city,
    shippingNotes: raw.shipping_notes,
    deliveryMethod: raw.delivery_method,
    pickupStore: raw.pickup_store || null,
    pickupStoreId: raw.pickup_store_id,
    courier: raw.courier,
    courierService: raw.courier_service,
    shippingCost: Number(raw.shipping_cost ?? 0),
    trackingNumber: raw.tracking_number,
    voucherCode: raw.voucher_code,
    discountAmount: Number(raw.discount_amount ?? 0),
    createdAt: raw.created_at ?? raw.createdAt,
    items: (raw.items || raw.order_items || []).map((item) => ({
      productId: item.product_id,
      productName: item.product_name,
      brand: item.brand,
      sizeMl: item.size_ml,
      quantity: item.quantity,
      price: Number(item.price ?? 0),
    })),
  };
}

export async function checkout({
  addressId, shippingName, shippingPhone, shippingAddress, shippingCity, shippingNotes,
  deliveryMethod, courier, courierService, shippingCost, voucherCode, pickupStoreId, cartItemIds,
}) {
  if (USE_DUMMY_DATA) return null;

  const response = await apiClient.post("/orders/checkout", {
    address_id: addressId,
    shipping_name: shippingName,
    shipping_phone: shippingPhone,
    shipping_address: shippingAddress,
    shipping_city: shippingCity,
    shipping_notes: shippingNotes,
    delivery_method: deliveryMethod,
    courier,
    courier_service: courierService,
    shipping_cost: shippingCost,
    voucher_code: voucherCode || undefined,
    pickup_store_id: pickupStoreId || undefined,
    cart_item_ids: cartItemIds || undefined,
  });

  return mapOrder(response.data.order);
}

export async function getMyOrders() {
  if (USE_DUMMY_DATA) return [];

  const response = await apiClient.get("/orders/my-orders");
  return (response.data.orders || []).map(mapOrder);
}

export async function getOrderById(id) {
  if (USE_DUMMY_DATA) return null;

  const response = await apiClient.get(`/orders/my-orders/${id}`);
  return mapOrder(response.data.order);
}

export async function createPayment(orderId) {
  if (USE_DUMMY_DATA) return null;

  const response = await apiClient.post(`/orders/my-orders/${orderId}/create-payment`);
  return response.data;
}

export async function getPaymentStatus(orderId) {
  if (USE_DUMMY_DATA) return null;

  const response = await apiClient.get(`/orders/my-orders/${orderId}/payment-status`);
  return response.data;
}

// PUT /api/orders/my-orders/:id/cancel (hanya pesanan berstatus pending)
export async function cancelOrder(orderId) {
  const response = await apiClient.put(`/orders/my-orders/${orderId}/cancel`);
  return response.data;
}