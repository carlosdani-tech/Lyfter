import { getProduct } from "../api/productsApi";

// A missing/inactive product is different from an unavailable or invalid API.
export async function loadProductResource(id, { signal } = {}) {
  try {
    const product = await getProduct(id, { signal });
    if (signal?.aborted) return null;
    return { loading: false, product: product.is_active ? product : null, error: "" };
  } catch (error) {
    if (signal?.aborted) return null;
    return { loading: false, product: null,
      error: error?.status === 404 ? "" : "No se pudo cargar el producto. Intenta nuevamente." };
  }
}
