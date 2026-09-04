/* ═══════════════════════════════════════════════════════════════════════════
   IMÁGENES
   ───────────────────────────────────────────────────────────────────────────
   Una foto subida desde el panel pasa por el mismo tratamiento que las que ya
   están en la tienda: se recorta a cuadrado, se generan los cuatro tamaños en
   webp más un jpg de respaldo, y se guarda una miniatura borrosa para que la
   tarjeta no salte mientras carga.

   Dónde quedan los archivos:
     · En tu computador -> assets/img, como siempre
     · En Vercel        -> Vercel Blob, porque allí el disco es de solo lectura

   En los dos casos la tienda las pide igual: assets/img/<base>-400.webp. Si el
   archivo no está en el disco, el servidor lo busca en la base y redirige.
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';

const fs = require('fs');
const path = require('path');
const { todos, uno, correr, RAIZ } = require('./db');
const { ErrorDeDatos } = require('./validar');

const ANCHOS = [160, 400, 760, 1200];
const LADO = 1200;
// 9 MB: por debajo del límite del cuerpo incluso contando el 33 % del base64
const MAX_BYTES = 9 * 1024 * 1024;
const TIPOS_OK = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' };

const DIR = path.join(RAIZ, 'assets', 'img');
const usaBlob = () => !!process.env.BLOB_READ_WRITE_TOKEN;

/* ── Reconoce el tipo por los primeros bytes, no por lo que diga el nombre ── */
function tipoReal(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'image/jpeg';
  if (buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  const riff = buf.slice(0, 4).toString('ascii');
  if (riff === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  if (buf.slice(4, 8).toString('ascii') === 'ftyp' && buf.slice(8, 12).toString('ascii').startsWith('avi')) return 'image/avif';
  return null;
}

/* Nombre base único y limpio para los archivos */
function baseLibre(sugerido) {
  const limpio = String(sugerido || 'foto')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/\.[a-z0-9]+$/, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'foto';
  return limpio + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

/* ── Procesa y guarda ────────────────────────────────────────────────────── */
async function guardarFoto(buffer, nombreSugerido) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) {
    throw new ErrorDeDatos('No llegó ninguna imagen.');
  }
  if (buffer.length > MAX_BYTES) {
    throw new ErrorDeDatos('La imagen pesa más de 10 MB. Súbela más liviana.');
  }
  const tipo = tipoReal(buffer);
  if (!tipo || !TIPOS_OK[tipo]) {
    throw new ErrorDeDatos('Ese archivo no es una imagen válida. Usa JPG, PNG o WEBP.');
  }

  const sharp = require('sharp');
  let meta;
  try {
    meta = await sharp(buffer).metadata();
  } catch (_) {
    throw new ErrorDeDatos('No pude leer esa imagen. Puede estar dañada.');
  }
  if (!meta.width || !meta.height) throw new ErrorDeDatos('No pude leer esa imagen.');
  if (meta.width < 200 || meta.height < 200) {
    throw new ErrorDeDatos('La imagen es muy pequeña. Necesito al menos 200 x 200 píxeles.');
  }

  const base = baseLibre(nombreSugerido);

  // Cuadrado, centrado en lo que importa, sobre el mismo fondo claro del sitio
  const cuadrada = await sharp(buffer)
    .rotate()
    .resize(LADO, LADO, { fit: 'cover', position: 'attention' })
    .toBuffer();

  const salidas = [];
  for (const ancho of ANCHOS) {
    salidas.push({
      ancho, tipo: 'webp',
      datos: await sharp(cuadrada).resize(ancho, ancho).webp({ quality: ancho > 700 ? 78 : 74 }).toBuffer(),
    });
  }
  // Un jpg de respaldo para el <img> de dentro del <picture>
  salidas.push({
    ancho: 760, tipo: 'jpg',
    datos: await sharp(cuadrada).resize(760, 760).jpeg({ quality: 80, progressive: true }).toBuffer(),
  });

  // Miniatura borrosa que se pinta mientras baja la foto de verdad
  const mini = await sharp(cuadrada).resize(24, 24).blur(1.1).webp({ quality: 42 }).toBuffer();
  const lqip = 'data:image/webp;base64,' + mini.toString('base64');

  for (const s of salidas) {
    const archivo = `${base}-${s.ancho}.${s.tipo}`;
    const url = usaBlob() ? await subirABlob(archivo, s.datos, s.tipo) : guardarEnDisco(archivo, s.datos);
    await correr(
      `INSERT INTO archivos (base, ancho, tipo, url, lqip) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(base, ancho, tipo) DO UPDATE SET url = excluded.url, lqip = excluded.lqip`,
      [base, s.ancho, s.tipo, url, lqip]
    );
  }

  return { base, origen: usaBlob() ? 'blob' : 'local', lqip, ancho: LADO };
}

function guardarEnDisco(archivo, datos) {
  if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(path.join(DIR, archivo), datos);
  return 'assets/img/' + archivo;
}

async function subirABlob(archivo, datos, tipo) {
  const { put } = require('@vercel/blob');
  const r = await put('img/' + archivo, datos, {
    access: 'public',
    contentType: tipo === 'jpg' ? 'image/jpeg' : 'image/webp',
    addRandomSuffix: false,
    cacheControlMaxAge: 31536000,
  });
  return r.url;
}

/* ── Dónde está un archivo concreto ──────────────────────────────────────── */
async function resolver(archivo) {
  const m = String(archivo).match(/^(.+)-(\d+)\.(webp|jpg)$/);
  if (!m) return null;
  const fila = await uno('SELECT url FROM archivos WHERE base = ? AND ancho = ? AND tipo = ?', [m[1], Number(m[2]), m[3]]);
  return fila ? fila.url : null;
}

/* Las miniaturas borrosas, para que la tienda no salte al cargar */
async function lqipDeTodas() {
  const filas = await todos('SELECT DISTINCT base, lqip FROM archivos WHERE lqip IS NOT NULL');
  const salida = {};
  filas.forEach((f) => { salida[f.base] = f.lqip; });
  return salida;
}

/* Bases disponibles: las subidas por el panel más las que ya venían en disco */
async function listarBases() {
  const subidas = (await todos('SELECT DISTINCT base FROM archivos')).map((f) => f.base);
  let enDisco = [];
  try {
    enDisco = fs.readdirSync(DIR)
      .filter((f) => f.endsWith('-400.webp'))
      .map((f) => f.replace('-400.webp', ''));
  } catch (_) { /* en Vercel no hay carpeta que leer */ }
  return [...new Set([...enDisco, ...subidas])].sort();
}

/* Borra una foto de todos sus tamaños. Solo si ya no la usa ningún producto. */
async function borrarFoto(base) {
  const uso = await uno('SELECT COUNT(*) AS n FROM imagenes WHERE base = ?', [base]);
  if (Number(uso.n) > 0) {
    throw new ErrorDeDatos('Esa foto todavía la usa un producto. Quítala del producto primero.');
  }
  const filas = await todos('SELECT url FROM archivos WHERE base = ?', [base]);
  if (usaBlob()) {
    const { del } = require('@vercel/blob');
    for (const f of filas) { try { await del(f.url); } catch (_) { /* si ya no está, da igual */ } }
  } else {
    for (const f of filas) {
      const p = path.join(RAIZ, f.url);
      try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch (_) { /* nada */ }
    }
  }
  await correr('DELETE FROM archivos WHERE base = ?', [base]);
  return true;
}

module.exports = { guardarFoto, resolver, lqipDeTodas, listarBases, borrarFoto, ANCHOS, MAX_BYTES, TIPOS_OK, usaBlob };
