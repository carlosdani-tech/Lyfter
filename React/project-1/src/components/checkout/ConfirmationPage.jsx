import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import useAuthContext from "../../hooks/useAuthContext";
import { getPurchaseConfirmation } from "../../api/salesApi";
import PurchaseConfirmation from "./PurchaseConfirmation";
import { parseRouteId } from "../../utils/routing";

function ConfirmationLookup({ saleId }) {
  const { currentUser, runProtectedRequest, isCurrentSession } = useAuthContext();
  const [state, setState] = useState({ loading: true, purchase: null, error: "" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    void runProtectedRequest((token) => getPurchaseConfirmation(saleId, token, { signal: controller.signal }))
      .then((purchase) => {
        if (!active || !isCurrentSession()) return;
        if (purchase.sale.user_id !== currentUser.id) throw new Error("Invalid purchase owner");
        setState({ loading: false, purchase, error: "" });
      }).catch((error) => {
        if (!active || !isCurrentSession()) return;
        setState({ loading: false, purchase: null, error: error?.status === 404 ?
          "No se encontró una compra disponible para tu cuenta." : "No pudimos consultar esta compra. Intenta nuevamente; no confirmes otra compra para consultar su estado." });
      });
    return () => { active = false; controller.abort(); };
  }, [saleId, currentUser, runProtectedRequest, isCurrentSession, attempt]);
  if (state.purchase) return <PurchaseConfirmation purchase={state.purchase} />;
  return <section className="purchase-card confirmation-status" aria-busy={state.loading}>
    <h1>Confirmación de compra</h1>
    {state.loading ? <p role="status">Consultando tu compra...</p> : <>
      <p role="alert">{state.error}</p><button className="cart-primary" type="button" onClick={() => {
        setState({ loading: true, purchase: null, error: "" }); setAttempt((value) => value + 1);
      }}>Volver a consultar</button>
    </>}
    <Link to="/productos" className="purchase-secondary">Volver al catálogo</Link>
  </section>;
}

export default function ConfirmationPage() {
  const { saleId } = useParams();
  const { sessionVersion } = useAuthContext();
  const id = parseRouteId(saleId);
  return <main className="purchase-page confirmation-page">{id !== null ?
    <ConfirmationLookup key={`${sessionVersion}:${id}`} saleId={id} /> :
    <section className="purchase-card"><h1>Confirmación de compra</h1><p role="alert">El identificador de la compra no es válido.</p><Link to="/productos">Volver al catálogo</Link></section>}
  </main>;
}
