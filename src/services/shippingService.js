
import apiClient from "./apiClient";

export async function searchDestinations(search) {
  const response = await apiClient.get("/shipping/destinations", {
    params: { search },
  });

  return response.data.destinations || [];
}

export async function getShippingCost(destinationId, weight, courier) {
  const response = await apiClient.post("/shipping/cost", {
    destination: destinationId,
    weight,
    courier,
  });

  return response.data.costs || [];
}

// ==============================
// DAFTAR KURIR AKTIF
// ==============================

export async function getActiveCouriers() {
  const response = await apiClient.get("/shipping/couriers");
  return response.data.couriers || [];
}
