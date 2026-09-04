/* ═══════════════════════════════════════════════════════════════════════════
   SEMBRAR LA BASE DE DATOS
   ───────────────────────────────────────────────────────────────────────────
   Pasa el catálogo escrito a mano de _tools/semilla/ a la base de datos, que
   es de donde lee la tienda desde que existe el panel. Se usa una vez al
   arrancar el proyecto, y otra vez al publicarlo para sembrar producción.

   Se puede correr las veces que haga falta: no duplica nada. Lo que ya esté
   en la base NO se pisa, salvo que se le pase --rehacer.

       node _tools/sembrar.js
       node _tools/sembrar.js --admin tu@correo.com      (crea el usuario)
       node _tools/sembrar.js --rehacer                  (vuelve a empezar)
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const RAIZ = path.join(__dirname, '..');
const { todos, uno, correr, prepararEsquema, ahora } = require(path.join(RAIZ, 'api', '_lib', 'db.js'));
const { guardarAjuste } = require(path.join(RAIZ, 'api', '_lib', 'contenido.js'));
const auth = require(path.join(RAIZ, 'api', '_lib', 'auth.js'));

const args = process.argv.slice(2);
const rehacer = args.includes('--rehacer');
const iAdmin = args.indexOf('--admin');
const correoAdmin = iAdmin >= 0 ? args[iAdmin + 1] : null;

/* ── Lee los archivos de siempre sin ejecutar nada peligroso ─────────────── */
function leerArchivosDeMano() {
  const caja = { window: {} };
  vm.createContext(caja);
  ['_tools/semilla/config.js', '_tools/semilla/productos.js'].forEach((rel) => {
    const p = path.join(RAIZ, rel);
    if (!fs.existsSync(p)) return;
    vm.runInContext(fs.readFileSync(p, 'utf8'), caja, { filename: rel });
  });
  const ECM = caja.window.ECM || {};
  return {
    CONFIG: ECM.CONFIG || null,
    PRODUCTOS: ECM.PRODUCTOS || [],
    COLECCIONES: ECM.COLECCIONES || [],
  };
}

async function vacia(tabla) {
  const f = await uno(`SELECT COUNT(*) AS n FROM ${tabla}`);
  return Number(f.n) === 0;
}

async function principal() {
  await prepararEsquema();

  if (rehacer) {
    console.log('  Vaciando el contenido (los usuarios y los pedidos se conservan)…');
    for (const t of ['imagenes', 'productos', 'marcas', 'tipos', 'colecciones', 'banners', 'ajustes']) {
      await correr(`DELETE FROM ${t}`);
    }
  }

  const { CONFIG, PRODUCTOS, COLECCIONES } = leerArchivosDeMano();
  if (!CONFIG) {
    console.log('  No encontré la semilla en _tools/semilla. Nada que sembrar.');
  } else {
    await sembrarAjustes(CONFIG);
    await sembrarTaxonomia(CONFIG);
    await sembrarProductos(PRODUCTOS);
    await sembrarColecciones(COLECCIONES);
  }

  if (correoAdmin) await crearAdmin(correoAdmin);

  const n = await uno('SELECT COUNT(*) AS n FROM productos');
  const u = await uno('SELECT COUNT(*) AS n FROM usuarios');
  console.log(`\n  Listo: ${n.n} productos y ${u.n} usuario(s) en la base.`);
  if (Number(u.n) === 0) {
    console.log('\n  Todavía no hay ningún usuario. Crea el tuyo con:');
    console.log('      node _tools/sembrar.js --admin tu@correo.com\n');
  }
}

/* ── Ajustes ─────────────────────────────────────────────────────────────── */
async function sembrarAjustes(C) {
  const bloques = {
    identidad: {
      marca: C.marca, razonSocial: C.razonSocial, ciudad: C.ciudad,
      region: C.region, pais: C.pais, descripcionCorta: C.descripcionCorta,
      direccion: C.direccion || null, correo: C.correo || null,
    },
    whatsapp: C.whatsapp,
    redes: {
      instagram: { usuario: (C.instagram || {}).usuario || '', url: (C.instagram || {}).url || '', activa: !!C.instagram },
      tiktok: { usuario: (C.tiktok || {}).usuario || '', url: (C.tiktok || {}).url || '', activa: !!C.tiktok },
      facebook: { usuario: '', url: '', activa: false },
    },
    sitio: C.sitio,
    moneda: C.moneda,
    colores: (C.taxonomia || {}).colores || {},
    carrusel: C.carrusel || [],
    carruselSegundos: typeof C.carruselSegundos === 'number' ? C.carruselSegundos : 6,
    confianza: C.confianza || [],
    pasos: C.pasos || [],
    faq: C.faq || [],
    checkout: C.checkout || { pedirCiudad: true, pedirDireccion: true, pedirNota: true },
    seo: { titulo: '', descripcion: '', imagen: '' },
  };

  let puestos = 0;
  for (const [clave, valor] of Object.entries(bloques)) {
    const ya = await uno('SELECT clave FROM ajustes WHERE clave = ?', [clave]);
    if (ya) continue;
    await guardarAjuste(clave, valor);
    puestos++;
  }
  console.log(`  Ajustes: ${puestos} bloques nuevos`);
}

/* ── Marcas y tipos ──────────────────────────────────────────────────────── */
const aSlug = (t) => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

async function sembrarTaxonomia(C) {
  const tax = C.taxonomia || {};
  let m = 0;
  for (const [i, nombre] of (tax.marcas || []).entries()) {
    const ya = await uno('SELECT id FROM marcas WHERE nombre = ?', [nombre]);
    if (ya) continue;
    await correr('INSERT INTO marcas (nombre, slug, visible, orden) VALUES (?, ?, 1, ?)', [nombre, aSlug(nombre), i]);
    m++;
  }
  let t = 0;
  for (const [i, nombre] of (tax.tipos || []).entries()) {
    const ya = await uno('SELECT id FROM tipos WHERE nombre = ?', [nombre]);
    if (ya) continue;
    await correr('INSERT INTO tipos (nombre, slug, visible, orden) VALUES (?, ?, 1, ?)', [nombre, aSlug(nombre), i]);
    t++;
  }
  console.log(`  Marcas: ${m} nuevas · Tipos: ${t} nuevos`);
}

/* ── Productos y sus fotos ───────────────────────────────────────────────── */
async function sembrarProductos(lista) {
  let nuevos = 0;
  for (const [i, p] of lista.entries()) {
    const ya = await uno('SELECT id FROM productos WHERE slug = ?', [p.slug]);
    if (ya) continue;

    const estado = p.disponible === false ? 'agotado' : 'disponible';
    const r = await correr(
      `INSERT INTO productos
         (slug, nombre, marca, tipo, modelo, sku, precio, precio_antes, estado, stock,
          destacado, nuevo, exclusivo, colores, talla, descripcion, caracteristicas,
          orden, creado, actualizado)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        p.slug, p.nombre, p.marca || null, p.tipo || null, p.modelo || null, p.sku || null,
        p.precio === undefined ? null : p.precio,
        p.precioAntes === undefined ? null : p.precioAntes,
        estado,
        p.stock === undefined ? null : p.stock,
        p.destacado ? 1 : 0, p.nuevo ? 1 : 0, p.exclusivo ? 1 : 0,
        JSON.stringify(p.colores || []), p.talla || null, p.descripcion || null,
        JSON.stringify(p.caracteristicas || []),
        i, ahora(), ahora(),
      ]
    );
    const id = Number(r.lastInsertRowid);
    for (const [j, base] of (p.imagenes || []).entries()) {
      await correr(
        'INSERT INTO imagenes (producto_id, base, origen, orden) VALUES (?, ?, ?, ?)',
        [id, base, 'local', j]
      );
    }
    nuevos++;
  }
  console.log(`  Productos: ${nuevos} nuevos`);
}

async function sembrarColecciones(lista) {
  let n = 0;
  for (const [i, c] of lista.entries()) {
    const ya = await uno('SELECT id FROM colecciones WHERE imagen = ?', [c.imagen]);
    if (ya) continue;
    await correr(
      'INSERT INTO colecciones (imagen, nombre, nota, visible, orden) VALUES (?, ?, ?, 1, ?)',
      [c.imagen, c.nombre, c.nota || null, i]
    );
    n++;
  }
  console.log(`  Colecciones: ${n} nuevas`);
}

/* ── Primer usuario ──────────────────────────────────────────────────────── */
async function crearAdmin(correo) {
  const limpio = String(correo).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(limpio)) {
    console.log(`\n  "${correo}" no parece un correo válido.`);
    return;
  }
  const ya = await uno('SELECT id FROM usuarios WHERE correo = ?', [limpio]);
  if (ya) {
    console.log(`\n  Ese usuario ya existe. Si olvidaste la contraseña, córrelo con --rehacer-clave.`);
    return;
  }
  // Contraseña aleatoria fuerte: no queda escrita en ningún archivo del proyecto
  const clave = crypto.randomBytes(12).toString('base64url').replace(/[^A-Za-z0-9]/g, '') + '7k';
  await correr(
    'INSERT INTO usuarios (correo, nombre, hash, rol, activo, creado) VALUES (?, ?, ?, ?, 1, ?)',
    [limpio, 'Administrador', auth.hashear(clave), 'admin', ahora()]
  );
  console.log('\n  ┌──────────────────────────────────────────────────────────┐');
  console.log('  │  USUARIO CREADO. Apunta esto AHORA: no se vuelve a ver.  │');
  console.log('  └──────────────────────────────────────────────────────────┘');
  console.log(`     Correo:     ${limpio}`);
  console.log(`     Contraseña: ${clave}`);
  console.log('\n     Entra en /admin y cámbiala desde Administradores.\n');
}

principal().catch((e) => {
  console.error('\n  Falló el sembrado:', e.message);
  process.exit(1);
});
