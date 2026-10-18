import apiClient from "./apiClient";

const USE_DUMMY_DATA = false;

const DUMMY_PRODUCTS_RAW = [
  {
    product_id: 1,
    brand: "HMNS Parfum",
    product_name: "Above The Cloud",
    concentration: "EDP",
    gender: "Unisex",
    main_accords: "Woody, Oud, Amber",
    inspirator: null,
    description: "Parfum dengan karakter kayu yang dalam, cocok untuk acara formal.",
    price_1ml: 4700,
    price_2ml: 9000,
    price_3ml: 13000,
    price_5ml: 21000,
    stock_ml: 150,
    image_filename: "hmns_above.png",
    is_active: true,
    sold_count: 312,
  },
  {
    product_id: 2,
    brand: "Afnan",
    product_name: "Turathi Electric",
    concentration: "EDP",
    gender: "Male",
    main_accords: "Oriental, Spicy, Citrus",
    inspirator: "Creed Aventus",
    description: "Aroma segar dengan sentuhan oriental yang elegan.",
    price_1ml: 8000,
    price_2ml: 15000,
    price_3ml: 21000,
    price_5ml: 33000,
    stock_ml: 90,
    image_filename: "default.png",
    is_active: true,
    sold_count: 88,
  },
];

const VARIANT_DEFINITIONS = [
  { size_ml: 1, priceField: "price_1ml" },
  { size_ml: 2, priceField: "price_2ml" },
  { size_ml: 3, priceField: "price_3ml" },
  { size_ml: 5, priceField: "price_5ml" },
];

function mapProduct(raw) {
  const totalStock = raw.stock_ml ?? 0;

  const variants = VARIANT_DEFINITIONS
    .filter((v) => raw[v.priceField] != null)
    .map((v) => ({
      size_ml: v.size_ml,
      price: raw[v.priceField],
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
    variants,
  };
}

export function mapProductFromApi(raw) {
  return mapProduct(raw);
}

const DUMMY_PRODUCTS = DUMMY_PRODUCTS_RAW.map(mapProduct);

export async function getProducts(params = {}) {
  if (USE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return {
      products: DUMMY_PRODUCTS,
      page: 1,
      totalPages: 1,
      total: DUMMY_PRODUCTS.length,
    };
  }

  const response = await apiClient.get("/products", { params });
  const { products, page, totalPages, total } = response.data;

  return {
    products: products.map(mapProductFromApi),
    page,
    totalPages,
    total,
  };
}

export async function getAllProducts(params = {}) {
  if (USE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return DUMMY_PRODUCTS;
  }

  const first = await apiClient.get("/products", { params: { ...params, page: 1 } });
  const { totalPages, products } = first.data;

  let all = [...products];
  for (let p = 2; p <= totalPages; p++) {
    const res = await apiClient.get("/products", { params: { ...params, page: p } });
    all = [...all, ...res.data.products];
  }

  return all.map(mapProductFromApi);
}

export async function getProductById(id) {
  if (USE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const found = DUMMY_PRODUCTS.find((p) => p.id === Number(id));
    if (!found) throw new Error("Produk tidak ditemukan");
    return found;
  }

  const response = await apiClient.get(`/products/${id}`);
  return mapProductFromApi(response.data.product);
}