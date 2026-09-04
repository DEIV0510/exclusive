/* ═══════════════════════════════════════════════════════════════════════════
   ENRUTADOR
   ───────────────────────────────────────────────────────────────────────────
   Un solo punto de entrada para toda la API. Se usa igual desde Vercel
   (api/index.js) y desde el servidor de pruebas del computador, así que lo
   que se prueba en local es exactamente lo que corre en producción.
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';

const { ok, fallo, fallaronLasCosas, cuerpoJson, leerCrudo, cabecerasSeguras, exigirMismoOrigen } = require('./http');
const A = require('./rutas-admin');
const C = require('./contenido');
const V = require('./validar');
const imagenes = require('./imagenes');
const { todos, uno, correr, ahora } = require('./db');

/* Casa "/api/admin/productos/12/duplicar" con "admin/productos/:id/duplicar".
   Un ":id" que no sea un número entero NO casa: así una dirección inventada
   responde 404 en vez de reventar contra la base con un NaN. */
function casa(partes, patron) {
  const p = patron.split('/');
  if (p.length !== partes.length) return null;
  const params = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) {
      const nombre = p[i].slice(1);
      let valor;
      try { valor = decodeURIComponent(partes[i]); } catch (_) { return null; }
      if (nombre === 'id' && !/^[0-9]{1,12}$/.test(valor)) return null;
      params[nombre] = valor;
    } else if (p[i] !== partes[i]) return null;
  }
  return params;
}

async function enrutar(req, res, rutaCruda) {
  // El despacho va aparte y con await: si no, el rechazo de una ruta async se
  // escapa del try y tumba el proceso entero en vez de responder un error.
  try {
    return await despachar(req, res, rutaCruda);
  } catch (e) {
    return fallaronLasCosas(res, e);
  }
}

async function despachar(req, res, rutaCruda) {
  const metodo = (req.method || 'GET').toUpperCase();
  const camino = String(rutaCruda || '').replace(/^\/+|\/+$/g, '');
  const partes = camino ? camino.split('/') : [];
  const m = (patron) => casa(partes, patron);

  cabecerasSeguras(res, { esAdmin: partes[0] === 'admin' });

  {
    exigirMismoOrigen(req);

    /* ── Público ─────────────────────────────────────────────────────────── */
    if (metodo === 'POST' && m('pedido')) return registrarPedido(req, res);
    if (metodo === 'GET' && m('estado')) return ok(res, { servicio: 'ecm', hora: ahora() });

    /* ── Panel ───────────────────────────────────────────────────────────── */
    if (partes[0] !== 'admin') return fallo(res, 404, 'Esa dirección no existe.');

    let p;
    if (metodo === 'POST' && m('admin/login')) return A.entrar(req, res);
    if (metodo === 'POST' && m('admin/salir')) return A.salir(req, res);
    if (metodo === 'GET' && m('admin/yo')) return A.yo(req, res);
    if (metodo === 'GET' && m('admin/resumen')) return A.resumen(req, res);
    if (metodo === 'GET' && m('admin/opciones')) return A.opciones(req, res);

    // Productos
    if (metodo === 'GET' && m('admin/productos')) return A.listarProductosPanel(req, res);
    if (metodo === 'POST' && m('admin/productos')) return A.crearProducto(req, res);
    if ((p = m('admin/productos/:id'))) {
      if (metodo === 'GET') return A.verProducto(req, res, p.id);
      if (metodo === 'PUT') return A.editarProducto(req, res, p.id);
      if (metodo === 'PATCH') return A.cambiarBandera(req, res, p.id);
      if (metodo === 'DELETE') return A.borrarProducto(req, res, p.id);
    }
    if (metodo === 'POST' && (p = m('admin/productos/:id/duplicar'))) return A.duplicarProducto(req, res, p.id);

    // Marcas y categorías
    for (const [nombre, mod] of [['marcas', A.marcas], ['tipos', A.tipos]]) {
      if (metodo === 'GET' && m('admin/' + nombre)) return mod.listar(req, res);
      if (metodo === 'POST' && m('admin/' + nombre)) return mod.crear(req, res);
      if ((p = m('admin/' + nombre + '/:id'))) {
        if (metodo === 'PUT') return mod.editar(req, res, p.id);
        if (metodo === 'DELETE') return mod.borrar(req, res, p.id);
      }
    }

    // Bloques de contenido
    if ((p = m('admin/ajustes/:clave'))) {
      if (metodo === 'GET') return A.verAjuste(req, res, p.clave);
      if (metodo === 'PUT') return A.guardarAjusteRuta(req, res, p.clave);
    }

    // Banners
    if (metodo === 'GET' && m('admin/banners')) return A.listarBanners(req, res);
    if (metodo === 'POST' && m('admin/banners')) return A.guardarBanner(req, res, null);
    if ((p = m('admin/banners/:id'))) {
      if (metodo === 'PUT') return A.guardarBanner(req, res, p.id);
      if (metodo === 'DELETE') return A.borrarBanner(req, res, p.id);
    }

    // Pedidos
    if (metodo === 'GET' && m('admin/pedidos')) return A.listarPedidos(req, res);
    if ((p = m('admin/pedidos/:id')) && metodo === 'PATCH') return A.cambiarPedido(req, res, p.id);

    // Usuarios
    if (metodo === 'GET' && m('admin/usuarios')) return A.listarUsuarios(req, res);
    if (metodo === 'POST' && m('admin/usuarios')) return A.crearUsuario(req, res);
    if ((p = m('admin/usuarios/:id'))) {
      if (metodo === 'PUT') return A.editarUsuario(req, res, p.id);
      if (metodo === 'DELETE') return A.borrarUsuario(req, res, p.id);
    }

    // Imágenes
    if (metodo === 'POST' && m('admin/imagenes')) return subirImagen(req, res);
    if ((p = m('admin/imagenes/:base')) && metodo === 'DELETE') return quitarImagen(req, res, p.base);

    return fallo(res, 404, 'Esa dirección no existe.');
  }
}

/* ── Subir una foto ──────────────────────────────────────────────────────── */
async function subirImagen(req, res) {
  const auth = require('./auth');
  await auth.exigir(req, 'productos');
  const cuerpo = await cuerpoJson(req);
  if (!cuerpo.datos) return fallo(res, 400, 'No llegó ninguna imagen.');

  // Llega como data URL desde el navegador
  const coma = String(cuerpo.datos).indexOf(',');
  const base64 = coma >= 0 ? String(cuerpo.datos).slice(coma + 1) : String(cuerpo.datos);
  let buffer;
  try {
    buffer = Buffer.from(base64, 'base64');
  } catch (_) {
    return fallo(res, 400, 'No pude leer esa imagen.');
  }
  const foto = await imagenes.guardarFoto(buffer, cuerpo.nombre);
  return ok(res, { ...foto, mensaje: 'Foto subida correctamente.' });
}

async function quitarImagen(req, res, base) {
  const auth = require('./auth');
  await auth.exigir(req, 'productos');
  await imagenes.borrarFoto(V.texto(base, { max: 200 }));
  return ok(res, { mensaje: 'Foto eliminada.' });
}

/* ── Registrar un pedido ─────────────────────────────────────────────────────
   Lo llama la tienda justo antes de abrir WhatsApp. Si esto fallara, el
   cliente NO se puede quedar sin poder pedir: la tienda abre WhatsApp igual.
   Por eso los precios se leen de la base, nunca de lo que mande el navegador. */
async function registrarPedido(req, res) {
  const d = await cuerpoJson(req);
  const lineas = Array.isArray(d.items) ? d.items.slice(0, 40) : [];
  if (!lineas.length) return fallo(res, 400, 'El pedido llegó vacío.');

  const productos = await todos('SELECT id, nombre, precio, slug FROM productos');
  const porId = new Map(productos.map((p) => [Number(p.id), p]));

  let total = 0;
  let faltaPrecio = false;
  const items = [];
  for (const l of lineas) {
    const p = porId.get(Number(l.id));
    if (!p) continue;
    const cantidad = Math.min(99, Math.max(1, Number(l.cantidad) || 1));
    if (p.precio === null || p.precio === undefined) faltaPrecio = true;
    else total += Number(p.precio) * cantidad;
    items.push({ id: p.id, slug: p.slug, nombre: p.nombre, cantidad, precio: p.precio });
  }
  if (!items.length) return fallo(res, 400, 'Los productos del pedido ya no existen.');

  const referencia = 'ECM-' + new Date().toISOString().slice(2, 10).replace(/-/g, '') + '-' +
    Math.random().toString(36).slice(2, 6).toUpperCase();

  await correr(
    `INSERT INTO pedidos (referencia, fecha, cliente, telefono, ciudad, direccion, nota, items, total, estado, actualizado)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'nuevo', ?)`,
    [
      referencia, ahora(),
      V.textoOpcional(d.cliente, { max: 90 }),
      V.telefono(d.telefono) || null,
      V.textoOpcional(d.ciudad, { max: 90 }),
      V.textoOpcional(d.direccion, { max: 160 }),
      V.textoOpcional(d.nota, { max: 400 }),
      JSON.stringify(items),
      faltaPrecio ? null : total,
      ahora(),
    ]
  );
  return ok(res, { referencia });
}

module.exports = { enrutar, casa };
