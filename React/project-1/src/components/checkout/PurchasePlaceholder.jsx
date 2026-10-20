import { useParams } from "react-router-dom";
import { parseRouteId } from "../../utils/routing";
import RouteStatusPage from "../routing/RouteStatusPage";

export default function PurchasePlaceholder({ title, confirmation = false }) {
  const { saleId } = useParams();
  if (confirmation && parseRouteId(saleId) === null) {
    return <RouteStatusPage title="Compra no encontrada" message="El identificador de la compra no es válido." />;
  }
  return <RouteStatusPage title={title} message={confirmation
    ? "La consulta de compras aún no está disponible. No se ha verificado ninguna compra."
    : "Esta sección aún no está disponible. Puedes continuar explorando el catálogo."} />;
}
