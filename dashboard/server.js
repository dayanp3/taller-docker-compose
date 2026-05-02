const express = require('express');
const http = require('http');
const fs = require('fs');

const app = express();
const SOCKET = '/var/run/docker.sock';
const PORT = 3000;

app.use(express.static('public'));
app.use(express.json());

function dockerGet(path) {
  return new Promise(resolve => {
    const req = http.request({ socketPath: SOCKET, path, method: 'GET' }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
        catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.end();
  });
}

function dockerGetRaw(path) {
  return new Promise(resolve => {
    const req = http.request({ socketPath: SOCKET, path, method: 'GET' }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', () => resolve(Buffer.alloc(0)));
    req.end();
  });
}

function dockerPost(path) {
  return new Promise(resolve => {
    const req = http.request({
      socketPath: SOCKET, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': 0 }
    }, res => {
      res.resume();
      res.on('end', () => resolve({ statusCode: res.statusCode }));
    });
    req.on('error', err => resolve({ error: err.message }));
    req.end();
  });
}

// Docker multiplexes stdout/stderr: 8-byte header per frame
function parseDockerLogs(buffer) {
  const lines = [];
  let offset = 0;
  while (offset + 8 <= buffer.length) {
    const size = buffer.readUInt32BE(offset + 4);
    offset += 8;
    if (size === 0) continue;
    if (offset + size > buffer.length) break;
    buffer.slice(offset, offset + size).toString('utf8')
      .split('\n').forEach(l => { const t = l.trim(); if (t) lines.push(t); });
    offset += size;
  }
  return lines;
}

async function findContainer(service) {
  const containers = await dockerGet('/containers/json?all=true') || [];
  return containers.find(c =>
    (c.Names || []).some(n => n.toLowerCase().includes(service))
  );
}

// Estado de los servicios
app.get('/api/status', async (req, res) => {
  const containers = await dockerGet('/containers/json?all=true') || [];
  const names = ['db-mock', 'backend-api', 'health-checker'];
  const services = names.map(name => {
    const c = containers.find(c =>
      (c.Names || []).some(n => n.toLowerCase().includes(name))
    );
    return {
      name,
      status: c ? c.State : 'not_found',
      status_text: c ? c.Status : 'No encontrado',
      id: c ? c.Id.slice(0, 12) : null
    };
  });
  res.json({ services });
});

// Logs de un servicio via Docker socket
app.get('/api/logs/:service', async (req, res) => {
  const limit = parseInt(req.query.limit) || 60;
  const container = await findContainer(req.params.service);
  if (!container) {
    return res.json({ logs: [`[Sistema] Contenedor '${req.params.service}' no disponible`] });
  }
  const raw = await dockerGetRaw(
    `/containers/${container.Id}/logs?stdout=1&stderr=1&tail=${limit}&follow=0`
  );
  res.json({ logs: parseDockerLogs(raw) });
});

// Contenido crudo del archivo compartido
app.get('/api/dbfile', (req, res) => {
  try {
    if (!fs.existsSync('/data/log.db'))
      return res.json({ logs: ['[Sistema] /data/log.db aún no existe'], total: 0 });
    const lines = fs.readFileSync('/data/log.db', 'utf8')
      .split('\n').filter(l => l.trim());
    res.json({ logs: lines.slice(-60), total: lines.length });
  } catch (e) {
    res.json({ logs: [], total: 0, error: e.message });
  }
});

// Acciones: stop | start | restart
app.post('/api/action/:action/:service', async (req, res) => {
  const { action, service } = req.params;
  const container = await findContainer(service);
  if (!container) {
    return res.status(404).json({ ok: false, error: `Contenedor '${service}' no encontrado` });
  }

  const endpoints = {
    stop:    `/containers/${container.Id}/stop`,
    start:   `/containers/${container.Id}/start`,
    restart: `/containers/${container.Id}/restart`
  };

  if (!endpoints[action]) {
    return res.status(400).json({ ok: false, error: 'Acción no válida' });
  }

  const result = await dockerPost(endpoints[action]);
  res.json({ ok: true, action, service, statusCode: result.statusCode });
});

app.listen(PORT, '0.0.0.0', () =>
  console.log(`[Dashboard] http://0.0.0.0:${PORT}`)
);
