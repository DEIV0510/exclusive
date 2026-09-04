/* ═══════════════════════════════════════════════════════════════════════════
   SERVIDOR PARA TRABAJAR EN EL COMPUTADOR
   ───────────────────────────────────────────────────────────────────────────
       node servidor-local.js          ->  http://localhost:5305

   Imita el mismo enrutado que hace Vercel en producción, así que lo que se
   prueba aquí es lo que va a pasar allá. No se usa para publicar: en Vercel
   corren las funciones de la carpeta api/.
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const RAIZ = __dirname;
const PUERTO = Number(process.env.PORT) || 5305;

const { enrutar } = require('./api/_lib/enrutador');
const { servirPagina, servirDatos, servirLqip, servirImagen, protegerPanel } = require('./api/_lib/publico');

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
};

/* Nunca servir nada de estas carpetas por web */
const PROHIBIDO = ['_datos', 'api', 'node_modules', '_tools', '.git'];

/* Las direcciones que arma el servidor, no el disco */
const esPaginaDeTienda = (c) =>
  c === '/' || c === '/index.html' || c === '/catalogo.html' || c === '/catalogo' ||
  c === '/404.html' || c === '/sitemap.xml' || c === '/robots.txt' ||
  c === '/site.webmanifest' || /^\/gorra-[a-z0-9-]+\.html$/.test(c);

function esRutaSegura(rel) {
  if (rel.includes('..') || rel.includes('\0')) return false;
  const primera = rel.split('/')[0];
  return !PROHIBIDO.includes(primera);
}

/* Una promesa suelta no puede tumbar el servidor: se anota y se sigue */
process.on('unhandledRejection', (e) => console.error('[promesa suelta]', e));

const servidor = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://localhost:' + PUERTO);
    // Una dirección con un % mal escrito hace que esto lance. Antes quedaba
    // fuera del try y la petición se colgaba para siempre.
    let camino;
    try {
      camino = decodeURIComponent(u.pathname);
    } catch (_) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      return res.end('Dirección mal formada');
    }
    // 1. API
    if (camino.startsWith('/api/')) {
      return await enrutar(req, res, camino.slice(5));
    }

    // 2. Datos de la tienda (lo que antes eran config.js y productos.js)
    if (camino === '/js/datos.js') return await servirDatos(req, res);
    if (camino === '/js/lqip.js') return await servirLqip(req, res);

    // 3. El panel: sin sesión no se ve, se redirige al login
    if (camino === '/admin' || camino === '/admin/' || camino === '/admin/index.html') {
      const redirigido = await protegerPanel(req, res);
      if (redirigido) return;
      return archivo(res, path.join(RAIZ, 'admin', 'index.html'));
    }
    if (camino === '/admin/login' || camino === '/admin/login.html') {
      return archivo(res, path.join(RAIZ, 'admin', 'login.html'));
    }

    // 4. Páginas de la tienda: SIEMPRE las arma el servidor con lo que hay en
    //    la base. Va antes que los archivos estáticos a propósito: si quedara
    //    un index.html viejo en el disco, taparía los cambios del panel.
    if (esPaginaDeTienda(camino)) return await servirPagina(req, res, camino);

    // 5. Archivo estático si existe
    const rel = camino.replace(/^\/+/, '');
    if (rel && esRutaSegura(rel)) {
      const p = path.join(RAIZ, rel);
      if (fs.existsSync(p) && fs.statSync(p).isFile()) return archivo(res, p);
    }

    // 5. Foto que no está en disco: puede estar en la base (o en Blob)
    if (camino.startsWith('/assets/img/')) {
      return await servirImagen(req, res, camino.replace('/assets/img/', ''));
    }

    // 6. Página pública, armada con lo que hay en la base
    return await servirPagina(req, res, camino);
  } catch (e) {
    console.error('[servidor]', e && e.stack ? e.stack : e);
    paginaDeCaida(res);
  }
});

/* Cuando algo se rompe de nuestro lado, el visitante merece una página, no una
   pestaña en blanco cargando para siempre. 503 + sin caché: los buscadores
   entienden que es temporal y no la guardan. */
function paginaDeCaida(res) {
  if (res.headersSent || res.writableEnded) return;
  res.statusCode = 503;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Retry-After', '30');
  res.end('<!doctype html><html lang="es"><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Volvemos enseguida</title>' +
    '<style>body{margin:0;min-height:100svh;display:grid;place-items:center;' +
    'font:16px/1.5 system-ui,sans-serif;background:#FAF8F4;color:#131C31;padding:24px}' +
    'div{max-width:24rem;text-align:center}h1{font-size:20px;margin:0 0 8px}' +
    'p{color:#454F68;margin:0 0 20px}a{display:inline-block;background:#0C5FCB;color:#fff;' +
    'text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:700}</style>' +
    '<div><h1>Volvemos enseguida</h1>' +
    '<p>No pudimos cargar la tienda en este momento. Vuelve a intentarlo en un minuto.</p>' +
    '<a href="/">Reintentar</a></div></html>');
}


function archivo(res, p) {
  const ext = path.extname(p).toLowerCase();
  const datos = fs.readFileSync(p);
  res.statusCode = 200;
  res.setHeader('Content-Type', TIPOS[ext] || 'application/octet-stream');
  // Sin caché mientras se trabaja: si no, cuesta ver los cambios
  res.setHeader('Cache-Control', 'no-store');
  res.end(datos);
}

servidor.listen(PUERTO, () => {
  console.log(`\n  EXCLUSIVE CAPS MED`);
  console.log(`  Tienda   http://localhost:${PUERTO}`);
  console.log(`  Panel    http://localhost:${PUERTO}/admin\n`);
});
