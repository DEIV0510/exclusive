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

/* La caché del borde de Vercel evita pagar una función por cada visita.

   OJO con stale-while-revalidate: con él, pasados los 10 segundos la red de
   Vercel sigue entregando la copia VIEJA mientras pide la nueva por detrás.
   Medido en producción: el dueño guardaba un cambio y seguía sin verlo. Para
   una tienda que se edita desde un panel eso es inaceptable, así que se quita:
   a los 10 segundos se vuelve a preguntar de verdad. El coste es una llamada
   a la función cada 10 segundos como mucho; el resto de visitas van por caché.

   Si algún día la tienda recibe mucho tráfico y esto se nota en la factura,
   sube s-maxage, pero NO vuelvas a poner stale-while-revalidate sin avisarle
   al dueño de que sus cambios tardarán en verse. */
const CACHE_PAGINA = 'public, max-age=0, s-maxage=10';

/* ── Datos ───────────────────────────────────────────────────────────────── */

async function datosParaRender() {
  const paquete = await C.paqueteDeTienda();
  return {
    CONFIG: paquete.config,
    PRODUCTOS: paquete.productos,
    COLECCIONES: paquete.colecciones,
    BANNERS: paquete.banners || [],
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
    base = fs.readFileSync(path.join(RAIZ, '_tools', 'lqip-base.js'), 'utf8');
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
  /* Una gorra sin fotos usa el emblema de la marca como respaldo, y la tienda
     lo pide como assets/img/emblema-400.webp. Ese archivo no existe: el
     emblema vive en assets/logo y con otros tamaños, así que salía el icono de
     imagen rota en la tarjeta, en la ficha y en el carrito. Y le pasa a
     cualquier gorra recién creada, antes de subirle la foto. */
  const emblema = String(archivo).match(/^emblema-\d+\.(webp|jpg)$/);
  if (emblema) {
    res.statusCode = 302;
    res.setHeader('Location', '/assets/logo/emblema-256.webp');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.end();
  }

  const destino = await imagenes.resolver(archivo);
  if (!destino) return sinEseTamano(res, archivo);
  if (/^https?:\/\//.test(destino)) {
    res.statusCode = 302;
    res.setHeader('Location', destino);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.end();
  }
  // En el computador el archivo sí está en disco
  const p = path.join(RAIZ, destino);
  if (!fs.existsSync(p)) return sinEseTamano(res, archivo);
  res.statusCode = 200;
  res.setHeader('Content-Type', destino.endsWith('.jpg') ? 'image/jpeg' : 'image/webp');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.end(fs.readFileSync(p));
}

/* Un tamaño que falta NO puede quedarse en un 404.

   Las fotos se piden con <picture><source srcset="...-400 400w, ...-760 760w,
   ...-1200 1200w">. Si el navegador elige un candidato del srcset y ese
   archivo no está, NO cae al <img src> de respaldo: deja el hueco vacío. Con
   la portada eso significa una pantalla en blanco.

   Puede pasar de verdad: los diez pósters de colección se generaron solo en
   400 y 760, y desde que el panel deja elegir foto de una galería, el dueño
   puede poner uno de fondo del carrusel sin enterarse de que le falta el
   tamaño grande. En vez de romper, se sirve el 760, que TODAS las fotos de la
   tienda tienen. Se ve un pelo menos nítida en una pantalla grande; se ve. */
function sinEseTamano(res, archivo) {
  // La imagen de compartir de una foto que no la tiene: vale la de 760
  const og = String(archivo).match(/^og-(.+)\.jpg$/);
  if (og && /^[A-Za-z0-9._~-]+$/.test(og[1])) {
    res.statusCode = 302;
    res.setHeader('Location', '/assets/img/' + og[1] + '-760.jpg');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.end();
  }

  const m = String(archivo).match(/^(.+)-(\d+)\.(webp|jpg)$/);
  /* Solo se redirige hacia el 760, nunca desde él (así no hay vuelta atrás), y
     solo si el nombre es de los que acepta el validador de fotos: letras,
     números, guiones y puntos. Con un nombre raro (un emoji, un carácter
     cirílico, un salto de línea) setHeader lanza y la petición entera se caía
     con la página de "Volvemos enseguida" en vez de un 404 limpio. */
  if (m && Number(m[2]) !== 760 && /^[A-Za-z0-9._~-]+$/.test(m[1])) {
    res.statusCode = 302;
    res.setHeader('Location', '/assets/img/' + m[1] + '-760.' + m[3]);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.end();
  }
  res.statusCode = 404;
  res.setHeader('Cache-Control', 'no-store');
  return res.end('No encontrada');
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
