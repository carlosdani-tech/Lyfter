import { formatColones } from "../../utils/formatters";
import AddToCartButton from "./AddToCartButton";
import { Link } from "react-router-dom";

function ProductDetailPage({ selectedProduct }) {
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
          <AddToCartButton product={selectedProduct} detail />

          <Link
            to="/productos"
            className="product-detail__button"
          >
            Volver al catálogo
          </Link>
        </div>
      </section>
    </main>
  );
}

export default ProductDetailPage;
