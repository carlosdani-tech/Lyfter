SET search_path TO lyfter_car_rental;

BEGIN;

UPDATE rentals
SET rental_status = 'Finalizado'
WHERE rental_id = 1;

UPDATE cars
SET car_status = 'Disponible'
WHERE car_id = (
    SELECT car_id
    FROM rentals
    WHERE rental_id = 1
);

COMMIT;

SELECT 
    rentals.rental_id,
    users.full_name,
    cars.brand,
    cars.model,
    rentals.rental_status,
    cars.car_status
FROM rentals
INNER JOIN users
    ON rentals.user_id = users.user_id
INNER JOIN cars
    ON rentals.car_id = cars.car_id
WHERE rentals.rental_id = 1;