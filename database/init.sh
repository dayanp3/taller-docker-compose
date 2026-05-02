#!/bin/sh
mkdir -p /data
echo "[$(date)] DB iniciada" >> /data/log.db
while true; do
    echo "[$(date)] DB activa - entrada de log" >> /data/log.db
    sleep 3
done
