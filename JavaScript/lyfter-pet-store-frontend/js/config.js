export const API_BASE_URL = "http://127.0.0.1:5000";

export const STORAGE_KEYS = {
  session: "lyfter_pet_store_session",
  cart: "lyfter_pet_store_cart",
  productsCache: "lyfter_pet_store_products_cache",
};

export const API_ENDPOINTS = {
  auth: {
    register: "/auth/register",
    login: "/auth/login",
    me: "/auth/me",
  },
  products: {
    base: "/products",
    byId: (productId) => `/products/${productId}`,
  },
  cart: {
    base: "/cart",
    items: "/cart/items",
    item: (itemId) => `/cart/items/${itemId}`,
  },
  sales: {
    base: "/invoices",
    checkout: "/sales/checkout",
    byId: (saleId) => `/invoices/${saleId}`,
  },
};