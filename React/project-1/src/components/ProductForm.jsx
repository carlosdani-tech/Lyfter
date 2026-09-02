function ProductForm({
  productForm,
  formError,
  onChange,
  onSubmit,
  submitLabel,
  children,
  showCategorySelect = false,
}) {
  return (
    <form className="admin-product-form" onSubmit={onSubmit}>
      <label>
        Nombre
        <input
          type="text"
          name="nombre"
          placeholder="Nombre del producto"
          value={productForm.nombre}
          onChange={onChange}
        />
      </label>

      <label>
        Descripción
        <textarea
          rows="4"
          name="descripcion"
          placeholder="Descripcion detallada del producto"
          value={productForm.descripcion}
          onChange={onChange}
        ></textarea>
      </label>

      <div className="admin-product-form__row">
        <label>
          Precio
          <input
            type="number"
            name="precio"
            placeholder="0.00"
            value={productForm.precio}
            onChange={onChange}
          />
        </label>

        <label>
          Categoría
          {showCategorySelect ? (
            <select
              name="categoria"
              value={productForm.categoria}
              onChange={onChange}
            >
              <option value="Perros">Perros</option>
              <option value="Gatos">Gatos</option>
              <option value="Accesorios">Accesorios</option>
              <option value="Alimento">Alimento</option>
              <option value="Juguetes">Juguetes</option>
            </select>
          ) : (
            <input
              type="text"
              name="categoria"
              placeholder="Categoria del producto (ej. Alimento, Juguetes)"
              value={productForm.categoria}
              onChange={onChange}
            />
          )}
        </label>
      </div>

      <label>
        URL de la imagen
        <input
          type="url"
          name="imagen"
          placeholder="/api/placeholder.co/600x400"
          value={productForm.imagen}
          onChange={onChange}
        />
      </label>

      <label>
        Stock
        <input
          type="number"
          name="stock"
          placeholder="0"
          value={productForm.stock}
          onChange={onChange}
        />
      </label>

      {children || (
        <button type="submit" className="admin-product-form__submit">
          {submitLabel}
        </button>
      )}

      {formError && <p className="admin-form-error">{formError}</p>}
    </form>
  );
}

export default ProductForm;
