
-- EJERCICIOS DE SQL

-- Activar soporte de llaves foraneas en SQLite
PRAGMA foreign_keys = ON;


-- Nota sobre SQLite:
-- SQLite acepta tipos como BIGINT, VARCHAR(150) y DECIMAL(10,2), pero no los aplica con la misma rigidez que otros motores.

-- Para llaves primarias autogeneradas, la forma correcta es:
-- INTEGER PRIMARY KEY AUTOINCREMENT

-- Por eso las PK se dejan como INTEGER y el resto de columnas usa, los tipos solicitados segun corresponda.


-- 1. CREACION DE TABLAS

CREATE TABLE Products (
    code INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(150) NOT NULL,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    entry_date TEXT NOT NULL,
    brand VARCHAR(150),
    stock_available BIGINT NOT NULL CHECK (stock_available >= 0)
);

CREATE TABLE Invoices (
    invoice_number INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_date TEXT NOT NULL,
    buyer_email VARCHAR(150) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0)
);

CREATE TABLE ProductsPerInvoice (
    invoice_number INTEGER NOT NULL,
    product_code INTEGER NOT NULL,
    quantity BIGINT NOT NULL CHECK (quantity > 0),
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),

    PRIMARY KEY (invoice_number, product_code),

    FOREIGN KEY (invoice_number)
        REFERENCES Invoices(invoice_number)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    FOREIGN KEY (product_code)
        REFERENCES Products(code)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE TABLE ShoppingCart (
    cart_id INTEGER PRIMARY KEY AUTOINCREMENT,
    buyer_email VARCHAR(150) NOT NULL
);

CREATE TABLE ShoppingCartProducts (
    cart_id INTEGER NOT NULL,
    product_code INTEGER NOT NULL,
    quantity BIGINT NOT NULL CHECK (quantity > 0),

    PRIMARY KEY (cart_id, product_code),

    FOREIGN KEY (cart_id)
        REFERENCES ShoppingCart(cart_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    FOREIGN KEY (product_code)
        REFERENCES Products(code)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- 2. INSERTS DE PRUEBA

INSERT INTO Products (name, price, entry_date, brand, stock_available)
VALUES
('Monitor Samsung 24 pulgadas', 85000.00, '2026-05-01', 'Samsung', 15),
('Mouse Logitech', 12000.00, '2026-05-02', 'Logitech', 50),
('Teclado Redragon', 35000.00, '2026-05-03', 'Redragon', 30),
('Laptop Lenovo', 350000.00, '2026-05-04', 'Lenovo', 10),
('Audifonos JBL', 45000.00, '2026-05-05', 'JBL', 25);

INSERT INTO Invoices (purchase_date, buyer_email, total_amount)
VALUES
('2026-05-10', 'cliente1@email.com', 109000.00),
('2026-05-11', 'cliente2@email.com', 350000.00),
('2026-05-12', 'cliente1@email.com', 47000.00);

INSERT INTO ProductsPerInvoice (invoice_number, product_code, quantity, total_amount)
VALUES
(1, 1, 1, 85000.00),
(1, 2, 2, 24000.00),
(2, 4, 1, 350000.00),
(3, 2, 1, 12000.00),
(3, 3, 1, 35000.00);

INSERT INTO ShoppingCart (buyer_email)
VALUES
('cliente1@email.com'),
('cliente2@email.com');

INSERT INTO ShoppingCartProducts (cart_id, product_code, quantity)
VALUES
(1, 1, 1),
(1, 2, 2),
(2, 4, 1);

-- 3. ALTER TABLE
-- Agregar telefono del comprador y codigo de empleado del cajero

ALTER TABLE Invoices
ADD COLUMN buyer_phone VARCHAR(150);

ALTER TABLE Invoices
ADD COLUMN cashier_employee_code VARCHAR(150);

-- Actualizacion de datos de prueba despues del ALTER
UPDATE Invoices
SET buyer_phone = '8888-1111',
    cashier_employee_code = 'EMP001'
WHERE invoice_number = 1;

UPDATE Invoices
SET buyer_phone = '8888-2222',
    cashier_employee_code = 'EMP002'
WHERE invoice_number = 2;

UPDATE Invoices
SET buyer_phone = '8888-1111',
    cashier_employee_code = 'EMP001'
WHERE invoice_number = 3;

-- 4. CONSULTAS SELECT SOLICITADAS
-- Consultas sin JOIN ni sintaxis avanzada innecesaria

-- 4.1 Obtenga todos los productos almacenados
SELECT *
FROM Products;

-- 4.2 Obtenga todos los productos que tengan un precio mayor a 50000
SELECT *
FROM Products
WHERE price > 50000;

-- 4.3 Obtenga todas las compras de un mismo producto por id
-- Ejemplo usando el producto con codigo 2
SELECT *
FROM ProductsPerInvoice
WHERE product_code = 2;

-- 4.4 Obtenga todas las compras agrupadas por producto,
-- donde se muestre el total comprado entre todas las compras
SELECT
    product_code,
    SUM(quantity) AS total_quantity,
    SUM(total_amount) AS total_purchased
FROM ProductsPerInvoice
GROUP BY product_code;

-- 4.5 Obtenga todas las facturas realizadas por el mismo comprador
-- Ejemplo usando cliente1@email.com
SELECT *
FROM Invoices
WHERE buyer_email = 'cliente1@email.com';

-- 4.6 Obtenga todas las facturas ordenadas por monto total de forma descendente
SELECT *
FROM Invoices
ORDER BY total_amount DESC;

-- 4.7 Obtenga una sola factura por numero de factura
-- Ejemplo usando factura numero 1
SELECT *
FROM Invoices
WHERE invoice_number = 1;
