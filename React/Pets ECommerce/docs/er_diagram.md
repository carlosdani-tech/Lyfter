# Entity-Relationship Diagram

This diagram represents the current PostgreSQL schema used by the Flask API.

```mermaid
erDiagram
    ROLES ||--o{ USERS : assigns
    USERS ||--o{ CARTS : owns
    USERS ||--o{ SALES : places
    CARTS ||--o{ CART_ITEMS : contains
    CARTS ||--o| SALES : checked_out_as
    PRODUCTS ||--o{ CART_ITEMS : appears_in
    PRODUCTS ||--o{ SALE_ITEMS : sold_as
    SALES ||--o{ SALE_ITEMS : includes
    SALES ||--o| INVOICES : generates

    ROLES {
        int id PK
        string name UK
        string description
        timestamptz created_at
        timestamptz updated_at
    }

    USERS {
        int id PK
        int role_id FK
        string email UK
        string password_hash
        string first_name
        string last_name
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    PRODUCTS {
        int id PK
        string name
        text description
        numeric price
        int stock
        string image_url
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    CARTS {
        int id PK
        int user_id FK
        string status
        timestamptz created_at
        timestamptz updated_at
    }

    CART_ITEMS {
        int id PK
        int cart_id FK
        int product_id FK
        int quantity
        timestamptz created_at
        timestamptz updated_at
    }

    SALES {
        int id PK
        int user_id FK
        int cart_id FK
        string status
        numeric subtotal_amount
        numeric tax_amount
        numeric total_amount
        timestamptz completed_at
        timestamptz cancelled_at
        timestamptz returned_at
        timestamptz created_at
        timestamptz updated_at
    }

    SALE_ITEMS {
        int id PK
        int sale_id FK
        int product_id FK
        int quantity
        numeric unit_price
        numeric line_total
        timestamptz created_at
        timestamptz updated_at
    }

    INVOICES {
        int id PK
        int sale_id FK,UK
        string invoice_number UK
        string status
        numeric total_amount
        timestamptz issued_at
        timestamptz created_at
        timestamptz updated_at
    }
```

## Relationship Summary

- One role can be assigned to many users.
- One user can own many carts.
- One user can place many sales.
- One cart can contain many cart items.
- One cart can be associated with zero or one sale after checkout.
- One product can appear in many cart items.
- One product can appear in many sale items.
- One sale contains many sale items.
- One sale can generate zero or one invoice.

## Main Constraints

- `roles.name` is unique.
- `users.email` is unique.
- `products.price >= 0`.
- `products.stock >= 0`.
- `cart_items.quantity > 0`.
- `cart_items.cart_id + cart_items.product_id` is unique.
- `sales.cart_id` is unique.
- `sale_items.quantity > 0`.
- `sale_items.unit_price >= 0`.
- `sale_items.line_total >= 0`.
- `sale_items.sale_id + sale_items.product_id` is unique.
- `invoices.invoice_number` is unique.
- `invoices.sale_id` is unique.

## Status Values

- `carts.status`: `active`, `checked_out`, `abandoned`.
- `sales.status`: `completed`, `cancelled`, `returned`.
- `invoices.status`: `issued`, `cancelled`, `refunded`.

## pgAdmin Verification SQL

```sql
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
      'roles',
      'users',
      'products',
      'carts',
      'cart_items',
      'sales',
      'sale_items',
      'invoices'
  )
ORDER BY table_name, ordinal_position;
```
