function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <p>
        © PawStore {currentYear} — Todos los derechos reservados.
      </p>

      <nav className="footer__links">
        <a href="#facebook">Facebook</a>
        <a href="#instagram">Instagram</a>
      </nav>
    </footer>
  );
}

export default Footer;