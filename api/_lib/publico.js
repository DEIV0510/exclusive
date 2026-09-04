/* ═══════════════════════════════════════════════════════════════════════════
   LA TIENDA PÚBLICA
   ───────────────────────────────────────────────────────────────────────────
   Arma cada página con lo que hay en la base, usando EL MISMO código que
   genera el sitio estático (_tools/build-paginas.js). No hay dos versiones
   del HTML que se puedan desincronizar.

   El HTML, el CSS y el JavaScript de la tienda no cambiaron: siguen leyendo
   window.ECM.CONFIG y window.ECM.PRODUCTOS igual que cuando esos datos
   estaban escritos a mano.
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';

const fs = require('fs');
const path = require('path');
const { RAIZ, todos } = require('./db');
const C = require('./contenido');
const imagenes = require('./imagenes');
const auth = require('./auth');
const { cabecerasSeguras } = require('./http');

const { crearRenderizador } = require(path.join(RAIZ, '_tools', 'build-paginas.js'));

/* La caché del borde de Vercel evita pagar una función por cada visita. Diez
   segundos es poco para el visitante y suficiente para que el dueño vea sus
   cambios casi al instante al guardar en el panel. */
const CACHE_PAGINA = 'public, max-age=0, s-maxage=10, stale-while-revalidate=86400';

/* ── Datos ───────────────────────────────────────────────────────────────── */

async function datosParaRender() {
  const paquete = await C.paqueteDeTienda();
  return {
    CONFIG: paquete.config,
    PRODUCTOS: paquete.productos,
    COLECCIONES: paquete.colecciones,
    entregas: await fotosDeEntrega(),
    archivoDeDatos: 'js/datos.js',
  };
}

/* Las fotos del mosaico de entregas. En el computador se leen del disco; en
   producción no se puede listar una carpeta, así que van por la base. */
async function fotosDeEntrega() {
  const subidas = (await todos("SELECT DISTINCT base FROM archivos WHERE base LIKE 'entrega%'")).map((f) => f.base);
  let enDisco = [];
  try {
    enDisco = fs.readdirSync(path.join(RAIZ, 'assets', 'img'))
      .filter((f) => /^entrega-\d+-400\.webp$/.test(f))
      .map((f) => f.replace('-400.webp', ''));
  } catch (_) { /* en producción no hay carpeta que listar */ }
  return [...new Set([...enDisco, ...subidas])].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
}

/* ── js/datos.js ─────────────────────────────────────────────────────────── */

async function servirDatos(req, res) {
  const paquete = await C.paqueteDeTienda();
  const cuerpo = C.comoArchivoJs(paquete);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', CACHE_PAGINA);
  cabecerasSeguras(res);
  res.end(cuerpo);
}

/* ── js/lqip.js ──────────────────────────────────────────────────────────────
   Las miniaturas borrosas de las fotos que ya venían con el sitio están en un
   archivo; las de las fotos subidas desde el panel están en la base. Se
   sirven juntas, sin tocar el JavaScript de la tienda. */
async function servirLqip(req, res) {
  let base = '';
  try {
    base = fs.readFileSync(path.join(RAIZ, 'js', 'lqip.js'), 'utf8');
  } catch (_) {
    base = 'window.ECM = window.ECM || {};\nwindow.ECM.LQIP = {};\n';
  }
  const subidas = await imagenes.lqipDeTodas();
  const extra = Object.keys(subidas).length
    ? '\n/* Miniaturas de las fotos subidas desde el panel */\n' +
      'Object.assign(window.ECM.LQIP, ' + JSON.stringify(subidas) + ');\n'
    : '';
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', CACHE_PAGINA);
  res.end(base + extra);
}

/* ── Páginas ─────────────────────────────────────────────────────────────── */

async function servirPagina(req, res, camino) {
  const limpio = String(camino || '/').replace(/\/+$/, '') || '/';
  const datos = await datosParaRender();
  const R = crearRenderizador(datos);

  let cuerpo = null;
  let tipo = 'text/html; charset=utf-8';
  let codigo = 200;

  if (limpio === '/' || limpio === '/index.html') {
    cuerpo = R.construirHome();
  } else if (limpio === '/catalogo.html' || limpio === '/catalogo') {
    cuerpo = R.construirCatalogo();
  } else if (limpio === '/sitemap.xml') {
    cuerpo = R.construirSitemap();
    tipo = 'application/xml; charset=utf-8';
  } else if (limpio === '/robots.txt') {
    cuerpo = R.construirRobots();
    tipo = 'text/plain; charset=utf-8';
  } else if (limpio === '/site.webmanifest') {
    cuerpo = R.construirManifest();
    tipo = 'application/manifest+json; charset=utf-8';
  } else {
    const m = limpio.match(/^\/gorra-(.+)\.html$/);
    const p = m && datos.PRODUCTOS.find((x) => x.slug === m[1]);
    if (p) {
      cuerpo = R.construirProducto(p);
    } else {
      cuerpo = R.construir404();
      codigo = 404;
    }
  }

  res.statusCode = codigo;
  res.setHeader('Content-Type', tipo);
  res.setHeader('Cache-Control', codigo === 200 ? CACHE_PAGINA : 'no-store');
  cabecerasSeguras(res);
  res.end(cuerpo);
}

/* ── Fotos que no están en el disco ──────────────────────────────────────── */

async function servirImagen(req, res, archivo) {
  const destino = await imagenes.resolver(archivo);
  if (!destino) {
    res.statusCode = 404;
    res.setHeader('Cache-Control', 'no-store');
    return res.end('No encontrada');
  }
  if (/^https?:\/\//.test(destino)) {
    res.statusCode = 302;
    res.setHeader('Location', destino);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.end();
  }
  // En el computador el archivo sí está en disco
  const p = path.join(RAIZ, destino);
  if (!fs.existsSync(p)) {
    res.statusCode = 404;
    return res.end('No encontrada');
  }
  res.statusCode = 200;
  res.setHeader('Content-Type', destino.endsWith('.jpg') ? 'image/jpeg' : 'image/webp');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.end(fs.readFileSync(p));
}

/* ── Puerta del panel ────────────────────────────────────────────────────────
   Esto es protección de verdad, en el servidor: sin sesión válida el HTML del
   panel no se llega a entregar. Ocultar el enlace no protegería nada. */
async function protegerPanel(req, res) {
  const usuario = await auth.usuarioActual(req);
  if (usuario) return false;
  res.statusCode = 302;
  res.setHeader('Location', '/admin/login');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.end();
  return true;
}

module.exports = { servirDatos, servirLqip, servirPagina, servirImagen, protegerPanel, datosParaRender, fotosDeEntrega, CACHE_PAGINA };
