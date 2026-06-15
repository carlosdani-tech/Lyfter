SET search_path TO lyfter_car_rental;

INSERT INTO cars (
    brand,
    model,
    manufacture_year,
    car_status
)
VALUES (
    'Toyota',
    'Prado',
    2023,
    'Disponible'
);

SELECT *
FROM cars
WHERE brand = 'Toyota'
AND model = 'Prado';