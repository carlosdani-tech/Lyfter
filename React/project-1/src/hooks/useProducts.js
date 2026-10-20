import { useCallback, useState } from "react";
import {
  createProduct as createProductRequest,
  deleteProduct as deleteProductRequest,
  getProducts,
  updateProduct as updateProductRequest,
} from "../api/productsApi";

function useProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productError, setProductError] = useState("");

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setProductError("");

    try {
      const backendProducts = await getProducts();
      setProducts(backendProducts);
    } catch {
      setProducts([]);
      setProductError(
        "No se pudieron cargar los productos. Verifica que el servidor esté disponible.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const createProduct = async (product, token) => {
    const createdProduct = await createProductRequest(product, token);
    await fetchProducts();
    return createdProduct;
  };

  const updateProduct = async (productId, product, token) => {
    const updatedProduct = await updateProductRequest(
      productId,
      product,
      token,
    );
    await fetchProducts();
    return updatedProduct;
  };

  const deleteProduct = async (productId, token) => {
    const deletedProduct = await deleteProductRequest(productId, token);
    await fetchProducts();
    return deletedProduct;
  };

  return {
    products,
    loading,
    productError,
    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
  };
}

export default useProducts;
