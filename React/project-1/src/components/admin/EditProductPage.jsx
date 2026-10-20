import ProductForm from "./ProductForm";
import { Link } from "react-router-dom";

function EditProductPage({
  productForm,
  formError,
  handleProductFormChange,
  handleSaveProduct,
  mutationLoading,
}) {
  return (
    <main className="edit-product-page">
      <h1>Editar producto</h1>

      <section className="edit-product-card">
        <ProductForm
          productForm={productForm}
          formError={formError}
          onChange={handleProductFormChange}
          onSubmit={handleSaveProduct}
          submitLabel={mutationLoading ? "Guardando..." : "Guardar cambios"}
          disabled={mutationLoading}
          disableNativeValidation
        >
          <div className="edit-product-card__actions">
            {mutationLoading ? <button type="button" className="edit-product-card__cancel" disabled>Cancelar</button> :
              <Link className="edit-product-card__cancel" to="/admin">Cancelar</Link>}

            <button
              type="submit"
              className="edit-product-card__save"
              disabled={mutationLoading}
            >
              {mutationLoading ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </ProductForm>
      </section>
    </main>
  );
}

export default EditProductPage;
