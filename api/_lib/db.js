/* ═══════════════════════════════════════════════════════════════════════════
   BASE DE DATOS
   ───────────────────────────────────────────────────────────────────────────
   Una sola conexión para todo el proyecto. El mismo código sirve en dos sitios:

     · En tu computador          -> un archivo SQLite en _datos/tienda.db
     · En Vercel (producción)    -> Turso, con las variables TURSO_URL y
                                    TURSO_TOKEN

   No hace falta cambiar nada al pasar de uno a otro: si no hay TURSO_URL,
   usa el archivo local.
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';

const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');

const RAIZ = path.join(__dirname, '..', '..');

let cliente = null;
let esquemaListo = false;

function url() {
  if (process.env.TURSO_URL) return process.env.TURSO_URL;
  // Local: el archivo vive fuera de assets para que nunca se sirva por web
  const dir = path.join(RAIZ, '_datos');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return 'file:' + path.join(dir, 'tienda.db').replace(/\\/g, '/');
}

function db() {
  if (!cliente) {
    cliente = createClient({
      url: url(),
      authToken: process.env.TURSO_TOKEN || undefined,
    });
  }
  return cliente;
}

/* ── Esquema ───────────────────────────────────────────────────────────────
   Todo con "IF NOT EXISTS": correrlo de más no rompe nada, así que se puede
   llamar en cada arranque en frío sin miedo.                              */
const ESQUEMA = [
  `CREATE TABLE IF NOT EXISTS ajustes (
     clave       TEXT PRIMARY KEY,
     valor       TEXT NOT NULL,
     actualizado TEXT NOT NULL
   )`,

  `CREATE TABLE IF NOT EXISTS marcas (
     id      INTEGER PRIMARY KEY AUTOINCREMENT,
     nombre  TEXT NOT NULL UNIQUE,
     slug    TEXT NOT NULL UNIQUE,
     logo    TEXT,
     visible INTEGER NOT NULL DEFAULT 1,
     orden   INTEGER NOT NULL DEFAULT 0
   )`,

  `CREATE TABLE IF NOT EXISTS tipos (
     id      INTEGER PRIMARY KEY AUTOINCREMENT,
     nombre  TEXT NOT NULL UNIQUE,
     slug    TEXT NOT NULL UNIQUE,
     imagen  TEXT,
     visible INTEGER NOT NULL DEFAULT 1,
     orden   INTEGER NOT NULL DEFAULT 0
   )`,

  `CREATE TABLE IF NOT EXISTS productos (
     id              INTEGER PRIMARY KEY AUTOINCREMENT,
     slug            TEXT NOT NULL UNIQUE,
     nombre          TEXT NOT NULL,
     marca           TEXT,
     tipo            TEXT,
     modelo          TEXT,
     sku             TEXT,
     precio          INTEGER,
     precio_antes    INTEGER,
     estado          TEXT NOT NULL DEFAULT 'disponible',
     stock           INTEGER,
     destacado       INTEGER NOT NULL DEFAULT 0,
     nuevo           INTEGER NOT NULL DEFAULT 0,
     exclusivo       INTEGER NOT NULL DEFAULT 0,
     colores         TEXT NOT NULL DEFAULT '[]',
     talla           TEXT,
     descripcion     TEXT,
     caracteristicas TEXT NOT NULL DEFAULT '[]',
     orden           INTEGER NOT NULL DEFAULT 0,
     creado          TEXT NOT NULL,
     actualizado     TEXT NOT NULL
   )`,

  /* Las fotos van en su propia tabla para que varios ángulos de la MISMA
     gorra queden agrupados y nunca se conviertan en productos distintos. */
  `CREATE TABLE IF NOT EXISTS imagenes (
     id          INTEGER PRIMARY KEY AUTOINCREMENT,
     producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
     base        TEXT NOT NULL,
     origen      TEXT NOT NULL DEFAULT 'local',
     orden       INTEGER NOT NULL DEFAULT 0
   )`,

  /* Dónde vive cada tamaño de una foto subida desde el panel */
  `CREATE TABLE IF NOT EXISTS archivos (
     base   TEXT NOT NULL,
     ancho  INTEGER NOT NULL,
     tipo   TEXT NOT NULL,
     url    TEXT NOT NULL,
     lqip   TEXT,
     PRIMARY KEY (base, ancho, tipo)
   )`,

  `CREATE TABLE IF NOT EXISTS colecciones (
     id      INTEGER PRIMARY KEY AUTOINCREMENT,
     imagen  TEXT NOT NULL,
     nombre  TEXT NOT NULL,
     nota    TEXT,
     visible INTEGER NOT NULL DEFAULT 1,
     orden   INTEGER NOT NULL DEFAULT 0
   )`,

  `CREATE TABLE IF NOT EXISTS banners (
     id      INTEGER PRIMARY KEY AUTOINCREMENT,
     titulo  TEXT,
     texto   TEXT,
     imagen  TEXT,
     boton   TEXT,
     enlace  TEXT,
     activo  INTEGER NOT NULL DEFAULT 1,
     orden   INTEGER NOT NULL DEFAULT 0
   )`,

  `CREATE TABLE IF NOT EXISTS usuarios (
     id            INTEGER PRIMARY KEY AUTOINCREMENT,
     correo        TEXT NOT NULL UNIQUE,
     nombre        TEXT NOT NULL,
     hash          TEXT NOT NULL,
     rol           TEXT NOT NULL DEFAULT 'editor',
     activo        INTEGER NOT NULL DEFAULT 1,
     creado        TEXT NOT NULL,
     ultimo_acceso TEXT
   )`,

  `CREATE TABLE IF NOT EXISTS sesiones (
     id         TEXT PRIMARY KEY,
     usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
     creada     TEXT NOT NULL,
     expira     TEXT NOT NULL,
     agente     TEXT
   )`,

  `CREATE TABLE IF NOT EXISTS pedidos (
     id          INTEGER PRIMARY KEY AUTOINCREMENT,
     referencia  TEXT NOT NULL UNIQUE,
     fecha       TEXT NOT NULL,
     cliente     TEXT,
     telefono    TEXT,
     ciudad      TEXT,
     direccion   TEXT,
     nota        TEXT,
     items       TEXT NOT NULL DEFAULT '[]',
     total       INTEGER,
     estado      TEXT NOT NULL DEFAULT 'nuevo',
     actualizado TEXT NOT NULL
   )`,

  /* Para frenar la fuerza bruta en el login */
  `CREATE TABLE IF NOT EXISTS intentos (
     id     INTEGER PRIMARY KEY AUTOINCREMENT,
     llave  TEXT NOT NULL,
     cuando TEXT NOT NULL
   )`,

  `CREATE INDEX IF NOT EXISTS ix_imagenes_producto ON imagenes (producto_id, orden)`,
  `CREATE INDEX IF NOT EXISTS ix_productos_estado  ON productos (estado)`,
  `CREATE INDEX IF NOT EXISTS ix_sesiones_expira   ON sesiones (expira)`,
  `CREATE INDEX IF NOT EXISTS ix_intentos_llave    ON intentos (llave, cuando)`,
  `CREATE INDEX IF NOT EXISTS ix_pedidos_fecha     ON pedidos (fecha DESC)`,
];

async function prepararEsquema() {
  if (esquemaListo) return;
  const c = db();
  for (const sql of ESQUEMA) await c.execute(sql);
  esquemaListo = true;
}

/* ── Ayudas de consulta ──────────────────────────────────────────────────── */
async function todos(sql, args = []) {
  await prepararEsquema();
  const r = await db().execute({ sql, args });
  return r.rows.map((f) => ({ ...f }));
}

async function uno(sql, args = []) {
  const filas = await todos(sql, args);
  return filas[0] || null;
}

async function correr(sql, args = []) {
  await prepararEsquema();
  return db().execute({ sql, args });
}

/* Varias escrituras que tienen que entrar o fallar juntas */
async function lote(sentencias) {
  await prepararEsquema();
  return db().batch(sentencias, 'write');
}

const ahora = () => new Date().toISOString();

module.exports = { db, prepararEsquema, todos, uno, correr, lote, ahora, RAIZ };
