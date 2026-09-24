import apiClient from "./apiClient";

function mapAddress(raw) {
  return {
    id: raw.address_id,
    label: raw.label,
    recipientName: raw.recipient_name,
    phone: raw.phone,
    province: raw.province,
    provinceId: raw.province_id,
    city: raw.city,
    cityId: raw.city_id,
    district: raw.district,
    postalCode: raw.postal_code,
    detail: raw.detail,
    isDefault: raw.is_default,
  };
}

export async function getAddresses() {
  const response = await apiClient.get("/addresses");
  return (response.data.addresses || []).map(mapAddress);
}

export async function createAddress({ label, recipientName, phone, province, provinceId, city, cityId, district, postalCode, detail, isDefault }) {
  const response = await apiClient.post("/addresses", {
    label, recipient_name: recipientName, phone,
    province, province_id: provinceId, city, city_id: cityId,
    district, postal_code: postalCode, detail, is_default: isDefault,
  });
  return mapAddress(response.data.address);
}

export async function deleteAddress(id) {
  await apiClient.delete(`/addresses/${id}`);
}

export async function setDefaultAddress(id) {
  await apiClient.put(`/addresses/${id}/set-default`);
}