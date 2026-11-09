import apiClient from "./apiClient";

const VARIANT_DEFINITIONS = [
  { size_ml: 1, priceField: "price_1ml", stockField: "stock_1ml" },
  { size_ml: 2, priceField: "price_2ml", stockField: "stock_2ml" },
  { size_ml: 3, priceField: "price_3ml", stockField: "stock_3ml" },
  { size_ml: 5, priceField: "price_5ml", stockField: "stock_5ml" },
];

function mapProduct(raw) {
  const variants = VARIANT_DEFINITIONS
    .filter((v) => raw[v.priceField] != null)
    .map((v) => {
      const stock = Number(raw[v.stockField]) || 0; // jumlah vial per ukuran
      return { 
        size_ml: v.size_ml, 
        price: raw[v.priceField], 
        stock, 
        in_stock: stock > 0 
      };
    });

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
    stock_ml: raw.stock_ml ?? 0, // dipertahankan untuk referensi total sisa ml
    image_filename: raw.image_filename,
    sold_count: raw.sold_count ?? 0,
    avg_rating: Number(raw.avg_rating) || 0,
    review_count: Number(raw.review_count) || 0,
    variants,
  };
}

export function mapProductFromApi(raw) {
  return mapProduct(raw);
}

export async function getProducts(params = {}) {
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
  const response = await apiClient.get(`/products/${id}`);
  return mapProductFromApi(response.data.product);
}