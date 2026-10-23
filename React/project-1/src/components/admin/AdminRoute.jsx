import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useProducts from "../../hooks/useProducts";
import useProductForm from "../../hooks/useProductForm";
import useProductMutations from "../../hooks/useProductMutations";
import AdminPage from "./AdminPage";
import EditProductPage from "./EditProductPage";

export default function AdminRoute({ product = null }) {
  const navigate = useNavigate();
  const catalog = useProducts();
  const form = useProductForm(product);
  const { fetchProducts } = catalog;
  useEffect(() => {
    if (!product) void fetchProducts();
  }, [fetchProducts, product]);
  const mutations = useProductMutations({
    ...form,
    ...catalog,
    deactivateProduct: catalog.deleteProduct,
    onEditSuccess: () => navigate("/admin"),
  });
  const shared = {
    productForm: form.productForm,
    formError: form.formError,
    handleProductFormChange: form.handleFormChange,
    mutationLoading: mutations.mutationLoading,
  };
  return product ? (
    <EditProductPage {...shared} handleSaveProduct={mutations.handleSaveProduct} />
  ) : (
    <AdminPage {...shared} {...catalog} {...mutations}
      formatAdminId={(id) => `PAW${String(id).padStart(3, "0")}`}
      retryLoadProducts={fetchProducts}
    />
  );
}
