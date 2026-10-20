import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { loadProductResource } from "../../utils/productResource";
import { parseRouteId } from "../../utils/routing";
import Loading from "./Loading";
import RouteStatusPage from "./RouteStatusPage";

function ProductResource({ id, children }) {
  const [resource, setResource] = useState({ loading: true, product: null, error: "" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    loadProductResource(id, { signal: controller.signal }).then((resource) => {
      if (resource) setResource(resource);
    });
    return () => controller.abort();
  }, [id, attempt]);

  if (resource.loading) return <Loading message="Cargando producto..." />;
  if (resource.error) return (
    <main className="empty-products">
      <h1>No se pudo cargar el producto</h1>
      <p role="alert">{resource.error}</p>
      <button type="button" className="product-detail__button" onClick={() => {
        setResource({ loading: true, product: null, error: "" });
        setAttempt((value) => value + 1);
      }}>Reintentar</button>
    </main>
  );
  if (!resource.product) return <RouteStatusPage title="Producto no encontrado" message="El producto no existe o ya no está disponible." />;
  return children(resource.product);
}

export default function ProductRoute({ children }) {
  const { id } = useParams();
  const productId = parseRouteId(id);
  if (productId === null) return <RouteStatusPage title="Producto no encontrado" message="El identificador del producto no es válido." />;
  return <ProductResource key={id} id={productId}>{children}</ProductResource>;
}
