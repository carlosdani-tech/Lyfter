-- Ejercicio 2: Transacción de Compra

DO $$
DECLARE
    v_user_id INT := 1;
    v_bill_id INT;
    v_total NUMERIC(10, 2) := 0;
    v_user_exists INT;
    v_product RECORD;
BEGIN
    -- 1. Validar que el usuario exista
    SELECT COUNT(*)
    INTO v_user_exists
    FROM users_app
    WHERE user_id = v_user_id;

    IF v_user_exists = 0 THEN
        RAISE EXCEPTION 'El usuario con ID % no existe.', v_user_id;
    END IF;

    -- 2. Crear tabla temporal con los productos a comprar
    CREATE TEMP TABLE temp_purchase (
        product_id INT,
        quantity INT
    ) ON COMMIT DROP;

    INSERT INTO temp_purchase (product_id, quantity)
    VALUES 
    (2, 2),
    (3, 1);

    -- 3. Validar que todos los productos existan
    IF EXISTS (
        SELECT 1
        FROM temp_purchase tp
        LEFT JOIN products p ON p.product_id = tp.product_id
        WHERE p.product_id IS NULL
    ) THEN
        RAISE EXCEPTION 'Uno o más productos no existen.';
    END IF;

    -- 4. Validar que haya stock suficiente
    IF EXISTS (
        SELECT 1
        FROM temp_purchase tp
        INNER JOIN products p ON p.product_id = tp.product_id
        WHERE p.stock < tp.quantity
    ) THEN
        RAISE EXCEPTION 'No hay stock suficiente para uno o más productos.';
    END IF;

    -- 5. Insertar factura
    INSERT INTO bills (user_id, status, total)
    VALUES (v_user_id, 'Completed', 0)
    RETURNING bill_id INTO v_bill_id;

    -- 6. Insertar detalle de factura
    INSERT INTO bill_details (
        bill_id,
        product_id,
        quantity,
        unit_price,
        subtotal
    )
    SELECT
        v_bill_id,
        p.product_id,
        tp.quantity,
        p.price,
        p.price * tp.quantity
    FROM temp_purchase tp
    INNER JOIN products p ON p.product_id = tp.product_id;

    -- 7. Calcular total de la factura
    SELECT SUM(subtotal)
    INTO v_total
    FROM bill_details
    WHERE bill_id = v_bill_id;

    UPDATE bills
    SET total = v_total
    WHERE bill_id = v_bill_id;

    -- 8. Reducir stock de productos
    FOR v_product IN
        SELECT product_id, quantity
        FROM temp_purchase
    LOOP
        UPDATE products
        SET stock = stock - v_product.quantity
        WHERE product_id = v_product.product_id;
    END LOOP;

    RAISE NOTICE 'Compra realizada correctamente. Factura ID: %, Total: %',
        v_bill_id, v_total;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error en la transacción de compra: %', SQLERRM;
        RAISE;
END $$;

-- Consultas para verificar resultado

SELECT * FROM bills;
SELECT * FROM bill_details;
SELECT * FROM products
ORDER BY product_id;