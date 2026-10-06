function ProductForm({
  productForm,
  formError,
  onChange,
  onSubmit,
  submitLabel,
  children,
  showCategorySelect = false,
  disabled = false,
  disableNativeValidation = false,
}) {
  return (
    <form
      className="admin-product-form"
      onSubmit={onSubmit}
      noValidate={disableNativeValidation}
    >
      <label>
        Nombre
        <input
          type="text"
          name="name"
          placeholder="Nombre del producto"
          value={productForm.name}
          onChange={onChange}
          required
          disabled={disabled}
        />
      </label>

      <label>
        Descripción
        <textarea
          rows="4"
          name="description"
          placeholder="Descripción detallada del producto"
          value={productForm.description}
          onChange={onChange}
          required
          disabled={disabled}
        ></textarea>
      </label>

      <div className="admin-product-form__row">
        <label>
          Precio
          <input
            type="number"
            name="price"
            placeholder="0.00"
            value={productForm.price}
            onChange={onChange}
            min="0"
            step="0.01"
            required
            disabled={disabled}
          />
        </label>

        <label>
          Categoría
          {showCategorySelect ? (
            <select
              name="category"
              value={productForm.category}
              onChange={onChange}
              required
              disabled={disabled}
            >
              <option value="" disabled>
                Selecciona una categoria
              </option>
              <option value="Perros">Perros</option>
              <option value="Gatos">Gatos</option>
              <option value="Accesorios">Accesorios</option>
              <option value="Alimento">Alimento</option>
              <option value="Juguetes">Juguetes</option>
            </select>
          ) : (
            <input
              type="text"
              name="category"
              placeholder="Categoría del producto (ej. Alimento, Juguetes)"
              value={productForm.category}
              onChange={onChange}
              required
              disabled={disabled}
            />
          )}
        </label>
      </div>

      <label>
        URL de la imagen
        <input
          type="url"
          name="image_url"
          placeholder="https://example.com/producto.jpg"
          value={productForm.image_url}
          onChange={onChange}
          required
          disabled={disabled}
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
          min="0"
          step="1"
          required
          disabled={disabled}
        />
      </label>

      {children || (
        <button
          type="submit"
          className="admin-product-form__submit"
          disabled={disabled}
        >
          {submitLabel}
        </button>
      )}

      {formError && <p className="admin-form-error">{formError}</p>}
    </form>
  );
}

export default ProductForm;
