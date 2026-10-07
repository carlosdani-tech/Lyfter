import { formatColones } from "../utils/formatters";

function ProductDetailPage({ selectedProduct, loadProducts }) {
  return (
    <main className="product-detail-page">
      <section className="product-detail">
        <div className="product-detail__image-container">
          <img
            src={selectedProduct.image_url || "/paw.png"}
            alt={selectedProduct.name}
            className="product-detail__image"
          />
        </div>

        <div className="product-detail__content">
          <h1>{selectedProduct.name}</h1>
          <p className="product-detail__price">
            {formatColones(selectedProduct.price)}
          </p>
          <p className="product-detail__category">
            {selectedProduct.category || "Sin categoría"}
          </p>
          <p className="product-detail__description">
            {selectedProduct.description || "Sin descripción disponible."}
          </p>
          <p className="product-detail__stock">
            Stock disponible: {selectedProduct.stock}
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
