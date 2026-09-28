# Taller de Dockerización de API con Nginx

## 1. Descripción de la solución

La solución implementa una API REST desarrollada con **Node.js, Express
y TypeScript**, dockerizada y desplegada mediante **Docker Compose**,
utilizando **Nginx como Reverse Proxy**.

La arquitectura busca aislar el backend dentro de una red interna de
Docker y evitar que el puerto `3000` de la API quede publicado
directamente en el Host. El único punto de entrada público es Nginx, que
escucha en el puerto `8080` y reenvía las solicitudes al servicio `api`
en el puerto interno `3000`.

La API implementa los siguientes endpoints:

- `GET /` --- Información de la API.
- `GET /health` --- Estado del servicio.
- `GET /api/products` --- Lista de productos.
- `GET /api/products/:id` --- Consulta de un producto específico.

El puerto de la aplicación se obtiene mediante la variable de entorno
`PORT`, utilizando `3000` como valor predeterminado.

Además, como reto adicional, se incorporó un tercer servicio **Redis**
para comprobar el descubrimiento de servicios mediante los nombres DNS
internos proporcionados por Docker Compose.

---

## 2. Arquitectura implementada

La solución está compuesta por tres servicios:

```text
                         HOST
                          │
                          │ HTTP :8080
                          ▼
                 ┌─────────────────┐
                 │      Nginx      │
                 │ Reverse Proxy   │
                 │     :8080       │
                 └────────┬────────┘
                          │
                          │ http://api:3000
                          │ Docker DNS
                          ▼
                 ┌─────────────────┐
                 │       API       │
                 │ Node.js/Express │
                 │     :3000       │
                 └─────────────────┘

                 ┌─────────────────┐
                 │      Redis      │
                 │     :6379       │
                 └─────────────────┘

              Docker Compose Network
                  taller-docker_default
```

### Servicios

Servicio Imagen / construcción Puerto interno Puerto publicado

---

`api` Imagen construida mediante `Dockerfile` `3000` Ninguno
`nginx` `nginx:alpine` `8080` `8080:8080`
`redis` `redis:alpine` `6379` Ninguno

### Flujo de una solicitud

Cuando el usuario ejecuta:

```bash
curl http://localhost:8080/health
```

la solicitud sigue este flujo:

```text
Host
  │
  │ localhost:8080
  ▼
Nginx
  │
  │ api:3000
  ▼
Node.js / Express
  │
  ▼
Respuesta HTTP
```

Nginx utiliza:

```nginx
proxy_pass http://api:3000;
```

El nombre `api` corresponde al nombre del servicio definido en
`compose.yaml`. Docker Compose proporciona DNS interno para resolver ese
nombre hacia la IP privada del contenedor.

### Estructura del proyecto

```text
taller-docker-nginx/
├── src/
│   └── server.ts
├── nginx/
│   └── nginx.conf
├── Dockerfile
├── compose.yaml
├── package.json
├── package-lock.json
└── README.md
```

---

## 3. Instrucciones para ejecutar el proyecto

### Requisitos

Se requiere tener instalados:

- Docker
- Docker Compose

El proyecto utiliza Docker Compose para construir y ejecutar todos los
servicios.

### 3.1 Construir y levantar el proyecto

Desde la raíz del proyecto:

```bash
docker compose up -d --build
```

El parámetro `--build` fuerza la construcción de la imagen de la API a
partir del `Dockerfile`.

### 3.2 Verificar el estado de los servicios

```bash
docker compose ps
```

La ejecución final mostró los servicios:

```text
backend-api
redis
taller-docker-nginx-1
```

correspondientes a:

```text
api
redis
nginx
```

### 3.3 Probar la API a través de Nginx

Información de la API:

```bash
curl http://localhost:8080/
```

Health check:

```bash
curl http://localhost:8080/health
```

Respuesta esperada:

```json
{
  "status": "ok",
  "service": "backend-api"
}
```

Lista de productos:

```bash
curl http://localhost:8080/api/products
```

Consulta de un producto:

```bash
curl http://localhost:8080/api/products/1
```

### 3.4 Detener el proyecto

```bash
docker compose down
```

Este comando detiene y elimina los contenedores y la red creada por
Docker Compose.

---

## 4. Comandos Docker utilizados

### Construcción de la imagen

```bash
docker build -t backend-api .
```

Construye la imagen de la API utilizando el `Dockerfile`.

### Ejecución individual del backend

Durante la etapa de prueba individual se utilizó:

```bash
docker run -d \
  --name backend-api \
  -p 3000:3000 \
  -e PORT=3000 \
  backend-api
```

Esto permitió validar la API antes de integrarla con Nginx.

### Ver contenedores en ejecución

```bash
docker ps
```

### Consultar logs

```bash
docker logs backend-api
```

Con Docker Compose:

```bash
docker compose logs nginx
docker compose logs api
```

### Inspeccionar un contenedor

```bash
docker inspect backend-api
```

Este comando permitió identificar información como:

- ID del contenedor.
- Imagen utilizada.
- Variables de entorno.
- Red.
- Dirección IP.
- Puertos.

### Levantar el stack completo

```bash
docker compose up -d --build
```

### Consultar el estado del stack

```bash
docker compose ps
```

### Detener y eliminar el stack

```bash
docker compose down
```

### Consultar las redes Docker

```bash
docker network ls
```

### Inspeccionar la red de Compose

```bash
docker network inspect taller-docker_default
```

---

## 5. Explicación de `ports` vs `expose`

Aunque ambos se relacionan con puertos de los contenedores, tienen
propósitos diferentes.

### `ports`

`ports` publica un puerto del contenedor en el Host.

Por ejemplo:

```yaml
ports:
  - "8080:8080"
```

significa:

```text
Puerto del Host 8080
        │
        ▼
Puerto del contenedor 8080
```

Esto permite acceder al servicio desde la máquina Host mediante:

```text
http://localhost:8080
```

En este proyecto se utiliza `ports` únicamente en Nginx:

```yaml
nginx:
  ports:
    - "8080:8080"
```

De esta manera, Nginx constituye la única entrada pública de la
aplicación.

### `expose`

`expose` indica el puerto que utiliza un servicio para la comunicación
interna entre contenedores, sin publicarlo directamente en el Host.

En la API:

```yaml
api:
  expose:
    - "3000"
```

La API escucha en el puerto `3000`, pero no existe un mapeo:

```yaml
ports:
  - "3000:3000"
```

Por lo tanto, el Host no puede acceder directamente mediante:

```text
http://localhost:3000
```

La comunicación correcta es:

```text
Nginx → api:3000
```

### Comparación

Característica `ports` `expose`

---

Acceso desde el Host Sí No
Comunicación entre contenedores Sí Sí
Publica el puerto en el Host Sí No
Uso en este proyecto Nginx `8080:8080` API `3000` y Redis `6379`

La configuración implementada permite mantener el backend aislado y
hacer que Nginx sea el único servicio accesible desde el exterior.

---

## 6. Explicación de `localhost` vs nombre del servicio Docker

Esta diferencia es fundamental para comprender la comunicación entre
contenedores.

### `localhost`

`localhost`, equivalente a `127.0.0.1`, hace referencia al propio
entorno de red en el que se ejecuta el proceso.

Dentro del contenedor de Nginx:

```text
localhost
```

hace referencia al **contenedor de Nginx**, no al contenedor de la API.

Por eso esta configuración es incorrecta:

```nginx
proxy_pass http://localhost:3000;
```

Nginx intentará encontrar un servicio escuchando en el puerto `3000`
dentro de su propio contenedor.

Como la API Express está en otro contenedor, la conexión falla.

### Nombre del servicio

Docker Compose crea una red privada para los servicios y proporciona
resolución DNS interna.

Como el servicio está definido como:

```yaml
services:
  api:
```

otros contenedores de la misma red pueden acceder a él utilizando:

```text
api
```

Por eso Nginx debe utilizar:

```nginx
proxy_pass http://api:3000;
```

Docker resuelve:

```text
api
 ↓
IP privada del contenedor de la API
 ↓
puerto 3000
```

### Resumen

```text
Dentro de Nginx:

localhost:3000
     │
     └──> Nginx mismo

api:3000
     │
     └──> Contenedor de la API
```

---

## 7. Evidencias de las pruebas realizadas

### 7.1 Inspección del contenedor individual

Durante la prueba independiente del backend se utilizó:

```bash
docker inspect backend-api
```

Los datos identificados fueron:

```text
ID del contenedor:
dd0b650eca647b616ff8a5f50d7d237bedef47d3be086d347589c3cfc6ff0ada

Imagen:
sha256:cb107d17a6d4cfcd4678c21b50e3afe522021c3659f9569f3e178e62650e2ff9

Puerto expuesto:
3000/tcp

Variables de entorno:
PORT=3000
NODE_VERSION=24.21.0
YARN_VERSION=1.22.22

Red:
bridge

Estado:
Running
```

### 7.2 Estado final de Docker Compose

La ejecución de:

```bash
docker compose ps
```

mostró los servicios:

```text
NAME                         IMAGE                    SERVICE
backend-api                  taller-docker-api        api
redis                        redis:alpine             redis
taller-docker-nginx-1        nginx:alpine             nginx
```

Esto evidencia que los tres servicios del stack se encuentran
desplegados mediante Docker Compose.

### 7.3 Prueba del endpoint raíz

```bash
curl http://localhost:8080/
```

Respuesta registrada:

```json
{ "message": "Welcome" }
```

### 7.4 Prueba del health check

```bash
curl http://localhost:8080/health
```

Respuesta:

```json
{ "status": "ok", "service": "backend-api" }
```

Esta respuesta demuestra que Nginx recibió la petición y logró
comunicarse correctamente con el backend.

### 7.5 Prueba de productos

```bash
curl http://localhost:8080/api/products
```

La respuesta contiene la lista de productos definida por la API,
incluyendo:

```json
[
  {
    "id": "1",
    "name": "Laptop",
    "price": 1200
  },
  {
    "id": "2",
    "name": "Mouse",
    "price": 25
  },
  {
    "id": "3",
    "name": "Teclado Mecánico",
    "price": 80
  }
]
```

### 7.6 Prueba de aislamiento del backend

Se ejecutó:

```bash
curl http://localhost:3000/health
```

El resultado fue:

```text
curl: (7) Failed to connect to localhost:3000 after 0 ms: Could not connect to server
```

Este comportamiento es esperado.

La API no tiene el puerto `3000` publicado mediante `ports`; solamente
utiliza `expose`.

Por tanto:

```text
localhost:3000  → x
localhost:8080  → V
```

Esto demuestra que el acceso externo al backend está bloqueado y que la
entrada debe realizarse mediante Nginx.

---

## 8. Explicación del error producido durante el ejercicio de troubleshooting

El ejercicio consistió en modificar intencionalmente la configuración de
Nginx para provocar un error de comunicación.

### 8.1 Configuración correcta

Inicialmente:

```nginx
proxy_pass http://api:3000;
```

Esta configuración funciona porque `api` es el nombre del servicio
dentro de la red de Docker Compose.

### 8.2 Configuración incorrecta

Para generar el error se modificó temporalmente a:

```nginx
proxy_pass http://localhost:3000;
```

Después se reiniciaron los servicios:

```bash
docker compose down
docker compose up -d
```

y se realizó:

```bash
curl http://localhost:8080/health
```

### 8.3 Error obtenido

La solicitud produce un:

```text
502 Bad Gateway
```

generado por Nginx.

### 8.4 Causa del error

El problema no está en el endpoint `/health` de Express.

El problema está en la dirección utilizada por Nginx para localizar el
backend.

Cuando Nginx ejecuta:

```nginx
proxy_pass http://localhost:3000;
```

`localhost` representa al propio contenedor de Nginx.

La API Express se encuentra en otro contenedor:

```text
nginx container
      │
      │ localhost:3000 x
      │
      X

api container
      │
      └── :3000
```

Como dentro del contenedor de Nginx no existe un servicio escuchando en
el puerto `3000`, la conexión es rechazada (`Connection Refused`).

Nginx no puede obtener una respuesta del backend y devuelve:

```text
502 Bad Gateway
```

### 8.5 Solución

La configuración debe volver a utilizar el nombre del servicio:

```nginx
proxy_pass http://api:3000;
```

Docker Compose resuelve `api` mediante su DNS interno y dirige la
conexión hacia la IP privada del contenedor correspondiente.

Después de restaurar la configuración:

```bash
docker compose down
docker compose up -d
```

la prueba:

```bash
curl http://localhost:8080/health
```

vuelve a responder correctamente:

```json
{
  "status": "ok",
  "service": "backend-api"
}
```

### 8.6 Verificación de la red Docker

Para consultar las redes disponibles:

```bash
docker network ls
```

Para inspeccionar la red creada por Compose:

```bash
docker network inspect taller-docker_default
```

Esto permite observar la red privada en la que participan los servicios
`api`, `nginx` y `redis`.

---

## 9. Conclusión

La solución implementada cumple con el objetivo del taller:

- La API REST está dockerizada.
- El backend funciona en el puerto interno `3000`.
- Nginx funciona como Reverse Proxy.
- El único puerto publicado hacia el Host es `8080`.
- La API no está expuesta directamente mediante `localhost:3000`.
- Nginx se comunica con la API mediante el nombre de servicio `api`.
- Docker Compose proporciona la red y resolución DNS interna.
- Redis fue incorporado como servicio adicional para demostrar el
  descubrimiento de servicios.
- Se verificó el funcionamiento mediante pruebas `curl`.
- Se realizó un ejercicio de troubleshooting provocando
  deliberadamente un `502 Bad Gateway`.
- Se identificó que el error era causado por utilizar `localhost`
  desde el contenedor de Nginx en lugar del nombre de servicio `api`.

La arquitectura final separa correctamente el acceso externo de la
comunicación interna entre servicios:

```text
                 HOST
                  │
                  │ :8080
                  ▼
              ┌───────┐
              │ NGINX │
              └───┬───┘
                  │
                  │ api:3000
                  ▼
              ┌───────┐
              │  API  │
              └───────┘

              ┌───────┐
              │ REDIS │
              └───────┘
```
