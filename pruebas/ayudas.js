/* ═══════════════════════════════════════════════════════════════════════════
   AYUDAS PARA LAS PRUEBAS
   ───────────────────────────────────────────────────────────────────────────
   Un corredor de pruebas pequeño y sin librerías, como el resto del proyecto.

   Cada prueba levanta la tienda DE VERDAD (el mismo servidor que corre en tu
   computador) sobre una base de datos temporal y desechable. Nunca toca
   _datos/tienda.db, así que puedes correr las pruebas con el panel abierto sin
   miedo a perder nada.
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const RAIZ = path.join(__dirname, '..');

/* ── El marcador de las pruebas ──────────────────────────────────────────── */

const estado = { hechas: 0, fallos: [], grupo: '' };

function grupo(titulo) {
  estado.grupo = titulo;
  console.log('\n  ' + titulo);
  console.log('  ' + '─'.repeat(titulo.length));
}

async function prueba(que, fn) {
  estado.hechas++;
  try {
    await fn();
    console.log('    ok   ' + que);
  } catch (e) {
    estado.fallos.push({ grupo: estado.grupo, que, error: e && e.message ? e.message : String(e) });
    console.log('    FALLA ' + que);
    console.log('           ' + (e && e.message ? e.message : e));
  }
}

/* Comprobaciones. Los mensajes explican qué se esperaba, para que un fallo se
   entienda sin abrir el código. */
const debe = {
  ser(real, esperado, nota) {
    if (real !== esperado) {
      throw new Error((nota ? nota + ': ' : '') + 'esperaba ' + JSON.stringify(esperado) + ' y llegó ' + JSON.stringify(real));
    }
  },
  cierto(valor, nota) {
    if (!valor) throw new Error(nota || 'esperaba que fuera cierto');
  },
  falso(valor, nota) {
    if (valor) throw new Error(nota || 'esperaba que fuera falso');
  },
  contener(texto, trozo, nota) {
    if (String(texto).indexOf(trozo) < 0) {
      throw new Error((nota ? nota + ': ' : '') + 'no encontré ' + JSON.stringify(trozo));
    }
  },
  noContener(texto, trozo, nota) {
    if (String(texto).indexOf(trozo) >= 0) {
      throw new Error((nota ? nota + ': ' : '') + 'no debería aparecer ' + JSON.stringify(trozo));
    }
  },
  async fallar(promesa, nota) {
    let salio = false;
    try { await promesa; salio = true; } catch (_) { /* eso queríamos */ }
    if (salio) throw new Error(nota || 'esperaba que fallara y no falló');
  },
};

function resumen() {
  console.log('');
  if (!estado.fallos.length) {
    console.log('  ✓  las ' + estado.hechas + ' pruebas pasaron\n');
    return 0;
  }
  console.log('  ✕  ' + estado.fallos.length + ' de ' + estado.hechas + ' fallaron:\n');
  estado.fallos.forEach((f) => console.log('     · [' + f.grupo + '] ' + f.que + '\n       ' + f.error));
  console.log('');
  return 1;
}

/* ── Una tienda desechable ───────────────────────────────────────────────── */

let siguientePuerto = 5600 + Math.floor(process.pid % 300);

/* Levanta el servidor real con una base nueva y vacía. Devuelve un objeto con
   la dirección, un ayudante para llamar a la API y cómo apagarlo. */
async function tiendaDePruebas({ sembrar = true } = {}) {
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'ecm-prueba-'));
  const archivo = path.join(carpeta, 'tienda.db').replace(/\\/g, '/');
  const puerto = siguientePuerto++;
  const entorno = {
    ...process.env,
    TURSO_DATABASE_URL: 'file:' + archivo,
    TURSO_AUTH_TOKEN: '',
    PORT: String(puerto),
  };

  if (sembrar) {
    await correrComando('node', [path.join(RAIZ, '_tools', 'sembrar.js')], entorno);
    await correrComando('node', [
      path.join(RAIZ, '_tools', 'sembrar.js'),
      '--admin', 'pruebas@ecm.local', '--clave', 'ClaveDePruebas2609',
    ], entorno);
  }

  const proceso = spawn('node', [path.join(RAIZ, 'servidor-local.js')], {
    env: entorno, cwd: RAIZ, stdio: ['ignore', 'ignore', 'pipe'],
  });
  let errores = '';
  proceso.stderr.on('data', (d) => { errores += String(d); });

  const base = 'http://127.0.0.1:' + puerto;
  await esperarA(base + '/api/estado');

  let galleta = '';

  async function pedir(metodo, ruta, cuerpo, opciones = {}) {
    const r = await fetch(base + ruta, {
      method: metodo,
      redirect: opciones.seguirRedirecciones === false ? 'manual' : 'follow',
      headers: {
        'Content-Type': 'application/json',
        Origin: opciones.origen === undefined ? base : opciones.origen,
        ...(opciones.sinSesion ? {} : (galleta ? { Cookie: galleta } : {})),
        ...(opciones.cabeceras || {}),
      },
      body: cuerpo === undefined ? undefined : (typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo)),
    });
    const puesta = r.headers.get('set-cookie');
    if (puesta && !opciones.noGuardarGalleta) galleta = puesta.split(';')[0];
    const tipo = r.headers.get('content-type') || '';
    let datos = null;
    let texto = '';
    if (tipo.indexOf('json') >= 0) { datos = await r.json().catch(() => null); }
    else { texto = await r.text(); }
    return { estado: r.status, datos, texto, cabeceras: r.headers };
  }

  const tienda = {
    base,
    puerto,
    archivo,
    pedir,
    get errores() { return errores; },
    get galleta() { return galleta; },
    set galleta(v) { galleta = v; },
    async entrar(correo = 'pruebas@ecm.local', clave = 'ClaveDePruebas2609') {
      const r = await pedir('POST', '/api/admin/login', { correo, clave });
      if (r.estado !== 200) throw new Error('no pude entrar al panel: ' + r.estado + ' ' + JSON.stringify(r.datos));
      return r;
    },
    async cerrar() {
      try { proceso.kill(); } catch (_) { /* ya estaba muerto */ }
      await new Promise((r) => setTimeout(r, 120));
      try { fs.rmSync(carpeta, { recursive: true, force: true }); } catch (_) { /* da igual */ }
    },
  };
  return tienda;
}

async function correrComando(mandato, argumentos, entorno) {
  await new Promise((resolver, rechazar) => {
    const p = spawn(mandato, argumentos, { env: entorno, cwd: RAIZ, stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => { err += String(d); });
    p.on('close', (codigo) => (codigo === 0 ? resolver() : rechazar(new Error(mandato + ' salió con ' + codigo + ': ' + err))));
  });
}

async function esperarA(url, intentos = 60) {
  for (let i = 0; i < intentos; i++) {
    try {
      const r = await fetch(url);
      if (r.status < 500) return;
    } catch (_) { /* todavía no está */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('el servidor de pruebas no levantó: ' + url);
}

module.exports = { grupo, prueba, debe, resumen, tiendaDePruebas, RAIZ, estado };
