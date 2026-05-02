

## Cómo ejecutar el proyecto

Abre una terminal en la carpeta `proyecto-final` y ejecuta:

```bash
# 1. Construir todas las imágenes
docker compose build

# 2. Levantar todos los servicios en segundo plano
docker compose up -d

# 3. Verificar que todos los contenedores estén activos
docker compose ps
```

Deberías ver los 4 contenedores con estado **Up**:

```
proyecto-final-db-mock-1         Up
proyecto-final-backend-api-1     Up
proyecto-final-health-checker-1  Up
proyecto-final-dashboard-1       Up
```

---

## Acceder al Dashboard

Abre tu navegador en:

```
http://localhost:3000
```

El dashboard muestra en tiempo real:
- Estado (activo / detenido / reiniciando) de cada contenedor
- Logs de cada servicio con código de colores
- Diagrama de arquitectura del sistema
- Conteo de entradas en el archivo de log compartido

---

## Estructura del proyecto

```
proyecto-final/
├── database/        → Servicio db-mock (simula base de datos)
│   ├── Dockerfile
│   └── init.sh      → Escribe en /data/log.db cada 3 segundos
├── backend/         → Servicio backend-api
│   ├── Dockerfile
│   └── app.sh       → Verifica DB al iniciar, falla con exit 1 si no existe
├── monitor/         → Servicio health-checker
│   ├── Dockerfile
│   └── check.sh     → Monitorea el sistema cada 4 segundos
├── dashboard/       → Dashboard web (Node.js + Express)
│   ├── Dockerfile
│   ├── server.js    → API REST + lectura de Docker socket
│   └── public/
│       └── index.html
└── docker-compose.yml
```

---

## Conceptos de Sistemas Distribuidos demostrados

| Concepto | Implementación |
|---|---|
| **Comunicación indirecta** | Los servicios comparten datos vía archivo en volumen, sin llamadas HTTP directas |
| **Fault Tolerance** | Si un servicio cae, los demás siguen operando |
| **Auto-recuperación** | `restart: on-failure` hace que el backend se reinicie solo ante errores |
| **Dependencias de arranque** | `depends_on` garantiza el orden: DB → Backend → Monitor → Dashboard |
| **Health Monitoring** | El monitor detecta inactividad y emite alertas sin depender de los otros |
| **Service Discovery** | Los contenedores se resuelven por nombre en la red Docker interna |

---

## Prueba de resiliencia (demo para el profesor)

### Paso 1 — Ver los logs en tiempo real
```bash
docker compose logs -f
```

### Paso 2 — Simular caída del backend
```bash
docker compose stop backend-api
```

**Qué observar:**
- En el dashboard, la tarjeta `backend-api` cambia a **Detenido** (rojo)
- El `health-checker` detecta si `log.db` deja de actualizarse y emite advertencias
- La tarjeta `db-mock` permanece **Activo** (el sistema es parcialmente tolerante a fallos)

### Paso 3 — Observar auto-recuperación
```bash
# Forzar un reinicio con fallo (la DB también debe estar activa)
docker compose restart backend-api
```

O para ver la política on-failure en acción (detener la DB primero):
```bash
docker compose stop db-mock
docker compose restart backend-api
# El backend intentará arrancar, no encontrará log.db, hará exit 1
# Docker lo reintentará automáticamente
docker compose logs -f backend-api
```

### Paso 4 — Restaurar el sistema completo
```bash
docker compose start db-mock
# El backend detectará log.db y arrancará normalmente
```

---

## Ver logs individuales

```bash
docker compose logs -f db-mock        # Logs de la base de datos
docker compose logs -f backend-api    # Logs del backend
docker compose logs -f health-checker # Logs del monitor
docker compose logs -f dashboard      # Logs del servidor web
```

---

## Detener el proyecto

```bash
# Detener sin eliminar volúmenes (los logs se conservan)
docker compose down

# Detener y eliminar todo (volúmenes incluidos)
docker compose down -v
```

---
