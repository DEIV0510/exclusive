/* ═══════════════════════════════════════════════════════════════════════════
   CONTENIDO · LA FUENTE DE DATOS ÚNICA
   ───────────────────────────────────────────────────────────────────────────
   Este archivo es el corazón del asunto: el panel escribe aquí y la tienda
   pública lee de aquí. No hay dos copias de la misma información.

   La tienda espera exactamente la misma forma de datos que tenía cuando
   estaban escritos a mano en js/config.js y js/productos.js, así que el
   JavaScript de la tienda no hubo que tocarlo: sigue leyendo
   window.ECM.CONFIG y window.ECM.PRODUCTOS igual que siempre.
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';

const { todos, uno, correr, ahora } = require('./db');

/* ── Ajustes (todo lo que antes vivía en config.js) ──────────────────────── */

/* Valores de arranque. Solo se usan si la base todavía no tiene ese bloque,
   así que nunca pisan lo que el dueño haya guardado desde el panel. */
const POR_DEFECTO = {
  identidad: {
    marca: 'EXCLUSIVE CAPS MED',
    razonSocial: 'EXCLUSIVE CAPS SAS',
    ciudad: 'Medellín',
    region: 'Antioquia',
    pais: 'CO',
    descripcionCorta: 'Gorras nacionales e importadas. Venta virtual desde Medellín, Colombia.',
    direccion: null,
    correo: null,
  },
  whatsapp: { numero: '573222544571', visible: '322 254 4571' },
  redes: {
    instagram: { usuario: 'exclusive_caps_med', url: 'https://instagram.com/exclusive_caps_med', activa: true },
    tiktok: { usuario: 'exclusive_caps_med', url: 'https://www.tiktok.com/@exclusive_caps_med', activa: true },
    facebook: { usuario: '', url: '', activa: false },
  },
  sitio: { url: 'https://exclusivecapsmed.com' },
  moneda: { codigo: 'COP', locale: 'es-CO' },
  colores: {},
  carrusel: [],
  carruselSegundos: 6,
  confianza: [],
  pasos: [],
  faq: [],
  checkout: { pedirCiudad: true, pedirDireccion: true, pedirNota: true },
  seo: { titulo: '', descripcion: '', imagen: '' },
  home: { orden: ['disponibles', 'confianza', 'pasos', 'identidad', 'colecciones', 'marcas', 'entregas', 'faq'] },
};

async function leerAjuste(clave) {
  const fila = await uno('SELECT valor FROM ajustes WHERE clave = ?', [clave]);
  if (!fila) return estructuraClonada(POR_DEFECTO[clave]);
  try {
    return JSON.parse(fila.valor);
  } catch (_) {
    return estructuraClonada(POR_DEFECTO[clave]);
  }
}

const estructuraClonada = (x) => (x === undefined ? null : JSON.parse(JSON.stringify(x)));

async function guardarAjuste(clave, valor) {
  await correr(
    `INSERT INTO ajustes (clave, valor, actualizado) VALUES (?, ?, ?)
       ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor, actualizado = excluded.actualizado`,
    [clave, JSON.stringify(valor), ahora()]
  );
  return valor;
}

/* ── Marcas y tipos ──────────────────────────────────────────────────────── */

const listarMarcas = () => todos('SELECT * FROM marcas ORDER BY orden, nombre');
const listarTipos = () => todos('SELECT * FROM tipos ORDER BY orden, nombre');
const listarColecciones = () => todos('SELECT * FROM colecciones ORDER BY orden, id');
const listarBanners = () => todos('SELECT * FROM banners ORDER BY orden, id');

/* ── Productos ───────────────────────────────────────────────────────────── */

/* Pasa una fila de la base a la forma exacta que espera la tienda. */
function aFormaDeTienda(fila, imagenes) {
  return {
    id: fila.id,
    slug: fila.slug,
    nombre: fila.nombre,
    marca: fila.marca,
    tipo: fila.tipo,
    modelo: fila.modelo,
    sku: fila.sku,
    precio: fila.precio === null || fila.precio === undefined ? null : Number(fila.precio),
    precioAntes: fila.precio_antes === null || fila.precio_antes === undefined ? null : Number(fila.precio_antes),
    disponible: fila.estado === 'disponible',
    stock: fila.stock === null || fila.stock === undefined ? null : Number(fila.stock),
    destacado: !!fila.destacado,
    nuevo: !!fila.nuevo,
    exclusivo: !!fila.exclusivo,
    colores: jsonOArray(fila.colores),
    talla: fila.talla,
    descripcion: fila.descripcion,
    caracteristicas: jsonOArray(fila.caracteristicas),
    imagenes,
  };
}

function jsonOArray(valor) {
  if (Array.isArray(valor)) return valor;
  try {
    const x = JSON.parse(valor || '[]');
    return Array.isArray(x) ? x : [];
  } catch (_) {
    return [];
  }
}

/* incluirOcultos = true SOLO para el panel. La tienda pública nunca los ve. */
async function listarProductos({ incluirOcultos = false } = {}) {
  const filas = incluirOcultos
    ? await todos('SELECT * FROM productos ORDER BY orden, id')
    : await todos("SELECT * FROM productos WHERE estado <> 'oculto' ORDER BY orden, id");
  if (!filas.length) return [];

  const fotos = await todos('SELECT producto_id, base FROM imagenes ORDER BY producto_id, orden, id');
  const porProducto = new Map();
  fotos.forEach((f) => {
    if (!porProducto.has(f.producto_id)) porProducto.set(f.producto_id, []);
    porProducto.get(f.producto_id).push(f.base);
  });

  return filas.map((f) => aFormaDeTienda(f, porProducto.get(f.id) || []));
}

/* La versión cruda, para el panel: incluye el estado tal cual y el id de cada
   foto, que el panel necesita para reordenarlas y borrarlas. */
async function productoParaPanel(id) {
  const fila = await uno('SELECT * FROM productos WHERE id = ?', [id]);
  if (!fila) return null;
  const fotos = await todos(
    'SELECT id, base, origen, orden FROM imagenes WHERE producto_id = ? ORDER BY orden, id',
    [id]
  );
  return {
    ...aFormaDeTienda(fila, fotos.map((f) => f.base)),
    estado: fila.estado,
    orden: fila.orden,
    fotos,
    creado: fila.creado,
    actualizado: fila.actualizado,
  };
}

/* ── El paquete que consume la tienda ────────────────────────────────────── */

/* Arma el objeto CONFIG con la misma forma que tenía el archivo escrito a
   mano, para no tener que tocar nada del JavaScript de la tienda. */
async function configDeTienda() {
  const [identidad, whatsapp, redes, sitio, moneda, colores, carrusel, confianza,
    pasos, faq, checkout, carruselSegundos] = await Promise.all([
    leerAjuste('identidad'), leerAjuste('whatsapp'), leerAjuste('redes'),
    leerAjuste('sitio'), leerAjuste('moneda'), leerAjuste('colores'),
    leerAjuste('carrusel'), leerAjuste('confianza'), leerAjuste('pasos'),
    leerAjuste('faq'), leerAjuste('checkout'), leerAjuste('carruselSegundos'),
  ]);

  const marcas = (await listarMarcas()).filter((m) => m.visible).map((m) => m.nombre);
  const tipos = (await listarTipos()).filter((t) => t.visible).map((t) => t.nombre);

  const config = {
    marca: identidad.marca,
    razonSocial: identidad.razonSocial,
    ciudad: identidad.ciudad,
    region: identidad.region,
    pais: identidad.pais,
    descripcionCorta: identidad.descripcionCorta,
    // Solo se mandan si están puestos: si no, la tienda no pinta la fila
    correo: identidad.correo || null,
    direccion: identidad.direccion || null,
    whatsapp,
    sitio,
    moneda,
    taxonomia: { marcas, tipos, colores },
    carrusel,
    carruselSegundos: typeof carruselSegundos === 'number' ? carruselSegundos : 6,
    confianza,
    pasos,
    faq,
    checkout,
  };

  // Las redes apagadas no salen: así la tienda no pinta un enlace vacío
  ['instagram', 'tiktok', 'facebook'].forEach((red) => {
    const r = redes && redes[red];
    if (r && r.activa && r.url) config[red] = { usuario: r.usuario, url: r.url };
  });

  return config;
}

async function paqueteDeTienda() {
  const [config, productos, colecciones] = await Promise.all([
    configDeTienda(),
    listarProductos({ incluirOcultos: false }),
    listarColecciones(),
  ]);
  return {
    config,
    productos,
    colecciones: colecciones
      .filter((c) => c.visible)
      .map((c) => ({ imagen: c.imagen, nombre: c.nombre, nota: c.nota })),
  };
}

/* Lo mismo pero como archivo .js, que es lo que la tienda carga con <script>.
   Se sirve con el mismo nombre de siempre (js/config.js, js/productos.js)
   para no tocar ni una línea del HTML. */
function comoArchivoJs(paquete) {
  const j = (x) => JSON.stringify(x, null, 2);
  return [
    '/* Generado por EXCLUSIVE CAPS MED. No lo edites a mano:',
    '   se rehace solo con lo que guardes en el panel (/admin). */',
    'window.ECM = window.ECM || {};',
    'window.ECM.CONFIG = ' + j(paquete.config) + ';',
    'window.ECM.PRODUCTOS = ' + j(paquete.productos) + ';',
    'window.ECM.COLECCIONES = ' + j(paquete.colecciones) + ';',
    '',
  ].join('\n');
}

module.exports = {
  POR_DEFECTO, leerAjuste, guardarAjuste, estructuraClonada,
  listarMarcas, listarTipos, listarColecciones, listarBanners,
  listarProductos, productoParaPanel, aFormaDeTienda, jsonOArray,
  configDeTienda, paqueteDeTienda, comoArchivoJs,
};
