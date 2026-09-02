/* ═══════════════════════════════════════════════════════════════════════════
   EXCLUSIVE CAPS MED · CONFIGURACIÓN
   ───────────────────────────────────────────────────────────────────────────
   Este archivo y js/productos.js son los ÚNICOS dos que necesitas tocar.
   Todo lo demás de la página se arma solo a partir de aquí.

   ¿CAMBIAR EL WHATSAPP?  ->  línea "numero" dentro de whatsapp (más abajo).
                              Con eso se actualiza toda la página.
   ═══════════════════════════════════════════════════════════════════════════ */

window.ECM = window.ECM || {};

window.ECM.CONFIG = {

  /* ── 1. IDENTIDAD ────────────────────────────────────────────────────── */
  marca: 'EXCLUSIVE CAPS MED',
  razonSocial: 'EXCLUSIVE CAPS SAS',
  ciudad: 'Medellín',
  region: 'Antioquia',
  pais: 'CO',
  descripcionCorta: 'Gorras nacionales e importadas. Venta virtual desde Medellín, Colombia.',

  /* ── 2. WHATSAPP ──────────────────────────────────────────────────────────
     numero: formato internacional, SIN "+", sin espacios ni guiones.
             57 = Colombia. Ejemplo: 322 254 4571  ->  '573222544571'
     visible: cómo se le muestra al cliente en pantalla.
     Cambiar estas dos líneas actualiza: header, menú, fichas, carrito,
     checkout, footer y el enlace de todos los botones verdes.            */
  whatsapp: {
    numero: '573222544571',
    visible: '322 254 4571',
  },

  /* ── 3. REDES ─────────────────────────────────────────────────────────── */
  instagram: {
    usuario: 'exclusive_caps_med',
    url: 'https://instagram.com/exclusive_caps_med',
  },

  /* ── 4. SITIO ─────────────────────────────────────────────────────────────
     url: dominio final. Se usa para las etiquetas canonical, Open Graph,
     el sitemap y los enlaces que van dentro del mensaje de WhatsApp.
     Cámbialo cuando compres el dominio y vuelve a correr:
        node _tools/build-paginas.js                                      */
  sitio: {
    url: 'https://exclusivecapsmed.com',
  },

  /* ── 5. PRECIOS ───────────────────────────────────────────────────────────
     Hoy NO hay precios cargados (ningún producto tiene el campo "precio"),
     así que la tienda muestra "Precio por WhatsApp" en lugar de inventar
     cifras. Apenas cargues precios reales en js/productos.js todo aparece
     solo: tarjetas, ficha, carrito, total, orden por precio y filtro de
     precio. No hay que tocar nada más.                                    */
  moneda: {
    codigo: 'COP',
    locale: 'es-CO',
  },

  /* ── 6. TAXONOMÍA ─────────────────────────────────────────────────────────
     Marcas y tipos que la tienda reconoce. Los que todavía no tienen
     productos aparecen como "Pronto en catálogo" y no llevan a un
     catálogo vacío.                                                       */
  taxonomia: {
    marcas: ['New Era', 'Melos Caps', 'Americanino'],
    tipos: ['Béisbol', 'Trucker', 'Snapback', 'Dad Hat', 'Fitted'],
    // Muestras del filtro por color. El "hex" solo pinta el círculo.
    // Para agregar un color nuevo, añade una línea aquí y ya lo puedes usar
    // en el campo "colores" de cualquier gorra.
    colores: {
      'Negro':         '#1B1B1F',
      'Blanco':        '#F2F4F7',
      'Crema':         '#ECE6DA',
      'Beige':         '#D9C79A',
      'Gris':          '#8A8B88',
      'Azul marino':   '#1E2A44',
      'Azul Royal':    '#0A55B5',
      'Celeste':       '#A8C8E8',
      'Verde azulado': '#157A7A',
      'Verde':         '#2E7D46',
      'Rojo':          '#C8202D',
      'Vino':          '#8C1F35',
      'Naranja':       '#C96A1E',
    },
  },

  /* ── 7. CARRUSEL DE LA PORTADA ────────────────────────────────────────────
     Las diapositivas que rotan arriba del todo. Cada una toma la foto, el
     nombre y el enlace de un producto de js/productos.js: solo escribes el
     título de campaña y la frase.

       producto  slug de la gorra (tiene que existir en productos.js)
       titulo    título grande de la diapositiva
       texto     una frase corta (máximo unas 15 palabras)
       cta       texto del botón

     Para quitar una diapositiva, borra su bloque. Si dejas la lista vacía,
     el carrusel se arma solo con las gorras marcadas como destacadas.
     Después de cambiar esto:  node _tools/build-paginas.js               */
  carrusel: [
    {
      // Diapositiva de marca: usa una foto suelta en vez de un producto.
      // "posicion" mueve el encuadre de la foto (izquierda/derecha, arriba/abajo).
      imagen: 'portada',
      posicion: '50% 3%',
      // Desenfoque de la foto de fondo, en píxeles. 0 = nítida.
      difuminado: 1,
      eyebrow: 'Medellín · Nacionales e importadas',
      titulo: 'Tu gorra habla primero',
      cta: 'Ver el catálogo',
      enlace: 'catalogo.html',
    },
    {
      producto: 'new-era-9fifty-charlotte-hornets',
      titulo: 'Charlotte Hornets',
      texto: 'Corona crema, visera verde azulado y el avispón a todo color.',
      cta: 'Comprar ahora',
    },
    {
      producto: 'new-era-9fifty-atlanta-braves-1999',
      titulo: 'Braves 1999',
      texto: 'Naranja y crema con parche de 1999 e interior rojo.',
      cta: 'Comprar ahora',
    },
    {
      producto: 'americanino-trucker-creative-campus',
      titulo: 'Creative Campus',
      texto: 'Trucker crema con visera roja en gamuza.',
      cta: 'Comprar ahora',
    },
  ],

  /* Segundos que dura cada diapositiva. Pon 0 para que no rote sola. */
  carruselSegundos: 6,

  /* ── 8. BLOQUES DE CONFIANZA ──────────────────────────────────────────────
     Solo afirmaciones que puedes sostener. Si cambias tus condiciones
     (envíos, pagos, garantías), edítalos aquí antes de prometerlos.       */
  confianza: [
    { icono: 'carrito',  titulo: 'Comprar es fácil',       texto: 'Eliges tu gorra y cierras el pedido por WhatsApp.' },
    { icono: 'chat',     titulo: 'Te atendemos directo',   texto: 'Resolvemos tus dudas por WhatsApp antes de que compres.' },
    { icono: 'estrella', titulo: 'Seleccionamos cada gorra', texto: 'Cada modelo entra al catálogo por decisión nuestra.' },
    { icono: 'gorra',    titulo: 'Solo hacemos gorras',    texto: 'No vendemos de todo: nos dedicamos únicamente a gorras.' },
  ],

  /* ── 9. CÓMO COMPRAR ──────────────────────────────────────────────────── */
  pasos: [
    { titulo: 'Elige tu gorra',        texto: 'Busca por marca, tipo o color en el catálogo.' },
    { titulo: 'Agrégala al carrito',   texto: 'Suma las que quieras y revisa el resumen.' },
    { titulo: 'Cierra por WhatsApp',   texto: 'Envías el mensaje y coordinamos el pedido contigo.' },
  ],

  /* ── 10. PREGUNTAS FRECUENTES ─────────────────────────────────────────────
      Se muestran en la home y también alimentan el schema FAQPage de Google.
      No agregues políticas que todavía no tengas definidas.               */
  faq: [
    {
      p: '¿Tienen tienda física?',
      r: 'No. EXCLUSIVE CAPS MED es una tienda virtual: mostramos el catálogo aquí y atendemos desde Medellín por WhatsApp e Instagram.',
    },
    {
      p: '¿Cómo hago un pedido?',
      r: 'Agregas las gorras que quieras al carrito, llenas tus datos y el sitio arma un mensaje de WhatsApp con tu pedido. Lo envías y desde ahí seguimos la conversación contigo.',
    },
    {
      p: '¿Cómo sé si una gorra está disponible?',
      r: 'Escríbenos por WhatsApp con el nombre del modelo y te confirmamos la disponibilidad antes de que hagas el pedido.',
    },
    {
      p: '¿Qué marcas manejan?',
      r: 'Hoy el catálogo está armado con New Era. Queremos sumar Melos Caps y Americanino más adelante; cuando entren, aparecerán aquí.',
    },
    {
      p: '¿Puedo preguntar por una gorra que no está en el catálogo?',
      r: 'Sí. Escríbenos por WhatsApp con el modelo, la marca o una foto de referencia y te contamos si la podemos conseguir.',
    },
    {
      p: '¿Cómo se acuerdan el pago y la entrega?',
      r: 'Se coordinan directamente contigo por WhatsApp una vez recibimos tu pedido, según tu ciudad y lo que necesites. No hay pago automático en la página.',
    },
  ],

  /* ── 11. CHECKOUT ─────────────────────────────────────────────────────────
      Campos que se le piden al cliente antes de armar el mensaje.
      Pon en false los que no necesites.                                   */
  checkout: {
    pedirCiudad: true,
    pedirDireccion: true,
    pedirNota: true,
  },
};
