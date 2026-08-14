# PawStore

PawStore es una aplicación web desarrollada con React y JavaScript que simula el catálogo de una tienda de productos para mascotas.

El proyecto tiene como objetivo aplicar conceptos fundamentales de React, incluyendo la creación de componentes reutilizables, manejo de estados, renderizado dinámico de información, eventos, filtrado de datos y organización de una interfaz en diferentes vistas.

Los productos utilizados por la aplicación se almacenan localmente en un archivo JSON y son procesados dinámicamente para generar el catálogo.

## Funcionalidades

La aplicación incluye las siguientes funcionalidades:

* Página principal con información introductoria sobre la tienda.
* Catálogo dinámico de productos.
* Carga de información desde un archivo JSON local.
* Búsqueda de productos por nombre.
* Filtro para mostrar únicamente productos disponibles.
* Indicador visual durante la carga del catálogo.
* Vista informativa cuando no existen productos que coincidan con los criterios de búsqueda.
* Consulta individual de los detalles de cada producto.
* Visualización del nombre, descripción, precio, categoría, imagen y stock de cada producto.
* Navegación entre la página principal, el catálogo y el detalle de los productos.
* Diseño adaptable a diferentes tamaños de pantalla.
* Componentes reutilizables para elementos comunes de la interfaz, como el encabezado y el pie de página.

## Tecnologías utilizadas

El proyecto fue desarrollado utilizando las siguientes tecnologías y herramientas:

* React
* JavaScript
* JSX
* CSS3
* Vite
* JSON
* ESLint
* Node.js y npm para la gestión de dependencias

## Estructura del proyecto

```text
project-1/
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── Header.jsx
│   │   └── Footer.jsx
│   ├── data/
│   │   └── products.json
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── .gitignore
├── eslint.config.js
├── index.html
├── package-lock.json
├── package.json
├── README.md
└── vite.config.js
```

## Fuente de datos

La información de los productos se encuentra almacenada en el archivo:

```text
src/data/products.json
```

Cada producto contiene una estructura similar a la siguiente:

```json
{
  "id": 1,
  "nombre": "Collar de cuero",
  "descripcion": "Collar resistente para perros de todos los tamaños.",
  "precio": 8500,
  "categoria": "Perros",
  "imagen": "URL de la imagen",
  "stock": 12
}
```

Estos datos son importados por la aplicación y utilizados para generar dinámicamente el catálogo de productos.

## Instalación y ejecución

Para ejecutar el proyecto localmente es necesario contar con Node.js y npm instalados.

### 1. Clonar el repositorio

```bash
git clone URL_DEL_REPOSITORIO
```

### 2. Acceder al directorio del proyecto

```bash
cd project-1
```

### 3. Instalar las dependencias

```bash
npm install
```

### 4. Iniciar el servidor de desarrollo

```bash
npm run dev
```

Una vez iniciado el servidor, Vite mostrará en la terminal una dirección local similar a:

```text
http://localhost:5173/
```

Esta dirección puede abrirse desde cualquier navegador web para visualizar la aplicación.

## Funcionamiento de la aplicación

### Página de inicio

La página principal presenta una introducción a PawStore y proporciona acceso directo al catálogo mediante la opción "Ver productos".

### Catálogo de productos

La vista de catálogo muestra dinámicamente los productos disponibles en el archivo `products.json`.

Cada producto se presenta mediante una tarjeta que contiene:

* Imagen.
* Nombre.
* Precio.
* Categoría.
* Opción para consultar los detalles.

La vista también proporciona una herramienta de búsqueda por nombre y un filtro para mostrar únicamente productos con existencias disponibles.

### Estado de carga

Al acceder al catálogo se muestra temporalmente un indicador de carga mientras se procesan los productos que serán mostrados en pantalla.

### Productos no encontrados

Cuando ningún producto cumple con los criterios establecidos en la búsqueda o filtros seleccionados, la aplicación muestra un mensaje informativo indicando que no se encontraron resultados.

### Detalle del producto

Al seleccionar la opción "Ver detalles", se presenta una vista con información ampliada del producto seleccionado.

Esta información incluye:

* Nombre del producto.
* Precio.
* Categoría.
* Descripción.
* Stock disponible.
* Imagen del producto.

Desde esta sección también es posible regresar al catálogo.

## Scripts disponibles

El proyecto incluye los siguientes comandos:

### Ejecutar el proyecto en modo desarrollo

```bash
npm run dev
```

### Generar la versión de producción

```bash
npm run build
```

### Ejecutar el análisis de código con ESLint

```bash
npm run lint
```

### Previsualizar la versión de producción

```bash
npm run preview
```

## Diseño adaptable

La interfaz fue desarrollada utilizando CSS responsive para facilitar su visualización en diferentes resoluciones de pantalla.

El catálogo modifica la distribución de sus columnas de acuerdo con el espacio disponible, permitiendo una presentación adecuada en equipos de escritorio, tabletas y dispositivos móviles.

## Consideraciones técnicas

El proyecto utiliza un archivo JSON local como fuente de información, por lo que no requiere una API externa, servidor backend ni conexión a una base de datos.

La interfaz se encuentra enfocada actualmente en la consulta y visualización de productos. La arquitectura permite ampliar posteriormente el proyecto con funcionalidades adicionales, como carrito de compras, autenticación de usuarios, gestión de productos o integración con una API.