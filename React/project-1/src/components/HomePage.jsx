function HomePage({ loadProducts }) {
  return (
    <main className="home">
      <section className="home__content">
        <h1>Bienvenido a PawStore</h1>

        <p>
          Somos una tienda dedicada a ofrecer productos de calidad para tus
          mascotas.
        </p>

        <p>
          Explora nuestro catálogo para encontrar camas, juguetes,
          accesorios y más.
        </p>

        <button className="home__link" type="button" onClick={loadProducts}>
          Ver productos
        </button>

        <p className="home__description">
          Esta es la página principal de la aplicación. Más adelante aquí
          se podrán mostrar productos destacados.
        </p>
      </section>
    </main>
  );
}

export default HomePage;
