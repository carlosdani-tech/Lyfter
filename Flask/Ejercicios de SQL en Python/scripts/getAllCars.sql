SET search_path TO lyfter_car_rental;

SELECT 
    car_id,
    brand,
    model,
    manufacture_year,
    car_status
FROM cars
WHERE car_status = 'Alquilado'
ORDER BY car_id;

SELECT 
    car_id,
    brand,
    model,
    manufacture_year,
    car_status
FROM cars
WHERE car_status = 'Disponible'
ORDER BY car_id;