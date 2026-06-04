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

Dependencias funcionales observables y reglas de negocio:

1. `VIN -> Year, Color`
2. `OwnerID -> OwnerName, OwnerPhone`
3. `(VIN, OwnerID) -> InsurancePolicy`
4. `InsurancePolicy -> InsuranceCompany`

Ademas, segun el feedback recibido:

- `Make` y `Model` no deben quedar almacenados como si dependieran de un `VIN` individual.
- Muchos autos distintos pueden compartir la misma marca y el mismo modelo.
- Por eso, `Make` y `Model` deben tratarse como informacion de catalogo reutilizable.

Justificacion:

- `VIN` identifica una unidad fisica especifica.
- `OwnerID` identifica al propietario.
- La poliza queda asociada a la relacion vehiculo-propietario.
- La compania aseguradora depende de la poliza emitida.
- La marca y el modelo describen tipos de vehiculo, no unidades individuales.

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

- Si cambia un dato del vehiculo, hay varias filas por revisar si ese auto tiene varios propietarios.
- Si cambia el telefono del propietario, tambien habria multiples filas por actualizar.

Descomposicion inicial a 2FN:

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

# Tabla `INSURANCE_POLICY_2FN`

| InsurancePolicy | InsuranceCompany |
| --- | --- |
| Fire & Theft | ABC Insurance |
| Full Cover | XYZ Insurance |
| Collision | DEF Insurance |
| Basic Legal | GHI Insurance |

# Tabla `CAR_OWNER_POLICY_2FN`

| VIN | OwnerID | InsurancePolicy |
| --- | --- | --- |
| 1HG CM8 2633 A | 101 | Fire & Theft |
| 1HG CM8 2633 A | 102 | Full Cover |
| 5J6R M4H 79EL | 103 | Collision |
| 1G1R A6EH 1FU | 104 | Basic Legal |

Justificacion adicional:

- La primera descomposicion quita las dependencias parciales de `VIN` y `OwnerID`.
- Siguiendo el feedback, tambien conviene separar `InsuranceCompany`, porque esa informacion depende de la poliza y no del par `(VIN, OwnerID)`.

# Paso a tercera forma normal (3FN)

La estructura anterior aun debe refinarse por dos razones:

1. `Make` y `Model` siguen repetidos dentro de `CAR_2FN`.
2. La informacion de seguros todavia debe expresarse como compania y poliza separadas formalmente.

Por eso, la descomposicion final a 3FN queda asi:

# Tabla `MAKE`

| MakeID | MakeName |
| --- | --- |
| MK01 | Honda |
| MK02 | Chevrolet |

# Tabla `MODEL`

| ModelID | MakeID | ModelName |
| --- | --- | --- |
| MD01 | MK01 | Accord |
| MD02 | MK01 | CR-V |
| MD03 | MK02 | Volt |

# Tabla `CAR`

| VIN | ModelID | Year | Color |
| --- | --- | --- | --- |
| 1HG CM8 2633 A | MD01 | 2003 | Silver |
| 5J6R M4H 79EL | MD02 | 2014 | Blue |
| 1G1R A6EH 1FU | MD03 | 2015 | Red |

# Tabla `OWNER`

| OwnerID | OwnerName | OwnerPhone |
| --- | --- | --- |
| 101 | Alice | 123-456-7890 |
| 102 | Bob | 987-654-3210 |
| 103 | Claire | 555-123-4567 |
| 104 | Dave | 111-222-3333 |

# Tabla `INSURANCE_COMPANY`

| InsuranceCompanyID | InsuranceCompanyName |
| --- | --- |
| IC01 | ABC Insurance |
| IC02 | XYZ Insurance |
| IC03 | DEF Insurance |
| IC04 | GHI Insurance |

# Tabla `INSURANCE_POLICY`

| PolicyID | InsuranceCompanyID | PolicyName |
| --- | --- | --- |
| PL01 | IC01 | Fire & Theft |
| PL02 | IC02 | Full Cover |
| PL03 | IC03 | Collision |
| PL04 | IC04 | Basic Legal |

# Tabla `CAR_OWNER_POLICY`

| VIN | OwnerID | PolicyID |
| --- | --- | --- |
| 1HG CM8 2633 A | 101 | PL01 |
| 1HG CM8 2633 A | 102 | PL02 |
| 5J6R M4H 79EL | 103 | PL03 |
| 1G1R A6EH 1FU | 104 | PL04 |

Justificacion:

- `MAKE` evita repetir la marca en cada auto.
- `MODEL` guarda el modelo y lo vincula con su marca.
- `CAR` conserva solo los datos propios de la unidad identificada por `VIN`.
- `INSURANCE_COMPANY` guarda cada aseguradora una sola vez.
- `INSURANCE_POLICY` guarda cada poliza y la enlaza con su compania.
- `CAR_OWNER_POLICY` deja solo la relacion entre auto, propietario y poliza.

# Resultado final para `Cars`

Esquema final en 3FN:

- `MAKE(MakeID, MakeName)`
- `MODEL(ModelID, MakeID, ModelName)`
- `CAR(VIN, ModelID, Year, Color)`
- `OWNER(OwnerID, OwnerName, OwnerPhone)`
- `INSURANCE_COMPANY(InsuranceCompanyID, InsuranceCompanyName)`
- `INSURANCE_POLICY(PolicyID, InsuranceCompanyID, PolicyName)`
- `CAR_OWNER_POLICY(VIN, OwnerID, PolicyID)`

Claves:

- `MAKE`: `MakeID`
- `MODEL`: `ModelID`
- `CAR`: `VIN`
- `OWNER`: `OwnerID`
- `INSURANCE_COMPANY`: `InsuranceCompanyID`
- `INSURANCE_POLICY`: `PolicyID`
- `CAR_OWNER_POLICY`: `(VIN, OwnerID)`

Llaves foraneas:

- `MODEL.MakeID -> MAKE.MakeID`
- `CAR.ModelID -> MODEL.ModelID`
- `INSURANCE_POLICY.InsuranceCompanyID -> INSURANCE_COMPANY.InsuranceCompanyID`
- `CAR_OWNER_POLICY.VIN -> CAR.VIN`
- `CAR_OWNER_POLICY.OwnerID -> OWNER.OwnerID`
- `CAR_OWNER_POLICY.PolicyID -> INSURANCE_POLICY.PolicyID`

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

Se separaron siete entidades:

1. Fabricante
2. Modelo
3. Auto
4. Propietario
5. Compania de seguros
6. Poliza
7. Relacion auto-propietario-poliza

La razon principal fue eliminar:

- Dependencias parciales de los datos del auto respecto a `VIN`
- Dependencias parciales de los datos del propietario respecto a `OwnerID`
- Repeticion innecesaria de marca y modelo en cada vehiculo
- Repeticion innecesaria de la compania de seguros en cada relacion vehiculo-propietario
