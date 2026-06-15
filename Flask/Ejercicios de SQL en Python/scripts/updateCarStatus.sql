SET search_path TO lyfter_car_rental;

UPDATE cars
SET car_status = 'Mantenimiento'
WHERE car_id = 1;

SELECT 
    car_id,
    brand,
    model,
    manufacture_year,
    car_status
FROM cars
WHERE car_id = 1;