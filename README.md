# API - Tienda

Documentación rápida de endpoints disponibles y ejemplos de payloads.

Base URL: `http://localhost:8080` (ajusta puerto si usas otro)

---

## Productos

- GET /api/productos
  - Descripción: Lista todos los productos.
  - Respuesta: `List<ProductoDTO>`

- GET /api/productos/categoria/{categoria}
  - Descripción: Lista productos por categoría.

- GET /api/productos/{id}
  - Descripción: Detalle de producto (incluye variantes e imágenes).
  - Respuesta: `ProductoDetalleDTO`

- POST /api/productos
  - Descripción: Crear un producto.
  - Body ejemplo:

```json
{
  "nombre": "Teclado Mecánico RGB",
  "descripcion": "Teclado switch blue con retroiluminación ajustable",
  "precio": 85.50,
  "categoria": "Electrónica",
  "imagenUrl": "https://ejemplo.com/fotos/teclado.jpg"
}
```
  - Respuesta: `ProductoDTO` (201 Created)

- PUT /api/productos/{id}
  - Descripción: Actualizar un producto.
  - Body: mismo formato que POST.
  - Respuesta: `ProductoDTO`

- DELETE /api/productos/{id}
  - Descripción: Eliminar producto.
  - Respuesta: 204 No Content

---

## Autenticación / Usuario

- POST /api/auth/registro
  - Body ejemplo:

```json
{
  "username": "maria",
  "email": "maria@ejemplo.com",
  "password": "Secreto123",
  "rol": "USER"
}
```
  - Respuesta: `AuthResponseDTO` (usuario y token)

- POST /api/auth/login
  - Body ejemplo:

```json
{
  "identifier": "maria",
  "password": "Secreto123"
}
```
  - Respuesta: `AuthResponseDTO` (token)

- GET /api/auth/me
  - Requiere header: `Authorization: Bearer {token}`
  - Respuesta: `UsuarioDTO`

---

## Carrito

- POST /api/carrito/agregar
  - Descripción: Agrega una variante al carrito.
  - Body ejemplo:

```json
{
  "varianteId": "11111111-2222-3333-4444-555555555555",
  "cantidad": 2,
  "usuarioId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  "sessionToken": "session_abc123"
}
```
  - Respuesta: `CarritoDTO`

- GET /api/carrito/usuario/{usuarioId}
  - Obtener carrito por usuario.

- GET /api/carrito/sesion/{sessionToken}
  - Obtener carrito por sesión (guest).

- DELETE /api/carrito/{carritoId}
  - Vaciar/eliminar carrito.

- PATCH /api/carrito/item/{carritoItemId}
  - Body ejemplo:

```json
{ "cantidad": 3 }
```
  - Actualiza la cantidad de un item.

- PATCH /api/carrito/item/{carritoItemId}/decrementar
  - Body opcional: `{ "cantidad": 1 }` (si se omite, puede decrementar 1)

- DELETE /api/carrito/item/{carritoItemId}
  - Elimina un item del carrito.

---

## Pedidos

- POST /api/pedidos/confirmar
  - Crea un pedido a partir de un carrito.
  - Body ejemplo:

```json
{
  "carritoId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  "emailContacto": "cliente@ejemplo.com"
}
```
  - Respuesta: `PedidoDTO`

- GET /api/pedidos/usuario/{usuarioId}
  - Historial de pedidos por usuario.

- GET /api/pedidos/email/{emailContacto}
  - Historial por email de contacto.

---

## Notas

- Los DTOs principales son `ProductoDTO`, `ProductoDetalleDTO`, `ProductoVarianteDTO`, `CarritoDTO`, `PedidoDTO`, `UsuarioDTO`.
- Para endpoints protegidos (si aplica), añade el header `Authorization: Bearer {token}`.
- UUIDs en payloads deben usar el formato estándar (ej. `11111111-2222-3333-4444-555555555555`).

---

## Ejemplos curl

Crear producto:

```bash
curl -X POST http://localhost:8080/api/productos \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Teclado Mecánico RGB","descripcion":"Teclado switch blue","precio":85.5,"categoria":"Electrónica","imagenUrl":"https://ejemplo.com/fotos/teclado.jpg"}'
```

Obtener lista de productos:

```bash
curl http://localhost:8080/api/productos
```

Eliminar producto:

```bash
curl -X DELETE http://localhost:8080/api/productos/{id}
```
