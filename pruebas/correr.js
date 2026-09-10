/* ═══════════════════════════════════════════════════════════════════════════
   PRUEBAS DE EXCLUSIVE CAPS MED
   ───────────────────────────────────────────────────────────────────────────
   Se corren con:   npm test

   Cada grupo levanta la tienda de verdad sobre una base temporal. No tocan
   _datos/tienda.db ni producción: puedes correrlas cuando quieras.

   Muchas de estas pruebas nacieron de un fallo real que llegó a estar
   publicado. Cuando eso pasa, el comentario dice cuál era, para que nadie lo
   reintroduzca sin enterarse.
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';

const fs = require('fs');
const path = require('path');
const { grupo, prueba, debe, resumen, tiendaDePruebas, RAIZ } = require('./ayudas');

(async () => {
  const t = await tiendaDePruebas();

  try {
    /* ═══ LA TIENDA SE VE ═══════════════════════════════════════════════ */
    grupo('La tienda responde');

    await prueba('la portada carga', async () => {
      const r = await t.pedir('GET', '/');
      debe.ser(r.estado, 200);
      debe.contener(r.texto, '<main id="principal"');
    });

    await prueba('el catálogo carga', async () => {
      const r = await t.pedir('GET', '/catalogo.html');
      debe.ser(r.estado, 200);
    });

    await prueba('las fichas de las gorras cargan', async () => {
      const datos = (await t.pedir('GET', '/js/datos.js')).texto;
      const slugs = [...datos.matchAll(/"slug": "([^"]+)"/g)].map((m) => m[1]);
      debe.cierto(slugs.length >= 10, 'esperaba un catálogo sembrado, hay ' + slugs.length);
      for (const s of slugs) {
        const r = await t.pedir('GET', '/gorra-' + s + '.html');
        debe.ser(r.estado, 200, 'la ficha de ' + s);
      }
    });

    await prueba('una dirección inventada responde 404, no un error', async () => {
      const r = await t.pedir('GET', '/gorra-esta-no-existe.html');
      debe.ser(r.estado, 404);
      debe.contener(r.texto, '<html');
    });

    await prueba('el mapa del sitio, robots y el manifiesto responden', async () => {
      for (const ruta of ['/sitemap.xml', '/robots.txt', '/site.webmanifest']) {
        debe.ser((await t.pedir('GET', ruta)).estado, 200, ruta);
      }
    });

    await prueba('los datos de la tienda son JavaScript válido', async () => {
      const js = (await t.pedir('GET', '/js/datos.js')).texto;
      // Si esto no es válido, la tienda entera se queda en blanco
      new Function(js); // eslint-disable-line no-new-func
    });

    await prueba('ninguna página deja marcadores de plantilla a la vista', async () => {
      const datos = (await t.pedir('GET', '/js/datos.js')).texto;
      const slugs = [...datos.matchAll(/"slug": "([^"]+)"/g)].map((m) => m[1]);
      for (const ruta of ['/', '/catalogo.html', '/gorra-' + slugs[0] + '.html']) {
        debe.noContener((await t.pedir('GET', ruta)).texto, '{{', ruta);
      }
    });

    /* ═══ EL PANEL SOLO ENTRA QUIEN DEBE ════════════════════════════════ */
    grupo('Seguridad: sin sesión no se entra');

    await prueba('/admin sin sesión redirige al ingreso y NO entrega el panel', async () => {
      const r = await t.pedir('GET', '/admin', undefined, { sinSesion: true, seguirRedirecciones: false });
      debe.ser(r.estado, 302);
      debe.ser(r.cabeceras.get('location'), '/admin/login');
      debe.noContener(r.texto, 'panel.js', 'el HTML del panel no puede salir sin sesión');
    });

    await prueba('todas las rutas del panel responden 401 sin sesión', async () => {
      const rutas = [
        ['GET', '/api/admin/yo'], ['GET', '/api/admin/resumen'], ['GET', '/api/admin/opciones'],
        ['GET', '/api/admin/productos'], ['POST', '/api/admin/productos'],
        ['GET', '/api/admin/marcas'], ['POST', '/api/admin/marcas'],
        ['GET', '/api/admin/tipos'], ['POST', '/api/admin/tipos'],
        ['GET', '/api/admin/colecciones'], ['POST', '/api/admin/colecciones'],
        ['GET', '/api/admin/banners'], ['POST', '/api/admin/banners'],
        ['GET', '/api/admin/pedidos'], ['GET', '/api/admin/usuarios'],
        ['POST', '/api/admin/usuarios'], ['GET', '/api/admin/imagenes'],
        ['POST', '/api/admin/imagenes'], ['GET', '/api/admin/ajustes/identidad'],
        ['PUT', '/api/admin/ajustes/identidad'],
      ];
      for (const [metodo, ruta] of rutas) {
        const r = await t.pedir(metodo, ruta, metodo === 'GET' ? undefined : {}, { sinSesion: true });
        debe.ser(r.estado, 401, metodo + ' ' + ruta);
      }
    });

    await prueba('una contraseña equivocada no entra', async () => {
      const r = await t.pedir('POST', '/api/admin/login',
        { correo: 'pruebas@ecm.local', clave: 'estanoes' }, { sinSesion: true });
      debe.cierto(r.estado === 401 || r.estado === 400, 'esperaba que rechazara, dio ' + r.estado);
    });

    await prueba('la cookie de sesión es HttpOnly y del mismo sitio', async () => {
      const r = await t.pedir('POST', '/api/admin/login',
        { correo: 'pruebas@ecm.local', clave: 'ClaveDePruebas2609' }, { sinSesion: true });
      debe.ser(r.estado, 200);
      const cookie = r.cabeceras.get('set-cookie') || '';
      debe.contener(cookie.toLowerCase(), 'httponly', 'la cookie tiene que ser HttpOnly');
      debe.contener(cookie.toLowerCase(), 'samesite', 'la cookie tiene que llevar SameSite');
    });

    await prueba('una petición desde otro sitio se rechaza', async () => {
      await t.entrar();
      const r = await t.pedir('POST', '/api/admin/colecciones',
        { imagen: 'portada', nombre: 'De otro sitio', visible: true },
        { origen: 'https://sitio-malo.example' });
      debe.cierto(r.estado === 403 || r.estado === 400,
        'esperaba que rechazara el origen, dio ' + r.estado);
    });

    await prueba('el servidor NO entrega archivos privados del proyecto', async () => {
      /* Con una lista de prohibidos en vez de una de permitidos, se olvidó
         .env.local: el servidor de trabajo entregaba el token de Vercel Blob y
         las credenciales de la base de producción a cualquiera en la misma
         red wifi. */
      const privados = [
        '/.env', '/.env.local', '/.vercel/project.json', '/package.json',
        '/vercel.json', '/LEEME.md', '/servidor-local.js', '/api/_lib/auth.js',
        '/api/_panel/index.html', '/api/_panel/login.html', '/_datos/tienda.db',
        '/_tools/sembrar.js', '/_tools/semilla/config.js', '/node_modules/sharp/package.json',
        '/pruebas/correr.js', '/.git/config',
      ];
      for (const ruta of privados) {
        const r = await t.pedir('GET', ruta, undefined, { sinSesion: true, seguirRedirecciones: false });
        debe.cierto(r.estado === 404 || r.estado === 400, ruta + ' salió con ' + r.estado);
      }
    });

    await prueba('lo que sí es público se sigue sirviendo', async () => {
      for (const ruta of ['/css/base.css', '/js/nucleo.js', '/admin/panel.js', '/admin/panel.css']) {
        debe.ser((await t.pedir('GET', ruta, undefined, { sinSesion: true })).estado, 200, ruta);
      }
    });

    /* ═══ PERMISOS DE VERDAD, NO BOTONES ESCONDIDOS ═════════════════════ */
    grupo('Seguridad: cada rol hace lo suyo');

    await prueba('un editor NO puede borrar aunque llame a la API', async () => {
      await t.entrar();
      const nueva = await t.pedir('POST', '/api/admin/colecciones',
        { imagen: 'portada', nombre: 'Para borrar', visible: false });
      debe.ser(nueva.estado, 200);

      const creado = await t.pedir('POST', '/api/admin/usuarios',
        { correo: 'editor@ecm.local', nombre: 'Editor', clave: 'ClaveEditor2609', rol: 'editor' });
      debe.ser(creado.estado, 200);

      const galletaAdmin = t.galleta;
      t.galleta = '';
      await t.entrar('editor@ecm.local', 'ClaveEditor2609');

      debe.ser((await t.pedir('GET', '/api/admin/colecciones')).estado, 200, 'el editor sí puede mirar');
      debe.ser((await t.pedir('DELETE', '/api/admin/colecciones/' + nueva.datos.id)).estado, 403, 'borrar');
      debe.ser((await t.pedir('GET', '/api/admin/usuarios')).estado, 403, 'ver usuarios');
      debe.ser((await t.pedir('PUT', '/api/admin/ajustes/sitio',
        { valor: { url: 'https://otro.example' } })).estado, 403, 'tocar la configuración');

      t.galleta = galletaAdmin;
      debe.ser((await t.pedir('DELETE', '/api/admin/colecciones/' + nueva.datos.id)).estado, 200,
        'el administrador sí puede borrar');
    });

    await prueba('un editor tampoco borra banners ni fotos, ni toca Configuración', async () => {
      // El panel le esconde esas pantallas, pero esconder no es impedir
      await t.entrar();
      const banner = await t.pedir('POST', '/api/admin/banners',
        { titulo: 'De prueba', activo: false });
      debe.ser(banner.estado, 200);
      const galletaAdmin = t.galleta;

      t.galleta = '';
      await t.entrar('editor@ecm.local', 'ClaveEditor2609');
      debe.ser((await t.pedir('DELETE', '/api/admin/banners/' + banner.datos.id)).estado, 403, 'borrar banner');
      debe.ser((await t.pedir('DELETE', '/api/admin/imagenes/portada')).estado, 403, 'borrar una foto');
      debe.ser((await t.pedir('PUT', '/api/admin/ajustes/checkout',
        { valor: { pedirCiudad: false, pedirDireccion: false, pedirNota: false } })).estado, 403,
      'cambiar los datos que se le piden al cliente');
      debe.ser((await t.pedir('PUT', '/api/admin/ajustes/seo',
        { valor: { titulo: 'x', descripcion: '', imagen: '' } })).estado, 403, 'cambiar los buscadores');
      // Lo suyo sí lo puede hacer
      debe.ser((await t.pedir('PUT', '/api/admin/banners/' + banner.datos.id,
        { titulo: 'Editado por el editor', activo: false })).estado, 200, 'editar un banner sí');

      t.galleta = galletaAdmin;
      debe.ser((await t.pedir('DELETE', '/api/admin/banners/' + banner.datos.id)).estado, 200);
    });

    await prueba('borrar algo que ya no existe no responde «eliminado»', async () => {
      await t.entrar();
      debe.ser((await t.pedir('DELETE', '/api/admin/banners/999999')).estado, 404);
      debe.ser((await t.pedir('DELETE', '/api/admin/colecciones/999999')).estado, 404);
    });

    await prueba('no se puede quedar la tienda sin ningún administrador', async () => {
      await t.entrar();
      const yo = (await t.pedir('GET', '/api/admin/yo')).datos;
      const usuarios = (await t.pedir('GET', '/api/admin/usuarios')).datos.items;
      const admins = usuarios.filter((u) => u.rol === 'admin');
      debe.ser(admins.length, 1, 'para esta prueba tiene que haber un solo administrador');
      const r = await t.pedir('DELETE', '/api/admin/usuarios/' + admins[0].id);
      debe.cierto(r.estado >= 400, 'el último administrador no se puede borrar (dio ' + r.estado + ')');
      debe.cierto(!!yo, 'la sesión sigue en pie');
    });

    /* ═══ EL DÓLAR QUE ROMPÍA LAS PÁGINAS ═══════════════════════════════ */
    grupo('Textos hostiles (fallos que llegaron a estar publicados)');

    await prueba('un nombre de gorra con "$&" no rompe su ficha', async () => {
      // String.replace trata $&, $`, $' y $$ como órdenes dentro del texto que
      // inserta. Con el nombre sin proteger, la ficha se duplicaba dentro de sí
      // misma y aparecían catorce marcadores crudos.
      await t.entrar();
      const creado = await t.pedir('POST', '/api/admin/productos',
        { nombre: 'Gorra 2x1 $& oferta $` rara', tipo: 'Snapback', estado: 'disponible' });
      debe.ser(creado.estado, 200, JSON.stringify(creado.datos));
      const ficha = await t.pedir('GET', '/gorra-' + creado.datos.producto.slug + '.html');
      debe.ser(ficha.estado, 200);
      debe.noContener(ficha.texto, '{{', 'no puede quedar ningún marcador crudo');
      debe.ser((ficha.texto.match(/<main id="principal"/g) || []).length, 1,
        'la página no puede duplicarse dentro de sí misma');
      await t.pedir('DELETE', '/api/admin/productos/' + creado.datos.id);
    });

    await prueba('un título de sección con "$&" sale literal en la portada', async () => {
      await t.entrar();
      const antes = (await t.pedir('GET', '/api/admin/ajustes/coleccionesTexto')).datos.valor;
      await t.pedir('PUT', '/api/admin/ajustes/coleccionesTexto',
        { valor: { eyebrow: '', titulo: 'Ofertas $& más', nota: 'Desde $$50.000' } });
      const home = (await t.pedir('GET', '/')).texto;
      debe.contener(home, 'Ofertas $&amp; más');
      debe.contener(home, 'Desde $$50.000');
      debe.noContener(home, '{{');
      await t.pedir('PUT', '/api/admin/ajustes/coleccionesTexto', { valor: antes });
    });

    await prueba('un nombre con etiquetas HTML no se cuela en la página', async () => {
      await t.entrar();
      const creado = await t.pedir('POST', '/api/admin/productos',
        { nombre: 'Gorra </script><script>alert(1)</script>', tipo: 'Snapback', estado: 'disponible' });
      debe.ser(creado.estado, 200);
      const ficha = (await t.pedir('GET', '/gorra-' + creado.datos.producto.slug + '.html')).texto;
      debe.noContener(ficha, '<script>alert(1)', 'el guion tiene que quedar escapado');
      const datos = (await t.pedir('GET', '/js/datos.js')).texto;
      new Function(datos); // eslint-disable-line no-new-func
      await t.pedir('DELETE', '/api/admin/productos/' + creado.datos.id);
    });

    /* ═══ FOTOS ═════════════════════════════════════════════════════════ */
    grupo('Fotos');

    await prueba('un tamaño que no existe se sirve con el de 760, no con un 404', async () => {
      // Un candidato de <source srcset> que da 404 NO cae al <img> de respaldo:
      // deja el hueco vacío. Con la portada eso era una pantalla en blanco.
      const r = await t.pedir('GET', '/assets/img/col-haru-1200.webp', undefined,
        { seguirRedirecciones: false });
      debe.ser(r.estado, 302);
      debe.ser(r.cabeceras.get('location'), '/assets/img/col-haru-760.webp');
      const seguido = await t.pedir('GET', '/assets/img/col-haru-1200.webp');
      debe.ser(seguido.estado, 200);
    });

    await prueba('una foto que no existe da 404 y no entra en bucle', async () => {
      const r = await t.pedir('GET', '/assets/img/no-existe-jamas-760.webp', undefined,
        { seguirRedirecciones: false });
      debe.ser(r.estado, 404);
    });

    await prueba('un nombre de foto imposible no tumba la petición', async () => {
      // Un carácter fuera de Latin-1 hacía saltar setHeader y la petición
      // entera se caía con la página de "Volvemos enseguida"
      for (const nombre of ['日本', 'абв', '—guion', 'a%0d%0ab']) {
        const r = await t.pedir('GET', '/assets/img/' + encodeURIComponent(nombre) + '-1200.webp',
          undefined, { seguirRedirecciones: false });
        debe.ser(r.estado, 404, 'con el nombre ' + nombre);
      }
    });

    await prueba('una gorra sin fotos NO deja la imagen rota', async () => {
      /* La tienda usa el emblema de la marca como respaldo y lo pide como
         assets/img/emblema-400.webp, un archivo que no existe: el emblema vive
         en assets/logo. Salía el icono de imagen rota en la tarjeta, en la
         ficha y en el carrito de cualquier gorra recién creada. */
      await t.entrar();
      const creado = await t.pedir('POST', '/api/admin/productos',
        { nombre: 'Gorra sin foto todavía', tipo: 'Snapback', estado: 'disponible' });
      const ficha = (await t.pedir('GET', '/gorra-' + creado.datos.producto.slug + '.html')).texto;
      const pedidas = [...new Set([...ficha.matchAll(/assets\/img\/([A-Za-z0-9._~-]+\.(?:webp|jpg))/g)].map((m) => m[1]))];
      for (const u of pedidas) {
        const r = await t.pedir('GET', '/assets/img/' + u);
        debe.ser(r.estado, 200, 'la ficha pide ' + u);
      }
      await t.pedir('DELETE', '/api/admin/productos/' + creado.datos.id);
    });

    await prueba('la imagen para compartir existe también para las fotos subidas', async () => {
      // Sin ella, el enlace de la gorra sale sin foto en WhatsApp
      for (const nombre of ['og-ohtani-1.jpg', 'og-esta-no-tiene-og.jpg']) {
        const r = await t.pedir('GET', '/assets/img/' + nombre, undefined, { seguirRedirecciones: true });
        debe.cierto(r.estado === 200 || r.estado === 404,
          nombre + ' respondió ' + r.estado);
      }
      const conOg = await t.pedir('GET', '/assets/img/og-ohtani-1.jpg');
      debe.ser(conOg.estado, 200, 'la de una gorra de la semilla sí existe');
    });

    await prueba('ninguna página se pide a sí misma como si fuera una foto', async () => {
      // Un <img src=""> hace que el navegador descargue la página entera otra
      // vez. Estaba en la ficha de cada gorra, en el visor de la foto ampliada.
      const datos = (await t.pedir('GET', '/js/datos.js')).texto;
      const slug = [...datos.matchAll(/"slug": "([^"]+)"/g)].map((m) => m[1])[0];
      for (const ruta of ['/', '/catalogo.html', '/gorra-' + slug + '.html']) {
        debe.noContener((await t.pedir('GET', ruta)).texto, 'src=""', ruta);
      }
    });

    await prueba('todas las fotos que pide la portada existen', async () => {
      const home = (await t.pedir('GET', '/')).texto;
      const urls = [...new Set([...home.matchAll(/assets\/img\/([A-Za-z0-9_-]+-\d+\.(?:webp|jpg))/g)].map((m) => m[1]))];
      debe.cierto(urls.length > 5, 'esperaba varias fotos, encontré ' + urls.length);
      for (const u of urls) {
        const r = await t.pedir('GET', '/assets/img/' + u);
        debe.ser(r.estado, 200, u);
      }
    });

    /* ═══ PRODUCTOS ═════════════════════════════════════════════════════ */
    grupo('Productos');

    await prueba('editar un solo campo NO borra los demás', async () => {
      // Esto llegó a pasar: un PUT con un campo se llevaba por delante trece
      await t.entrar();
      const creado = await t.pedir('POST', '/api/admin/productos', {
        nombre: 'Gorra completa', tipo: 'Snapback', marca: 'New Era', modelo: '9FIFTY',
        precio: 165000, descripcion: 'Una descripción larga que no se puede perder.',
        caracteristicas: ['Uno', 'Dos'], colores: ['Negro'], talla: 'Ajustable',
        estado: 'disponible', destacado: true,
      });
      debe.ser(creado.estado, 200, JSON.stringify(creado.datos));
      const antes = (await t.pedir('GET', '/api/admin/productos/' + creado.datos.id)).datos.producto;

      const r = await t.pedir('PUT', '/api/admin/productos/' + creado.datos.id, { precio: 175000 });
      debe.ser(r.estado, 200);
      const despues = (await t.pedir('GET', '/api/admin/productos/' + creado.datos.id)).datos.producto;

      debe.ser(Number(despues.precio), 175000, 'el precio sí cambia');
      for (const campo of ['nombre', 'marca', 'modelo', 'descripcion', 'talla', 'tipo']) {
        debe.ser(despues[campo], antes[campo], 'no se puede perder ' + campo);
      }
      debe.ser(JSON.stringify(despues.caracteristicas), JSON.stringify(antes.caracteristicas), 'características');
      debe.ser(JSON.stringify(despues.colores), JSON.stringify(antes.colores), 'colores');
      await t.pedir('DELETE', '/api/admin/productos/' + creado.datos.id);
    });

    await prueba('una gorra oculta desaparece de la tienda y su ficha responde 404', async () => {
      await t.entrar();
      const creado = await t.pedir('POST', '/api/admin/productos',
        { nombre: 'Gorra escondida', tipo: 'Snapback', estado: 'disponible' });
      const slug = creado.datos.producto.slug;
      debe.ser((await t.pedir('GET', '/gorra-' + slug + '.html')).estado, 200, 'primero se ve');

      await t.pedir('PUT', '/api/admin/productos/' + creado.datos.id, { estado: 'oculto' });
      debe.ser((await t.pedir('GET', '/gorra-' + slug + '.html')).estado, 404, 'oculta ya no');
      debe.noContener((await t.pedir('GET', '/js/datos.js')).texto, 'Gorra escondida', 'ni en los datos');
      debe.noContener((await t.pedir('GET', '/sitemap.xml')).texto, slug, 'ni en el mapa del sitio');
      await t.pedir('DELETE', '/api/admin/productos/' + creado.datos.id);
    });

    await prueba('pasarse de colores o de características se avisa, no se recorta callado', async () => {
      // Antes se guardaban seis de las ocho y el panel decía «guardado correctamente»
      await t.entrar();
      const muchas = Array.from({ length: 14 }, (_, i) => 'Característica número ' + (i + 1));
      const r = await t.pedir('POST', '/api/admin/productos',
        { nombre: 'Gorra con mucha letra', tipo: 'Snapback', caracteristicas: muchas });
      debe.ser(r.estado, 400);
      debe.contener(String(r.datos.error), '10', 'el mensaje dice cuántas caben');
      debe.contener(String(r.datos.error), '14', 'y cuántas hay');
    });

    await prueba('dos marcas con nombres parecidos avisan, no revientan con un 500', async () => {
      /* "New Era" y "NEW ERA!" dan la misma dirección web, que es única en la
         base: antes salía un error de restricción y el panel decía «intenta
         nuevamente» sin explicar nada. */
      await t.entrar();
      const a = await t.pedir('POST', '/api/admin/marcas', { nombre: 'Marca De Prueba' });
      debe.ser(a.estado, 200);
      const b = await t.pedir('POST', '/api/admin/marcas', { nombre: '¡MARCA DE PRUEBA!' });
      debe.ser(b.estado, 409, 'esperaba un aviso, no un error del servidor');
      debe.contener(String(b.datos.error), 'Marca De Prueba', 'el mensaje dice con cuál choca');
      await t.pedir('DELETE', '/api/admin/marcas/' + a.datos.id);
    });

    await prueba('un precio anterior menor que el actual no se acepta', async () => {
      await t.entrar();
      const r = await t.pedir('POST', '/api/admin/productos',
        { nombre: 'Descuento al revés', tipo: 'Snapback', precio: 100000, precioAntes: 50000 });
      debe.ser(r.estado, 400, 'esperaba que lo rechazara');
      debe.cierto(!!(r.datos && r.datos.error), 'y con un mensaje que se entienda');
    });

    /* ═══ COLECCIONES ═══════════════════════════════════════════════════ */
    grupo('Colecciones');

    await prueba('crear, ver en la portada, ocultar y borrar', async () => {
      await t.entrar();
      const r = await t.pedir('POST', '/api/admin/colecciones',
        { imagen: 'col-haru', nombre: 'Colección de prueba', nota: 'Una nota', visible: true });
      debe.ser(r.estado, 200);
      debe.contener((await t.pedir('GET', '/')).texto, 'Colección de prueba');

      await t.pedir('PUT', '/api/admin/colecciones/' + r.datos.id,
        { imagen: 'col-haru', nombre: 'Colección de prueba', nota: 'Una nota', visible: false });
      debe.noContener((await t.pedir('GET', '/')).texto, 'Colección de prueba', 'oculta no se muestra');

      debe.ser((await t.pedir('DELETE', '/api/admin/colecciones/' + r.datos.id)).estado, 200);
    });

    await prueba('una colección nueva queda LA ÚLTIMA aunque se borrara otra antes', async () => {
      // Contando filas, al borrar una del medio la nueva salía en mitad de la tira
      await t.entrar();
      const antes = (await t.pedir('GET', '/api/admin/colecciones')).datos.items;
      debe.cierto(antes.length >= 3, 'la semilla trae colecciones');
      await t.pedir('DELETE', '/api/admin/colecciones/' + antes[1].id);
      const nueva = await t.pedir('POST', '/api/admin/colecciones',
        { imagen: 'col-haru', nombre: 'La última', visible: true });
      const ahora = (await t.pedir('GET', '/api/admin/colecciones')).datos.items;
      debe.ser(ahora[ahora.length - 1].id, nueva.datos.id, 'tiene que quedar al final');

      await t.pedir('DELETE', '/api/admin/colecciones/' + nueva.datos.id);
      await t.pedir('POST', '/api/admin/colecciones', {
        imagen: antes[1].imagen, nombre: antes[1].nombre, nota: antes[1].nota,
        visible: !!antes[1].visible, orden: antes[1].orden,
      });
    });

    await prueba('una foto con ruta o comillas no se acepta', async () => {
      await t.entrar();
      for (const imagen of ['../../etc/passwd', 'foto"onerror=x', 'http://malo.example/x']) {
        const r = await t.pedir('POST', '/api/admin/colecciones',
          { imagen, nombre: 'Mala', visible: true });
        debe.ser(r.estado, 400, 'con la imagen ' + imagen);
      }
    });

    /* ═══ CARRUSEL ══════════════════════════════════════════════════════ */
    grupo('Carrusel de la portada');

    await prueba('una diapositiva de foto y una de gorra se guardan y se pintan', async () => {
      await t.entrar();
      const antes = (await t.pedir('GET', '/api/admin/ajustes/carrusel')).datos.valor;
      const slug = JSON.parse((await t.pedir('GET', '/js/datos.js')).texto
        .match(/window\.ECM\.PRODUCTOS = (\[[\s\S]*?\n\]);/)[1])[0].slug;

      const r = await t.pedir('PUT', '/api/admin/ajustes/carrusel', {
        valor: [
          { imagen: 'portada', titulo: 'De foto', cta: 'Ver el catálogo', posicion: '50% 3%', difuminado: 1, enlace: 'catalogo.html' },
          { producto: slug, titulo: 'De gorra', cta: 'Comprar ahora' },
        ],
      });
      debe.ser(r.estado, 200, JSON.stringify(r.datos));
      const home = (await t.pedir('GET', '/')).texto;
      debe.contener(home, 'De foto');
      debe.contener(home, 'De gorra');
      debe.contener(home, '50% 3%', 'el encuadre puesto a mano tiene que llegar a la portada');
      await t.pedir('PUT', '/api/admin/ajustes/carrusel', { valor: antes });
    });

    await prueba('no se aceptan más de ocho diapositivas, y lo dice', async () => {
      await t.entrar();
      const muchas = Array.from({ length: 9 }, (_, i) => ({ imagen: 'portada', titulo: 'D' + i }));
      const r = await t.pedir('PUT', '/api/admin/ajustes/carrusel', { valor: muchas });
      debe.ser(r.estado, 400);
      debe.contener(String(r.datos.error), '8', 'el mensaje tiene que decir cuántas caben');
    });

    /* ═══ CONFIGURACIÓN ═════════════════════════════════════════════════ */
    grupo('Configuración');

    await prueba('la dirección del sitio sin https:// no se acepta', async () => {
      /* Pasaba por "enlace relativo" y a partir de ahí el mapa del sitio y las
         direcciones que lee Google quedaban rotas para toda la tienda. */
      await t.entrar();
      const antes = (await t.pedir('GET', '/api/admin/ajustes/sitio')).datos.valor;
      const r = await t.pedir('PUT', '/api/admin/ajustes/sitio', { valor: { url: 'mitienda.com' } });
      debe.ser(r.estado, 400);
      debe.contener(String(r.datos.error), 'https://mitienda.com', 'el mensaje enseña cómo se escribe');
      debe.ser((await t.pedir('GET', '/api/admin/ajustes/sitio')).datos.valor.url, antes.url,
        'y no cambió nada');
    });

    await prueba('con una dirección buena, el mapa del sitio lleva direcciones completas', async () => {
      await t.entrar();
      const antes = (await t.pedir('GET', '/api/admin/ajustes/sitio')).datos.valor;
      await t.pedir('PUT', '/api/admin/ajustes/sitio', { valor: { url: 'https://prueba.example' } });
      const mapa = (await t.pedir('GET', '/sitemap.xml')).texto;
      debe.contener(mapa, '<loc>https://prueba.example/');
      const home = (await t.pedir('GET', '/')).texto;
      debe.contener(home, 'rel="canonical" href="https://prueba.example');
      await t.pedir('PUT', '/api/admin/ajustes/sitio', { valor: antes });
    });

    /* ═══ PEDIDOS ═══════════════════════════════════════════════════════ */
    grupo('Pedidos');

    await prueba('el total lo calcula el servidor: no se puede falsear el precio', async () => {
      await t.entrar();
      const creado = await t.pedir('POST', '/api/admin/productos',
        { nombre: 'Gorra con precio', tipo: 'Snapback', precio: 100000, estado: 'disponible' });
      const r = await t.pedir('POST', '/api/pedido', {
        items: [{ id: creado.datos.id, cantidad: 2, precio: 1 }],
        cliente: 'Cliente de prueba', telefono: '3001234567',
      }, { sinSesion: true });
      debe.ser(r.estado, 200, JSON.stringify(r.datos));

      const pedidos = (await t.pedir('GET', '/api/admin/pedidos')).datos.items;
      const mio = pedidos.filter((p) => p.referencia === r.datos.referencia)[0];
      debe.cierto(!!mio, 'el pedido queda registrado');
      debe.ser(Number(mio.total), 200000, 'el total sale de la base, no de lo que mande el navegador');
      await t.pedir('DELETE', '/api/admin/productos/' + creado.datos.id);
    });

    await prueba('un teléfono raro NO hace perder el pedido', async () => {
      /* Antes, un cliente que escribiera dos números hacía saltar el validador,
         el registro fallaba entero y el pedido desaparecía: el cliente mandaba
         su WhatsApp igual y el dueño no veía nada en el panel. */
      await t.entrar();
      const creado = await t.pedir('POST', '/api/admin/productos',
        { nombre: 'Gorra del teléfono raro', tipo: 'Snapback', precio: 50000, estado: 'disponible' });
      const raros = ['300 111 2233 / 310 222 3344', 'llámenme al fijo 604 000 0000 ext 12', '+57 300 111 22 33', ''];
      for (const telefono of raros) {
        const r = await t.pedir('POST', '/api/pedido', {
          items: [{ id: creado.datos.id, cantidad: 1 }],
          cliente: 'Cliente', telefono,
        }, { sinSesion: true });
        debe.ser(r.estado, 200, 'con el teléfono ' + JSON.stringify(telefono));
      }
      const pedidos = (await t.pedir('GET', '/api/admin/pedidos')).datos.items;
      debe.cierto(pedidos.length >= raros.length, 'los cuatro pedidos quedaron registrados');
      await t.pedir('DELETE', '/api/admin/productos/' + creado.datos.id);
    });

    await prueba('la dirección de entrega y la nota llegan al panel', async () => {
      // Se guardaban pero no se enseñaban en ninguna parte: el dueño tenía que
      // volver a preguntarle la dirección al cliente
      await t.entrar();
      const creado = await t.pedir('POST', '/api/admin/productos',
        { nombre: 'Gorra con envío', tipo: 'Snapback', precio: 90000, estado: 'disponible' });
      const hecho = await t.pedir('POST', '/api/pedido', {
        items: [{ id: creado.datos.id, cantidad: 1 }],
        cliente: 'Ana', telefono: '3001112233',
        ciudad: 'Medellín', direccion: 'Calle 10 #4-20, apto 301',
        nota: 'Timbre dañado\nLlamar al llegar',
      }, { sinSesion: true });
      debe.ser(hecho.estado, 200);
      const pedido = (await t.pedir('GET', '/api/admin/pedidos')).datos.items
        .filter((p) => p.referencia === hecho.datos.referencia)[0];
      debe.ser(pedido.ciudad, 'Medellín');
      debe.ser(pedido.direccion, 'Calle 10 #4-20, apto 301');
      debe.contener(pedido.nota, 'Timbre dañado');
      debe.contener(pedido.nota, '\n', 'los saltos de línea se conservan');
      await t.pedir('DELETE', '/api/admin/productos/' + creado.datos.id);
    });

    await prueba('«Imagen al compartir» no acepta comillas ni direcciones', async () => {
      /* Es el nombre de una foto: con él se arma la etiqueta que leen WhatsApp
         y Google. Sin validar, unas comillas cerraban el atributo y metían
         HTML en la cabecera de TODAS las páginas. */
      await t.entrar();
      const antes = (await t.pedir('GET', '/api/admin/ajustes/seo')).datos.valor;
      for (const imagen of ['foto" onload="alert(1)', 'https://malo.example/x.jpg', '../../secreto']) {
        const r = await t.pedir('PUT', '/api/admin/ajustes/seo',
          { valor: { titulo: '', descripcion: '', imagen } });
        debe.ser(r.estado, 400, 'con ' + JSON.stringify(imagen));
      }
      await t.pedir('PUT', '/api/admin/ajustes/seo', { valor: antes });
    });

    await prueba('un pedido vacío se rechaza', async () => {
      const r = await t.pedir('POST', '/api/pedido', { items: [] }, { sinSesion: true });
      debe.ser(r.estado, 400);
    });

    /* ═══ CONTACTO Y REDES ══════════════════════════════════════════════ */
    grupo('Contacto y redes');

    await prueba('cambiar el WhatsApp lo cambia en toda la tienda', async () => {
      await t.entrar();
      const antes = (await t.pedir('GET', '/api/admin/ajustes/whatsapp')).datos.valor;
      await t.pedir('PUT', '/api/admin/ajustes/whatsapp',
        { valor: { numero: '573001112233', visible: '300 111 2233' } });
      const datos = (await t.pedir('GET', '/js/datos.js')).texto;
      debe.contener(datos, '573001112233');
      debe.noContener(datos, antes.numero, 'el número viejo no puede quedar por ahí');
      await t.pedir('PUT', '/api/admin/ajustes/whatsapp', { valor: antes });
    });

    await prueba('Facebook existe de verdad en la tienda, no solo en el panel', async () => {
      // El interruptor estaba en el panel pero la tienda no tenía dónde
      // ponerlo: encenderlo no hacía absolutamente nada
      const home = (await t.pedir('GET', '/')).texto;
      debe.contener(home, 'data-fb', 'la portada tiene dónde poner Facebook');
      debe.contener(home, 'i-facebook', 'y su icono');
      const ficha = (await t.pedir('GET', '/catalogo.html')).texto;
      debe.contener(ficha, 'data-fb', 'el pie de todas las páginas también');
    });

    await prueba('vaciar un bloque esconde su sección, no deja el título solo', async () => {
      await t.entrar();
      const pasos = (await t.pedir('GET', '/api/admin/ajustes/pasos')).datos.valor;
      const faq = (await t.pedir('GET', '/api/admin/ajustes/faq')).datos.valor;
      await t.pedir('PUT', '/api/admin/ajustes/pasos', { valor: [] });
      await t.pedir('PUT', '/api/admin/ajustes/faq', { valor: [] });
      const home = (await t.pedir('GET', '/')).texto;
      debe.contener(home, 'id="como-comprar" hidden');
      debe.contener(home, 'id="preguntas" hidden');
      await t.pedir('PUT', '/api/admin/ajustes/pasos', { valor: pasos });
      await t.pedir('PUT', '/api/admin/ajustes/faq', { valor: faq });
    });

    await prueba('una red apagada no deja un botón roto en la tienda', async () => {
      await t.entrar();
      const antes = (await t.pedir('GET', '/api/admin/ajustes/redes')).datos.valor;
      await t.pedir('PUT', '/api/admin/ajustes/redes', {
        valor: {
          instagram: { usuario: '', url: '', activa: false },
          tiktok: { usuario: '', url: '', activa: false },
          facebook: { usuario: '', url: '', activa: false },
        },
      });
      const home = await t.pedir('GET', '/');
      debe.ser(home.estado, 200, 'la tienda sigue en pie sin ninguna red');
      const datos = (await t.pedir('GET', '/js/datos.js')).texto;
      new Function(datos); // eslint-disable-line no-new-func
      debe.noContener(datos, 'instagram.com', 'sin enlaces a redes apagadas');
      await t.pedir('PUT', '/api/admin/ajustes/redes', { valor: antes });
    });

    await prueba('un enlace de red sin https no se acepta', async () => {
      await t.entrar();
      const r = await t.pedir('PUT', '/api/admin/ajustes/redes', {
        valor: {
          instagram: { usuario: 'x', url: 'instagram.com/x', activa: true },
          tiktok: { usuario: '', url: '', activa: false },
          facebook: { usuario: '', url: '', activa: false },
        },
      });
      debe.ser(r.estado, 400);
    });

    /* ═══ AGUANTE ═══════════════════════════════════════════════════════ */
    grupo('El servidor aguanta lo que le echen');

    await prueba('direcciones mal formadas no lo tumban', async () => {
      const raras = [
        '/%', '/%zz', '/gorra-%e0%a4%a.html', '/' + 'x'.repeat(3000),
        '/../../etc/passwd', '/assets/img/..%2f..%2fpaquete.json',
        '/js/datos.js%00', '/catalogo.html?' + 'a='.repeat(2000),
      ];
      for (const r of raras) {
        const res = await fetch(t.base + r).catch(() => ({ status: 0 }));
        debe.cierto(res.status > 0, 'la petición ' + r + ' dejó la conexión colgada');
        debe.cierto(res.status < 500 || res.status === 503, r + ' dio ' + res.status);
      }
      debe.ser((await t.pedir('GET', '/')).estado, 200, 'y la tienda sigue viva después');
    });

    await prueba('cuerpos JSON rotos o enormes no lo tumban', async () => {
      await t.entrar();
      const cuerpos = ['{', 'no soy json', '[]', 'null', '{"a":' + '['.repeat(500) + ']'.repeat(500) + '}'];
      for (const c of cuerpos) {
        const r = await t.pedir('POST', '/api/admin/colecciones', c);
        debe.cierto(r.estado >= 400 && r.estado < 500, 'con el cuerpo ' + c.slice(0, 20) + ' dio ' + r.estado);
      }
      debe.ser((await t.pedir('GET', '/api/admin/colecciones')).estado, 200, 'el panel sigue vivo');
    });

    await prueba('el proceso no escribió ningún error inesperado', async () => {
      const err = t.errores.replace(/\[promesa suelta\][\s\S]*?\n/g, '');
      debe.noContener(err, 'UnhandledPromiseRejection');
      debe.noContener(err, 'MODULE_NOT_FOUND');
    });

    /* ═══ EL INVARIANTE DEL RENDERIZADOR ════════════════════════════════ */
    grupo('El HTML servido y el exportado son el mismo');

    await prueba('la portada servida coincide con la exportación estática', async () => {
      // Las dos salen de crearRenderizador(). Si esto se separa, el sitio
      // publicado y la copia de respaldo dejan de ser lo mismo.
      const { crearRenderizador, cargarDatos } = require(path.join(RAIZ, '_tools', 'build-paginas.js'));
      const R = crearRenderizador({ ...cargarDatos(), entregas: null, archivoDeDatos: 'js/datos.js' });
      const html = R.construirHome();
      debe.cierto(html.indexOf('{{') < 0, 'la exportación no puede dejar marcadores');
      const guardada = path.join(RAIZ, '_estatico', 'index.html');
      if (fs.existsSync(guardada)) {
        debe.ser(html, fs.readFileSync(guardada, 'utf8'),
          'la exportación guardada está vieja: corre "npm run estatico"');
      }
    });
  } finally {
    await t.cerrar();
  }

  /* ═══ EL FRENO DE LOS INTENTOS ════════════════════════════════════════
     En su propia tienda: al probarlo se bloquea esta dirección durante un
     rato, y eso dejaría sin entrar a las demás pruebas. */
  const conFreno = await tiendaDePruebas();
  try {
    grupo('El freno contra quien prueba contraseñas a lo bruto');

    await prueba('tras varios intentos fallidos se bloquea', async () => {
      let bloqueado = false;
      for (let i = 0; i < 14 && !bloqueado; i++) {
        const r = await conFreno.pedir('POST', '/api/admin/login',
          { correo: 'pruebas@ecm.local', clave: 'malamalamala' + i }, { sinSesion: true });
        if (r.estado === 429) bloqueado = true;
      }
      debe.cierto(bloqueado, 'esperaba que en algún momento dijera «demasiados intentos»');
    });

    await prueba('un espacio en el correo NO reinicia el freno', async () => {
      /* El freno se contaba con el correo tal cual llegaba y la búsqueda del
         usuario lo normalizaba: " a@b.com" contaba como otra cuenta pero
         entraba a la misma, así que bastaba ir añadiendo espacios. */
      for (const variante of [' pruebas@ecm.local', 'pruebas@ecm.local ', 'PRUEBAS@ECM.LOCAL', '  Pruebas@Ecm.Local  ']) {
        const r = await conFreno.pedir('POST', '/api/admin/login',
          { correo: variante, clave: 'otraequivocada' }, { sinSesion: true });
        debe.ser(r.estado, 429, 'con el correo ' + JSON.stringify(variante));
      }
    });

    await prueba('y con la contraseña buena tampoco entra mientras está bloqueado', async () => {
      const r = await conFreno.pedir('POST', '/api/admin/login',
        { correo: 'pruebas@ecm.local', clave: 'ClaveDePruebas2609' }, { sinSesion: true });
      debe.ser(r.estado, 429);
    });
  } finally {
    await conFreno.cerrar();
  }

  /* ═══ UNA BASE VACÍA DEL TODO ═════════════════════════════════════════ */
  const limpia = await tiendaDePruebas({ sembrar: false });
  try {
    grupo('Una tienda recién instalada, sin nada dentro');

    await prueba('la portada carga sin productos, sin marcas y sin carrusel', async () => {
      const r = await limpia.pedir('GET', '/');
      debe.ser(r.estado, 200);
      debe.noContener(r.texto, '{{');
    });

    await prueba('el catálogo vacío carga', async () => {
      debe.ser((await limpia.pedir('GET', '/catalogo.html')).estado, 200);
    });

    await prueba('los datos siguen siendo JavaScript válido', async () => {
      new Function((await limpia.pedir('GET', '/js/datos.js')).texto); // eslint-disable-line no-new-func
    });

    await prueba('el mapa del sitio no se rompe sin páginas', async () => {
      const r = await limpia.pedir('GET', '/sitemap.xml');
      debe.ser(r.estado, 200);
      debe.contener(r.texto, '<urlset');
    });

    await prueba('el panel sigue protegido en una tienda vacía', async () => {
      const r = await limpia.pedir('GET', '/admin', undefined,
        { sinSesion: true, seguirRedirecciones: false });
      debe.ser(r.estado, 302);
    });
  } finally {
    await limpia.cerrar();
  }

  process.exit(resumen());
})().catch((e) => {
  console.error('\n  Las pruebas se cayeron antes de terminar:\n  ' + (e && e.stack ? e.stack : e) + '\n');
  process.exit(1);
});
