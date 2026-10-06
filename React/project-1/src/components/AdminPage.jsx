import Loading from "./Loading";
import ProductForm from "./ProductForm";

function AdminPage({
  loading,
  products,
  productForm,
  formError,
  formatAdminId,
  openEditProduct,
  deleteProduct,
  handleProductFormChange,
  handleAddProduct,
}) {
  if (loading) {
    return (
      <main className="admin-page">
        <Loading message="Cargando panel de administracion..." />
      </main>
    );
  }

  return (
    <main className="admin-page">
      <section className="admin-panel">
        <h1>Administración de productos</h1>

        <p>
          En esta sección puedes gestionar el catálogo de productos de PawStore.
        </p>

        {products.length === 0 ? (
          <section className="empty-products">
            <div className="empty-products__icon">:(</div>

            <h2>No hay productos disponibles por el momento.</h2>
          </section>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Precio</th>
                  <th>Categoría</th>
                  <th>Stock</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>{formatAdminId(product.id)}</td>
                    <td>{product.nombre}</td>
                    <td>₡{product.precio}</td>
                    <td>
                      <span className="admin-table__tag">
                        {product.categoria}
                      </span>
                    </td>
                    <td>{product.stock}</td>
                    <td>
                      <div className="admin-table__actions">
                        <button
                          type="button"
                          className="admin-table__edit"
                          onClick={() => openEditProduct(product)}
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          className="admin-table__delete"
                          onClick={() => deleteProduct(product.id)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin-form-card">
        <h2>Agregar nuevo producto</h2>

        <ProductForm
          productForm={productForm}
          formError={formError}
          onChange={handleProductFormChange}
          onSubmit={handleAddProduct}
          submitLabel="Agregar producto"
        />
      </section>
    </main>
  );
}

export default AdminPage;
