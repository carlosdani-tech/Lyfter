import ProductForm from "./ProductForm";

function EditProductPage({
  productForm,
  formError,
  handleProductFormChange,
  handleSaveProduct,
  loadAdmin,
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
          submitLabel="Guardar cambios"
          showCategorySelect
        >
          <div className="edit-product-card__actions">
            <button
              type="button"
              className="edit-product-card__cancel"
              onClick={loadAdmin}
            >
              Cancelar
            </button>

            <button type="submit" className="edit-product-card__save">
              Guardar cambios
            </button>
          </div>
        </ProductForm>
      </section>
    </main>
  );
}

export default EditProductPage;
