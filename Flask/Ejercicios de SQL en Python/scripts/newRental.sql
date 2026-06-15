SET search_path TO lyfter_car_rental;

BEGIN;

INSERT INTO rentals (
    user_id,
    car_id,
    rental_status
)
VALUES (
    2,
    3,
    'Activo'
);

UPDATE cars
SET car_status = 'Alquilado'
WHERE car_id = 3;

COMMIT;

SELECT 
    rentals.rental_id,
    users.full_name,
    users.email,
    cars.brand,
    cars.model,
    rentals.rental_date,
    rentals.rental_status,
    cars.car_status
FROM rentals
INNER JOIN users
    ON rentals.user_id = users.user_id
INNER JOIN cars
    ON rentals.car_id = cars.car_id
WHERE rentals.user_id = 2
AND rentals.car_id = 3
ORDER BY rentals.rental_id DESC;