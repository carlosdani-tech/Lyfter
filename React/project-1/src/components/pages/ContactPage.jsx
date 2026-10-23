import { Link } from "react-router-dom";

function ContactPage() {
  return (
    <main className="contact-page">
      <section className="contact-card">
        <h1>Contacto</h1>
        <p>
          Esta sección aún no está disponible. Estamos trabajando para
          habilitarla próximamente.
        </p>
        <p>Puedes continuar navegando por nuestros productos mientras tanto.</p>
        <Link className="contact-card__link" to="/productos">
          Ver productos
        </Link>
      </section>
    </main>
  );
}

export default ContactPage;
