SET search_path TO lyfter_car_rental;

UPDATE users
SET account_status = 'Suspendido'
WHERE user_id = 1;

SELECT
    user_id,
    full_name,
    email,
    account_status
FROM users
WHERE user_id = 1;
