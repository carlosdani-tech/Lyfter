import { Link } from "react-router-dom";

function Footer() {

  return (
    <footer className="footer">
      <p>
        © PawStore 2025 — Todos los derechos reservados.
      </p>

      <nav className="footer__links">
        <Link to="#facebook">Facebook</Link>
        <Link to="#instagram">Instagram</Link>
      </nav>
    </footer>
  );
}

export default Footer;
