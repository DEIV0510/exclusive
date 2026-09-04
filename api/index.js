/* ═══════════════════════════════════════════════════════════════════════════
   PUNTO DE ENTRADA EN VERCEL
   ───────────────────────────────────────────────────────────────────────────
   Vercel corre este archivo para todo lo que no sea un archivo estático. Usa
   exactamente el mismo enrutador y el mismo renderizador que el servidor del
   computador, así que lo que se prueba en local es lo que pasa en producción.

   Va todo en UNA función a propósito: el plan gratuito de Vercel limita
   cuántas funciones puede tener un proyecto.
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';

const { enrutar } = require('./_lib/enrutador');
const { servirPagina, servirDatos, servirLqip, servirImagen, protegerPanel } = require('./_lib/publico');

module.exports = async function (req, res) {
  try {
    const url = new URL(req.url, 'https://' + (req.headers['x-forwarded-host'] || req.headers.host || 'local'));
    // Una dirección con un % mal escrito hace que esto lance. Fuera del try,
    // la petición se quedaba colgada para siempre en vez de responder.
    let camino;
    try {
      camino = decodeURIComponent(url.pathname);
    } catch (_) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      return res.end('Dirección mal formada');
    }

    if (camino.startsWith('/api/')) return await enrutar(req, res, camino.slice(5));

    if (camino === '/js/datos.js') return await servirDatos(req, res);
    if (camino === '/js/lqip.js') return await servirLqip(req, res);

    // El panel: sin sesión válida el HTML no se llega a entregar
    if (camino === '/admin' || camino === '/admin/' || camino === '/admin/index.html') {
      const redirigido = await protegerPanel(req, res);
      if (redirigido) return;
      return enviarArchivoDelPanel(res, 'index.html');
    }
    if (camino === '/admin/login' || camino === '/admin/login.html') {
      return enviarArchivoDelPanel(res, 'login.html');
    }

    if (camino.startsWith('/assets/img/')) {
      return await servirImagen(req, res, camino.replace('/assets/img/', ''));
    }

    return await servirPagina(req, res, camino);
  } catch (e) {
    console.error('[vercel]', e && e.stack ? e.stack : e);
    paginaDeCaida(res);
  }
};

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


/* Los dos HTML del panel se leen por ruta fija para que Vercel los empaquete:
   una lectura calculada al vuelo no se incluye en el despliegue. */
const fs = require('fs');
const path = require('path');
const PANEL = path.join(__dirname, '..', 'admin');

function enviarArchivoDelPanel(res, nombre) {
  const p = nombre === 'login.html'
    ? path.join(PANEL, 'login.html')
    : path.join(PANEL, 'index.html');
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  res.setHeader('X-Frame-Options', 'DENY');
  res.end(fs.readFileSync(p, 'utf8'));
}
