#!/bin/sh
echo "[$(date)] Backend iniciando..."

if [ ! -f /data/log.db ]; then
    echo "[$(date)] ERROR: /data/log.db no encontrado. La base de datos no está lista." >&2
    exit 1
fi

echo "[$(date)] Conexión a DB verificada correctamente."
while true; do
    echo "[$(date)] Backend activo - procesando solicitudes"
    sleep 5
done
