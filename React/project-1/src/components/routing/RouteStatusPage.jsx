import { Link } from "react-router-dom";

export default function RouteStatusPage({ title, message }) {
  return (
    <main className="contact-page">
      <section className="contact-card">
        <h1>{title}</h1>
        <p role="status">{message}</p>
        <Link className="product-detail__button" to="/productos">Ver productos</Link>
        <Link className="route-home-link" to="/">Volver al inicio</Link>
      </section>
    </main>
  );
}
