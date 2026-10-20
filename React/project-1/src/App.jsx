import { useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import HomePage from "./components/pages/HomePage";
import ProductsPage from "./components/products/ProductsPage";
import ProductDetailPage from "./components/products/ProductDetailPage";
import Login from "./components/auth/Login";
import ContactPage from "./components/pages/ContactPage";
import AdminRoute from "./components/admin/AdminRoute";
import ProductRoute from "./components/routing/ProductRoute";
import NotFoundPage from "./components/routing/NotFoundPage";
import CheckoutPage from "./components/checkout/CheckoutPage";
import ConfirmationPage from "./components/checkout/ConfirmationPage";
import { RequireAuth, RequireRole } from "./components/routing/RouteGuards";
import useProducts from "./hooks/useProducts";
import CartFeedback from "./components/cart/CartFeedback";
import CartPage from "./components/cart/CartPage";
import RouteErrorBoundary from "./components/routing/RouteErrorBoundary";

function CatalogRoute({ search, setSearch, onlyAvailable, setOnlyAvailable }) {
  const catalog = useProducts();
  const { fetchProducts } = catalog;
  useEffect(() => { void fetchProducts(); }, [fetchProducts]);
  const filteredProducts = catalog.products.filter((product) =>
    product.name.toLowerCase().includes(search.toLowerCase()) &&
    (!onlyAvailable || product.stock > 0),
  );
  return <ProductsPage {...catalog} filteredProducts={filteredProducts}
    search={search} setSearch={setSearch} onlyAvailable={onlyAvailable}
    setOnlyAvailable={setOnlyAvailable} retryLoadProducts={fetchProducts} />;
}

export default function App() {
  const [search, setSearch] = useState("");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  return (
    <>
      <Header />
      <CartFeedback />
      <RouteErrorBoundary><Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/productos" element={<CatalogRoute search={search} setSearch={setSearch}
          onlyAvailable={onlyAvailable} setOnlyAvailable={setOnlyAvailable} />} />
        <Route path="/productos/:id" element={<ProductRoute>{(product) =>
          <ProductDetailPage selectedProduct={product} />
        }</ProductRoute>} />
        <Route path="/contacto" element={<ContactPage />} />
        <Route path="/login" element={<Login />} />
        <Route element={<RequireAuth />}>
          <Route element={<RequireRole role="admin" />}>
            <Route path="/admin" element={<AdminRoute />} />
            <Route path="/admin/editar/:id" element={<ProductRoute>{(product) =>
              <AdminRoute key={product.id} product={product} />
            }</ProductRoute>} />
          </Route>
          <Route element={<RequireRole role="client" />}>
            <Route path="/carrito" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/compra/:saleId" element={<ConfirmationPage />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes></RouteErrorBoundary>
      <Footer />
    </>
  );
}
