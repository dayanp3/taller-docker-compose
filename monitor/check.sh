#!/bin/sh
echo "[$(date)] Monitor iniciado. Supervisando sistema..."

while true; do
    if [ ! -f /data/log.db ]; then
        echo "[$(date)] FALLO: /data/log.db no encontrado. Base de datos o backend caído." >&2
    else
        LAST_ENTRY=$(tail -1 /data/log.db 2>/dev/null)
        LAST_TIME=$(stat -c %Y /data/log.db 2>/dev/null)
        NOW=$(date +%s)
        DIFF=$((NOW - LAST_TIME))

        if [ "$DIFF" -gt 10 ]; then
            echo "[$(date)] ADVERTENCIA: No hay entradas recientes en log.db (última hace ${DIFF}s). Backend posiblemente caído." >&2
        else
            echo "[$(date)] SISTEMA OK - log.db activo. Última entrada hace ${DIFF}s: $LAST_ENTRY"
        fi
    fi
    sleep 4
done
