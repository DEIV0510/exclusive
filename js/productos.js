/* ═══════════════════════════════════════════════════════════════════════════
   EXCLUSIVE CAPS MED · CATÁLOGO
   ───────────────────────────────────────────────────────────────────────────
   Cada bloque { ... } es una gorra. Para agregar una nueva, copia un bloque
   completo, cámbiale el id y el slug, y ajusta los datos. El catálogo, los
   filtros, las marcas, las categorías y el buscador se arman solos.

   ┌─ CÓMO PONERLE PRECIO A UNA GORRA ────────────────────────────────────┐
   │  precio: null      ->  muestra "Precio por WhatsApp"                 │
   │  precio: 165000    ->  muestra $ 165.000 y suma al total del carrito │
   │  Sin puntos, sin comas, sin el signo $. Solo el número.              │
   └──────────────────────────────────────────────────────────────────────┘

   Todas están en precio: null porque todavía no nos pasaste la lista. Apenas
   los cambies por números reales, la tienda activa sola el total del carrito,
   el orden por precio y el filtro de precio.

   CAMPOS
   ──────
   id           Número único. NO lo cambies nunca: es la llave del carrito.
   slug         Texto para la URL. Genera el archivo gorra-<slug>.html
   nombre       Nombre comercial
   marca        Debe estar en CONFIG.taxonomia.marcas
   tipo         Debe estar en CONFIG.taxonomia.tipos
   modelo       Referencia del fabricante, o null
   sku          Tu referencia interna, o null (si es null no se muestra)
   precio       Número entero en pesos, o null si aún no lo tienes
   precioAntes  Precio tachado para mostrar descuento, o null
   disponible   true = se puede comprar · false = se muestra AGOTADO
   stock        Número de unidades, o null si no lo llevas
   destacado    true = sale en la portada
   nuevo        true = muestra la etiqueta NUEVO
   exclusivo    true = muestra EXCLUSIVO (úsalo solo si es pieza única)
   colores      Nombres que existan en CONFIG.taxonomia.colores
   talla        Texto libre
   descripcion  1 o 2 frases. Solo lo que se ve en la foto.
   caracteristicas  Entre 3 y 6 puntos cortos y verificables
   imagenes     Nombres de archivo en assets/img, sin el -400.webp del final.
                La primera es la principal.
   ═══════════════════════════════════════════════════════════════════════════ */

window.ECM = window.ECM || {};

window.ECM.PRODUCTOS = [

  /* ═══════════════════ NEW ERA ═══════════════════ */

  {
    id: 1,
    slug: 'new-era-9fifty-shohei-ohtani-17',
    nombre: 'New Era 9FIFTY Shohei Ohtani 17',
    marca: 'New Era',
    tipo: 'Snapback',
    modelo: '9FIFTY',
    sku: null,
    precio: null,
    precioAntes: null,
    disponible: true,
    stock: null,
    destacado: true,
    nuevo: true,
    exclusivo: false,
    colores: ['Crema', 'Azul Royal', 'Rojo'],
    talla: 'Ajustable (cierre snapback)',
    descripcion:
      'Corona crema de perfil alto, visera plana azul royal y botón rojo a contraste, con un bordado frontal dedicado a Shohei Ohtani: su silueta al bate, su nombre y el kanji japonés.',
    caracteristicas: [
      'Corona crema de perfil alto',
      'Visera plana azul royal con botón rojo a contraste',
      'Bordado frontal: silueta de bateador, «SHOHEI OHTANI» y kanji japonés',
      'Firma y número 17 bordados al costado',
      'Interior 9FIFTY con cintas de marca y cierre snapback ajustable',
    ],
    imagenes: ['ohtani-1', 'ohtani-2', 'ohtani-3'],
  },

  {
    id: 2,
    slug: 'new-era-9fifty-ny-yankees-roses',
    nombre: 'New Era 9FIFTY New York Yankees Roses',
    marca: 'New Era',
    tipo: 'Snapback',
    modelo: '9FIFTY',
    sku: null,
    precio: null,
    precioAntes: null,
    disponible: true,
    stock: null,
    destacado: true,
    nuevo: true,
    exclusivo: false,
    colores: ['Negro', 'Gris', 'Rojo'],
    talla: 'Ajustable (cierre snapback)',
    descripcion:
      'Corona negra con el clásico NY bordado en gris, atravesado por rosas rojas con hojas blancas. Silueta 9FIFTY de visera plana y cierre snapback.',
    caracteristicas: [
      'Corona negra lisa',
      'Logo NY bordado en gris',
      'Rosas rojas con hojas blancas bordadas sobre el frente',
      'Adhesivo 9FIFTY SNAPBACK sobre la visera',
      'Cierre snapback ajustable',
    ],
    imagenes: ['ny-roses-1', 'ny-roses-2'],
  },

  {
    id: 3,
    slug: 'new-era-9fifty-white-sox-roses',
    nombre: 'New Era 9FIFTY Chicago White Sox Roses',
    marca: 'New Era',
    tipo: 'Snapback',
    modelo: '9FIFTY',
    sku: null,
    precio: null,
    precioAntes: null,
    disponible: true,
    stock: null,
    destacado: true,
    nuevo: true,
    exclusivo: false,
    colores: ['Negro', 'Blanco', 'Rojo'],
    talla: 'Ajustable (cierre snapback)',
    descripcion:
      'Corona negra con el logo Sox bordado en blanco y un ramo de rosas rojas con tallo verde al costado. El ribete rojo bajo la visera cierra el contraste.',
    caracteristicas: [
      'Corona negra',
      'Logo «Sox» bordado en blanco al frente',
      'Ramo de rosas rojas con tallo verde bordado al costado',
      'Ribete rojo bajo la visera',
      'Cierre snapback ajustable',
    ],
    imagenes: ['sox-roses-1', 'sox-roses-2'],
  },

  {
    id: 4,
    slug: 'new-era-9fifty-st-louis-cardinals',
    nombre: 'New Era 9FIFTY St. Louis Cardinals',
    marca: 'New Era',
    tipo: 'Snapback',
    modelo: '9FIFTY',
    sku: null,
    precio: null,
    precioAntes: null,
    disponible: true,
    stock: null,
    destacado: true,
    nuevo: true,
    exclusivo: false,
    colores: ['Crema', 'Celeste', 'Vino'],
    talla: 'Ajustable (cierre snapback)',
    descripcion:
      'Corona crema con el clásico «St. Louis» bordado en vino y dos cardenales posados sobre el bate. La visera celeste levanta todo el conjunto.',
    caracteristicas: [
      'Corona crema de dos tonos con visera celeste',
      'Bordado frontal «St. Louis» con dos cardenales sobre el bate',
      'Bandera New Era bordada al costado',
      'Placa metálica 9FIFTY al frente de la visera',
      'Cierre snapback ajustable',
    ],
    imagenes: ['cardinals-1', 'cardinals-3', 'cardinals-4', 'cardinals-2'],
  },

  {
    id: 5,
    slug: 'new-era-9forty-yankees-fresh-from-new-york',
    nombre: 'New Era 9FORTY Yankees Fresh From New York',
    marca: 'New Era',
    tipo: 'Béisbol',
    modelo: '9FORTY A-Frame',
    sku: null,
    precio: null,
    precioAntes: null,
    disponible: true,
    stock: null,
    destacado: true,
    nuevo: true,
    exclusivo: false,
    colores: ['Crema', 'Celeste', 'Vino'],
    talla: 'Ajustable',
    descripcion:
      'Corona crema con «YANKEES» en arco bordado en vino, estrellas y el sello «Fresh from New York». Visera celeste y silueta A-Frame.',
    caracteristicas: [
      'Corona crema con visera celeste',
      'Bordado frontal «YANKEES» en arco con estrellas',
      'Sello «Fresh from New York» con la bandera del equipo',
      'Placa metálica 9FORTY ADJUSTABLE A-FRAME',
      'Cierre ajustable',
    ],
    imagenes: ['yankees-fresh-1'],
  },

  {
    id: 6,
    slug: 'new-era-9fifty-charlotte-hornets',
    nombre: 'New Era 9FIFTY Charlotte Hornets',
    marca: 'New Era',
    tipo: 'Snapback',
    modelo: '9FIFTY',
    sku: null,
    precio: null,
    precioAntes: null,
    disponible: true,
    stock: null,
    destacado: true,
    nuevo: true,
    exclusivo: false,
    colores: ['Crema', 'Verde azulado', 'Azul marino'],
    talla: 'Ajustable (cierre snapback)',
    descripcion:
      'Corona crema con el avispón de Charlotte bordado a todo color y «CHARLOTTE HORNETS» en arco. Visera y cierre en verde azulado.',
    caracteristicas: [
      'Corona crema con visera verde azulado',
      'Bordado frontal del avispón con balón de baloncesto',
      '«CHARLOTTE HORNETS» en arco sobre el frente',
      'Bandera New Era bordada al costado',
      'Placa metálica 9FIFTY SNAPBACK y cierre a juego',
    ],
    imagenes: ['hornets-1', 'hornets-2', 'hornets-3'],
  },

  {
    id: 7,
    slug: 'new-era-navy-all-star-game',
    nombre: 'New Era Azul Marino All-Star Game',
    marca: 'New Era',
    tipo: 'Snapback',
    modelo: null,
    sku: null,
    precio: null,
    precioAntes: null,
    disponible: true,
    stock: null,
    destacado: false,
    nuevo: true,
    exclusivo: false,
    colores: ['Azul marino', 'Azul Royal'],
    talla: 'Ajustable (cierre snapback)',
    descripcion:
      'Corona azul marino con un parche bordado a todo color del All-Star Game de la Liga Nacional al costado, y bordado tonal en el panel lateral.',
    caracteristicas: [
      'Corona azul marino de perfil bajo',
      'Parche bordado del All-Star Game de la Liga Nacional',
      'Bordado tonal en el panel lateral',
      'Visera curva',
      'Cierre ajustable',
    ],
    imagenes: ['nl-navy-1'],
  },

  {
    id: 8,
    slug: 'new-era-9forty-boston-red-sox-alas',
    nombre: 'New Era 9FORTY Boston Red Sox Alas',
    marca: 'New Era',
    tipo: 'Béisbol',
    modelo: '9FORTY A-Frame',
    sku: null,
    precio: null,
    precioAntes: null,
    disponible: true,
    stock: null,
    destacado: true,
    nuevo: true,
    exclusivo: false,
    colores: ['Azul marino', 'Rojo'],
    talla: 'Ajustable',
    descripcion:
      'Corona azul marino con la «B» de Boston en rojo enmarcada por un par de alas bordadas en azul. Silueta A-Frame de visera curva.',
    caracteristicas: [
      'Corona azul marino',
      '«B» de Boston bordada en rojo al frente',
      'Alas bordadas en azul a cada lado del logo',
      'Placa metálica 9FORTY ADJUSTABLE A-FRAME',
      'Cierre ajustable',
    ],
    imagenes: ['redsox-alas-1'],
  },

  {
    id: 9,
    slug: 'new-era-9fifty-atlanta-braves-1999',
    nombre: 'New Era 9FIFTY Atlanta Braves 1999',
    marca: 'New Era',
    tipo: 'Snapback',
    modelo: '9FIFTY',
    sku: null,
    precio: null,
    precioAntes: null,
    disponible: true,
    stock: null,
    destacado: true,
    nuevo: true,
    exclusivo: false,
    colores: ['Naranja', 'Crema', 'Rojo'],
    talla: 'Ajustable (cierre snapback)',
    descripcion:
      'Corona naranja con la «A» de Atlanta y el hacha bordadas al frente, visera crema y un parche de 1999 al costado. Por dentro, ribete rojo.',
    caracteristicas: [
      'Corona naranja con visera crema',
      'Bordado frontal de la «A» de Atlanta con el hacha',
      'Parche bordado de 1999 al costado',
      'Interior 9FIFTY con ribete rojo bajo la visera',
      'Placa metálica 9FIFTY y cierre snapback',
    ],
    imagenes: ['braves-1', 'braves-3', 'braves-2', 'braves-4'],
  },

  {
    id: 10,
    slug: 'new-era-9fifty-new-york-100-seasons',
    nombre: 'New Era 9FIFTY New York 100 Seasons',
    marca: 'New Era',
    tipo: 'Snapback',
    modelo: '9FIFTY',
    sku: null,
    precio: null,
    precioAntes: null,
    disponible: true,
    stock: null,
    destacado: true,
    nuevo: true,
    exclusivo: false,
    colores: ['Gris', 'Azul marino'],
    talla: 'Ajustable (cierre snapback)',
    descripcion:
      'Corona gris con «NEW YORK» bordado al frente en azul marino y un parche de las 100 temporadas de la Liga Americana al costado.',
    caracteristicas: [
      'Corona gris con visera azul marino',
      '«NEW YORK» bordado al frente en azul marino',
      'Parche bordado «100 Seasons» de la Liga Americana al costado',
      'Bandera New Era bordada al otro costado',
      'Placa metálica 9FIFTY SNAPBACK y cierre a juego',
    ],
    imagenes: ['ny100-1', 'ny100-2', 'ny100-3', 'ny100-4'],
  },

  {
    id: 11,
    slug: 'new-era-toronto-blue-jays-all-star-91',
    nombre: 'New Era Toronto Blue Jays All-Star 91',
    marca: 'New Era',
    tipo: 'Béisbol',
    modelo: null,
    sku: null,
    precio: null,
    precioAntes: null,
    disponible: true,
    stock: null,
    destacado: false,
    nuevo: true,
    exclusivo: false,
    colores: ['Beige', 'Celeste', 'Azul Royal'],
    talla: 'Ajustable',
    descripcion:
      'Corona beige con el pájaro azul de Toronto bordado sobre la «T» del equipo, visera celeste y un parche del All-Star Game de 1991 al costado.',
    caracteristicas: [
      'Corona beige con visera celeste',
      'Bordado frontal del pájaro azul sobre la «T» de Toronto',
      'Parche del «Toronto \'91 All-Star Game» al costado',
      'Placa metálica New Era ADJUSTABLE',
      'Cierre ajustable',
    ],
    imagenes: ['bluejays-1', 'bluejays-2'],
  },

  {
    id: 12,
    slug: 'new-era-9fifty-boston-tan',
    nombre: 'New Era 9FIFTY Boston Beige',
    marca: 'New Era',
    tipo: 'Snapback',
    modelo: '9FIFTY',
    sku: null,
    precio: null,
    precioAntes: null,
    disponible: true,
    stock: null,
    destacado: true,
    nuevo: true,
    exclusivo: false,
    colores: ['Beige', 'Azul marino', 'Rojo'],
    talla: 'Ajustable (cierre snapback)',
    descripcion:
      'Corona beige con «BOSTON» bordado en rojo con relleno de estrellas y detalles gráficos. Visera azul marino y silueta 9FIFTY.',
    caracteristicas: [
      'Corona beige con visera azul marino',
      '«BOSTON» bordado en rojo con relleno de estrellas',
      'Detalles gráficos bordados junto al texto',
      'Placa metálica 9FIFTY SNAPBACK',
      'Cierre snapback ajustable',
    ],
    imagenes: ['boston-tan-1', 'boston-tan-2'],
  },

  /* ═══════════════════ AMERICANINO ═══════════════════ */

  {
    id: 13,
    slug: 'americanino-escudo-am',
    nombre: 'Americanino Escudo AM',
    marca: 'Americanino',
    tipo: 'Béisbol',
    modelo: null,
    sku: null,
    precio: null,
    precioAntes: null,
    disponible: true,
    stock: null,
    destacado: true,
    nuevo: true,
    exclusivo: false,
    colores: ['Blanco', 'Vino'],
    talla: 'Ajustable (hebilla metálica)',
    descripcion:
      'Corona blanca con el escudo AM bordado en vino al frente, rematado por una corona y la leyenda «Seventy Five». Cierre trasero de hebilla metálica.',
    caracteristicas: [
      'Corona blanca de seis paneles',
      'Escudo AM bordado en vino con corona y estrellas',
      'Leyenda «Seventy Five» en el escudo',
      'Visera curva a juego',
      'Cierre trasero de hebilla metálica con logo grabado',
    ],
    imagenes: ['am-escudo-1', 'am-escudo-2', 'am-escudo-3'],
  },

  {
    id: 14,
    slug: 'americanino-trucker-creative-campus',
    nombre: 'Americanino Trucker Creative Campus',
    marca: 'Americanino',
    tipo: 'Trucker',
    modelo: null,
    sku: null,
    precio: null,
    precioAntes: null,
    disponible: true,
    stock: null,
    destacado: true,
    nuevo: true,
    exclusivo: false,
    colores: ['Crema', 'Vino'],
    talla: 'Ajustable (cierre snapback)',
    descripcion:
      'Trucker de frente crema y malla al mismo tono, con el parche circular «Americanino Creative Campus» bordado en vino. Visera roja en gamuza con la firma «Sporty Lifestyle».',
    caracteristicas: [
      'Frente crema con paneles traseros de malla',
      'Parche circular bordado «Americanino Creative Campus»',
      'Visera roja con la firma «Sporty Lifestyle» bordada',
      'Cierre snapback de broches',
      'Silueta trucker de perfil alto',
    ],
    imagenes: ['am-trucker-1', 'am-trucker-2', 'am-trucker-3'],
  },

  {
    id: 15,
    slug: 'americanino-azul-laurel',
    nombre: 'Americanino Azul Laurel',
    marca: 'Americanino',
    tipo: 'Béisbol',
    modelo: null,
    sku: null,
    precio: null,
    precioAntes: null,
    disponible: true,
    stock: null,
    destacado: false,
    nuevo: true,
    exclusivo: false,
    colores: ['Azul marino'],
    talla: 'Ajustable',
    descripcion:
      'Corona azul con la firma «Amc» y una corona de laurel bordadas al mismo tono, para un acabado discreto y monocromático.',
    caracteristicas: [
      'Corona azul de seis paneles',
      'Firma «Amc» y corona de laurel bordadas al tono',
      'Ojales de ventilación bordados a juego',
      'Visera curva',
      'Cierre trasero ajustable',
    ],
    imagenes: ['am-azul-1', 'am-azul-2'],
  },

  {
    id: 16,
    slug: 'americanino-crema-eternal-champions',
    nombre: 'Americanino Crema Eternal Champions',
    marca: 'Americanino',
    tipo: 'Béisbol',
    modelo: null,
    sku: null,
    precio: null,
    precioAntes: null,
    disponible: true,
    stock: null,
    destacado: false,
    nuevo: true,
    exclusivo: false,
    colores: ['Crema', 'Verde'],
    talla: 'Ajustable (hebilla metálica)',
    descripcion:
      'Corona crema con el monograma AM bordado en verde al frente y la leyenda «Eternal Champions» bajo la visera. Cierre trasero de hebilla metálica.',
    caracteristicas: [
      'Corona crema de seis paneles',
      'Monograma AM bordado en verde al frente',
      'Leyenda «Eternal Champions» bordada bajo la visera',
      'Visera curva a juego',
      'Cierre trasero de hebilla metálica',
    ],
    imagenes: ['am-verde-1', 'am-verde-2', 'am-verde-3'],
  },

];

/* ═══════════════════════════════════════════════════════════════════════════
   COLECCIONES MELOS CAPS
   ───────────────────────────────────────────────────────────────────────────
   Piezas de campaña de la marca colombiana Melos Caps. Son pósters de
   colección, no fotos sueltas de producto: cada uno muestra la misma gorra
   desde varios ángulos (frente, lateral, trasera e interior).

   Se muestran en la portada como colecciones, con un botón para preguntar por
   WhatsApp. Cuando tengas fotos de producto sueltas y los nombres definitivos,
   pásamelas y las subimos al catálogo como gorras que se pueden agregar al
   carrito.

   Para quitar una, borra su bloque. Para agregar otra, copia uno y cambia la
   imagen (tiene que estar en _tools/build-images.js dentro de POSTERS).
   ═══════════════════════════════════════════════════════════════════════════ */

window.ECM.COLECCIONES = [
  { imagen: 'col-haru',          nombre: 'Haru',              nota: 'Bordados japoneses sobre corona crema' },
  { imagen: 'col-chrome-crema',  nombre: 'Chrome',            nota: 'Cruces bordadas y visera en gamuza rosa' },
  { imagen: 'col-chrome-2',      nombre: 'Chrome 2.0',        nota: 'Cruces e interior rojo' },
  { imagen: 'col-chrome-negro',  nombre: 'Chrome Negro',      nota: 'La misma colección en negro y rojo' },
  { imagen: 'col-fortune',       nombre: 'Fortune',           nota: 'Rosa y mano esqueleto, interior rojo' },
  { imagen: 'col-kamizoku',      nombre: 'Kamizoku',          nota: 'Blanco y negro con bordados en morado' },
  { imagen: 'col-pink-paws',     nombre: 'Pink Paws Club',    nota: 'Huellas y estrellas en rosa sobre negro' },
  { imagen: 'col-777',           nombre: 'Números 777',       nota: 'Bordado tonal sobre negro' },
  { imagen: 'col-333',           nombre: 'Números 333',       nota: 'Bordado con relieve sobre negro' },
  { imagen: 'col-111',           nombre: 'Números 111',       nota: 'Bordado en plata sobre negro' },
];
