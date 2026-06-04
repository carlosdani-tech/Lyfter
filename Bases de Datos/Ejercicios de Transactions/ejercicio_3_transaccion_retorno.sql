-- Ejercicio 3: Transacción de Retorno de Productos

DO $$
DECLARE
    v_bill_id INT := 1;
    v_bill_exists INT;
    v_bill_status VARCHAR(20);
    v_detail RECORD;
BEGIN
    -- 1. Verificar que la factura exista
    SELECT COUNT(*)
    INTO v_bill_exists
    FROM bills
    WHERE bill_id = v_bill_id;

    IF v_bill_exists = 0 THEN
        RAISE EXCEPTION 'La factura con ID % no existe.', v_bill_id;
    END IF;

    -- 2. Verificar que la factura no haya sido retornada antes
    SELECT status
    INTO v_bill_status
    FROM bills
    WHERE bill_id = v_bill_id;

    IF v_bill_status = 'Returned' THEN
        RAISE EXCEPTION 'La factura con ID % ya fue retornada anteriormente.', v_bill_id;
    END IF;

    -- 3. Aumentar stock de los productos comprados
    FOR v_detail IN
        SELECT product_id, quantity
        FROM bill_details
        WHERE bill_id = v_bill_id
    LOOP
        UPDATE products
        SET stock = stock + v_detail.quantity
        WHERE product_id = v_detail.product_id;
    END LOOP;

    -- 4. Marcar la factura como retornada
    UPDATE bills
    SET status = 'Returned'
    WHERE bill_id = v_bill_id;

    RAISE NOTICE 'Retorno realizado correctamente para la factura ID: %',
        v_bill_id;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error en la transacción de retorno: %', SQLERRM;
        RAISE;
END $$;

-- Consultas para verificar resultado

SELECT * FROM bills;
SELECT * FROM bill_details;
SELECT * FROM products
ORDER BY product_id;