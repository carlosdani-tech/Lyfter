-- Ejercicio 1: Creación de la base de datos

-- Database: transactions_db

-- DROP DATABASE IF EXISTS transactions_db;

-- CREATE DATABASE transactions_db
--     WITH
--     OWNER = postgres
--     ENCODING = 'UTF8'
--     LC_COLLATE = 'Spanish_Costa Rica.1252'
--     LC_CTYPE = 'Spanish_Costa Rica.1252'
--     LOCALE_PROVIDER = 'libc'
--     TABLESPACE = pg_default
--     CONNECTION LIMIT = -1
--     IS_TEMPLATE = False;

DROP TABLE IF EXISTS bill_details;
DROP TABLE IF EXISTS bills;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS users_app;

-- Tabla de usuarios
CREATE TABLE users_app (
    user_id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de productos
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    product_name VARCHAR(100) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    stock INT NOT NULL CHECK (stock >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de facturas
CREATE TABLE bills (
    bill_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    bill_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'Completed',
    total NUMERIC(10, 2) NOT NULL DEFAULT 0,

    CONSTRAINT fk_bills_users
        FOREIGN KEY (user_id)
        REFERENCES users_app(user_id),

    CONSTRAINT chk_bill_status
        CHECK (status IN ('Completed', 'Returned'))
);

-- Tabla detalle de factura
-- Esta tabla permite que una factura tenga múltiples productos
CREATE TABLE bill_details (
    bill_detail_id SERIAL PRIMARY KEY,
    bill_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),

    CONSTRAINT fk_bill_details_bills
        FOREIGN KEY (bill_id)
        REFERENCES bills(bill_id),

    CONSTRAINT fk_bill_details_products
        FOREIGN KEY (product_id)
        REFERENCES products(product_id)
);

-- Datos de prueba

INSERT INTO users_app (full_name, email)
VALUES 
('Carlos Gutierrez', 'carlos@example.com'),
('Maria Lopez', 'maria@example.com'),
('Andres Ramirez', 'andres@example.com');

INSERT INTO products (product_name, description, price, stock)
VALUES
('Laptop Lenovo', 'Laptop para trabajo y estudio', 450000.00, 10),
('Mouse Logitech', 'Mouse inalámbrico', 12000.00, 25),
('Teclado Redragon', 'Teclado mecánico', 35000.00, 15),
('Monitor Samsung', 'Monitor de 24 pulgadas', 95000.00, 8),
('Audífonos JBL', 'Audífonos Bluetooth', 28000.00, 20);

-- Consultas para verificar

SELECT * FROM users_app;
SELECT * FROM products;
SELECT * FROM bills;
SELECT * FROM bill_details;