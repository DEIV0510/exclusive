/**
 * EXCLUSIVE CAPS MED — pipeline de imágenes
 * ---------------------------------------------------------------------------
 * Toma las fotos originales de la carpeta "gorras", las deja todas cuadradas y
 * con el mismo aire alrededor, y exporta WebP en varios tamaños + un JPG de
 * respaldo + la miniatura borrosa que se ve mientras carga.
 *
 * TRATAMIENTO
 * Las fotos de catálogo vienen sobre fondo blanco. NO se oscurecen: se recorta
 * el fondo sobrante, se centra la gorra en un lienzo cuadrado y se rellena con
 * el color real de las esquinas de esa misma foto, así no se ve ninguna
 * costura ni marco. Es lo que hace que 50 fotos de sesiones distintas queden
 * como una sola retícula ordenada.
 *
 * Uso:  NODE_PATH=<ruta a node_modules con sharp> node _tools/build-images.js
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SRC = 'C:/Users/Lenovo/Desktop/gorras';
const OUT = path.join(__dirname, '..', 'assets', 'img');
const OUT_LOGO = path.join(__dirname, '..', 'assets', 'logo');
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(OUT_LOGO, { recursive: true });

// 160 = miniaturas de la ficha · 400 = tarjeta en móvil · 760 = tarjeta grande
// y ficha · 1200 = lente de zoom
const ANCHOS = [160, 400, 760, 1200];

/* ═══════════════════════════════════════════════════════════════════════════
   LAS FOTOS
   src    archivo dentro de la carpeta "gorras"
   out    nombre que se usa en js/productos.js
   crop   recorte opcional {left, top, width, height}
   aire   cuánto respirar alrededor (1 = pegado, 1.12 = 12% de margen)
   ═══════════════════════════════════════════════════════════════════════════ */
const FOTOS = [
  /* ── New Era · Shohei Ohtani 17 ─────────────────────────────────────────
     gorra6 = gorra3, gorra7 = gorra2, gorra8 = gorra (repetidas)          */
  { src: 'gorra3.png', out: 'ohtani-1', crop: { left: 125, top: 75, width: 545, height: 435 } },
  { src: 'gorra.png',  out: 'ohtani-2', crop: { left: 8, top: 38, width: 548, height: 370 } },
  { src: 'gorra2.png', out: 'ohtani-3', crop: { left: 100, top: 92, width: 385, height: 500 } },

  /* ── New Era · Roses (gorra4/5/9 traen las dos gorras juntas) ────────── */
  { src: 'gorra5.png', out: 'ny-roses-1',  crop: { left: 10, top: 238, width: 295, height: 320 } },
  { src: 'gorra4.png', out: 'ny-roses-2',  crop: { left: 0, top: 232, width: 320, height: 430 } },
  { src: 'gorra5.png', out: 'sox-roses-1', crop: { left: 300, top: 232, width: 265, height: 275 } },
  { src: 'gorra4.png', out: 'sox-roses-2', crop: { left: 258, top: 230, width: 317, height: 350 } },

  /* ── New Era · St. Louis Cardinals crema / celeste ──────────────────── */
  { src: 'gorra37.png', out: 'cardinals-1' },
  { src: 'gorra36.png', out: 'cardinals-2' },
  { src: 'gorra38.png', out: 'cardinals-3' },
  { src: 'gorra40.png', out: 'cardinals-4' },

  /* ── New Era · Yankees "Fresh from New York" ────────────────────────── */
  { src: 'gorra39.png', out: 'yankees-fresh-1' },

  /* ── New Era · Charlotte Hornets crema / verde azulado ──────────────── */
  { src: 'gorra50.png', out: 'hornets-1' },
  { src: 'gorra52.png', out: 'hornets-2' },
  { src: 'gorra51.png', out: 'hornets-3' },

  /* ── New Era · azul marino con parche NL ────────────────────────────── */
  { src: 'gorra53.png', out: 'nl-navy-1' },

  /* ── New Era · Boston Red Sox "B" con alas ──────────────────────────── */
  { src: 'gorra54.png', out: 'redsox-alas-1' },

  /* ── New Era · Atlanta Braves naranja / crema ───────────────────────── */
  { src: 'gorra58.png', out: 'braves-1' },
  { src: 'gorra56.png', out: 'braves-2' },
  { src: 'gorra57.png', out: 'braves-3' },
  { src: 'gorra55.png', out: 'braves-4' },

  /* ── New Era · New York gris / azul "100 Seasons" ───────────────────── */
  { src: 'gorra60.png', out: 'ny100-1' },
  { src: 'gorra59.png', out: 'ny100-2' },
  { src: 'gorra61.png', out: 'ny100-3' },
  { src: 'gorra62.png', out: 'ny100-4' },

  /* ── New Era · Toronto Blue Jays tan / celeste ──────────────────────── */
  { src: 'gorra63.png', out: 'bluejays-1' },
  { src: 'gorra64.png', out: 'bluejays-2' },

  /* ── New Era · Boston tan / azul marino ─────────────────────────────── */
  { src: 'gorra66.png', out: 'boston-tan-1' },
  { src: 'gorra65.png', out: 'boston-tan-2' },

  /* ── Americanino · blanca con escudo AM ─────────────────────────────── */
  { src: 'gorra23.png', out: 'am-escudo-1' },
  { src: 'gorra24.png', out: 'am-escudo-2', ocupacion: 0.94 },
  { src: 'gorra25.png', out: 'am-escudo-3', ocupacion: 0.94 },

  /* ── Americanino · trucker crema / roja Creative Campus ─────────────── */
  { src: 'gorra27.png', out: 'am-trucker-1' },
  { src: 'gorra29.png', out: 'am-trucker-2', ocupacion: 0.94 },
  { src: 'gorra30.png', out: 'am-trucker-3', ocupacion: 0.94 },

  /* ── Americanino · azul con laurel Amc ──────────────────────────────── */
  { src: 'gorra31.png', out: 'am-azul-1' },
  { src: 'gorra32.png', out: 'am-azul-2', ocupacion: 0.94 },

  /* ── Americanino · crema con AM verde ───────────────────────────────── */
  { src: 'gorra33.png', out: 'am-verde-1' },
  { src: 'gorra34.png', out: 'am-verde-2', ocupacion: 0.94 },
  { src: 'gorra35.png', out: 'am-verde-3', ocupacion: 0.94 },
];

/* ═══════════════════════════════════════════════════════════════════════════
   PÓSTERS DE COLECCIÓN (Melos Caps)
   Se usan enteros, sin recortar: son piezas de campaña diseñadas así.
   ═══════════════════════════════════════════════════════════════════════════ */
const POSTERS = [
  { src: 'gorra10.png', out: 'col-chrome-negro' },
  { src: 'gorra12.png', out: 'col-chrome-crema' },
  { src: 'gorra16.png', out: 'col-chrome-2' },
  { src: 'gorra13.png', out: 'col-kamizoku' },
  { src: 'gorra14.png', out: 'col-pink-paws' },
  { src: 'gorra15.png', out: 'col-fortune' },
  { src: 'gorra20.png', out: 'col-haru' },
  { src: 'gorra17.png', out: 'col-777' },
  { src: 'gorra18.png', out: 'col-333' },
  { src: 'gorra19.png', out: 'col-111' },
];

/* ═══════════════════════════════════════════════════════════════════════════
   FOTOS DE ENTREGAS
   ───────────────────────────────────────────────────────────────────────────
   No hay que escribir nada aquí: se toman solas todas las fotos de la carpeta
   "gorras" cuyo nombre empiece por "entrega" (entrega1.jpg, entrega-2.png,
   entregaJuan.jpeg...). Se ordenan por nombre y salen en el mosaico de la
   portada, recortadas en cuadrado.
   ═══════════════════════════════════════════════════════════════════════════ */
function buscarEntregas() {
  return fs.readdirSync(SRC)
    .filter((f) => /^entrega/i.test(f) && /\.(png|jpe?g|webp)$/i.test(f))
    .sort((a, b) => a.localeCompare(b, 'es', { numeric: true }))
    .map((f, i) => ({ src: f, out: 'entrega-' + (i + 1) }));
}

/* Lado del lienzo cuadrado de todas las fotos de producto */
const LADO = 760;
/* Qué porcentaje del lienzo ocupa la gorra (su lado más largo).
   Normalizarlo es lo que hace que todas se vean del mismo tamaño en la
   retícula, vengan de la sesión que vengan. */
const OCUPACION = 0.86;

/* ¿El borde de la foto es un fondo liso? Se miran cuatro tiras finas: si
   apenas varían, es un fondo de estudio y se puede replicar con un color
   plano. Si varían mucho, hay textura y hay que difuminar. */
async function analizarBorde(buf) {
  const m = await sharp(buf).metadata();
  const g = Math.max(3, Math.round(Math.min(m.width, m.height) * 0.02));
  const tiras = [
    { left: 0, top: 0, width: m.width, height: g },
    { left: 0, top: m.height - g, width: m.width, height: g },
    { left: 0, top: 0, width: g, height: m.height },
    { left: m.width - g, top: 0, width: g, height: m.height },
  ];
  let suma = [0, 0, 0], desv = 0;
  for (const t of tiras) {
    // stats() mide la imagen de entrada e ignora el extract pendiente: hay
    // que materializar la tira antes o se acaba midiendo la foto entera.
    const trozo = await sharp(buf).extract(t).png().toBuffer();
    const s = await sharp(trozo).stats();
    for (let c = 0; c < 3; c++) {
      suma[c] += s.channels[c].mean;
      desv = Math.max(desv, s.channels[c].stdev);
    }
  }
  return {
    color: { r: Math.round(suma[0] / 4), g: Math.round(suma[1] / 4), b: Math.round(suma[2] / 4) },
    desviacion: Math.round(desv),
    uniforme: desv < 16,
  };
}

/* Suaviza el contorno de la copia nítida para que se funda con el fondo */
async function difuminarBordes(buf, radio) {
  const m = await sharp(buf).metadata();
  const mascara = await sharp({
    create: { width: m.width, height: m.height, channels: 3, background: '#000000' },
  })
    .composite([{
      input: await sharp({
        create: {
          width: Math.max(1, m.width - radio * 2),
          height: Math.max(1, m.height - radio * 2),
          channels: 3, background: '#ffffff',
        },
      }).png().toBuffer(),
      gravity: 'center',
    }])
    .blur(radio / 2)
    .toColourspace('b-w')
    .png()
    .toBuffer();

  return sharp(buf).ensureAlpha()
    .composite([{ input: mascara, blend: 'dest-in' }])
    .png()
    .toBuffer();
}

async function exportar(buf, nombre) {
  const m = await sharp(buf).metadata();
  for (const w of ANCHOS) {
    const escala = w / m.width;
    let s = sharp(buf).resize({ width: w, kernel: 'lanczos3' });
    if (escala > 1.15) s = s.sharpen({ sigma: 0.7, m1: 0.5, m2: 1.8 });
    await s.webp({ quality: 84, effort: 6 }).toFile(path.join(OUT, `${nombre}-${w}.webp`));
  }
  await sharp(buf).resize({ width: 760, kernel: 'lanczos3' })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(path.join(OUT, `${nombre}-760.jpg`));

  const lqip = await sharp(buf).resize({ width: 24 }).blur(1.2).webp({ quality: 40 }).toBuffer();
  return `data:image/webp;base64,${lqip.toString('base64')}`;
}

async function procesarFoto(job) {
  // La foto completa se guarda aparte: de ella sale el fondo difuminado. Si
  // el fondo se sacara del recorte (que va pegado a la gorra) el resultado
  // sería una gorra borrosa detrás de la gorra nítida, no un fondo.
  const completa = await sharp(path.join(SRC, job.src)).removeAlpha().png().toBuffer();

  let img = sharp(path.join(SRC, job.src));
  if (job.crop) img = img.extract(job.crop);
  let buf = await img.removeAlpha().png().toBuffer();

  // 1. El borde se mide ANTES de recortar: después de recortar, el borde ya
  //    es la propia gorra y cualquier fondo parecería tener textura.
  const borde = await analizarBorde(buf);

  // 2. Recorta el fondo uniforme que sobra por los bordes
  try {
    const recortado = await sharp(buf).trim({ threshold: 14 }).png().toBuffer();
    const m = await sharp(recortado).metadata();
    // Si el recorte se comió casi todo, algo salió mal: se usa el original
    if (m.width > 40 && m.height > 40) buf = recortado;
  } catch (e) { /* nada que recortar */ }

  // 3. Escala la gorra para que ocupe siempre la misma porción del cuadro
  const objetivo = Math.round(LADO * (job.ocupacion || OCUPACION));
  const gorra = await sharp(buf)
    .resize({ width: objetivo, height: objetivo, fit: 'inside', kernel: 'lanczos3' })
    .png()
    .toBuffer();

  // 4. El fondo del lienzo depende de cómo sea el borde de la foto:
  let fondo, pieza;

  if (borde.uniforme) {
    // Fondo liso de estudio: se rellena con EXACTAMENTE ese color y el
    // empalme desaparece. Es el caso de casi todas las fotos de catálogo.
    fondo = await sharp({
      create: { width: LADO, height: LADO, channels: 3, background: borde.color },
    }).png().toBuffer();
    pieza = gorra;
  } else {
    // Fondo con textura (madera, estudio oscuro, neón): se amplía la FOTO
    // COMPLETA muy desenfocada y se difuminan los bordes de la copia nítida,
    // así no queda ningún rectángulo marcado.
    fondo = await sharp(completa)
      .resize({ width: LADO, height: LADO, fit: 'cover', position: 'centre' })
      .blur(42)
      .modulate({ saturation: 0.8, brightness: 0.92 })
      .png()
      .toBuffer();
    pieza = await difuminarBordes(gorra, 14);
  }

  buf = await sharp(fondo)
    .composite([{ input: pieza, gravity: 'center' }])
    .png()
    .toBuffer();

  const lqip = await exportar(buf, job.out);

  // Portada 1200x630 para compartir por WhatsApp y redes
  await sharp(buf)
    .resize({ width: 1200, height: 630, fit: 'cover', position: 'centre', kernel: 'lanczos3' })
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile(path.join(OUT, `og-${job.out}.jpg`));

  return { out: job.out, lqip, w: LADO, h: LADO };
}

/* Los pósters conservan sus proporciones verticales: son piezas de campaña */
async function procesarPoster(job) {
  const buf = await sharp(path.join(SRC, job.src)).removeAlpha().png().toBuffer();
  const m = await sharp(buf).metadata();
  for (const w of [400, 760]) {
    await sharp(buf).resize({ width: w, kernel: 'lanczos3' })
      .webp({ quality: 82, effort: 6 })
      .toFile(path.join(OUT, `${job.out}-${w}.webp`));
  }
  await sharp(buf).resize({ width: 760, kernel: 'lanczos3' })
    .jpeg({ quality: 80, mozjpeg: true })
    .toFile(path.join(OUT, `${job.out}-760.jpg`));
  const lqip = await sharp(buf).resize({ width: 20 }).blur(1.2).webp({ quality: 40 }).toBuffer();
  return { out: job.out, lqip: `data:image/webp;base64,${lqip.toString('base64')}`, w: m.width, h: m.height };
}

/* ── La portada del inicio: foto de estilo de vida para el hero ─────────── */
async function procesarPortada() {
  const buf = await sharp(path.join(SRC, 'portada inicio .png')).removeAlpha().png().toBuffer();
  const m = await sharp(buf).metadata();
  for (const w of [400, 760, 1200]) {
    await sharp(buf).resize({ width: w, kernel: 'lanczos3' })
      .sharpen({ sigma: 0.6, m1: 0.4, m2: 1.5 })
      .webp({ quality: 86, effort: 6 })
      .toFile(path.join(OUT, `portada-${w}.webp`));
  }
  await sharp(buf).resize({ width: 900, kernel: 'lanczos3' })
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile(path.join(OUT, 'portada-760.jpg'));

  // Versión apaisada para compartir
  await sharp(buf)
    .resize({ width: 1200, height: 630, fit: 'cover', position: 'top', kernel: 'lanczos3' })
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(path.join(OUT_LOGO, 'og-image.jpg'));

  const lqip = await sharp(buf).resize({ width: 20 }).blur(1.2).webp({ quality: 40 }).toBuffer();
  console.log(`  ✓ portada ${m.width}x${m.height}`);
  return { out: 'portada', lqip: `data:image/webp;base64,${lqip.toString('base64')}` };
}

/* ── Logo e iconos ─────────────────────────────────────────────────────── */
async function procesarLogo() {
  const trim = await sharp(path.join(SRC, 'logosinfondo.png')).trim({ threshold: 1 }).png().toBuffer();
  const m = await sharp(trim).metadata();
  const lado = Math.max(m.width, m.height);
  const cuadrado = await sharp({
    create: { width: lado, height: lado, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  }).composite([{ input: trim, gravity: 'center' }]).png().toBuffer();

  for (const t of [{ w: 256, q: 80 }, { w: 128, q: 82 }]) {
    await sharp(cuadrado).resize({ width: t.w }).webp({ quality: t.q, effort: 6 })
      .toFile(path.join(OUT_LOGO, `emblema-${t.w}.webp`));
  }
  await sharp(cuadrado).resize({ width: 256 })
    .png({ compressionLevel: 9, palette: true, quality: 90 })
    .toFile(path.join(OUT_LOGO, 'emblema-256.png'));

  for (const w of [180, 192, 512]) {
    const nombre = w === 180 ? 'apple-touch-icon.png' : `icono-${w}.png`;
    await sharp({ create: { width: w, height: w, channels: 4, background: '#0a1730' } })
      .composite([{ input: await sharp(cuadrado).resize({ width: Math.round(w * 0.92) }).toBuffer(), gravity: 'center' }])
      .png({ compressionLevel: 9, palette: true, quality: 90 })
      .toFile(path.join(OUT_LOGO, nombre));
  }
  await sharp({ create: { width: 48, height: 48, channels: 4, background: '#0a1730' } })
    .composite([{ input: await sharp(cuadrado).resize({ width: 44 }).toBuffer(), gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT_LOGO, 'favicon-48.png'));

  console.log('  ✓ logo e iconos');
}

/* ── Ejecutar ──────────────────────────────────────────────────────────── */
(async () => {
  const lqips = {};
  console.log(`\nProcesando ${FOTOS.length} fotos de producto...`);
  for (const job of FOTOS) {
    const r = await procesarFoto(job);
    lqips[r.out] = r.lqip;
    console.log(`  ✓ ${r.out.padEnd(16)} ${r.w}x${r.h}`);
  }

  console.log(`\nProcesando ${POSTERS.length} pósters de colección...`);
  for (const job of POSTERS) {
    const r = await procesarPoster(job);
    lqips[r.out] = r.lqip;
    console.log(`  ✓ ${r.out.padEnd(16)} ${r.w}x${r.h}`);
  }

  const entregas = buscarEntregas();
  if (entregas.length) {
    console.log(`\nProcesando ${entregas.length} fotos de entregas...`);
    for (const job of entregas) {
      // Recorte cuadrado centrado: son fotos de celular, de cualquier forma
      const buf = await sharp(path.join(SRC, job.src))
        .removeAlpha()
        .resize({ width: LADO, height: LADO, fit: 'cover', position: 'attention', kernel: 'lanczos3' })
        .png()
        .toBuffer();
      lqips[job.out] = await exportar(buf, job.out);
      console.log(`  ✓ ${job.out.padEnd(16)} desde ${job.src}`);
    }
  } else {
    console.log('\nSin fotos de entregas todavía.');
    console.log('  Para llenar el mosaico: deja fotos en la carpeta "gorras" con');
    console.log('  nombres que empiecen por "entrega" (entrega1.jpg, entrega2.jpg...)');
    console.log('  y vuelve a correr este comando.');
  }

  console.log('\nPortada, logo e iconos...');
  const p = await procesarPortada();
  lqips[p.out] = p.lqip;
  await procesarLogo();

  fs.writeFileSync(path.join(__dirname, 'lqip.json'), JSON.stringify(lqips, null, 2));
  console.log(`\nListo: ${Object.keys(lqips).length} imágenes en assets/img\n`);
})();
