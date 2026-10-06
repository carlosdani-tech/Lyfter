import Loading from "./Loading";

function ProductsPage({
  loading,
  productError,
  products,
  filteredProducts,
  search,
  onlyAvailable,
  setSearch,
  setOnlyAvailable,
  showProductDetail,
  retryLoadProducts,
}) {
  if (loading) {
    return (
      <main className="products-page">
        <Loading message="Cargando productos..." />
      </main>
    );
  }

  if (productError) {
    return (
      <main className="products-page">
        <section className="empty-products">
          <div className="empty-products__icon">:(</div>
          <h2>No se pudieron cargar los productos</h2>
          <p>{productError}</p>
          <button
            type="button"
            className="product-card__button"
            onClick={retryLoadProducts}
          >
            Reintentar
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="products-page">
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
            onChange={(event) => setOnlyAvailable(event.target.checked)}
          />

          Mostrar solo disponibles
        </label>
      </section>

      {products.length === 0 ? (
        <section className="empty-products">
          <div className="empty-products__icon">:(</div>
          <h2>No hay productos disponibles por el momento.</h2>
        </section>
      ) : filteredProducts.length === 0 ? (
        <section className="empty-products">
          <div className="empty-products__icon">:(</div>
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
                  src={product.image_url || "/paw.png"}
                  alt={product.name}
                  className="product-card__image"
                />

                <div className="product-card__content">
                  <h2>{product.name}</h2>
                  <p className="product-card__price">₡{product.price}</p>
                  <p className="product-card__category">
                    {product.category || "Sin categoría"}
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
    </main>
  );
}

export default ProductsPage;