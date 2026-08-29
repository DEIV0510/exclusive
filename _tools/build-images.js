/**
 * EXCLUSIVE CAPS MED — pipeline de imágenes
 * Recorta los productos desde las fotos originales, unifica el fondo con un
 * tratamiento navy y exporta WebP responsive (400 / 800 / 1200) + LQIP.
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
// y ficha · 1200 = lente de zoom.
// Las fotos originales son pequeñas (266–600 px de ancho), así que 1200 es un
// reescalado con lanczos + enfoque: sirve para el zoom, no añade detalle real.
const ANCHOS = [160, 400, 760, 1200];

/* Recortes: cada foto original -> una o dos gorras */
const RECORTES = [
  { src: 'gorra3.png', out: 'ohtani-1', crop: { left: 95, top: 55, width: 600, height: 470 }, tono: 'oscuro' },
  { src: 'gorra.png',  out: 'ohtani-2', crop: { left: 0, top: 0, width: 562, height: 560 }, tono: 'oscuro' },
  { src: 'gorra2.png', out: 'ohtani-3', crop: { left: 40, top: 40, width: 490, height: 620 }, tono: 'oscuro' },
  { src: 'gorra5.png', out: 'ny-1',     crop: { left: 8, top: 218, width: 284, height: 345 }, tono: 'claro' },
  { src: 'gorra4.png', out: 'ny-2',     crop: { left: 0, top: 228, width: 268, height: 392 }, tono: 'claro' },
  { src: 'gorra5.png', out: 'sox-1',    crop: { left: 302, top: 222, width: 266, height: 305 }, tono: 'claro' },
  { src: 'gorra4.png', out: 'sox-2',    crop: { left: 272, top: 222, width: 303, height: 385 }, tono: 'claro' },
];

/* Overlay navy suave para que todas las fotos convivan en la misma retícula */
function vinetaSVG(w, h, fuerza) {
  return Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="v" cx="50%" cy="45%" r="72%">
        <stop offset="45%" stop-color="#0a1730" stop-opacity="0"/>
        <stop offset="100%" stop-color="#050d1c" stop-opacity="${fuerza}"/>
      </radialGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#v)"/>
  </svg>`);
}

async function procesarProducto(job) {
  const claro = job.tono === 'claro';
  let img = sharp(path.join(SRC, job.src)).extract(job.crop);

  // Unifica: las fotos con fondo claro bajan de brillo; la saturación se sube un
  // punto para que el rojo de las rosas siga vivo (nada de tint: apaga los rojos).
  if (claro) {
    img = img.modulate({ brightness: 0.86, saturation: 1.1 });
  } else {
    img = img.modulate({ brightness: 1.04, saturation: 1.04 });
  }

  const base = await img.png().toBuffer();
  const m = await sharp(base).metadata();
  const conVineta = await sharp(base)
    .composite([{ input: vinetaSVG(m.width, m.height, claro ? 0.58 : 0.34), blend: 'over' }])
    .png()
    .toBuffer();

  for (const w of ANCHOS) {
    const escala = w / m.width;
    let s = sharp(conVineta).resize({ width: w, kernel: 'lanczos3' });
    if (escala > 1.15) s = s.sharpen({ sigma: 0.8, m1: 0.6, m2: 2 }); // compensa el reescalado
    await s.webp({ quality: 84, effort: 6 }).toFile(path.join(OUT, `${job.out}-${w}.webp`));
  }
  // Fallback JPG para navegadores sin WebP
  await sharp(conVineta).resize({ width: 760, kernel: 'lanczos3' })
    .sharpen({ sigma: 0.8, m1: 0.6, m2: 2 })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(path.join(OUT, `${job.out}-760.jpg`));

  // Portada 1200x630 para compartir por WhatsApp y redes. Se hace aparte
  // porque la foto del producto no tiene esas proporciones: recortarla al
  // vuelo dejaría la gorra cortada en la vista previa.
  await sharp({
    create: { width: 1200, height: 630, channels: 3, background: '#060D22' },
  })
    .composite([{
      input: await sharp(conVineta)
        .resize({ width: 1200, height: 630, fit: 'cover', position: 'centre', kernel: 'lanczos3' })
        .toBuffer(),
    }])
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile(path.join(OUT, `og-${job.out}.jpg`));

  // LQIP en base64 (24px) para el skeleton
  const lqip = await sharp(conVineta).resize({ width: 24 }).blur(1.2).webp({ quality: 40 }).toBuffer();
  return { out: job.out, lqip: `data:image/webp;base64,${lqip.toString('base64')}`, w: m.width, h: m.height };
}

async function procesarLogo() {
  const src = path.join(SRC, 'logosinfondo.png');
  const trim = await sharp(src).trim({ threshold: 1 }).png().toBuffer();
  const m = await sharp(trim).metadata();
  // Lienzo cuadrado, el emblema centrado
  const lado = Math.max(m.width, m.height);
  const cuadrado = await sharp({
    create: { width: lado, height: lado, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: trim, gravity: 'center' }])
    .png()
    .toBuffer();

  // Solo los tamaños que la página usa de verdad, con calidad ajustada al uso.
  // El emblema es un raster con degradados finos: pasar de q=80 casi no aporta
  // a la vista y triplica el peso, y este archivo entra en la pantalla de carga.
  const tamsLogo = [
    { w: 256, q: 80 },   // pantalla de carga, footer y menú
    { w: 128, q: 82 },   // header
  ];
  for (const t of tamsLogo) {
    await sharp(cuadrado).resize({ width: t.w }).webp({ quality: t.q, effort: 6 })
      .toFile(path.join(OUT_LOGO, `emblema-${t.w}.webp`));
  }
  // PNG de respaldo para navegadores sin WebP
  await sharp(cuadrado).resize({ width: 256 })
    .png({ compressionLevel: 9, palette: true, quality: 90 })
    .toFile(path.join(OUT_LOGO, 'emblema-256.png'));

  // Iconos: emblema sobre navy para que se vea en pestañas claras
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

  // Portada para redes (1200x630): foto real de la gorra a la derecha + emblema
  const fondoOg = Buffer.from(
    `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="g" cx="28%" cy="38%" r="82%">
          <stop offset="0%" stop-color="#122a55"/>
          <stop offset="100%" stop-color="#050d1c"/>
        </radialGradient>
      </defs>
      <rect width="1200" height="630" fill="url(#g)"/>
    </svg>`
  );
  const gorraOg = await sharp(path.join(OUT, 'ohtani-1-760.webp'))
    .resize({ width: 620, height: 630, fit: 'cover', position: 'centre' })
    .toBuffer();
  // Difuminado del borde izquierdo de la foto para que funda con el fondo
  const mascara = Buffer.from(
    `<svg width="620" height="630" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="m" x1="0" x2="1">
        <stop offset="0%" stop-color="#000" stop-opacity="0"/>
        <stop offset="32%" stop-color="#000" stop-opacity="1"/>
      </linearGradient></defs>
      <rect width="620" height="630" fill="url(#m)"/>
    </svg>`
  );
  const gorraFundida = await sharp(gorraOg)
    .composite([{ input: mascara, blend: 'dest-in' }])
    .png()
    .toBuffer();

  await sharp(fondoOg)
    .composite([
      { input: gorraFundida, left: 580, top: 0 },
      { input: await sharp(cuadrado).resize({ width: 340 }).toBuffer(), left: 70, top: 145 },
    ])
    .jpeg({ quality: 86 })
    .toFile(path.join(OUT_LOGO, 'og-image.jpg'));

  console.log('logo listo');
}

(async () => {
  const lqips = {};
  for (const job of RECORTES) {
    const r = await procesarProducto(job);
    lqips[r.out] = r.lqip;
    console.log('  ✓', r.out, `${r.w}x${r.h}`);
  }
  await procesarLogo();
  fs.writeFileSync(
    path.join(__dirname, 'lqip.json'),
    JSON.stringify(lqips, null, 2)
  );
  console.log('\nimágenes listas en assets/img');
})();
