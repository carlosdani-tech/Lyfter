function ProductDetailPage({ selectedProduct, loadProducts }) {
  return (
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

          <p className="product-detail__price">₡{selectedProduct.precio}</p>

          <p className="product-detail__category">
            {selectedProduct.categoria}
          </p>

          <p className="product-detail__description">
            {selectedProduct.descripcion}
          </p>

          <p className="product-detail__stock">
            Stock disponible: {selectedProduct.stock}
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
  );
}

export default ProductDetailPage;
