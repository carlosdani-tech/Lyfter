function Header({
  view,
  goHome,
  loadProducts,
  loadAdmin,
  openLogin,
  openContact,
  currentUser,
  isAdmin,
  handleLogout,
}) {
  const isAdminView =
    isAdmin && (view === "admin" || view === "edit-product");
  const showAdminAction = !currentUser || isAdmin;
  const sessionName = currentUser
    ? [currentUser.first_name, currentUser.last_name].filter(Boolean).join(" ") ||
      currentUser.email
    : "";

  return (
    <header className="header">
      <button type="button" className="header__logo" onClick={goHome}>
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
          className={view === "products" || view === "detail" ? "active" : ""}
          onClick={loadProducts}
        >
          Productos
        </button>

        <button
          type="button"
          className={view === "contact" ? "active" : ""}
          onClick={openContact}
        >
          Contacto
        </button>

        {showAdminAction && (
          <button
            type="button"
            className={`btn-administracion ${isAdminView ? "active" : ""}`}
            onClick={loadAdmin}
          >
            Administración
          </button>
        )}

        {currentUser ? (
          <div className="header__session">
            <span>Sesión iniciada como: {sessionName}</span>
            <button
              type="button"
              className="header__logout"
              onClick={handleLogout}
            >
              Cerrar sesión
            </button>
          </div>
        ) : (
          <button
            type="button"
            className={view === "login" ? "active" : ""}
            onClick={openLogin}
          >
            Iniciar sesión
          </button>
        )}
      </nav>
    </header>
  );
}

export default Header;
