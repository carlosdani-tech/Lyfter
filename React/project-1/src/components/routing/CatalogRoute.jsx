import { useEffect } from "react";
import ProductsPage from "../products/ProductsPage";
import useProducts from "../../hooks/useProducts";

export default function CatalogRoute({ search, setSearch, onlyAvailable, setOnlyAvailable }) {
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
