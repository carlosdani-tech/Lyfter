# API Integration

La integración HTTP se centraliza en `js/api/apiClient.js` usando Fetch API.

## Cliente API

- Centraliza `API_BASE_URL` desde `js/config.js`.
- Agrega `Authorization: Bearer <token>` cuando existe sesión local.
- Serializa JSON automáticamente.
- Parsea respuestas JSON y maneja respuestas vacías `204`.
- Lanza `ApiError` con `status`, `code`, `details`, `data` y un mensaje visible para la UI.
- Diferencia errores HTTP de errores de red o timeout.

## Endpoints integrados

Auth:

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

Products:

- `GET /products`
- `GET /products/:id`
- `POST /products`
- `PUT /products/:id`
- `PATCH /products/:id`
- `DELETE /products/:id`

Cart:

- `GET /cart`
- `POST /cart/items`
- `PUT /cart/items/:itemId`
- `DELETE /cart/items/:itemId`

Sales and invoices:

- `POST /sales/checkout`
- `GET /invoices` para la sección administrativa de Ventas/Facturas.
- `GET /invoices/:id` está definido en la capa API como capacidad futura; la UI actual no implementa detalle de venta.

## Payloads

Productos mantienen `imageUrl` en UI y objetos frontend. Antes de enviar al backend, `productService.js` lo mapea a `image_url`.

Checkout envía `POST /sales/checkout` con comprador, direcciones, pago seguro, items, subtotal y total. El backend actual procesa la compra desde el carrito activo del usuario autenticado; `items`, `subtotal` y `total` se conservan por compatibilidad y futuras extensiones.

No se envía CVV, número completo de tarjeta ni datos sensibles de pago.

## Carrito

El carrito backend es la fuente de verdad. `localStorage` conserva un espejo no sensible para contador del navbar y metadatos visuales.

Antes de confirmar checkout, `checkout.html` vuelve a consultar `GET /cart` para evitar procesar un carrito activo vacío.

## Errores

`apiClient.js` mapea errores comunes `400`, `401`, `403`, `404`, `409`, `422` y `500` a mensajes claros. Las páginas muestran esos mensajes en estados visibles.

Errores de red muestran `No se pudo conectar con el servidor.` y timeouts muestran `El servidor tardó demasiado en responder.`.