# Lyfter Pet Store Frontend

Interfaz web para Lyfter Pet Store, una tienda en línea para productos de mascotas. El proyecto implementa catálogo, detalle de producto, carrito, checkout, confirmación de compra, autenticación y panel administrativo usando HTML5, CSS3 y JavaScript vanilla.

## Objetivo

Construir una experiencia frontend clara y funcional para clientes y administradores de Lyfter Pet Store, conectada a un backend Flask mediante API REST, con validaciones visibles, manejo de sesión, carrito persistente como espejo local y flujos protegidos por rol.

## Stack

- HTML5 semántico.
- CSS3 puro.
- JavaScript vanilla modular.
- Fetch API para solicitudes HTTP.
- localStorage para sesión y espejo no sensible del carrito.
- sessionStorage para resumen temporal de confirmación de compra.

No se usan frameworks frontend.

## Requisitos cubiertos

- Estructura modular separando API, servicios, páginas, componentes UI y utilidades.
- Configuración centralizada de backend en `js/config.js`.
- Autenticación con persistencia segura de sesión en `localStorage`.
- Protección de páginas restringidas con guards de sesión y rol.
- Navbar dinámico según sesión y rol.
- Catálogo y detalle de producto desde API.
- Carrito conectado al backend con espejo local no sensible.
- Checkout autenticado contra el carrito activo del backend.
- Confirmación de compra con resumen temporal en `sessionStorage`.
- Panel administrativo para inventario, creación, edición, desactivación/eliminación de productos y ventas.
- Validación visible de formularios con Regex para correo electrónico, longitudes mínimas, números y URL.
- Estados visibles de carga, error y vacío.
- CSS puro con diseño responsive, Flexbox/Grid, variables CSS y unidades relativas.

## Cómo ejecutar el frontend

Para usar módulos ES en el navegador, servir el proyecto con un servidor estático local desde la raíz del frontend.

Ejemplo con Python:

```bash
python -m http.server 8080
```

Luego abrir:

```text
http://127.0.0.1:8080/views/index.html
```

## Backend y conexión

El backend Flask debe estar iniciado por separado antes de usar inicio de sesión, registro, catálogo, carrito, checkout o administración.

Backend local esperado:

```text
http://127.0.0.1:5000
```

Frontend local usado durante desarrollo:

```text
http://127.0.0.1:8080/views/index.html
```

Para iniciar el backend desde el proyecto Flask, usar el comando documentado por el backend, por ejemplo:

```bash
python -m flask --app run.py run --debug
```

## API_BASE_URL

La URL base se centraliza en `js/config.js`:

```js
export const API_BASE_URL = "http://127.0.0.1:5000";
```

No debe incluir `/api` porque el backend actual expone rutas como `/auth/login`, no `/api/auth/login`.

## CORS

El backend debe permitir CORS desde el origen del frontend:

```text
Origin: http://127.0.0.1:8080
Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Headers: Content-Type, Authorization
```

Si el navegador muestra error CORS o solo aparece una solicitud `OPTIONS` sin el request real, revisar que la respuesta preflight incluya `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods` y `Access-Control-Allow-Headers`.

## Endpoints usados

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
- `GET /invoices` para la sección administrativa de Ventas/Facturas, porque el backend actual no expone `GET /sales`.
- `GET /invoices/:id` está definido en la capa API como capacidad disponible/futura, pero la UI actual no implementa detalle de venta.

## Estructura

```text
css/
  main.css
  layout.css
  components.css
  pages.css
  responsive.css
docs/
  api-integration.md
  navigation-flow.md
  screenshots.md
  validation-rules.md
js/
  api/
  pages/
  services/
  ui/
  utils/
views/
  index.html
  products.html
  product-detail.html
  cart.html
  checkout.html
  checkout-success.html
  restricted-access.html
  login.html
  register.html
  admin.html
  edit-product.html
```

## Páginas

- Inicio.
- Productos.
- Detalle de producto.
- Carrito.
- Checkout / Finalizar compra.
- Confirmación de compra.
- Acceso restringido.
- Inicio de sesión.
- Registro.
- Administración de productos, inventario y ventas.
- Crear/editar producto.

## Sesión y localStorage

El frontend guarda solo datos seguros de sesión y datos no sensibles del carrito.

- `lyfter_pet_store_session`: token y datos básicos del usuario.
- `lyfter_pet_store_cart`: espejo no sensible del carrito backend para contador y metadatos visuales.
- `lyfter_pet_store_last_order`: resumen temporal en `sessionStorage` para la pantalla de confirmación.

No se guardan contraseñas, CVV ni números completos de tarjeta.

Las solicitudes protegidas envían:

```text
Authorization: Bearer <token>
```

## Carrito

El backend es la fuente de verdad para el carrito. El frontend usa `/cart` y `/cart/items` para listar, agregar, actualizar cantidad y eliminar productos del carrito.

`localStorage` conserva un espejo no sensible para el contador del navbar y metadatos visuales. Checkout no usa ese espejo como fuente de verdad; antes de confirmar compra, la página vuelve a consultar `GET /cart`.

El carrito valida:

- Carrito vacío.
- Cantidad entera mayor a cero.
- Cantidad no mayor al stock conocido del item.
- Estados visibles de carga, error y vacío.

## Checkout

Checkout refresca `GET /cart` al abrir la página y vuelve a refrescar `GET /cart` justo antes de enviar `POST /sales/checkout`. Si el carrito activo está vacío, no se llama al endpoint de checkout y se muestra un error visible.

Payload enviado a `POST /sales/checkout`:

```json
{
  "buyer": {
    "fullName": "Nombre Apellido",
    "email": "cliente@example.com",
    "phone": "88889999"
  },
  "billing_address": "Dirección de facturación",
  "shipping_address": "Dirección de envío",
  "payment_method": "bank_transfer",
  "payment_reference": "123456",
  "items": [
    {
      "product_id": 1,
      "quantity": 2,
      "unit_price": 4500
    }
  ],
  "subtotal": 9000,
  "total": 9000
}
```

El backend actual procesa la compra desde el carrito activo del usuario autenticado. Los campos `items`, `subtotal` y `total` se envían por compatibilidad de UI y futuras extensiones; el stock final siempre debe confirmarse desde el backend.

Después de un checkout exitoso, el frontend limpia el cache local de productos para que `products.html` vuelva a consultar stock actualizado.

## Administración

El panel administrativo está protegido por `requireAdmin()`. Usuarios invitados se redirigen a inicio de sesión y usuarios autenticados sin rol administrador se redirigen a `restricted-access.html`.

El panel permite:

- Listar productos e inventario.
- Crear producto desde `edit-product.html` sin `id`.
- Editar producto desde `edit-product.html?id=<productId>`.
- Desactivar producto con `PATCH /products/:id` enviando `{ "active": false }`.
- Eliminar producto con `DELETE /products/:id`.
- Listar ventas/facturas desde `GET /invoices`.

La UI muestra mensajes visibles de carga, éxito, error y estados vacíos.

## Validación

Las reglas puras viven en `js/utils/validators.js` y las páginas muestran errores visibles por campo.

Reglas principales:

- Campos requeridos.
- Correo electrónico con Regex.
- Contraseña con mínimo de 8 caracteres.
- Confirmación de contraseña.
- Nombre y descripciones con longitudes mínimas.
- Precio como número positivo.
- Stock como entero no negativo.
- URL válida cuando se ingresa.
- Teléfono con formato básico.
- Dirección de facturación y dirección de envío requeridas.
- Método de pago requerido.
- Referencia de pago corta con letras, números o guiones.

## Manejo de errores

La capa `js/api/apiClient.js` diferencia errores HTTP de errores de red:

- Errores HTTP (`400`, `401`, `403`, `404`, `409`, `422`, `500`) usan el status real y muestran mensajes claros.
- Errores de red o backend apagado muestran `No se pudo conectar con el servidor.`.
- Timeout de request muestra `El servidor tardó demasiado en responder.`.
- `401` limpia la sesión y redirige o muestra mensaje según el flujo.
- `403` redirige a acceso restringido o muestra un mensaje de permisos según el contexto.
- `Active cart has no items.` se traduce a un mensaje comprensible para el usuario.

## Decisiones CSS

- CSS puro, sin frameworks.
- Variables CSS para colores, radios, sombras y escala de espaciado.
- Layout responsive con Flexbox y CSS Grid.
- Unidades relativas (`rem`, `%`, `vh`, `fr`) para tamaños y tipografía.
- Componentes reutilizables para botones, paneles, formularios, tablas, cards y mensajes de estado.
- Estados de foco, hover, error, éxito, carga y vacío definidos en CSS.

## Decisiones técnicas

- API centralizada en `js/api/` para evitar requests hardcodeados en handlers DOM.
- Servicios en `js/services/` para reglas de negocio y normalización de datos.
- Páginas en `js/pages/` para lógica específica de cada vista.
- Componentes UI en `js/ui/` para renderizado reusable.
- `imageUrl` se mantiene en objetos frontend y se mapea a `image_url` al enviar payloads al backend.
- El carrito backend es la fuente de verdad porque `/sales/checkout` lee el carrito activo del usuario autenticado.
- El frontend no reduce stock manualmente; refresca productos después de checkout y espera datos finales del backend.
- La seguridad real de administración vive en backend; el guard frontend solo controla navegación y visibilidad.

## Limitaciones conocidas

- El backend debe estar corriendo para usar autenticación, catálogo, carrito, checkout y administración.
- El backend actual requiere JWT para consultar productos.
- La UI de ventas lista facturas desde `/invoices`; no existe vista de detalle de venta implementada.
- No hay botón para vaciar el carrito completo porque el backend no expone una ruta dedicada.
- El resumen de confirmación se guarda temporalmente en `sessionStorage`; si se recarga o se vuelve más tarde, puede no estar disponible.
- Las capturas visuales todavía están pendientes en `docs/screenshots.md`.
- Si Redis está habilitado en backend, el backend debe invalidar su cache después de cambios de stock.

## Troubleshooting

### Backend apagado o URL incorrecta

Síntoma: `No se pudo conectar con el servidor.`

Revisar:

1. Backend corriendo en `http://127.0.0.1:5000`.
2. Frontend corriendo en `http://127.0.0.1:8080`.
3. `API_BASE_URL` configurado como `http://127.0.0.1:5000`.
4. Probar el endpoint de salud del backend si está disponible.

### CORS

Si el navegador muestra error CORS o solo aparece `OPTIONS` en Network:

1. Confirmar que el backend permita origen `http://127.0.0.1:8080`.
2. Confirmar métodos `GET, POST, PUT, PATCH, DELETE, OPTIONS`.
3. Confirmar headers `Content-Type` y `Authorization`.

### 401 y 403

- `401`: sesión ausente, expirada o token inválido. El frontend limpia la sesión y solicita iniciar sesión nuevamente.
- `403`: usuario autenticado sin permisos para la sección solicitada. El frontend muestra acceso restringido o mensaje de permisos.

### Productos tardan demasiado

Síntoma: `El servidor tardó demasiado en responder.` en catálogo o detalle.

Revisar primero el backend. En desarrollo local, si no se usa Redis Cloud o un Redis disponible, configurar en el `.env` del backend:

```text
REDIS_ENABLED=false
```

Después de cambiar `.env`, reiniciar Flask.

### Carrito o checkout

Si checkout muestra que el carrito está vacío:

1. Confirmar sesión válida de cliente.
2. Confirmar que agregar producto llama a `POST /cart/items` con `product_id` y `quantity`.
3. Confirmar que `GET /cart` devuelve items antes de abrir checkout.
4. Confirmar que `POST /sales/checkout` procesa el carrito activo del backend.