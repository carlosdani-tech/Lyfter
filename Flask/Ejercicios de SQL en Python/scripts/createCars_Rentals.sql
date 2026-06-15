-- SCRIPT 2: Create and populate cars table
-- and create rentals cross table

SET search_path TO lyfter_car_rental;

DROP TABLE IF EXISTS rentals;
DROP TABLE IF EXISTS cars;

CREATE TABLE cars (
    car_id SERIAL PRIMARY KEY,
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    manufacture_year INT NOT NULL CHECK (manufacture_year >= 1900),
    car_status VARCHAR(30) NOT NULL CHECK (
        car_status IN ('Disponible', 'Alquilado', 'Mantenimiento', 'Inactivo')
    )
);

INSERT INTO cars (
    brand,
    model,
    manufacture_year,
    car_status
)
VALUES
('Toyota', 'Corolla', 2020, 'Disponible'),
('Toyota', 'Yaris', 2019, 'Alquilado'),
('Toyota', 'RAV4', 2021, 'Disponible'),
('Honda', 'Civic', 2020, 'Disponible'),
('Honda', 'CR-V', 2022, 'Alquilado'),
('Hyundai', 'Accent', 2017, 'Disponible'),
('Hyundai', 'Elantra', 2019, 'Mantenimiento'),
('Hyundai', 'Tucson', 2021, 'Disponible'),
('Nissan', 'Sentra', 2018, 'Disponible'),
('Nissan', 'Versa', 2020, 'Alquilado'),

('Kia', 'Rio', 2019, 'Disponible'),
('Kia', 'Sportage', 2021, 'Disponible'),
('Mazda', 'Mazda 3', 2020, 'Alquilado'),
('Mazda', 'CX-5', 2022, 'Disponible'),
('Ford', 'Escape', 2018, 'Mantenimiento'),
('Ford', 'Focus', 2017, 'Disponible'),
('Chevrolet', 'Spark', 2016, 'Disponible'),
('Chevrolet', 'Trax', 2020, 'Alquilado'),
('Volkswagen', 'Jetta', 2019, 'Disponible'),
('Volkswagen', 'Tiguan', 2021, 'Disponible'),

('Suzuki', 'Swift', 2020, 'Disponible'),
('Suzuki', 'Vitara', 2022, 'Alquilado'),
('Mitsubishi', 'Lancer', 2017, 'Inactivo'),
('Mitsubishi', 'ASX', 2019, 'Disponible'),
('Subaru', 'Impreza', 2020, 'Disponible'),
('Subaru', 'Forester', 2021, 'Mantenimiento'),
('BMW', 'Serie 3', 2020, 'Disponible'),
('BMW', 'X1', 2022, 'Alquilado'),
('Mercedes-Benz', 'Clase A', 2021, 'Disponible'),
('Mercedes-Benz', 'GLA', 2022, 'Disponible'),

('Audi', 'A3', 2020, 'Alquilado'),
('Audi', 'Q3', 2021, 'Disponible'),
('Renault', 'Duster', 2019, 'Disponible'),
('Renault', 'Kwid', 2020, 'Mantenimiento'),
('Peugeot', '208', 2021, 'Disponible'),
('Peugeot', '3008', 2022, 'Alquilado'),
('Fiat', 'Argo', 2020, 'Disponible'),
('Fiat', 'Cronos', 2021, 'Disponible'),
('Jeep', 'Renegade', 2022, 'Alquilado'),
('Jeep', 'Compass', 2021, 'Disponible'),

('Isuzu', 'D-Max', 2020, 'Disponible'),
('Toyota', 'Hilux', 2021, 'Alquilado'),
('Nissan', 'Frontier', 2020, 'Disponible'),
('Ford', 'Ranger', 2022, 'Disponible'),
('Chevrolet', 'Colorado', 2021, 'Mantenimiento'),
('Honda', 'HR-V', 2020, 'Disponible'),
('Hyundai', 'Santa Fe', 2022, 'Alquilado'),
('Kia', 'Sorento', 2021, 'Disponible'),
('Mazda', 'CX-30', 2022, 'Disponible'),
('Volkswagen', 'Amarok', 2020, 'Inactivo');

CREATE TABLE rentals (
    rental_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    car_id INT NOT NULL,
    rental_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    rental_status VARCHAR(30) NOT NULL CHECK (
        rental_status IN ('Activo', 'Finalizado', 'Cancelado')
    ),

    CONSTRAINT fk_rentals_users
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_rentals_cars
        FOREIGN KEY (car_id)
        REFERENCES cars(car_id)
        ON DELETE CASCADE
);

INSERT INTO rentals (
    user_id,
    car_id,
    rental_status
)
VALUES
(1, 2, 'Activo'),
(2, 5, 'Activo'),
(3, 10, 'Finalizado'),
(4, 13, 'Activo'),
(5, 18, 'Cancelado'),
(6, 22, 'Activo'),
(7, 28, 'Finalizado'),
(8, 31, 'Activo'),
(9, 36, 'Activo'),
(10, 39, 'Finalizado'),
(11, 42, 'Activo'),
(12, 47, 'Cancelado'),
(13, 1, 'Finalizado'),
(14, 3, 'Activo'),
(15, 7, 'Cancelado');

SELECT * FROM cars;

SELECT COUNT(*) AS total_cars FROM cars;

SELECT 
    rentals.rental_id,
    users.user_id,
    users.full_name,
    users.email,
    cars.car_id,
    cars.brand,
    cars.model,
    cars.manufacture_year,
    rentals.rental_date,
    rentals.rental_status
FROM rentals
INNER JOIN users
    ON rentals.user_id = users.user_id
INNER JOIN cars
    ON rentals.car_id = cars.car_id
ORDER BY rentals.rental_id;

SELECT COUNT(*) AS total_rentals FROM rentals;