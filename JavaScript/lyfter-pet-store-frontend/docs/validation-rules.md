# Validation Rules

Las reglas puras viven en `js/utils/validators.js`. Los mensajes visibles se aplican en `js/pages/`.

## Auth

- Correo electrónico requerido y validado con Regex.
- Contraseña requerida con mínimo de 8 caracteres.
- Registro requiere nombre mínimo de 3 caracteres.
- Registro requiere confirmación de contraseña coincidente.

## Producto

- Nombre requerido, mínimo 3 caracteres.
- Descripción requerida, mínimo 8 caracteres.
- Categoría requerida, mínimo 3 caracteres.
- Precio como número positivo.
- Stock como entero no negativo.
- URL de imagen opcional, pero válida si se ingresa.

## Carrito

- Cantidad como entero mayor a cero.
- Cantidad no puede superar el stock conocido del item.
- Checkout requiere carrito backend con items.

## Checkout

- Nombre completo requerido, mínimo 3 caracteres.
- Correo electrónico requerido y validado con Regex.
- Teléfono requerido con formato básico.
- Dirección de facturación requerida, mínimo 8 caracteres.
- Dirección de envío requerida, mínimo 8 caracteres.
- Método de pago requerido.
- Referencia de pago corta opcional, con letras, números o guiones.
- No se solicita ni guarda CVV.
- No se solicita ni guarda número completo de tarjeta.

## Administración

- Nombre, descripción, categoría, precio, stock y URL de imagen se validan antes de crear o editar productos.
- El panel administrativo requiere sesión y rol `admin`.