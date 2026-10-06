# PawStore

PawStore es una aplicacion web desarrollada con React y JavaScript que simula el catalogo de una tienda de productos para mascotas.

El proyecto permite consultar productos desde una vitrina publica y tambien administrar el inventario desde una seccion llamada **Administracion**. Los datos iniciales provienen de un archivo JSON local, pero durante la ejecucion de la aplicacion el inventario se manipula mediante estado de React.

## Objetivo del proyecto

El objetivo principal es aplicar conceptos fundamentales de React:

- Creacion de componentes reutilizables.
- Manejo de estado con `useState`.
- Renderizado condicional de vistas.
- Renderizado dinamico de listas.
- Manejo de eventos.
- Formularios controlados.
- Filtrado de datos.
- Operaciones CRUD basicas en memoria.
- Organizacion del codigo en componentes.

## Funcionalidades implementadas

La aplicacion incluye:

- Pagina de inicio con informacion introductoria.
- Catalogo dinamico de productos.
- Carga inicial de productos desde `src/data/products.json`.
- Busqueda de productos por nombre.
- Filtro para mostrar solo productos disponibles.
- Indicador visual de carga.
- Mensaje cuando no hay productos o no existen coincidencias.
- Vista de detalle para cada producto.
- Visualizacion de nombre, descripcion, precio, categoria, imagen y stock.
- Seccion de administracion.
- Listado administrativo de productos.
- Formulario para agregar productos.
- Pantalla separada para editar productos.
- Eliminacion de productos.
- Actualizacion inmediata del catalogo al agregar, editar o eliminar.
- Manejo del inventario en memoria mientras la aplicacion esta abierta.
- Diseno adaptable para diferentes tamanos de pantalla.

## Tecnologias utilizadas

- React
- JavaScript
- JSX
- CSS3
- Vite
- JSON
- ESLint
- Node.js
- npm

## Estructura del proyecto

```text
project-1/
|-- public/
|   `-- paw.png
|-- src/
|   |-- components/
|   |   |-- AdminPage.jsx
|   |   |-- EditProductPage.jsx
|   |   |-- Footer.jsx
|   |   |-- Header.jsx
|   |   |-- HomePage.jsx
|   |   |-- Loading.jsx
|   |   |-- ProductDetailPage.jsx
|   |   |-- ProductForm.jsx
|   |   `-- ProductsPage.jsx
|   |-- data/
|   |   `-- products.json
|   |-- App.jsx
|   |-- index.css
|   `-- main.jsx
|-- eslint.config.js
|-- index.html
|-- package-lock.json
|-- package.json
|-- README.md
`-- vite.config.js
```

## Fuente de datos

Los productos iniciales estan definidos en:

```text
src/data/products.json
```

Cada producto tiene una estructura similar a:

```json
{
  "id": 1,
  "nombre": "Collar de cuero",
  "descripcion": "Collar resistente para perros de todos los tamanos.",
  "precio": 8500,
  "categoria": "Perros",
  "imagen": "https://via.placeholder.com/300x300.png?text=Collar+de+cuero",
  "stock": 12
}
```

El archivo JSON funciona como inventario inicial. Al iniciar la aplicacion, esos datos se cargan en el estado de React:

```js
const [products, setProducts] = useState(productsData);
```

A partir de ese momento, las operaciones de agregar, editar y eliminar modifican el estado `products`, no el archivo JSON.

## Persistencia de datos

Esta etapa no incluye persistencia permanente.

Eso significa:

- Los cambios existen solo mientras la aplicacion esta abierta.
- No se modifica `products.json`.
- No se usa backend.
- No se usa base de datos.
- No se usa `localStorage`.
- Si se recarga la pagina, el catalogo vuelve al contenido original del JSON.

## Funcionamiento general

La aplicacion se organiza alrededor de `App.jsx`.

`App.jsx` mantiene el estado principal:

- `view`: vista actual de la aplicacion.
- `products`: catalogo activo en memoria.
- `selectedProduct`: producto seleccionado para detalle.
- `editingProduct`: producto que se esta editando.
- `productForm`: datos actuales del formulario.
- `formError`: mensaje de error para formularios.
- `search`: texto de busqueda.
- `onlyAvailable`: filtro de disponibilidad.
- `loading`: indicador de carga.

Las vistas se muestran de forma condicional segun el valor de `view`.

## Vistas principales

### Inicio

Componente:

```text
src/components/HomePage.jsx
```

Muestra una introduccion de PawStore y un boton para ir al catalogo.

### Catalogo

Componente:

```text
src/components/ProductsPage.jsx
```

Muestra los productos en tarjetas. Permite:

- Buscar productos por nombre.
- Filtrar productos disponibles.
- Abrir la vista de detalle de un producto.

El catalogo se renderiza desde el estado `products`, por lo que refleja inmediatamente los cambios realizados desde administracion.

### Detalle de producto

Componente:

```text
src/components/ProductDetailPage.jsx
```

Muestra informacion completa del producto seleccionado:

- Imagen.
- Nombre.
- Precio.
- Categoria.
- Descripcion.
- Stock disponible.

Tambien incluye un boton para volver al catalogo.

### Administracion

Componente:

```text
src/components/AdminPage.jsx
```

Es la zona donde se gestiona el inventario. Incluye:

- Tabla con todos los productos.
- Boton para editar cada producto.
- Boton para eliminar cada producto.
- Formulario para agregar nuevos productos.

### Edicion de producto

Componente:

```text
src/components/EditProductPage.jsx
```

Muestra una pantalla separada para editar un producto existente.

El formulario aparece precargado con los datos actuales del producto. Desde esta vista se puede:

- Guardar cambios.
- Cancelar y volver a administracion sin guardar.

## Formulario reutilizable

El formulario de productos esta centralizado en:

```text
src/components/ProductForm.jsx
```

Este componente se usa tanto para:

- Agregar productos.
- Editar productos.

Recibe por props:

- Datos del formulario.
- Funcion para manejar cambios.
- Funcion para enviar el formulario.
- Texto del boton principal.
- Mensaje de error.
- Configuracion opcional para mostrar la categoria como `select`.

Esto evita duplicar el mismo formulario en varias vistas.

## Agregar productos

Desde la vista de administracion se completa el formulario con:

- `nombre`
- `descripcion`
- `precio`
- `categoria`
- `imagen`
- `stock`

Todos los campos son obligatorios.

Al enviar el formulario:

1. Se evita la recarga de pagina.
2. Se valida que no existan campos vacios.
3. Se calcula un nuevo `id`.
4. Se crea un nuevo objeto de producto.
5. Se agrega al estado `products`.
6. Se limpia el formulario.

El nuevo producto aparece inmediatamente en:

- Listado administrativo.
- Catalogo publico.
- Vista de detalle, cuando se selecciona.

## Editar productos

Desde la tabla administrativa, el boton **Editar** abre una vista separada.

Al abrir la edicion:

1. Se guarda el producto actual en `editingProduct`.
2. Se cargan sus datos en `productForm`.
3. Se cambia la vista a `edit-product`.

Al guardar:

1. Se valida que no haya campos vacios.
2. Se crea una version actualizada del producto.
3. Se reemplaza el producto correspondiente dentro de `products`.
4. Si ese producto estaba abierto en detalle, tambien se actualiza `selectedProduct`.
5. Se vuelve a la vista de administracion.

Al cancelar:

- No se guardan cambios.
- Se vuelve a administracion.

## Eliminar productos

Desde la tabla administrativa, el boton **Eliminar** remueve el producto del estado `products`.

Al eliminar:

1. Se recibe el `id` del producto.
2. Se filtra el arreglo para excluir ese producto.
3. Se actualiza el estado.
4. El producto desaparece del listado administrativo.
5. El producto desaparece del catalogo.
6. Si el producto estaba abierto en detalle, se limpia la seleccion y se evita seguir mostrando informacion eliminada.

## Actualizacion inmediata

Todas las vistas leen desde el mismo estado `products`.

Por eso, cuando se ejecuta:

```js
setProducts(...)
```

React vuelve a renderizar automaticamente las partes de la interfaz que dependen de ese estado.

No es necesario recargar manualmente la pagina.

## Scripts disponibles

Instalar dependencias:

```bash
npm install
```

Ejecutar en modo desarrollo:

```bash
npm run dev
```

Generar version de produccion:

```bash
npm run build
```

Ejecutar ESLint:

```bash
npm run lint
```

Previsualizar la version de produccion:

```bash
npm run preview
```

En Windows PowerShell, si `npm run ...` falla por politica de ejecucion de scripts, se puede usar:

```bash
npm.cmd run dev
npm.cmd run build
npm.cmd run lint
```

## Verificacion

El proyecto fue verificado con:

```bash
npm.cmd run lint
npm.cmd run build
```

Ambos comandos finalizaron correctamente.

## Consideraciones tecnicas

- El proyecto no usa React Router; las vistas se controlan con el estado `view`.
- El estado principal vive en `App.jsx`.
- Los componentes de `src/components` se encargan principalmente de renderizar vistas.
- Las operaciones CRUD se hacen en memoria usando `useState`.
- El JSON sigue siendo la fuente inicial, pero no se modifica durante la ejecucion.
- La arquitectura actual permite agregar posteriormente persistencia, backend, autenticacion o carrito de compras.
