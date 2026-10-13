import Loading from "./Loading";
import ProductForm from "./ProductForm";
import { formatColones } from "../utils/formatters";

function AdminPage({
  loading,
  productError,
  products,
  productForm,
  formError,
  formatAdminId,
  openEditProduct,
  deleteProduct,
  handleProductFormChange,
  handleAddProduct,
  retryLoadProducts,
  mutationLoading,
  deactivatingProductId,
}) {
  if (loading) {
    return (
      <main className="admin-page">
        <Loading message="Cargando panel de administración..." />
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

        {productError ? (
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
        ) : products.length === 0 ? (
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
                    <td>{product.name}</td>
                    <td>{formatColones(product.price)}</td>
                    <td>
                      <span className="admin-table__tag">
                        {product.category || "Sin categoría"}
                      </span>
                    </td>
                    <td>{product.stock}</td>
                    <td>
                      <div className="admin-table__actions">
                        <button
                          type="button"
                          className="admin-table__edit"
                          onClick={() => openEditProduct(product)}
                          disabled={mutationLoading}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="admin-table__delete"
                          onClick={() => deleteProduct(product)}
                          disabled={
                            mutationLoading || deactivatingProductId !== null
                          }
                        >
                          {deactivatingProductId === product.id
                            ? "Eliminando..."
                            : "Eliminar"}
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
          submitLabel={mutationLoading ? "Agregando..." : "Agregar producto"}
          disabled={mutationLoading}
          disableNativeValidation
        />
      </section>
    </main>
  );
}

export default AdminPage;
