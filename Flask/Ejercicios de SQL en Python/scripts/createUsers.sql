-- SCRIPT 1: Create and populate users table

SET search_path TO lyfter_car_rental;

DROP TABLE IF EXISTS rentals;
DROP TABLE IF EXISTS cars;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    birth_date DATE NOT NULL,
    account_status VARCHAR(20) NOT NULL CHECK (
        account_status IN ('Activo', 'Inactivo', 'Suspendido')
    )
);

INSERT INTO users (
    full_name,
    email,
    username,
    password,
    birth_date,
    account_status
)
VALUES
('Carlos Gutiérrez', 'carlos.gutierrez@example.com', 'carlosg', 'Pass1234', '2000-04-15', 'Activo'),
('María Fernández', 'maria.fernandez@example.com', 'mariaf', 'Pass1234', '1998-07-22', 'Activo'),
('José Ramírez', 'jose.ramirez@example.com', 'joser', 'Pass1234', '1995-02-10', 'Inactivo'),
('Ana Rodríguez', 'ana.rodriguez@example.com', 'anar', 'Pass1234', '2001-11-05', 'Activo'),
('Luis Morales', 'luis.morales@example.com', 'luism', 'Pass1234', '1997-09-18', 'Suspendido'),
('Valeria Castro', 'valeria.castro@example.com', 'valeriac', 'Pass1234', '2002-01-30', 'Activo'),
('Andrés Vargas', 'andres.vargas@example.com', 'andresv', 'Pass1234', '1999-06-12', 'Activo'),
('Sofía Jiménez', 'sofia.jimenez@example.com', 'sofiaj', 'Pass1234', '2003-03-27', 'Inactivo'),
('Daniel Rojas', 'daniel.rojas@example.com', 'danielr', 'Pass1234', '1996-12-08', 'Activo'),
('Camila Soto', 'camila.soto@example.com', 'camilas', 'Pass1234', '2000-08-14', 'Activo'),

('Diego Herrera', 'diego.herrera@example.com', 'diegoh', 'Pass1234', '1994-05-19', 'Suspendido'),
('Fernanda Arias', 'fernanda.arias@example.com', 'fernandaa', 'Pass1234', '1998-10-25', 'Activo'),
('Pablo Méndez', 'pablo.mendez@example.com', 'pablom', 'Pass1234', '2001-04-03', 'Activo'),
('Daniela Chacón', 'daniela.chacon@example.com', 'danielac', 'Pass1234', '1997-07-17', 'Inactivo'),
('Kevin Solís', 'kevin.solis@example.com', 'kevins', 'Pass1234', '1995-09-09', 'Activo'),
('Natalia Brenes', 'natalia.brenes@example.com', 'nataliab', 'Pass1234', '2002-12-21', 'Activo'),
('Gabriel Mora', 'gabriel.mora@example.com', 'gabrielm', 'Pass1234', '1999-01-11', 'Activo'),
('Melissa Alfaro', 'melissa.alfaro@example.com', 'melissaa', 'Pass1234', '1996-06-28', 'Suspendido'),
('Ricardo Campos', 'ricardo.campos@example.com', 'ricardoc', 'Pass1234', '2000-02-16', 'Activo'),
('Laura Aguilar', 'laura.aguilar@example.com', 'lauraa', 'Pass1234', '1998-03-06', 'Inactivo'),

('Esteban Navarro', 'esteban.navarro@example.com', 'estebann', 'Pass1234', '1997-11-29', 'Activo'),
('Paola Salazar', 'paola.salazar@example.com', 'paolas', 'Pass1234', '2001-05-13', 'Activo'),
('Javier León', 'javier.leon@example.com', 'javierl', 'Pass1234', '1995-08-20', 'Activo'),
('Karla Pineda', 'karla.pineda@example.com', 'karlap', 'Pass1234', '1999-09-24', 'Suspendido'),
('Marco Quesada', 'marco.quesada@example.com', 'marcoq', 'Pass1234', '1996-01-07', 'Activo'),
('Adriana Vega', 'adriana.vega@example.com', 'adrianav', 'Pass1234', '2003-07-02', 'Activo'),
('Sebastián Molina', 'sebastian.molina@example.com', 'sebastianm', 'Pass1234', '1994-10-31', 'Inactivo'),
('Mónica Cordero', 'monica.cordero@example.com', 'monicac', 'Pass1234', '1998-12-15', 'Activo'),
('Felipe Araya', 'felipe.araya@example.com', 'felipea', 'Pass1234', '1997-04-26', 'Activo'),
('Andrea Fallas', 'andrea.fallas@example.com', 'andreaf', 'Pass1234', '2000-06-04', 'Suspendido'),

('Alejandro Núñez', 'alejandro.nunez@example.com', 'alejandron', 'Pass1234', '1995-03-12', 'Activo'),
('Gabriela Segura', 'gabriela.segura@example.com', 'gabrielas', 'Pass1234', '2002-09-01', 'Activo'),
('Manuel Rivera', 'manuel.rivera@example.com', 'manuelr', 'Pass1234', '1999-11-23', 'Inactivo'),
('Patricia Esquivel', 'patricia.esquivel@example.com', 'patriciae', 'Pass1234', '1996-05-30', 'Activo'),
('Oscar Murillo', 'oscar.murillo@example.com', 'oscarm', 'Pass1234', '1994-02-14', 'Activo'),
('Rebeca Zúñiga', 'rebeca.zuniga@example.com', 'rebecaz', 'Pass1234', '2001-08-08', 'Suspendido'),
('Cristian Calderón', 'cristian.calderon@example.com', 'cristianc', 'Pass1234', '1998-01-19', 'Activo'),
('Lucía Acosta', 'lucia.acosta@example.com', 'luciaa', 'Pass1234', '2003-10-10', 'Activo'),
('Emilio Barrantes', 'emilio.barrantes@example.com', 'emiliob', 'Pass1234', '1997-12-03', 'Inactivo'),
('Isabella Montero', 'isabella.montero@example.com', 'isabellam', 'Pass1234', '2000-07-25', 'Activo'),

('Tomás Villalobos', 'tomas.villalobos@example.com', 'tomasv', 'Pass1234', '1996-09-16', 'Activo'),
('Elena Madrigal', 'elena.madrigal@example.com', 'elenam', 'Pass1234', '1999-04-09', 'Suspendido'),
('Rafael Porras', 'rafael.porras@example.com', 'rafaelp', 'Pass1234', '1995-06-18', 'Activo'),
('Viviana Zamora', 'viviana.zamora@example.com', 'vivianaz', 'Pass1234', '2002-11-11', 'Activo'),
('Héctor Blanco', 'hector.blanco@example.com', 'hectorb', 'Pass1234', '1994-08-27', 'Inactivo'),
('Silvia Corrales', 'silvia.corrales@example.com', 'silviac', 'Pass1234', '1998-02-05', 'Activo'),
('Mauricio Rivas', 'mauricio.rivas@example.com', 'mauricior', 'Pass1234', '1997-03-22', 'Activo'),
('Tatiana Gómez', 'tatiana.gomez@example.com', 'tatianag', 'Pass1234', '2001-12-19', 'Suspendido'),
('Bryan Salas', 'bryan.salas@example.com', 'bryans', 'Pass1234', '1999-05-06', 'Activo'),
('Noelia Céspedes', 'noelia.cespedes@example.com', 'noeliac', 'Pass1234', '2000-10-28', 'Activo');

SELECT * FROM users;

SELECT COUNT(*) AS total_users FROM users;
