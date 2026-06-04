-- Script para ejercicios de joins-select

PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS Rents;
DROP TABLE IF EXISTS Books;
DROP TABLE IF EXISTS Customers;
DROP TABLE IF EXISTS Authors;

CREATE TABLE Authors (
    ID INTEGER PRIMARY KEY,
    Name TEXT NOT NULL
);

CREATE TABLE Books (
    ID INTEGER PRIMARY KEY,
    Name TEXT NOT NULL,
    AuthorID INTEGER NULL,
    FOREIGN KEY (AuthorID) REFERENCES Authors(ID)
);

CREATE TABLE Customers (
    ID INTEGER PRIMARY KEY,
    Name TEXT NOT NULL,
    Email TEXT NOT NULL
);

CREATE TABLE Rents (
    ID INTEGER PRIMARY KEY,
    BookID INTEGER NOT NULL,
    CustomerID INTEGER NOT NULL,
    State TEXT NOT NULL,
    FOREIGN KEY (BookID) REFERENCES Books(ID),
    FOREIGN KEY (CustomerID) REFERENCES Customers(ID)
);

INSERT INTO Authors (ID, Name) VALUES
(1, 'Miguel de Cervantes'),
(2, 'Dante Alighieri'),
(3, 'Takehiko Inoue'),
(4, 'Akira Toriyama'),
(5, 'Walt Disney');

INSERT INTO Books (ID, Name, AuthorID) VALUES
(1, 'Don Quijote', 1),
(2, 'La Divina Comedia', 2),
(3, 'Vagabond 1-3', 3),
(4, 'Dragon Ball 1', 4),
(5, 'The Book of the 5 Rings', NULL);

INSERT INTO Customers (ID, Name, Email) VALUES
(1, 'John Doe', 'j.doe@email.com'),
(2, 'Jane Doe', 'jane@doe.com'),
(3, 'Luke Skywalker', 'darthson@email.com');

INSERT INTO Rents (ID, BookID, CustomerID, State) VALUES
(1, 1, 2, 'Returned'),
(2, 2, 2, 'Returned'),
(3, 1, 1, 'On time'),
(4, 3, 1, 'On time'),
(5, 2, 2, 'Overdue');

-- 1. Todos los libros y sus autores, en caso de tenerlos
SELECT
    b.ID,
    b.Name AS BookName,
    a.Name AS AuthorName
FROM Books b
LEFT JOIN Authors a
    ON b.AuthorID = a.ID
ORDER BY b.ID;

-- 2. Todos los libros que no tienen autor
SELECT
    b.ID,
    b.Name AS BookName
FROM Books b
LEFT JOIN Authors a
    ON b.AuthorID = a.ID
WHERE a.ID IS NULL
ORDER BY b.ID;

-- 3. Todos los autores que no tienen libros
SELECT
    a.ID,
    a.Name AS AuthorName
FROM Authors a
LEFT JOIN Books b
    ON a.ID = b.AuthorID
WHERE b.ID IS NULL
ORDER BY a.ID;

-- 4. Todos los libros que han sido rentados en algun momento
SELECT DISTINCT
    b.ID,
    b.Name AS BookName
FROM Books b
INNER JOIN Rents r
    ON b.ID = r.BookID
ORDER BY b.ID;

-- 5. Todos los libros que nunca han sido rentados
SELECT
    b.ID,
    b.Name AS BookName
FROM Books b
LEFT JOIN Rents r
    ON b.ID = r.BookID
WHERE r.ID IS NULL
ORDER BY b.ID;

-- 6. Todos los clientes que nunca han rentado un libro
SELECT
    c.ID,
    c.Name AS CustomerName,
    c.Email
FROM Customers c
LEFT JOIN Rents r
    ON c.ID = r.CustomerID
WHERE r.ID IS NULL
ORDER BY c.ID;

-- 7. Todos los libros que han sido rentados y estan en estado Overdue
SELECT DISTINCT
    b.ID,
    b.Name AS BookName,
    r.State
FROM Books b
INNER JOIN Rents r
    ON b.ID = r.BookID
WHERE r.State = 'Overdue'
ORDER BY b.ID;

-- Consulta extra para demostrar GROUP BY
SELECT
    r.State,
    COUNT(*) AS TotalRents
FROM Rents r
GROUP BY r.State
ORDER BY TotalRents DESC;

-- Consulta extra para demostrar LIMIT
SELECT
    b.ID,
    b.Name
FROM Books b
ORDER BY b.ID
LIMIT 3;
