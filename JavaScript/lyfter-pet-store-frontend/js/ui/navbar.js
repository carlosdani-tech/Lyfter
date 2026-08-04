import { escapeHtml } from "../utils/formatters.js";
import { logout } from "../services/authService.js";
import { getCartItemCount } from "../services/cartService.js";
import { getCurrentUser, getUserDisplayName, isAdmin, isAuthenticated } from "../services/sessionService.js";


function isAuthLink(link, pageName) {
  const href = link.getAttribute("href") || "";
  return href.endsWith(`/${pageName}`) || href.endsWith(pageName);
}

export function applySessionVisibility(root = document) {
  const authenticated = isAuthenticated();

  root.querySelectorAll("[data-guest-only]").forEach((element) => {
    element.hidden = authenticated;
    element.toggleAttribute("aria-hidden", authenticated);
  });

  root.querySelectorAll("a").forEach((link) => {
    const isLoginOrRegister = isAuthLink(link, "login.html") || isAuthLink(link, "register.html");
    if (!isLoginOrRegister) return;

    link.hidden = authenticated;
    link.toggleAttribute("aria-hidden", authenticated);
  });
}

export function renderNavbar(target) {
  if (!target) return;

  const authenticated = isAuthenticated();
  const user = getCurrentUser();
  const displayName = escapeHtml(getUserDisplayName(user));
  const cartCount = getCartItemCount();

  target.innerHTML = `
    <nav class="navbar" aria-label="Principal">
      <a class="brand-link" href="./index.html" aria-label="Lyfter Pet Store inicio">
        <img class="icon-image" src="../../assets/img/logo-.jpg" alt="">
        <span>Lyfter Pet Store</span>
      </a>
      <div class="nav-links">
        <a href="./products.html">Productos</a>
        <a class="cart-nav-link" href="./cart.html">Carrito <span class="cart-count" data-cart-count>${cartCount}</span></a>
        ${isAdmin() ? '<a href="./admin.html">Administración</a>' : ""}
        ${authenticated ? `<span class="nav-user">Usuario: ${displayName}</span><button class="nav-link-button" type="button" data-logout>Cerrar sesión</button>` : '<a href="./login.html" data-guest-only>Iniciar sesión</a><a href="./register.html" data-guest-only>Crear cuenta</a>'}
      </div>
    </nav>
  `;

  target.querySelector("[data-logout]")?.addEventListener("click", () => {
    logout();
    renderNavbar(target);
    applySessionVisibility(document);
    window.location.href = "./index.html";
  });

  applySessionVisibility(document);
}