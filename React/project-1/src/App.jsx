import { useEffect, useState } from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import productsData from "./data/products.json";

function App() {
  const [view, setView] = useState("home");
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [search, setSearch] = useState("");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadProducts = () => {
    setView("products");
    setLoading(true);

    setTimeout(() => {
      setProducts(productsData);
      setLoading(false);
    }, 700);
  };

  useEffect(() => {
    setProducts(productsData);
  }, []);

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
  };

  return (
    <>
      <Header
        view={view}
        goHome={goHome}
        loadProducts={loadProducts}
      />

      {view === "home" && (
        <main className="home">
          <section className="home__content">
            <h1>Bienvenido a PawStore</h1>

            <p>
              Somos una tienda dedicada a ofrecer productos de calidad para tus
              mascotas.
            </p>

            <p>
              Explora nuestro catálogo para encontrar camas, juguetes,
              accesorios y más.
            </p>

            <button
              className="home__link"
              type="button"
              onClick={loadProducts}
            >
              Ver productos
            </button>

            <p className="home__description">
              Esta es la página principal de la aplicación. Más adelante aquí
              se podrán mostrar productos destacados.
            </p>
          </section>
        </main>
      )}

      {view === "products" && (
        <main className="products-page">
          {loading ? (
            <section className="loading">
              <div className="spinner"></div>
              <h2>Cargando productos...</h2>
            </section>
          ) : (
            <>
              <section className="products-filters">
                <input
                  type="search"
                  placeholder="Buscar producto..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />

                <label className="available-filter">
                  <input
                    type="checkbox"
                    checked={onlyAvailable}
                    onChange={(event) =>
                      setOnlyAvailable(event.target.checked)
                    }
                  />

                  Mostrar solo disponibles
                </label>
              </section>

              {filteredProducts.length === 0 ? (
                <section className="empty-products">
                  <div className="empty-products__icon">☹</div>

                  <h2>No se encontraron productos</h2>

                  <p>Intenta cambiar los filtros o la búsqueda.</p>
                </section>
              ) : (
                <section className="catalog">
                  <h1>Catálogo de productos</h1>

                  <div className="products-grid">
                    {filteredProducts.map((product) => (
                      <article className="product-card" key={product.id}>
                        <img
                          src={product.imagen}
                          alt={product.nombre}
                          className="product-card__image"
                        />

                        <div className="product-card__content">
                          <h2>{product.nombre}</h2>

                          <p className="product-card__price">
                            ₡{product.precio}
                          </p>

                          <p className="product-card__category">
                            {product.categoria}
                          </p>

                          <button
                            type="button"
                            className="product-card__button"
                            onClick={() => showProductDetail(product)}
                          >
                            Ver detalles
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </main>
      )}

      {view === "detail" && selectedProduct && (
        <main className="product-detail-page">
          <section className="product-detail">
            <div className="product-detail__image-container">
              <img
                src={selectedProduct.imagen}
                alt={selectedProduct.nombre}
                className="product-detail__image"
              />
            </div>

            <div className="product-detail__content">
              <h1>{selectedProduct.nombre}</h1>

              <p className="product-detail__price">
                ₡{selectedProduct.precio}
              </p>

              <p className="product-detail__category">
                {selectedProduct.categoria}
              </p>

              <p className="product-detail__description">
                {selectedProduct.descripcion}
              </p>

              <p className="product-detail__message">
                Más adelante aquí se podrá agregar este producto al carrito y
                completar la compra.
              </p>

              <button
                type="button"
                className="product-detail__button"
                onClick={loadProducts}
              >
                Volver al catálogo
              </button>
            </div>
          </section>
        </main>
      )}

      <Footer />
    </>
  );
}

export default App;