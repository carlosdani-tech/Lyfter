# Navigation Flow

## Público

- `index.html` muestra entrada general y enlaces al catálogo.
- `products.html` carga catálogo desde API y enlaza a `product-detail.html?id=<id>`.
- `product-detail.html` muestra detalle del producto y permite agregar al carrito si hay stock.

## Auth

- `login.html` autentica al usuario y guarda una sesión segura.
- `register.html` crea cuenta y redirige a login.
- Navbar muestra Iniciar sesión o nombre de usuario y botón Cerrar sesión según la sesión.
- Navbar muestra Administración solo cuando `role === "admin"`.

## Compra

- `cart.html` muestra el carrito backend, permite actualizar cantidades y eliminar items.
- `checkout.html` requiere sesión, valida datos del comprador, refresca el carrito backend y envía checkout.
- `checkout-success.html` muestra el resumen temporal de compra cuando está disponible.

## Administración

- `admin.html` está protegido por `requireAdmin()` y mantiene la UI oculta hasta pasar el guard.
- `edit-product.html` está protegido por `requireAdmin()`.
- Sin `id`, `edit-product.html` crea producto.
- Con `id`, `edit-product.html?id=<id>` carga y actualiza producto.
- Administración puede desactivar o eliminar productos; eliminar requiere confirmación del navegador.
- La tabla de ventas lista datos desde `GET /invoices`; ventas no tiene detalle dedicado en la UI actual.