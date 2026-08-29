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

   Hoy los tres productos están en precio: null porque todavía no nos pasaste
   la lista de precios. Apenas los cambies por números reales, la tienda
   activa sola el total del carrito, el orden por precio y el filtro de precio.

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
    imagenes: ['ny-1', 'ny-2'],
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
    imagenes: ['sox-1', 'sox-2'],
  },

];
