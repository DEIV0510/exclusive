/* ═══════════════════════════════════════════════════════════════════════════
   EXCLUSIVE CAPS MED · generador de páginas
   ───────────────────────────────────────────────────────────────────────────
   Arma index.html, catalogo.html, una ficha por producto, 404.html,
   sitemap.xml, robots.txt y site.webmanifest a partir de:
       js/config.js  +  js/productos.js  +  _tools/plantilla/*.html

   CUÁNDO CORRERLO:  cada vez que agregues o cambies un producto, o cuando
   cambies el dominio en CONFIG.sitio.url

       node _tools/build-paginas.js

   No necesita instalar nada.
   ═══════════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const RAIZ = path.join(__dirname, '..');
const PLANTILLA = path.join(__dirname, 'plantilla');

/* ── Cargar config.js y productos.js sin navegador ─────────────────────── */
function cargarDatos() {
  const sandbox = { window: {}, console };
  sandbox.window.ECM = {};
  vm.createContext(sandbox);
  ['config.js', 'productos.js'].forEach((f) => {
    const codigo = fs.readFileSync(path.join(RAIZ, 'js', f), 'utf8');
    vm.runInContext(codigo, sandbox, { filename: f });
  });
  return {
    CONFIG: sandbox.window.ECM.CONFIG,
    PRODUCTOS: sandbox.window.ECM.PRODUCTOS,
    COLECCIONES: sandbox.window.ECM.COLECCIONES || [],
  };
}

const { CONFIG, PRODUCTOS, COLECCIONES } = cargarDatos();
const BASE = String(CONFIG.sitio.url).replace(/\/+$/, '');

/* ── Utilidades ────────────────────────────────────────────────────────── */
const leer = (f) => fs.readFileSync(path.join(PLANTILLA, f), 'utf8');
const esc = (t) => String(t == null ? '' : t)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const abs = (rel) => BASE + '/' + String(rel).replace(/^\/+/, '');
const urlProducto = (p) => `gorra-${p.slug}.html`;
const tienePrecio = (p) => typeof p.precio === 'number' && isFinite(p.precio) && p.precio > 0;

const pesos = new Intl.NumberFormat(CONFIG.moneda.locale, {
  style: 'currency', currency: CONFIG.moneda.codigo, maximumFractionDigits: 0,
});
const precioTexto = (v) => pesos.format(v).replace(/ /g, ' ');

// Corta por la última palabra completa: una meta description partida a mitad
// de palabra se ve mal en el resultado de búsqueda y en la vista previa.
function recortar(texto, max) {
  const t = String(texto).trim();
  if (t.length <= max) return t;
  const corte = t.slice(0, max - 1);
  const espacio = corte.lastIndexOf(' ');
  return (espacio > max * 0.6 ? corte.slice(0, espacio) : corte).replace(/[,;:.\s]+$/, '') + '…';
}

function altDe(p, i) {
  const colores = (p.colores || []).join(' y ').toLowerCase();
  const vistas = ['vista frontal', 'vista lateral', 'interior'];
  return `${p.nombre} — gorra ${p.tipo.toLowerCase()} ${p.marca} color ${colores}, ${vistas[i] || 'detalle'}`;
}

/* ── <head> ──────────────────────────────────────────────────────────────
   La imagen de Open Graph es SIEMPRE un JPG de 1200x630 generado a medida.
   Poner ahí el WebP del producto rompía la vista previa: WhatsApp y Facebook
   no siempre leen WebP y, además, las medidas declaradas (630) no coincidían
   con las reales (940 a 1458), así que la miniatura salía cortada.          */
function cabeza({ titulo, descripcion, ruta, imagen, imagenAlt, jsonld, precargarImagen, tipoOg }) {
  const canonical = ruta === 'index.html' ? BASE + '/' : abs(ruta);
  const img = imagen || abs('assets/logo/og-image.jpg');
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">

<title>${esc(titulo)}</title>
<meta name="description" content="${esc(descripcion)}">
<link rel="canonical" href="${canonical}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">

<meta name="theme-color" content="#FAF8F4">
<meta name="color-scheme" content="light">

<meta property="og:site_name" content="${esc(CONFIG.marca)}">
<meta property="og:locale" content="es_CO">
<meta property="og:type" content="${tipoOg || 'website'}">
<meta property="og:url" content="${canonical}">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(descripcion)}">
<meta property="og:image" content="${img}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(imagenAlt || CONFIG.marca)}">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(titulo)}">
<meta name="twitter:description" content="${esc(descripcion)}">
<meta name="twitter:image" content="${img}">
<meta name="twitter:image:alt" content="${esc(imagenAlt || CONFIG.marca)}">

<link rel="icon" href="assets/logo/favicon-48.png" sizes="48x48">
<link rel="icon" href="assets/logo/icono-192.png" sizes="192x192">
<link rel="apple-touch-icon" href="assets/logo/apple-touch-icon.png">
<link rel="manifest" href="site.webmanifest">

<link rel="preload" href="assets/fonts/archivo-var-latin.woff2" as="font" type="font/woff2" crossorigin>
${precargarImagen || ''}
<link rel="stylesheet" href="css/base.css">
<link rel="stylesheet" href="css/componentes.css">
<link rel="stylesheet" href="css/paginas.css">

<script type="application/ld+json">
${JSON.stringify(jsonld, null, 2)}
</script>`;
}

/* ── JSON-LD ───────────────────────────────────────────────────────────── */
const ORG = {
  '@type': 'OnlineStore',
  '@id': BASE + '/#organizacion',
  name: CONFIG.marca,
  legalName: CONFIG.razonSocial,
  url: BASE + '/',
  description: CONFIG.descripcionCorta,
  logo: {
    '@type': 'ImageObject',
    url: abs('assets/logo/icono-512.png'),
    width: 512, height: 512,
  },
  image: abs('assets/logo/og-image.jpg'),
  sameAs: [CONFIG.instagram.url],
  address: {
    '@type': 'PostalAddress',
    addressLocality: CONFIG.ciudad,
    addressRegion: CONFIG.region,
    addressCountry: CONFIG.pais,
  },
  areaServed: { '@type': 'Country', name: 'Colombia' },
  contactPoint: [{
    '@type': 'ContactPoint',
    contactType: 'sales',
    name: 'Pedidos por WhatsApp',
    telephone: '+' + CONFIG.whatsapp.numero,
    url: 'https://wa.me/' + CONFIG.whatsapp.numero,
    availableLanguage: ['es'],
    areaServed: 'CO',
  }],
};

function jsonldHome() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      ORG,
      {
        '@type': 'WebSite',
        '@id': BASE + '/#sitio',
        url: BASE + '/',
        name: CONFIG.marca,
        inLanguage: 'es-CO',
        publisher: { '@id': BASE + '/#organizacion' },
      },
      {
        '@type': 'FAQPage',
        '@id': BASE + '/#faq',
        mainEntity: CONFIG.faq.map((f) => ({
          '@type': 'Question',
          name: f.p,
          acceptedAnswer: { '@type': 'Answer', text: f.r },
        })),
      },
    ],
  };
}

function jsonldCatalogo() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', '@id': BASE + '/#organizacion' },
      {
        '@type': 'ItemList',
        '@id': abs('catalogo.html') + '#catalogo',
        name: 'Catálogo de gorras ' + CONFIG.marca,
        url: abs('catalogo.html'),
        numberOfItems: PRODUCTOS.length,
        itemListOrder: 'https://schema.org/ItemListOrderAscending',
        itemListElement: PRODUCTOS.map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: p.nombre,
          url: abs(urlProducto(p)),
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: BASE + '/' },
          { '@type': 'ListItem', position: 2, name: 'Catálogo', item: abs('catalogo.html') },
        ],
      },
    ],
  };
}

function jsonldProducto(p) {
  const producto = {
    '@type': 'Product',
    '@id': abs(urlProducto(p)) + '#producto',
    name: p.nombre,
    description: p.descripcion,
    image: p.imagenes.map((im) => abs(`assets/img/${im}-1200.webp`)),
    url: abs(urlProducto(p)),
    brand: { '@type': 'Brand', name: p.marca },
    category: 'Gorras > ' + p.tipo,
    itemCondition: 'https://schema.org/NewCondition',
    additionalProperty: [
      { '@type': 'PropertyValue', name: 'Tipo', value: p.tipo },
      { '@type': 'PropertyValue', name: 'Talla', value: p.talla },
    ],
  };
  if (p.modelo) producto.model = p.modelo;
  if (p.sku) producto.sku = p.sku;
  if (p.colores && p.colores.length) producto.color = p.colores.join(' / ');

  // La Offer solo se declara si hay un precio real. Publicar una oferta sin
  // precio (o con 0) genera un error en Google y engaña al comprador.
  if (tienePrecio(p)) {
    producto.offers = {
      '@type': 'Offer',
      url: abs(urlProducto(p)),
      price: String(p.precio),
      priceCurrency: CONFIG.moneda.codigo,
      availability: p.disponible
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@id': BASE + '/#organizacion' },
    };
  }

  return {
    '@context': 'https://schema.org',
    '@graph': [
      producto,
      {
        '@type': 'BreadcrumbList',
        '@id': abs(urlProducto(p)) + '#migas',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: BASE + '/' },
          { '@type': 'ListItem', position: 2, name: 'Catálogo', item: abs('catalogo.html') },
          { '@type': 'ListItem', position: 3, name: p.nombre, item: abs(urlProducto(p)) },
        ],
      },
      { '@type': 'Organization', '@id': BASE + '/#organizacion' },
    ],
  };
}

/* ── Documento ─────────────────────────────────────────────────────────── */
function documento({ head, pagina, cuerpo, atributosBody = '', scripts }) {
  const iconos = leer('iconos.html');
  const header = leer('header.html')
    .replace('{{NAV_HOME}}', pagina === 'home' ? ' aria-current="page"' : '')
    .replace('{{NAV_CATALOGO}}', pagina === 'catalogo' ? ' aria-current="page"' : '');
  const pie = leer('pie.html')
    .replace('{{BARRA_HOME}}', pagina === 'home' ? ' aria-current="page"' : '')
    .replace('{{BARRA_CATALOGO}}', pagina === 'catalogo' ? ' aria-current="page"' : '');

  return `<!DOCTYPE html>
<html lang="es-CO">
<head>
${head}
</head>
<body data-pagina="${pagina}"${atributosBody}>

${iconos}
${header}
${cuerpo}
${pie}

${scripts}
</body>
</html>
`;
}

const SCRIPTS_BASE = [
  'js/config.js', 'js/productos.js', 'js/lqip.js', 'js/nucleo.js',
  'js/carrito.js', 'js/whatsapp.js', 'js/ui-comunes.js', 'js/ui-catalogo.js',
];

function scripts(extra) {
  return SCRIPTS_BASE.concat(extra || []).concat(['js/main.js'])
    .map((s) => `<script src="${s}" defer></script>`).join('\n');
}

/* ── Diapositivas del carrusel ─────────────────────────────────────────────
   Salen de CONFIG.carrusel; cada una toma la foto y el enlace de su producto.
   Si la lista está vacía o apunta a productos que ya no existen, se rellena
   sola con las gorras destacadas: la portada nunca se queda sin carrusel.  */
function slidesDeConfig() {
  const porSlug = (s) => PRODUCTOS.filter((p) => p.slug === s)[0];

  let slides = (CONFIG.carrusel || [])
    .map((s) => {
      // Una diapositiva puede colgar de un producto o traer su propia foto
      if (s.imagen) return { ...s, suelta: true };
      const p = porSlug(s.producto);
      if (!p) console.log(`  ! El carrusel apunta a "${s.producto}", que no está en productos.js`);
      return p ? { ...s, p } : null;
    })
    .filter(Boolean);

  if (!slides.length) {
    slides = PRODUCTOS.filter((p) => p.destacado).slice(0, 4).map((p) => ({ p }));
  }
  if (!slides.length) slides = PRODUCTOS.slice(0, 4).map((p) => ({ p }));
  return slides;
}

function fotoPrincipalDeSlide(s) {
  return s.suelta ? s.imagen : s.p.imagenes[0];
}

function diapositivas() {
  const slides = slidesDeConfig();

  return slides.map((s, i) => {
    const p = s.p;
    const titulo = s.titulo || (p && p.nombre) || '';
    const texto = s.texto || (p && p.descripcion) || '';
    const cta = s.cta || 'Comprar ahora';
    const enlace = s.enlace || (p ? urlProducto(p) : 'catalogo.html');
    const eyebrow = s.eyebrow || (p ? `${p.marca}${p.modelo ? ' ' + p.modelo : ''}` : '');
    const alt = s.suelta
      ? `${CONFIG.marca} — ${titulo}`
      : altDe(p, 0);
    const base = fotoPrincipalDeSlide(s);
    // "difuminado" son los píxeles de desenfoque de la foto de fondo. Va como
    // variable CSS para que el CSS decida cómo aplicarlo en cada tamaño.
    // Se topa en 12 px: un cero de más al escribirlo dejaría el hero ilegible.
    const dif = Math.min(12, Math.max(0, Number(s.difuminado) || 0));
    const partes = [];
    // config.js lo escribe una persona: un valor con comillas rompería el atributo
    if (s.posicion) partes.push(`object-position:${esc(String(s.posicion))}`);
    if (dif) partes.push(`--dif:${dif}px`);
    const estilo = partes.length ? ` style="${partes.join(';')}"` : '';

    // Solo la primera se carga de inmediato; las demás esperan a que el
    // usuario deslice, para no pelear con la imagen principal.
    const carga = i === 0
      ? ' fetchpriority="high" decoding="async"'
      : ' loading="lazy" decoding="async"';

    return `<article class="dia" role="group" aria-roledescription="diapositiva"
               aria-label="${i + 1} de ${slides.length}: ${esc(titulo)}">
        <div class="dia-foto${dif ? ' es-difuminada' : ''}">
          <picture>
            <source type="image/webp"
                    srcset="assets/img/${base}-400.webp 400w, assets/img/${base}-760.webp 760w, assets/img/${base}-1200.webp 1200w"
                    sizes="(min-width: 900px) 60vw, 100vw">
            <img src="assets/img/${base}-760.jpg" alt="${esc(alt)}"
                 width="760" height="760"${estilo}${carga}>
          </picture>
        </div>
        <div class="dia-txt">
          ${eyebrow ? `<span class="eyebrow">${esc(eyebrow)}</span>` : ''}
          <h2 class="dia-titulo">${esc(titulo)}</h2>
          ${texto ? `<p class="dia-frase">${esc(texto)}</p>` : ''}
          <a class="btn btn--primario dia-cta" href="${enlace}">${esc(cta)}</a>
        </div>
      </article>`;
  }).join('\n      ');
}

/* ── Mosaico de entregas ───────────────────────────────────────────────────
   Se arma solo con lo que haya en assets/img: cada foto que el dueño deje en
   la carpeta "gorras" empezando por "entrega" aparece aquí. Mientras no haya
   ninguna, la sección se queda con el título y el botón de Instagram — no se
   inventa un mosaico de relleno.                                          */
function fotosDeEntrega() {
  return fs.readdirSync(path.join(RAIZ, 'assets', 'img'))
    .filter((f) => /^entrega-\d+-400\.webp$/.test(f))
    .map((f) => f.replace('-400.webp', ''))
    .sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
}

function entregas() {
  const fotos = fotosDeEntrega();
  if (!fotos.length) return '';
  const piezas = fotos.map((f) => [
    '<figure class="mosaico-pieza">',
    '          <picture>',
    '            <source type="image/webp" srcset="assets/img/' + f + '-400.webp 400w, assets/img/' + f + '-760.webp 760w"',
    '                    sizes="(min-width: 900px) 280px, 46vw">',
    '            <img src="assets/img/' + f + '-760.jpg" alt="Entrega de ' + esc(CONFIG.marca) + ' a un cliente"',
    '                 width="760" height="760" loading="lazy" decoding="async">',
    '          </picture>',
    '        </figure>',
  ].join('\n')).join('\n        ');
  return '<div class="mosaico revelar">\n        ' + piezas + '\n      </div>';
}

/* ── Colecciones (pósters de campaña) ──────────────────────────────────── */
function colecciones() {
  const lista = COLECCIONES || [];
  if (!lista.length) return '';
  return lista.map((c) => {
    const wa = 'https://wa.me/' + CONFIG.whatsapp.numero + '?text=' +
      encodeURIComponent(`Hola ${CONFIG.marca}, quiero información sobre la colección ${c.nombre}.`);
    return `<a class="coleccion" href="${wa}" target="_blank" rel="noopener">
          <picture>
            <source type="image/webp" srcset="assets/img/${c.imagen}-400.webp 400w, assets/img/${c.imagen}-760.webp 760w"
                    sizes="(min-width: 900px) 300px, 62vw">
            <img src="assets/img/${c.imagen}-760.jpg" alt="Colección ${esc(c.nombre)} de Melos Caps"
                 width="600" height="760" loading="lazy" decoding="async">
          </picture>
          <span class="coleccion-txt">
            <b>${esc(c.nombre)}</b>
            <small>${esc(c.nota || '')}</small>
          </span>
        </a>`;
  }).join('\n        ');
}

/* ── Página: home ──────────────────────────────────────────────────────── */
function construirHome() {
  const faq = CONFIG.faq.map((f) =>
    `<details>
          <summary>${esc(f.p)}</summary>
          <p>${esc(f.r)}</p>
        </details>`).join('\n        ');

  const cuerpo = leer('cuerpo-home.html')
    .replace('{{FAQ}}', faq)
    .replace('{{H1}}', esc(`${CONFIG.marca} — gorras nacionales e importadas en ${CONFIG.ciudad}`))
    .replace('{{DIAPOSITIVAS}}', diapositivas())
    .replace('{{COLECCIONES}}', colecciones())
    .replace('{{ENTREGAS}}', entregas())
    .replace('{{ENTREGAS_TITULO}}', fotosDeEntrega().length ? 'Entregas' : 'Míralas de cerca')
    .replace('{{ENTREGAS_NOTA}}', fotosDeEntrega().length
      ? 'Gorras que ya salieron para su dueño.'
      : 'Publicamos cada gorra que sale para su dueño.');

  // Se precarga la foto de la PRIMERA diapositiva: es el elemento más grande
  // de la pantalla inicial y marca el tiempo de carga percibido.
  const primeraFoto = fotoPrincipalDeSlide(slidesDeConfig()[0]);
  const precarga = `<link rel="preload" as="image" fetchpriority="high"
      href="assets/img/${primeraFoto}-760.webp"
      imagesrcset="assets/img/${primeraFoto}-400.webp 400w, assets/img/${primeraFoto}-760.webp 760w, assets/img/${primeraFoto}-1200.webp 1200w"
      imagesizes="(min-width: 900px) 560px, 100vw" type="image/webp">`;

  const head = cabeza({
    titulo: `Gorras New Era en ${CONFIG.ciudad} | ${CONFIG.marca}`,
    descripcion: 'Tienda virtual de gorras nacionales e importadas en Medellín. Snapbacks New Era seleccionadas una por una. Pide la tuya por WhatsApp.',
    ruta: 'index.html',
    jsonld: jsonldHome(),
    precargarImagen: precarga,
  });

  return documento({ head, pagina: 'home', cuerpo, scripts: scripts(['js/ui-carrusel.js']) });
}

/* ── Página: catálogo ──────────────────────────────────────────────────── */
function construirCatalogo() {
  // Lista simple para quien no tenga JS: el catálogo nunca queda en blanco
  const noscript = '<noscript>' + PRODUCTOS.map((p) =>
    `<article class="card"><a class="card-a" href="${urlProducto(p)}">` +
    `<div class="card-foto"><img src="assets/img/${p.imagenes[0]}-400.webp" alt="${esc(altDe(p, 0))}" width="400" height="400"></div>` +
    `<div class="card-cuerpo"><span class="card-marca">${esc(p.marca)}</span>` +
    `<h2 class="card-nombre">${esc(p.nombre)}</h2>` +
    `<p class="card-consultar">${tienePrecio(p) ? precioTexto(p.precio) : 'Precio por WhatsApp'}</p>` +
    `</div></a></article>`).join('') + '</noscript>';

  const cuerpo = leer('cuerpo-catalogo.html').replace('{{NOSCRIPT_LISTA}}', noscript);

  const primera = PRODUCTOS[0];
  const precargaCat = primera ? `<link rel="preload" as="image" fetchpriority="high"
      href="assets/img/${primera.imagenes[0]}-400.webp"
      imagesrcset="assets/img/${primera.imagenes[0]}-400.webp 400w, assets/img/${primera.imagenes[0]}-760.webp 760w"
      imagesizes="(min-width: 900px) 280px, 46vw" type="image/webp">` : '';

  const head = cabeza({
    titulo: `Catálogo de gorras | ${CONFIG.marca}`,
    descripcion: `Todas las gorras disponibles en ${CONFIG.marca}. Filtra por marca, tipo y color, y pide por WhatsApp desde ${CONFIG.ciudad}.`,
    ruta: 'catalogo.html',
    jsonld: jsonldCatalogo(),
    precargarImagen: precargaCat,
  });

  return documento({ head, pagina: 'catalogo', cuerpo, scripts: scripts() });
}

/* ── Página: ficha de producto ─────────────────────────────────────────── */
function construirProducto(p) {
  const agotado = !p.disponible;

  const insignias = [];
  if (agotado) insignias.push('<span class="insignia insignia--agotado">Agotado</span>');
  else if (p.exclusivo) insignias.push('<span class="insignia insignia--exclusivo">Exclusivo</span>');
  else if (p.nuevo) insignias.push('<span class="insignia insignia--nuevo">Nuevo</span>');
  else if (p.destacado) insignias.push('<span class="insignia insignia--destacado">Destacado</span>');

  const miniaturas = p.imagenes.length > 1
    ? '<div class="miniaturas" role="group" aria-label="Fotos del producto">' +
      p.imagenes.map((im, i) =>
        `<button type="button" class="mini" aria-current="${i === 0}" aria-label="Ver la foto ${i + 1} de ${p.imagenes.length}">` +
        `<img src="assets/img/${im}-160.webp" alt="" width="68" height="68" loading="lazy" decoding="async"></button>`
      ).join('') + '</div>'
    : '';

  const precio = tienePrecio(p)
    ? `<span class="valor cifra">${precioTexto(p.precio)}</span>` +
      (p.precioAntes && p.precioAntes > p.precio
        ? `<span class="antes cifra">${precioTexto(p.precioAntes)}</span>` : '')
    : `<span class="consultar">Precio por WhatsApp</span>
          <span class="nota">Escríbenos y te lo confirmamos.</span>`;

  const precioCorto = tienePrecio(p) ? precioTexto(p.precio) : 'Precio por WhatsApp';

  const colores = (p.colores && p.colores.length)
    ? '<div class="colores-fila"><span class="meta">Colores:</span>' +
      p.colores.map((c) =>
        `<span class="color-pill"><span class="muestra" style="background:${CONFIG.taxonomia.colores[c] || '#888'}"></span>${esc(c)}</span>`
      ).join('') + '</div>'
    : '';

  const caracteristicas = p.caracteristicas.map((c) =>
    `<li><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-check"></use></svg><span>${esc(c)}</span></li>`
  ).join('\n          ');

  const compra = agotado
    ? `<div class="compra-acciones" id="compra-acciones">
          <p class="meta" style="margin-bottom:4px">Agotado por ahora. Escríbenos y te contamos si vuelve a entrar.</p>
          <a class="btn btn--wa btn--bloque" data-wa href="#" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-whatsapp"></use></svg>
            Preguntar por WhatsApp
          </a>
        </div>`
    : `<div class="compra-fila">
          <div class="cantidad">
            <button type="button" data-cant="-1" aria-label="Quitar una unidad">
              <svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-menos"></use></svg>
            </button>
            <output class="cifra" id="cantidad" aria-live="polite">1</output>
            <button type="button" data-cant="1" aria-label="Agregar una unidad">
              <svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-mas"></use></svg>
            </button>
          </div>
          <span class="meta">Unidades</span>
        </div>
        <div class="compra-acciones" id="compra-acciones">
          <button type="button" class="btn btn--primario" id="ficha-agregar">
            <svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-carrito"></use></svg>
            Agregar al carrito
          </button>
          <a class="btn btn--linea" id="ficha-wa" href="https://wa.me/${CONFIG.whatsapp.numero}" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-whatsapp"></use></svg>
            Preguntar por esta gorra
          </a>
        </div>`;

  const stickyBoton = agotado
    ? `<a class="btn btn--wa btn--sm" data-wa href="#" target="_blank" rel="noopener">Preguntar</a>`
    : `<button type="button" class="btn btn--primario btn--sm" id="cs-agregar">Agregar</button>`;

  const cuerpo = leer('cuerpo-producto.html')
    .replace(/\{\{NOMBRE\}\}/g, esc(p.nombre))
    .replace(/\{\{MARCA_URL\}\}/g, encodeURIComponent(p.marca))
    .replace(/\{\{MARCA\}\}/g, esc(p.marca))
    .replace(/\{\{IMG0\}\}/g, p.imagenes[0])
    .replace(/\{\{ALT0\}\}/g, esc(altDe(p, 0)))
    .replace('{{INSIGNIAS}}', insignias.length ? `<div class="insignias">${insignias.join('')}</div>` : '<div class="insignias"></div>')
    .replace('{{MINIATURAS}}', miniaturas)
    .replace('{{PRECIO}}', precio)
    .replace('{{PRECIO_CORTO}}', esc(precioCorto))
    .replace('{{DESCRIPCION}}', esc(p.descripcion))
    .replace('{{TIPO}}', esc(p.tipo))
    .replace('{{MODELO}}', esc(p.modelo || '—'))
    .replace('{{TALLA}}', esc(p.talla))
    .replace('{{ESTADO_CLASE}}', agotado ? 'no' : 'si')
    .replace('{{ESTADO}}', agotado ? 'Agotado' : 'Disponible')
    .replace('{{COLORES}}', colores)
    .replace('{{CARACTERISTICAS}}', caracteristicas)
    .replace('{{COMPRA}}', compra)
    .replace('{{STICKY_BOTON}}', stickyBoton);

  const precarga = `<link rel="preload" as="image" fetchpriority="high"
      href="assets/img/${p.imagenes[0]}-760.webp"
      imagesrcset="assets/img/${p.imagenes[0]}-400.webp 400w, assets/img/${p.imagenes[0]}-760.webp 760w, assets/img/${p.imagenes[0]}-1200.webp 1200w"
      imagesizes="(min-width:900px) 560px, 94vw" type="image/webp">`;

  const head = cabeza({
    titulo: `${p.nombre} | ${CONFIG.marca}`,
    descripcion: recortar(p.descripcion, 155),
    ruta: urlProducto(p),
    imagen: abs(`assets/img/og-${p.imagenes[0]}.jpg`),
    imagenAlt: altDe(p, 0),
    tipoOg: 'product',
    jsonld: jsonldProducto(p),
    precargarImagen: precarga,
  });

  return documento({
    head,
    pagina: 'producto',
    cuerpo,
    atributosBody: ` data-producto="${p.slug}"`,
    scripts: scripts(['js/ui-producto.js']),
  });
}

/* ── Página: 404 ───────────────────────────────────────────────────────── */
function construir404() {
  const cuerpo = `<main id="principal">
  <div class="contenedor">
    <div class="vacio" style="padding-block:96px">
      <img class="vacio-emblema" src="assets/logo/emblema-256.webp" alt="" width="110" height="110">
      <h1 class="t-sec" style="margin-bottom:10px">Esta página no existe</h1>
      <p class="parrafo" style="margin:0 auto 24px">El enlace que abriste no lleva a ninguna parte.</p>
      <div class="vacio-acciones">
        <a class="btn btn--primario" href="catalogo.html">Ir al catálogo</a>
        <a class="btn btn--linea" href="index.html">Ir al inicio</a>
      </div>
    </div>
  </div>
</main>`;

  const head = cabeza({
    titulo: `Página no encontrada | ${CONFIG.marca}`,
    descripcion: 'La página que buscas no existe. Vuelve al catálogo de gorras.',
    ruta: '404.html',
    jsonld: { '@context': 'https://schema.org', '@graph': [ORG] },
  }).replace('index, follow, max-image-preview:large, max-snippet:-1', 'noindex, follow');

  return documento({ head, pagina: '404', cuerpo, scripts: scripts() });
}

/* ── sitemap · robots · manifest ───────────────────────────────────────── */
function construirSitemap() {
  const hoy = new Date().toISOString().slice(0, 10);
  const urls = [
    { loc: BASE + '/', prio: '1.0' },
    { loc: abs('catalogo.html'), prio: '0.9' },
  ].concat(PRODUCTOS.map((p) => ({ loc: abs(urlProducto(p)), prio: '0.8' })));

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${hoy}</lastmod>
    <priority>${u.prio}</priority>
  </url>`).join('\n')}
</urlset>
`;
}

function construirRobots() {
  return `User-agent: *
Allow: /
Disallow: /_tools/

Sitemap: ${abs('sitemap.xml')}
`;
}

function construirManifest() {
  return JSON.stringify({
    name: CONFIG.marca,
    short_name: 'Exclusive Caps',
    description: CONFIG.descripcionCorta,
    start_url: './index.html',
    display: 'standalone',
    background_color: '#FAF8F4',
    theme_color: '#FAF8F4',
    lang: 'es-CO',
    icons: [
      { src: 'assets/logo/icono-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'assets/logo/icono-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }, null, 2) + '\n';
}

/* ── Ejecutar ──────────────────────────────────────────────────────────── */
function escribir(nombre, contenido) {
  fs.writeFileSync(path.join(RAIZ, nombre), contenido, 'utf8');
  console.log('  ✓', nombre);
}

console.log(`\nGenerando ${CONFIG.marca} (${PRODUCTOS.length} productos)\n`);

// Borra fichas de productos que ya no existen
fs.readdirSync(RAIZ)
  .filter((f) => /^gorra-.*\.html$/.test(f))
  .forEach((f) => {
    if (!PRODUCTOS.some((p) => urlProducto(p) === f)) {
      fs.unlinkSync(path.join(RAIZ, f));
      console.log('  −', f, '(el producto ya no está en el catálogo)');
    }
  });

escribir('index.html', construirHome());
escribir('catalogo.html', construirCatalogo());
PRODUCTOS.forEach((p) => escribir(urlProducto(p), construirProducto(p)));
escribir('404.html', construir404());
escribir('sitemap.xml', construirSitemap());
escribir('robots.txt', construirRobots());
escribir('site.webmanifest', construirManifest());

const sinPrecio = PRODUCTOS.filter((p) => !tienePrecio(p));
if (sinPrecio.length) {
  console.log(`\n  Aviso: ${sinPrecio.length} de ${PRODUCTOS.length} productos no tienen precio.`);
  console.log('  La tienda muestra "Precio por WhatsApp" y no declara Offer en el schema.');
  console.log('  Cárgalos en js/productos.js y vuelve a correr este comando.');
}
console.log('\nListo.\n');
