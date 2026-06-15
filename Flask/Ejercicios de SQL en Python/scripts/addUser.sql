SET search_path TO lyfter_car_rental;

INSERT INTO users (
    full_name,
    email,
    username,
    password,
    birth_date,
    account_status
)
VALUES (
    'Carlos Méndez',
    'carlos.mendez@example.com',
    'carlosmendez',
    'Pass1234',
    '1999-06-15',
    'Activo'
);

SELECT * 
FROM users
WHERE username = 'carlosmendez';