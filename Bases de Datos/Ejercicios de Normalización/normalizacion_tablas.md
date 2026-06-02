# Normalizacion de las tablas

# 1. Tabla `Orders`

# Tabla original

Relacion original:

`ORDERS(OrderID, CustomerName, CustomerPhone, Address, ItemID, ItemName, Price, Quantity, SpecialRequest, DeliveryTime)`

Datos originales:

| OrderID | CustomerName | CustomerPhone | Address | ItemID | ItemName | Price | Quantity | SpecialRequest | DeliveryTime |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 001 | Alice | 123-456-7890 | 123 Main St | 101 | Cheeseburger | 8 | 2 | No onions | 6:00 pm |
| 001 | Alice | 123-456-7890 | 123 Main St | 102 | Fries | 3 | 1 | Extra ketchup | 6:00 pm |
| 002 | Bob | 987-654-3210 | 456 Elm St | 103 | Pizza | 12 | 1 | Extra cheese | 7:30 pm |
| 002 | Bob | 987-654-3210 | 456 Elm St | 102 | Fries | 3 | 2 | None | 7:30 pm |
| 003 | Claire | 555-123-4567 | 789 Oak St | 105 | Salad | 6 | 1 | No croutons | 12:00 pm |
| 004 | Claire | 555-123-4567 | 464 Georgia ST | 106 | Water | 1 | 1 | None | 5:00 pm |

# Clave candidata y dependencias funcionales

Como un mismo `OrderID` puede tener varios articulos, una clave natural razonable en la tabla original es:

`(OrderID, ItemID)`

Dependencias funcionales observables:

1. `OrderID -> CustomerName, CustomerPhone, Address, DeliveryTime`
2. `ItemID -> ItemName, Price`
3. `(OrderID, ItemID) -> Quantity, SpecialRequest`
4. `CustomerPhone -> CustomerName`

Justificacion:

- Los datos del cliente y la entrega describen al pedido, no al articulo del pedido.
- `ItemID` identifica el producto y su precio.
- `Quantity` y `SpecialRequest` dependen de la combinacion pedido-articulo.
- En la muestra, el telefono del cliente se repite para la misma persona. Eso permite separar la entidad cliente.
- `Address` no se lleva a cliente, porque Claire aparece con el mismo telefono pero con dos direcciones distintas; por tanto la direccion depende del pedido.

# Primera forma normal (1FN)

La tabla ya cumple 1FN porque:

- Cada celda contiene un valor atomico.
- No hay listas dentro de una sola columna.
- Los articulos repetidos del pedido ya estan representados como filas separadas.

Por tanto, en 1FN la relacion queda igual:

`ORDERS_1FN(OrderID, CustomerName, CustomerPhone, Address, ItemID, ItemName, Price, Quantity, SpecialRequest, DeliveryTime)`

# Paso a segunda forma normal (2FN)

La tabla no esta en 2FN porque la clave es compuesta `(OrderID, ItemID)` y existen dependencias parciales:

- `OrderID -> CustomerName, CustomerPhone, Address, DeliveryTime`
- `ItemID -> ItemName, Price`

Eso genera redundancia y anomalias:

- Si cambia el telefono de Alice, hay que actualizar varias filas.
- Si cambia el precio de Fries, hay que actualizar todas las filas donde aparece `ItemID = 102`.
- No se puede registrar un producto nuevo sin insertarlo dentro de un pedido.

Descomposicion a 2FN:

# Tabla `ORDER_2FN`

| OrderID | CustomerName | CustomerPhone | Address | DeliveryTime |
| --- | --- | --- | --- | --- |
| 001 | Alice | 123-456-7890 | 123 Main St | 6:00 pm |
| 002 | Bob | 987-654-3210 | 456 Elm St | 7:30 pm |
| 003 | Claire | 555-123-4567 | 789 Oak St | 12:00 pm |
| 004 | Claire | 555-123-4567 | 464 Georgia ST | 5:00 pm |

# Tabla `ITEM_2FN`

| ItemID | ItemName | Price |
| --- | --- | --- |
| 101 | Cheeseburger | 8 |
| 102 | Fries | 3 |
| 103 | Pizza | 12 |
| 105 | Salad | 6 |
| 106 | Water | 1 |

# Tabla `ORDER_DETAIL_2FN`

| OrderID | ItemID | Quantity | SpecialRequest |
| --- | --- | --- | --- |
| 001 | 101 | 2 | No onions |
| 001 | 102 | 1 | Extra ketchup |
| 002 | 103 | 1 | Extra cheese |
| 002 | 102 | 2 | None |
| 003 | 105 | 1 | No croutons |
| 004 | 106 | 1 | None |

# Paso a tercera forma normal (3FN)

En `ORDER_2FN` todavia hay una dependencia transitiva:

`OrderID -> CustomerPhone -> CustomerName`

Ademas, el cliente es una entidad propia que se repite entre pedidos. Por eso se separa en una tabla independiente.

Descomposicion final a 3FN:

# Tabla `CUSTOMER`

| CustomerID | CustomerName | CustomerPhone |
| --- | --- | --- |
| C001 | Alice | 123-456-7890 |
| C002 | Bob | 987-654-3210 |
| C003 | Claire | 555-123-4567 |

# Tabla `ORDER`

| OrderID | CustomerID | Address | DeliveryTime |
| --- | --- | --- | --- |
| 001 | C001 | 123 Main St | 6:00 pm |
| 002 | C002 | 456 Elm St | 7:30 pm |
| 003 | C003 | 789 Oak St | 12:00 pm |
| 004 | C003 | 464 Georgia ST | 5:00 pm |

# Tabla `ITEM`

| ItemID | ItemName | Price |
| --- | --- | --- |
| 101 | Cheeseburger | 8 |
| 102 | Fries | 3 |
| 103 | Pizza | 12 |
| 105 | Salad | 6 |
| 106 | Water | 1 |

# Tabla `ORDER_DETAIL`

| OrderID | ItemID | Quantity | SpecialRequest |
| --- | --- | --- | --- |
| 001 | 101 | 2 | No onions |
| 001 | 102 | 1 | Extra ketchup |
| 002 | 103 | 1 | Extra cheese |
| 002 | 102 | 2 | None |
| 003 | 105 | 1 | No croutons |
| 004 | 106 | 1 | None |

# Resultado final para `Orders`

Esquema final en 3FN:

- `CUSTOMER(CustomerID, CustomerName, CustomerPhone)`
- `ORDER(OrderID, CustomerID, Address, DeliveryTime)`
- `ITEM(ItemID, ItemName, Price)`
- `ORDER_DETAIL(OrderID, ItemID, Quantity, SpecialRequest)`

Claves:

- `CUSTOMER`: `CustomerID`
- `ORDER`: `OrderID`
- `ITEM`: `ItemID`
- `ORDER_DETAIL`: `(OrderID, ItemID)`

Llaves foraneas:

- `ORDER.CustomerID -> CUSTOMER.CustomerID`
- `ORDER_DETAIL.OrderID -> ORDER.OrderID`
- `ORDER_DETAIL.ItemID -> ITEM.ItemID`

---

# 2. Tabla `Cars`

# Tabla original

Relacion original:

`CARS(VIN, Make, Model, Year, Color, OwnerID, OwnerName, OwnerPhone, InsuranceCompany, InsurancePolicy)`

Datos originales:

| VIN | Make | Model | Year | Color | OwnerID | OwnerName | OwnerPhone | InsuranceCompany | InsurancePolicy |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1HG CM8 2633 A | Honda | Accord | 2003 | Silver | 101 | Alice | 123-456-7890 | ABC Insurance | Fire & Theft |
| 1HG CM8 2633 A | Honda | Accord | 2003 | Silver | 102 | Bob | 987-654-3210 | XYZ Insurance | Full Cover |
| 5J6R M4H 79EL | Honda | CR-V | 2014 | Blue | 103 | Claire | 555-123-4567 | DEF Insurance | Collision |
| 1G1R A6EH 1FU | Chevrolet | Volt | 2015 | Red | 104 | Dave | 111-222-3333 | GHI Insurance | Basic Legal |

# Clave candidata y dependencias funcionales

Como un mismo `VIN` aparece con mas de un propietario, una clave natural razonable en la tabla original es:

`(VIN, OwnerID)`

Dependencias funcionales observables:

1. `VIN -> Make, Model, Year, Color`
2. `OwnerID -> OwnerName, OwnerPhone`
3. `(VIN, OwnerID) -> InsuranceCompany, InsurancePolicy`

Justificacion:

- Los datos tecnicos del vehiculo dependen solo del `VIN`.
- Los datos del propietario dependen solo del `OwnerID`.
- La informacion del seguro queda asociada a la relacion entre vehiculo y propietario en esta muestra.

# Primera forma normal (1FN)

La tabla ya cumple 1FN porque:

- Todos los atributos son atomicos.
- Cada fila representa una ocurrencia unica vehiculo-propietario.

Por tanto, en 1FN la relacion queda igual:

`CARS_1FN(VIN, Make, Model, Year, Color, OwnerID, OwnerName, OwnerPhone, InsuranceCompany, InsurancePolicy)`

# Paso a segunda forma normal (2FN)

La tabla no esta en 2FN porque la clave es compuesta `(VIN, OwnerID)` y existen dependencias parciales:

- `VIN -> Make, Model, Year, Color`
- `OwnerID -> OwnerName, OwnerPhone`

Eso produce redundancia:

- Si cambia el color o modelo del auto, hay varias filas por revisar si ese auto tiene varios propietarios.
- Si cambia el telefono del propietario, tambien habria multiples filas por actualizar.

Descomposicion a 2FN:

# Tabla `CAR_2FN`

| VIN | Make | Model | Year | Color |
| --- | --- | --- | --- | --- |
| 1HG CM8 2633 A | Honda | Accord | 2003 | Silver |
| 5J6R M4H 79EL | Honda | CR-V | 2014 | Blue |
| 1G1R A6EH 1FU | Chevrolet | Volt | 2015 | Red |

# Tabla `OWNER_2FN`

| OwnerID | OwnerName | OwnerPhone |
| --- | --- | --- |
| 101 | Alice | 123-456-7890 |
| 102 | Bob | 987-654-3210 |
| 103 | Claire | 555-123-4567 |
| 104 | Dave | 111-222-3333 |

# Tabla `CAR_OWNER_INSURANCE_2FN`

| VIN | OwnerID | InsuranceCompany | InsurancePolicy |
| --- | --- | --- | --- |
| 1HG CM8 2633 A | 101 | ABC Insurance | Fire & Theft |
| 1HG CM8 2633 A | 102 | XYZ Insurance | Full Cover |
| 5J6R M4H 79EL | 103 | DEF Insurance | Collision |
| 1G1R A6EH 1FU | 104 | GHI Insurance | Basic Legal |

# Paso a tercera forma normal (3FN)

Despues de la descomposicion anterior no quedan dependencias transitivas evidentes entre atributos no clave:

- En `CAR_2FN`, todos los atributos dependen de `VIN`.
- En `OWNER_2FN`, todos los atributos dependen de `OwnerID`.
- En `CAR_OWNER_INSURANCE_2FN`, los atributos restantes dependen de la clave compuesta `(VIN, OwnerID)`.

Por eso, en este caso, la estructura en 2FN ya cumple 3FN.

# Resultado final para `Cars`

Esquema final en 3FN:

- `CAR(VIN, Make, Model, Year, Color)`
- `OWNER(OwnerID, OwnerName, OwnerPhone)`
- `CAR_OWNER_INSURANCE(VIN, OwnerID, InsuranceCompany, InsurancePolicy)`

Claves:

- `CAR`: `VIN`
- `OWNER`: `OwnerID`
- `CAR_OWNER_INSURANCE`: `(VIN, OwnerID)`

Llaves foraneas:

- `CAR_OWNER_INSURANCE.VIN -> CAR.VIN`
- `CAR_OWNER_INSURANCE.OwnerID -> OWNER.OwnerID`

---

# 3. Resumen de la solucion final

# Para `Orders`

Se separaron cuatro entidades:

1. Cliente
2. Pedido
3. Item
4. Detalle del pedido

La razon principal fue eliminar:

- Dependencias parciales por el uso de una clave compuesta `(OrderID, ItemID)`
- Dependencias transitivas entre pedido y cliente
- Redundancia de datos de cliente y producto

# Para `Cars`

Se separaron tres entidades:

1. Auto
2. Propietario
3. Relacion auto-propietario-seguro

La razon principal fue eliminar:

- Dependencias parciales de los datos del auto respecto a `VIN`
- Dependencias parciales de los datos del propietario respecto a `OwnerID`

En esta tabla no fue necesario descomponer mas alla porque, una vez separadas esas entidades, no quedaron dependencias transitivas claras.