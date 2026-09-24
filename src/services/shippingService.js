import apiClient from "./apiClient";

export async function getProvinces() {
  const response = await apiClient.get("/shipping/provinces");
  return response.data.provinces || [];
}

export async function getCities(provinceId) {
  const response = await apiClient.get(`/shipping/cities/${provinceId}`);
  return response.data.cities || [];
}

// courier: 'jne' | 'jnt' | 'sicepat' | 'cod'
export async function getShippingCost(destinationCityId, weight, courier) {
  const response = await apiClient.post("/shipping/cost", {
    destination: destinationCityId,
    weight,
    courier,
  });
  return response.data.costs || [];
}