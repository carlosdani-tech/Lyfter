# PawStore React Frontend

PawStore is a React and Vite frontend integrated with the Flask API in
`../Pets ECommerce`.

## Current integration scope

The frontend provides:

- A public Home page.
- A public product catalog and product detail view.
- Login with email and password.
- Session information and logout in the header.
- `admin` and `client` role handling.
- Admin-only product creation, editing, and deletion/deactivation.
- Toast feedback and confirmation for product mutations and logout.

This phase intentionally does not include frontend registration, React Router,
shopping cart, checkout, sales, invoices, email, or user-management UI.

## Product data source

Products are loaded from the Flask API with `GET /products`. Product creation,
editing, and deletion call the protected API endpoints rather than changing a
local-only product list.

The former `src/data/products.json` file is historical sample data and is no
longer an active runtime source. Catalog and detail content are derived from
products returned by the backend.

The frontend uses the backend field names:

- `id`
- `name`
- `description`
- `price`
- `stock`
- `image_url`
- `category`
- `is_active`

## API configuration

The default API base URL is:

```text
http://127.0.0.1:5000
```

Override it with the optional Vite environment variable:

```env
VITE_API_BASE_URL=http://127.0.0.1:5000
```

If this variable is omitted, the frontend uses the default URL above. Restart
the Vite development server after changing a Vite environment variable.

The API layer is centralized under `src/api/`:

- `apiClient.js`: base URL, JSON parsing, errors, and Bearer tokens.
- `authApi.js`: login requests.
- `productsApi.js`: public catalog reads and protected product mutations.

The project uses the browser `fetch` API and does not use Axios.

Application state is split into focused hooks under `src/hooks/`:

- `useAuth`: in-memory user, token, login errors, and session invalidation.
- `useProducts`: backend product collection, selection, loading, and refresh.
- `useProductForm`: shared create/edit form state and validation.
- `useProductMutations`: protected create/edit/delete workflows, request locks,
  and mutation Toast feedback.

`App.jsx` remains the state-based navigation and page-composition coordinator.

## Authentication and roles

`POST /auth/login` returns `data.user` and `data.access_token`. The frontend
keeps them in React state for the current browser session.

- Logged-out users can browse products. Selecting Administration sends them to
  Login.
- A logged-in `client` can browse products but cannot open administration or
  edit views.
- A logged-in `admin` can create, edit, and delete products.
- Product mutations send `Authorization: Bearer <admin_token>`.
- Logout clears the in-memory session after user confirmation.

Session persistence across a page reload is not required in this phase.

## Product administration

The UI labels the destructive action as **Eliminar**, while the backend keeps
soft-delete semantics: `DELETE /products/<product_id>` sets `is_active` to
`false`. Inactive products no longer appear in the public catalog and their
public detail endpoint returns `404`.

After a successful create, update, or delete request, the frontend reloads the
product list from the backend. Toast notifications report loading, success,
validation, and request errors without optimistic product changes.

## Navigation

Navigation remains state-based in `App.jsx`. The project does not use React
Router.

Main views:

- `HomePage.jsx`
- `ProductsPage.jsx`
- `ProductDetailPage.jsx`
- `ContactPage.jsx`
- `Login.jsx`
- `AdminPage.jsx`
- `EditProductPage.jsx`

## Run locally

Start the Flask backend first from `../Pets ECommerce`:

```powershell
.venv\Scripts\python -m flask --app run.py db upgrade
.venv\Scripts\python -m flask --app run.py run --debug
```

The backend requires PostgreSQL migrations to be applied and the security and
seed password variables described in its README to be configured before it can
start.

Then start the frontend from `project-1`:

```powershell
npm install
npm run dev
```

On Windows PowerShell, `npm.cmd` can be used if script execution policy blocks
`npm`:

```powershell
npm.cmd run dev
```

Vite normally serves the application at `http://localhost:5173`. The backend
also permits `http://127.0.0.1:5173` through CORS.

## Available scripts

```powershell
npm.cmd run dev
npm.cmd run lint
npm.cmd run build
npm.cmd run preview
```

## Validation

```powershell
npm.cmd run lint
npm.cmd run build
```

Manual integration checks should cover public catalog/detail access, logged-out
and client administration denial, admin login, product create/edit/delete, and
logout confirmation.
