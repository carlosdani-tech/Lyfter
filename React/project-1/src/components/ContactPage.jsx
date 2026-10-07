function ContactPage({ loadProducts }) {
  return (
    <main className="contact-page">
      <section className="contact-card">
        <h1>Contacto</h1>
        <p>
          Esta sección aún no está disponible. Estamos trabajando para
          habilitarla próximamente.
        </p>
        <p>Puedes continuar navegando por nuestros productos mientras tanto.</p>
        <button type="button" onClick={loadProducts}>
          Ver productos
        </button>
      </section>
    </main>
  );
}

export default ContactPage;
