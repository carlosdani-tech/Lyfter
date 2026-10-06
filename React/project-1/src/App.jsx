import { useState } from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import HomePage from "./components/HomePage";
import ProductsPage from "./components/ProductsPage";
import ProductDetailPage from "./components/ProductDetailPage";
import AdminPage from "./components/AdminPage";
import EditProductPage from "./components/EditProductPage";
import productsData from "./data/products.json";

const emptyProductForm = {
  nombre: "",
  descripcion: "",
  precio: "",
  categoria: "",
  imagen: "",
  stock: "",
};

function App() {
  const [view, setView] = useState("home");
  const [products, setProducts] = useState(productsData);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState(emptyProductForm);
  const [formError, setFormError] = useState("");

  const [search, setSearch] = useState("");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadProducts = () => {
    setView("products");
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
    }, 700);
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.nombre
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
  };

  const loadAdmin = () => {
    setView("admin");
    setLoading(true);
    setEditingProduct(null);
    setFormError("");
    setProductForm(emptyProductForm);

    setTimeout(() => {
      setLoading(false);
    }, 700);
  };

  const formatAdminId = (id) => `PAW${String(id).padStart(3, "0")}`;

  const openEditProduct = (product) => {
    setEditingProduct(product);
    setProductForm({
      nombre: product.nombre,
      descripcion: product.descripcion,
      precio: String(product.precio),
      categoria: product.categoria,
      imagen: product.imagen,
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

  const createProductFromForm = (id) => ({
    id,
    nombre: productForm.nombre,
    descripcion: productForm.descripcion,
    precio: Number(productForm.precio),
    categoria: productForm.categoria,
    imagen: productForm.imagen,
    stock: Number(productForm.stock),
  });

  const handleAddProduct = (event) => {
    event.preventDefault();

    if (hasEmptyProductField()) {
      setFormError("Por favor completa todos los campos antes de agregar el producto.");
      return;
    }

    const nextId =
      products.length === 0
        ? 1
        : Math.max(...products.map((product) => product.id)) + 1;

    setProducts((currentProducts) => [
      ...currentProducts,
      createProductFromForm(nextId),
    ]);
    setProductForm(emptyProductForm);
    setFormError("");
  };

  const handleSaveProduct = (event) => {
    event.preventDefault();

    if (hasEmptyProductField()) {
      setFormError("Por favor completa todos los campos antes de guardar los cambios.");
      return;
    }

    const updatedProduct = createProductFromForm(editingProduct.id);

    setProducts((currentProducts) =>
      currentProducts.map((product) =>
        product.id === editingProduct.id ? updatedProduct : product,
      ),
    );

    setSelectedProduct((currentProduct) =>
      currentProduct?.id === editingProduct.id ? updatedProduct : currentProduct,
    );
    setEditingProduct(null);
    setFormError("");
    setView("admin");
  };

  const deleteProduct = (productId) => {
    setProducts((currentProducts) =>
      currentProducts.filter((product) => product.id !== productId),
    );

    if (selectedProduct?.id === productId) {
      setSelectedProduct(null);

      if (view === "detail") {
        setView("products");
      }
    }
  };

  return (
    <>
      <Header
        view={view}
        goHome={goHome}
        loadProducts={loadProducts}
        loadAdmin={loadAdmin}
      />

      {view === "home" && <HomePage loadProducts={loadProducts} />}

      {view === "products" && (
        <ProductsPage
          loading={loading}
          products={products}
          filteredProducts={filteredProducts}
          search={search}
          onlyAvailable={onlyAvailable}
          setSearch={setSearch}
          setOnlyAvailable={setOnlyAvailable}
          showProductDetail={showProductDetail}
        />
      )}

      {view === "detail" && selectedProduct && (
        <ProductDetailPage
          selectedProduct={selectedProduct}
          loadProducts={loadProducts}
        />
      )}

      {view === "admin" && (
        <AdminPage
          loading={loading}
          products={products}
          productForm={productForm}
          formError={formError}
          formatAdminId={formatAdminId}
          openEditProduct={openEditProduct}
          deleteProduct={deleteProduct}
          handleProductFormChange={handleProductFormChange}
          handleAddProduct={handleAddProduct}
        />
      )}

      {view === "edit-product" && editingProduct && (
        <EditProductPage
          productForm={productForm}
          formError={formError}
          handleProductFormChange={handleProductFormChange}
          handleSaveProduct={handleSaveProduct}
          loadAdmin={loadAdmin}
        />
      )}

      <Footer />
    </>
  );
}

export default App;
