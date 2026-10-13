import { useState } from "react";
import {
  createProduct as createProductRequest,
  deleteProduct as deleteProductRequest,
  getProducts,
  updateProduct as updateProductRequest,
} from "../api/productsApi";

function useProducts() {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [productError, setProductError] = useState("");

  const fetchProducts = async () => {
    setLoading(true);
    setProductError("");

    try {
      const backendProducts = await getProducts();
      setProducts(backendProducts);
    } catch {
      setProducts([]);
      setProductError(
        "No se pudieron cargar los productos. Verifica que el servidor este disponible.",
      );
    } finally {
      setLoading(false);
    }
  };

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

  const selectProduct = (product) => {
    setSelectedProduct(product);
  };

  const clearSelectedProduct = () => {
    setSelectedProduct(null);
  };

  const replaceSelectedProduct = (product) => {
    setSelectedProduct((currentProduct) =>
      currentProduct?.id === product.id ? product : currentProduct,
    );
  };

  const clearSelectedProductById = (productId) => {
    setSelectedProduct((currentProduct) =>
      currentProduct?.id === productId ? null : currentProduct,
    );
  };

  return {
    products,
    selectedProduct,
    loading,
    productError,
    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    selectProduct,
    clearSelectedProduct,
    replaceSelectedProduct,
    clearSelectedProductById,
    clearProductError: () => setProductError(""),
  };
}

export default useProducts;
