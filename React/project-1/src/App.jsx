import { useRef, useState } from "react";
import { toast } from "react-toastify";
import Header from "./components/Header";
import Footer from "./components/Footer";
import HomePage from "./components/HomePage";
import ProductsPage from "./components/ProductsPage";
import ProductDetailPage from "./components/ProductDetailPage";
import AdminPage from "./components/AdminPage";
import EditProductPage from "./components/EditProductPage";
import Login from "./components/Login";
import ContactPage from "./components/ContactPage";
import useAuth from "./hooks/useAuth";
import useProducts from "./hooks/useProducts";
import useProductForm from "./hooks/useProductForm";
import useProductMutations from "./hooks/useProductMutations";

const LOGOUT_CONFIRMATION_TOAST_ID = "logout-confirmation";
const ADMIN_ACCESS_DENIED_MESSAGE =
  "No tienes permiso para acceder a esta sección.";

function App() {
  const [view, setView] = useState("home");
  const [search, setSearch] = useState("");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [accessMessage, setAccessMessage] = useState("");
  const logoutInProgressRef = useRef(false);

  const {
    currentUser,
    accessToken,
    isAdmin,
    authError,
    authLoading,
    login,
    logout,
    invalidateSession,
    showAuthError,
    clearAuthError,
  } = useAuth();
  const {
    products,
    selectedProduct,
    loading,
    productError,
    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct: deactivateProduct,
    selectProduct,
    clearSelectedProduct,
    replaceSelectedProduct,
    clearSelectedProductById,
    clearProductError,
  } = useProducts();
  const {
    editingProduct,
    productForm,
    formError,
    startEditing,
    handleFormChange,
    validateForm,
    createPayload,
    resetForm,
    clearEditingState,
    setFormError,
  } = useProductForm();

  const loadProducts = async () => {
    setAccessMessage("");
    setView("products");
    await fetchProducts();
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesStock = onlyAvailable ? product.stock > 0 : true;

    return matchesSearch && matchesStock;
  });

  const showProductDetail = (product) => {
    selectProduct(product);
    setView("detail");
  };

  const goHome = () => {
    setView("home");
    clearSelectedProduct();
    clearEditingState();
    clearProductError();
    setAccessMessage("");
  };

  const openAdminView = async () => {
    setAccessMessage("");
    resetForm();
    await fetchProducts();
    setView("admin");
  };

  const loadAdmin = async () => {
    if (!currentUser) {
      showAuthError(ADMIN_ACCESS_DENIED_MESSAGE);
      setAccessMessage("");
      setView("login");
      return;
    }

    if (!isAdmin) {
      clearAuthError();
      setAccessMessage(ADMIN_ACCESS_DENIED_MESSAGE);
      setView("products");
      await fetchProducts();
      return;
    }

    clearAuthError();
    await openAdminView();
  };

  const openLogin = () => {
    clearAuthError();
    setAccessMessage("");
    setView("login");
  };

  const openContact = () => {
    clearAuthError();
    setAccessMessage("");
    setFormError("");
    clearProductError();
    setView("contact");
  };

  const handleLogin = async (credentials) => {
    const session = await login(credentials);

    if (!session) {
      return;
    }

    if (session.user.role === "admin") {
      setAccessMessage("");
      resetForm();
      await fetchProducts();
      setView("admin");
    } else {
      await loadProducts();
    }
  };

  const clearSession = () => {
    logout();
    clearEditingState();
    setAccessMessage("");
  };

  const handleProtectedSessionExpired = (message) => {
    invalidateSession(message);
    clearEditingState();
    setAccessMessage("");
    setView("login");
  };

  const {
    mutationLoading,
    deactivatingProductId,
    handleAddProduct,
    handleSaveProduct,
    deleteProduct,
  } = useProductMutations({
    isAdmin,
    accessToken,
    editingProduct,
    validateForm,
    createPayload,
    resetForm,
    setFormError,
    createProduct,
    updateProduct,
    deactivateProduct,
    replaceSelectedProduct,
    clearSelectedProductById,
    onSessionExpired: handleProtectedSessionExpired,
    onEditSuccess: () => setView("admin"),
  });

  const performLogout = async () => {
    if (logoutInProgressRef.current) {
      return;
    }

    logoutInProgressRef.current = true;
    clearSession();
    clearAuthError();

    try {
      if (view === "admin" || view === "edit-product") {
        setView("products");
        await fetchProducts();
      }
    } finally {
      logoutInProgressRef.current = false;
    }
  };

  const handleLogout = () => {
    if (
      logoutInProgressRef.current ||
      toast.isActive(LOGOUT_CONFIRMATION_TOAST_ID)
    ) {
      return;
    }

    toast.warning(
      <div className="toast-confirmation">
        <p>¿Deseas cerrar la sesión?</p>
        <div className="toast-confirmation__actions">
          <button
            type="button"
            className="toast-confirmation__confirm"
            onClick={() => {
              toast.dismiss(LOGOUT_CONFIRMATION_TOAST_ID);
              void performLogout();
            }}
          >
            Cerrar sesión
          </button>
          <button
            type="button"
            className="toast-confirmation__cancel"
            onClick={() => toast.dismiss(LOGOUT_CONFIRMATION_TOAST_ID)}
          >
            Cancelar
          </button>
        </div>
      </div>,
      {
        toastId: LOGOUT_CONFIRMATION_TOAST_ID,
        autoClose: false,
        closeOnClick: false,
        draggable: false,
      },
    );
  };

  const formatAdminId = (id) => `PAW${String(id).padStart(3, "0")}`;

  const openEditProduct = (product) => {
    if (!isAdmin) {
      void loadAdmin();
      return;
    }

    if (!product || product.id == null) {
      return;
    }

    startEditing(product);
    setView("edit-product");
  };

  const isUnauthorizedProtectedView =
    (view === "admin" || view === "edit-product") && !isAdmin;
  const renderedView = isUnauthorizedProtectedView
    ? currentUser
      ? "products"
      : "login"
    : view;
  const renderedAccessMessage = isUnauthorizedProtectedView
    ? currentUser
      ? ADMIN_ACCESS_DENIED_MESSAGE
      : ""
    : accessMessage;
  const renderedAuthError =
    isUnauthorizedProtectedView && !currentUser
      ? ADMIN_ACCESS_DENIED_MESSAGE
      : authError;

  return (
    <>
      <Header
        view={renderedView}
        goHome={goHome}
        loadProducts={loadProducts}
        loadAdmin={loadAdmin}
        openLogin={openLogin}
        openContact={openContact}
        currentUser={currentUser}
        isAdmin={isAdmin}
        handleLogout={handleLogout}
      />

      {renderedView === "home" && <HomePage loadProducts={loadProducts} />}

      {renderedView === "login" && (
        <Login
          onSubmit={handleLogin}
          loading={authLoading}
          error={renderedAuthError}
        />
      )}

      {renderedView === "contact" && (
        <ContactPage loadProducts={loadProducts} />
      )}

      {renderedView === "products" && (
        <>
          {renderedAccessMessage && (
            <p className="access-message" role="alert">
              {renderedAccessMessage}
            </p>
          )}
          <ProductsPage
            loading={loading}
            productError={productError}
            products={products}
            filteredProducts={filteredProducts}
            search={search}
            onlyAvailable={onlyAvailable}
            setSearch={setSearch}
            setOnlyAvailable={setOnlyAvailable}
            showProductDetail={showProductDetail}
            retryLoadProducts={loadProducts}
          />
        </>
      )}

      {renderedView === "detail" && selectedProduct && (
        <ProductDetailPage
          selectedProduct={selectedProduct}
          loadProducts={loadProducts}
        />
      )}

      {renderedView === "admin" && isAdmin && (
        <AdminPage
          loading={loading}
          productError={productError}
          products={products}
          productForm={productForm}
          formError={formError}
          formatAdminId={formatAdminId}
          openEditProduct={openEditProduct}
          deleteProduct={deleteProduct}
          handleProductFormChange={handleFormChange}
          handleAddProduct={handleAddProduct}
          retryLoadProducts={loadAdmin}
          mutationLoading={mutationLoading}
          deactivatingProductId={deactivatingProductId}
        />
      )}

      {renderedView === "edit-product" && isAdmin && editingProduct && (
        <EditProductPage
          productForm={productForm}
          formError={formError}
          handleProductFormChange={handleFormChange}
          handleSaveProduct={handleSaveProduct}
          loadAdmin={loadAdmin}
          mutationLoading={mutationLoading}
        />
      )}

      <Footer />
    </>
  );
}

export default App;
