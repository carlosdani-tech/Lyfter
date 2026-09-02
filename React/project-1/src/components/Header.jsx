function Header({ view, goHome, loadProducts }) {
  return (
    <header className="header">
      <button
        type="button"
        className="header__logo"
        onClick={goHome}
      >
        <span className="header__logo-icon">🐾</span>
        <span>PawStore</span>
      </button>

      <nav className="header__nav">
        <button
          type="button"
          className={view === "home" ? "active" : ""}
          onClick={goHome}
        >
          Inicio
        </button>

        <button
          type="button"
          className={
            view === "products" || view === "detail"
              ? "active"
              : ""
          }
          onClick={loadProducts}
        >
          Productos
        </button>

        <a href="">Contacto</a>
      </nav>
    </header>
  );
}

export default Header;