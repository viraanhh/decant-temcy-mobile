import apiClient from "./apiClient";

const VARIANT_DEFINITIONS = [
  { size_ml: 1, priceField: "price_1ml" },
  { size_ml: 2, priceField: "price_2ml" },
  { size_ml: 3, priceField: "price_3ml" },
  { size_ml: 5, priceField: "price_5ml" },
  { size_ml: 10, priceField: "price_10ml" },
];

// ==========================================
// MAP PRODUCT DATA
// ==========================================

function mapProduct(raw) {
  // stock = sisa ml produk (dipakai bersama semua ukuran). 
  // Ukuran bisa dibeli kalau sisa ml >= ukurannya.
  const totalStock = Number(raw.stock_ml) || 0;

  const variants = VARIANT_DEFINITIONS
    .filter((v) => Number(raw[v.priceField]) > 0)
    .map((v) => ({
      size_ml: v.size_ml,
      price: Number(raw[v.priceField]),
      stock: totalStock,
      in_stock: totalStock >= v.size_ml,
    }));

  return {
    id: raw.product_id,
    product_id: raw.product_id,

    brand: raw.brand,
    product_name: raw.product_name,
    concentration: raw.concentration,
    gender: raw.gender,

    main_accords: raw.main_accords,
    inspirator: raw.inspirator,
    description: raw.description,

    top_notes: raw.top_notes,
    middle_notes: raw.middle_notes,
    base_notes: raw.base_notes,

    pros: raw.pros,
    cons: raw.cons,
    characteristic: raw.characteristic,

    price_1ml: raw.price_1ml,
    stock_ml: totalStock,

    image_filename: raw.image_filename,

    sold_count: raw.sold_count ?? 0,
    avg_rating: Number(raw.avg_rating) || 0,
    review_count: Number(raw.review_count) || 0,

    variants,
  };
}

// ==========================================
// MAP PRODUCT FROM API
// ==========================================

export function mapProductFromApi(raw) {
  return mapProduct(raw);
}

// ==========================================
// GET PRODUCTS
// ==========================================

export async function getProducts(params = {}) {
  const response = await apiClient.get("/products", {
    params,
  });

  const { products, page, totalPages, total } = response.data;

  return {
    products: products.map(mapProductFromApi),
    page,
    totalPages,
    total,
  };
}

// ==========================================
// GET ALL PRODUCTS
// ==========================================

export async function getAllProducts(params = {}) {
  const first = await apiClient.get("/products", {
    params: {
      ...params,
      page: 1,
    },
  });

  const { totalPages, products } = first.data;

  let all = [...products];

  for (let p = 2; p <= totalPages; p++) {
    const response = await apiClient.get("/products", {
      params: {
        ...params,
        page: p,
      },
    });

    all = [...all, ...response.data.products];
  }

  return all.map(mapProductFromApi);
}

// ==========================================
// GET PRODUCT BY ID
// ==========================================

export async function getProductById(id) {
  const response = await apiClient.get(`/products/${id}`);

  return mapProductFromApi(response.data.product);
}