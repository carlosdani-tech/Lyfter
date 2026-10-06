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
import {
  createProduct,
  deleteProduct as deleteProductRequest,
  getProducts,
  updateProduct,
} from "./api/productsApi";
import { login as loginUser } from "./api/authApi";

const emptyProductForm = {
  name: "",
  description: "",
  price: "",
  category: "",
  image_url: "",
  stock: "",
};

const DEACTIVATION_CONFIRMATION_TOAST_ID = "product-deactivation-confirmation";
const DEACTIVATION_SUCCESS_TOAST_ID = "product-deactivation-success";
const DEACTIVATION_ERROR_TOAST_ID = "product-deactivation-error";
const LOGOUT_CONFIRMATION_TOAST_ID = "logout-confirmation";
const CREATION_TOAST_ID = "product-creation";
const CREATION_ACCESS_TOAST_ID = "product-creation-access";
const CREATION_VALIDATION_TOAST_ID = "product-creation-validation";
const EDIT_TOAST_ID = "product-edit";
const EDIT_ACCESS_TOAST_ID = "product-edit-access";
const EDIT_VALIDATION_TOAST_ID = "product-edit-validation";

function App() {
  const [view, setView] = useState("home");
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState(() => ({ ...emptyProductForm }));
  const [formError, setFormError] = useState("");

  const [search, setSearch] = useState("");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [productError, setProductError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [accessToken, setAccessToken] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [accessMessage, setAccessMessage] = useState("");
  const [mutationLoading, setMutationLoading] = useState(false);
  const [deactivatingProductId, setDeactivatingProductId] = useState(null);
  const deactivationInProgressRef = useRef(false);
  const creationInProgressRef = useRef(false);
  const editInProgressRef = useRef(false);
  const logoutInProgressRef = useRef(false);

  const isAdmin = currentUser?.role === "admin";

  const resetProductEditingState = () => {
    setEditingProduct(null);
    setProductForm({ ...emptyProductForm });
    setFormError("");
  };

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
    setSelectedProduct(product);
    setView("detail");
  };

  const goHome = () => {
    setView("home");
    setSelectedProduct(null);
    setEditingProduct(null);
    setFormError("");
    setProductError("");
    setAccessMessage("");
  };

  const openAdminView = async () => {
    setAccessMessage("");
    resetProductEditingState();
    await fetchProducts();
    setView("admin");
  };

  const loadAdmin = async () => {
    if (!currentUser) {
      setAuthError("Debes iniciar sesión para acceder a Administracion.");
      setAccessMessage("");
      setView("login");
      return;
    }

    if (!isAdmin) {
      setAccessMessage("No tienes permisos para acceder a Administracion.");
      setView("products");
      await fetchProducts();
      return;
    }

    await openAdminView();
  };

  const openLogin = () => {
    setAuthError("");
    setAccessMessage("");
    setView("login");
  };

  const handleLogin = async (credentials) => {
    setAuthLoading(true);
    setAuthError("");

    try {
      const session = await loginUser(credentials);
      setCurrentUser(session.user);
      setAccessToken(session.access_token);

      if (session.user.role === "admin") {
        setAccessMessage("");
        resetProductEditingState();
        await fetchProducts();
        setView("admin");
      } else {
        await loadProducts();
      }
    } catch (error) {
      setAuthError(
        error.status === 401
          ? "El correo o la contraseña son incorrectos."
          : "No se pudo iniciar sesión. Verifica que el servidor esté disponible.",
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const clearSession = () => {
    setCurrentUser(null);
    setAccessToken("");
    setEditingProduct(null);
    setFormError("");
    setAccessMessage("");
  };

  const performLogout = async () => {
    if (logoutInProgressRef.current) {
      return;
    }

    logoutInProgressRef.current = true;
    clearSession();
    setAuthError("");

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

    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description ?? "",
      price: String(product.price),
      category: product.category ?? "",
      image_url: product.image_url ?? "",
      stock: String(product.stock),
    });
    setFormError("");
    setView("edit-product");
  };

  const handleProductFormChange = (event) => {
    const { name, value } = event.target;

    setProductForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const hasEmptyProductField = () =>
    Object.values(productForm).some((value) => String(value).trim() === "");

  const createProductPayload = () => ({
    name: productForm.name.trim(),
    description: productForm.description.trim(),
    price: Number(productForm.price),
    category: productForm.category.trim(),
    image_url: productForm.image_url.trim(),
    stock: Number(productForm.stock),
  });

  const requireAdminMutationAccess = () => {
    if (isAdmin && accessToken) {
      return true;
    }

    setFormError("Debes iniciar sesión como administrador para modificar productos.");
    return false;
  };

  const handleMutationError = (error, action, setError = setFormError) => {
    if (error.status === 401) {
      const message = "Tu sesión expiró. Inicia sesión nuevamente.";
      clearSession();
      setAuthError(message);
      setView("login");
      setError(message);
      return;
    }

    if (error.status === 403) {
      setError("No tienes permisos para modificar productos.");
      return;
    }

    if (error.status === 0) {
      setError(
        `No se pudo conectar con el servidor para ${action} el producto.`,
      );
      return;
    }

    if (error.status >= 500) {
      setError(
        `El servidor no pudo ${action} el producto. Intenta nuevamente.`,
      );
      return;
    }

    setError(`No se pudo ${action} el producto. Intenta nuevamente.`);
  };

  const handleAddProduct = async (event) => {
    event.preventDefault();

    if (creationInProgressRef.current) {
      return;
    }

    if (!isAdmin || !accessToken) {
      const message =
        "Debes iniciar sesión como administrador para agregar productos.";
      setFormError("");
      toast.error(message, { toastId: CREATION_ACCESS_TOAST_ID });
      return;
    }

    if (hasEmptyProductField()) {
      setFormError("");
      toast.warning(
        "Por favor completa todos los campos antes de agregar el producto.",
        { toastId: CREATION_VALIDATION_TOAST_ID },
      );
      return;
    }

    creationInProgressRef.current = true;
    setFormError("");
    setMutationLoading(true);
    toast.dismiss(CREATION_VALIDATION_TOAST_ID);
    toast.loading("Agregando producto...", { toastId: CREATION_TOAST_ID });

    try {
      await createProduct(createProductPayload(), accessToken);
      await fetchProducts();
      setProductForm({ ...emptyProductForm });
      setFormError("");
      toast.update(CREATION_TOAST_ID, {
        render: "Producto agregado correctamente.",
        type: "success",
        isLoading: false,
        autoClose: 5000,
        closeButton: true,
      });
    } catch (error) {
      handleMutationError(error, "agregar", (message) => {
        setFormError("");
        toast.update(CREATION_TOAST_ID, {
          render: message,
          type: "error",
          isLoading: false,
          autoClose: 5000,
          closeButton: true,
        });
      });
    } finally {
      creationInProgressRef.current = false;
      setMutationLoading(false);
    }
  };

  const handleSaveProduct = async (event) => {
    event.preventDefault();

    if (editInProgressRef.current) {
      return;
    }

    if (!isAdmin || !accessToken || !editingProduct) {
      const message =
        "Debes iniciar sesión como administrador para actualizar productos.";
      setFormError("");
      toast.error(message, { toastId: EDIT_ACCESS_TOAST_ID });
      return;
    }

    if (hasEmptyProductField()) {
      setFormError("");
      toast.warning(
        "Por favor completa todos los campos antes de guardar los cambios.",
        { toastId: EDIT_VALIDATION_TOAST_ID },
      );
      return;
    }

    editInProgressRef.current = true;
    setFormError("");
    setMutationLoading(true);
    toast.dismiss(EDIT_VALIDATION_TOAST_ID);
    toast.loading("Guardando cambios...", { toastId: EDIT_TOAST_ID });

    try {
      const updatedProduct = await updateProduct(
        editingProduct.id,
        createProductPayload(),
        accessToken,
      );
      setSelectedProduct((currentProduct) =>
        currentProduct?.id === editingProduct.id
          ? updatedProduct
          : currentProduct,
      );
      await fetchProducts();
      resetProductEditingState();
      setView("admin");
      toast.update(EDIT_TOAST_ID, {
        render: "Producto actualizado correctamente.",
        type: "success",
        isLoading: false,
        autoClose: 5000,
        closeButton: true,
      });
    } catch (error) {
      handleMutationError(error, "actualizar", (message) => {
        setFormError("");
        toast.update(EDIT_TOAST_ID, {
          render: message,
          type: "error",
          isLoading: false,
          autoClose: 5000,
          closeButton: true,
        });
      });
    } finally {
      editInProgressRef.current = false;
      setMutationLoading(false);
    }
  };

  const performProductDeactivation = async (product) => {
    if (deactivationInProgressRef.current) {
      return;
    }

    deactivationInProgressRef.current = true;
    setDeactivatingProductId(product.id);

    try {
      await deleteProductRequest(product.id, accessToken);

      if (selectedProduct?.id === product.id) {
        setSelectedProduct(null);
      }

      if (editingProduct?.id === product.id) {
        resetProductEditingState();
      }

      await fetchProducts();
      toast.success("Producto eliminado correctamente.", {
        toastId: DEACTIVATION_SUCCESS_TOAST_ID,
      });
    } catch (error) {
      handleMutationError(error, "eliminar", (message) => {
        toast.error(message, { toastId: DEACTIVATION_ERROR_TOAST_ID });
      });
    } finally {
      deactivationInProgressRef.current = false;
      setDeactivatingProductId(null);
    }
  };

  const deleteProduct = (product) => {
    if (!requireAdminMutationAccess()) {
      return;
    }

    if (
      deactivationInProgressRef.current ||
      toast.isActive(DEACTIVATION_CONFIRMATION_TOAST_ID)
    ) {
      return;
    }

    toast.warning(
      <div className="toast-confirmation">
        <p>
          ¿Deseas eliminar el producto "{product.name}"? Dejará de aparecer en
          el catálogo.
        </p>
        <div className="toast-confirmation__actions">
          <button
            type="button"
            className="toast-confirmation__confirm toast-confirmation__confirm--danger"
            onClick={() => {
              toast.dismiss(DEACTIVATION_CONFIRMATION_TOAST_ID);
              void performProductDeactivation(product);
            }}
          >
            Eliminar
          </button>
          <button
            type="button"
            className="toast-confirmation__cancel"
            onClick={() => toast.dismiss(DEACTIVATION_CONFIRMATION_TOAST_ID)}
          >
            Cancelar
          </button>
        </div>
      </div>,
      {
        toastId: DEACTIVATION_CONFIRMATION_TOAST_ID,
        autoClose: false,
        closeOnClick: false,
        draggable: false,
      },
    );
  };

  return (
    <>
      <Header
        view={view}
        goHome={goHome}
        loadProducts={loadProducts}
        loadAdmin={loadAdmin}
        openLogin={openLogin}
        currentUser={currentUser}
        handleLogout={handleLogout}
      />

      {view === "home" && <HomePage loadProducts={loadProducts} />}

      {view === "login" && (
        <Login
          onSubmit={handleLogin}
          loading={authLoading}
          error={authError}
        />
      )}

      {view === "products" && (
        <>
          {accessMessage && (
            <p className="access-message" role="alert">
              {accessMessage}
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

      {view === "detail" && selectedProduct && (
        <ProductDetailPage
          selectedProduct={selectedProduct}
          loadProducts={loadProducts}
        />
      )}

      {view === "admin" && isAdmin && (
        <AdminPage
          loading={loading}
          productError={productError}
          products={products}
          productForm={productForm}
          formError={formError}
          formatAdminId={formatAdminId}
          openEditProduct={openEditProduct}
          deleteProduct={deleteProduct}
          handleProductFormChange={handleProductFormChange}
          handleAddProduct={handleAddProduct}
          retryLoadProducts={loadAdmin}
          mutationLoading={mutationLoading}
          deactivatingProductId={deactivatingProductId}
        />
      )}

      {view === "edit-product" && isAdmin && editingProduct && (
        <EditProductPage
          productForm={productForm}
          formError={formError}
          handleProductFormChange={handleProductFormChange}
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
