/* ═══════════════════════════════════════════════════════════════════════════
   API DEL PANEL
   ───────────────────────────────────────────────────────────────────────────
   Todo lo que hay aquí exige sesión, menos el login. El permiso se comprueba
   ruta por ruta con auth.exigir(): ocultar el botón en la pantalla no es
   seguridad, la comprobación de verdad está aquí.
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';

const { todos, uno, correr, ahora } = require('./db');
const auth = require('./auth');
const V = require('./validar');
const C = require('./contenido');
const { ok, fallo, cuerpoJson } = require('./http');
const imagenes = require('./imagenes');

const ESTADOS_PRODUCTO = ['disponible', 'agotado', 'oculto'];
const ESTADOS_PEDIDO = ['nuevo', 'pendiente', 'confirmado', 'enviado', 'completado', 'cancelado'];

/* ═══ LOGIN ════════════════════════════════════════════════════════════════ */

/* El cuerpo solo se puede leer una vez del socket: se guarda para poder
   mirarlo antes de comprobar los frenos y también después. */
async function cuerpoGuardado(req) {
  if (!req._cuerpoLeido) req._cuerpoLeido = await cuerpoJson(req);
  return req._cuerpoLeido;
}

async function entrar(req, res) {
  const datos = await cuerpoGuardado(req);
  const llaveIp = 'ip:' + auth.ipDe(req);

  // Dos frenos: por dirección y por correo. Con solo el primero, alguien con
  // muchas direcciones podía seguir probando contra la misma cuenta.
  const llaveCorreo = 'correo:' + String((await cuerpoGuardado(req)).correo || '').toLowerCase().slice(0, 160);
  if (await auth.demasiadosIntentos(llaveIp) || await auth.demasiadosIntentos(llaveCorreo)) {
    return fallo(res, 429, `Demasiados intentos. Espera ${auth.VENTANA_MINUTOS} minutos y vuelve a probar.`);
  }

  let correo;
  try {
    correo = V.correo(datos.correo);
  } catch (_) {
    await auth.anotarIntento(llaveIp);
    await auth.anotarIntento(llaveCorreo);
    return fallo(res, 401, 'Correo o contraseña incorrectos.');
  }

  const usuario = await uno('SELECT * FROM usuarios WHERE correo = ?', [correo]);
  const valida = usuario && usuario.activo && auth.verificar(datos.clave, usuario.hash);

  if (!valida) {
    await auth.anotarIntento(llaveIp);
    await auth.anotarIntento(llaveCorreo);
    // El mismo mensaje tanto si el correo no existe como si la clave está mal:
    // así no se puede averiguar qué correos están dados de alta.
    return fallo(res, 401, 'Correo o contraseña incorrectos.');
  }

  await auth.limpiarIntentos(llaveIp);
  await auth.limpiarIntentos(llaveCorreo);
  await auth.abrirSesion(res, usuario.id, req.headers['user-agent']);
  return ok(res, { usuario: { nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol } });
}

async function salir(req, res) {
  await auth.cerrarSesion(req, res);
  return ok(res);
}

async function yo(req, res) {
  const usuario = await auth.usuarioActual(req);
  if (!usuario) return fallo(res, 401, 'Tu sesión se cerró. Vuelve a entrar.');
  return ok(res, { usuario, permisos: auth.PERMISOS[usuario.rol] || [] });
}

/* ═══ RESUMEN DEL TABLERO ══════════════════════════════════════════════════ */

async function resumen(req, res) {
  await auth.exigir(req, 'productos');
  const [prod, ocultos, agotados, destacados, sinPrecio, sinFoto, marcas, tipos, pedidos, nuevos] = await Promise.all([
    uno('SELECT COUNT(*) AS n FROM productos'),
    uno("SELECT COUNT(*) AS n FROM productos WHERE estado = 'oculto'"),
    uno("SELECT COUNT(*) AS n FROM productos WHERE estado = 'agotado'"),
    uno('SELECT COUNT(*) AS n FROM productos WHERE destacado = 1'),
    uno('SELECT COUNT(*) AS n FROM productos WHERE precio IS NULL'),
    uno('SELECT COUNT(*) AS n FROM productos p WHERE NOT EXISTS (SELECT 1 FROM imagenes i WHERE i.producto_id = p.id)'),
    uno('SELECT COUNT(*) AS n FROM marcas'),
    uno('SELECT COUNT(*) AS n FROM tipos'),
    uno('SELECT COUNT(*) AS n FROM pedidos'),
    uno("SELECT COUNT(*) AS n FROM pedidos WHERE estado = 'nuevo'"),
  ]);
  const ultimos = await todos('SELECT referencia, fecha, cliente, total, estado FROM pedidos ORDER BY fecha DESC LIMIT 5');
  return ok(res, {
    resumen: {
      productos: Number(prod.n), ocultos: Number(ocultos.n), agotados: Number(agotados.n),
      destacados: Number(destacados.n), sinPrecio: Number(sinPrecio.n), sinFoto: Number(sinFoto.n),
      marcas: Number(marcas.n), tipos: Number(tipos.n),
      pedidos: Number(pedidos.n), pedidosNuevos: Number(nuevos.n),
    },
    ultimosPedidos: ultimos,
  });
}

/* ═══ PRODUCTOS ════════════════════════════════════════════════════════════ */

async function listarProductosPanel(req, res) {
  await auth.exigir(req, 'productos');
  const lista = await C.listarProductos({ incluirOcultos: true });
  const filas = await todos('SELECT id, estado, orden FROM productos');
  const porId = new Map(filas.map((f) => [f.id, f]));
  return ok(res, {
    productos: lista.map((p) => ({ ...p, estado: (porId.get(p.id) || {}).estado || 'disponible' })),
  });
}

async function verProducto(req, res, id) {
  await auth.exigir(req, 'productos');
  const p = await C.productoParaPanel(Number(id));
  if (!p) return fallo(res, 404, 'Ese producto ya no existe.');
  return ok(res, { producto: p });
}

/* Valida y normaliza lo que llega del formulario */
async function leerCamposProducto(datos, idActual) {
  const nombre = V.textoObligatorio(datos.nombre, 'El nombre', { max: 140 });
  const slugPedido = V.slug(datos.slug || '', nombre);

  // El slug tiene que ser único: es la dirección de la ficha
  let slug = slugPedido;
  let intento = 2;
  while (true) {
    const choque = await uno('SELECT id FROM productos WHERE slug = ?', [slug]);
    if (!choque || (idActual && choque.id === Number(idActual))) break;
    slug = slugPedido + '-' + intento++;
    if (intento > 60) throw new V.ErrorDeDatos('No pude generar una dirección única para ese nombre.');
  }

  const marcasOk = (await C.listarMarcas()).map((m) => m.nombre);
  const tiposOk = (await C.listarTipos()).map((t) => t.nombre);
  const coloresOk = Object.keys(await C.leerAjuste('colores'));

  const marca = datos.marca ? V.unoDe(datos.marca, marcasOk, 'La marca') : null;
  const tipo = datos.tipo ? V.unoDe(datos.tipo, tiposOk, 'El tipo de gorra') : null;
  if (!tipo) throw new V.ErrorDeDatos('Elige el tipo de gorra.');

  const colores = V.lista(datos.colores, { max: 8, maxLargo: 40 })
    .filter((c) => coloresOk.includes(c));

  const precio = V.precio(datos.precio);
  const precioAntes = V.precio(datos.precioAntes, 'El precio anterior');
  if (precioAntes !== null && precio !== null && precioAntes <= precio) {
    throw new V.ErrorDeDatos('El precio anterior tiene que ser mayor que el precio actual.');
  }

  return {
    slug,
    nombre,
    marca,
    tipo,
    modelo: V.textoOpcional(datos.modelo, { max: 60 }),
    sku: V.textoOpcional(datos.sku, { max: 60 }),
    precio,
    precio_antes: precioAntes,
    estado: V.unoDe(datos.estado || 'disponible', ESTADOS_PRODUCTO, 'El estado'),
    stock: V.entero(datos.stock, { min: 0, max: 100000, campo: 'El stock' }),
    destacado: V.bool(datos.destacado),
    nuevo: V.bool(datos.nuevo),
    exclusivo: V.bool(datos.exclusivo),
    colores: JSON.stringify(colores),
    talla: V.textoOpcional(datos.talla, { max: 80 }),
    descripcion: V.parrafo(datos.descripcion, { max: 1200 }) || null,
    caracteristicas: JSON.stringify(V.lista(datos.caracteristicas, { max: 10, maxLargo: 200 })),
  };
}

async function crearProducto(req, res) {
  await auth.exigir(req, 'productos');
  const datos = await cuerpoJson(req);
  const c = await leerCamposProducto(datos, null);
  const sig = await uno('SELECT COALESCE(MAX(orden), 0) + 1 AS n FROM productos');

  const r = await correr(
    `INSERT INTO productos
       (slug, nombre, marca, tipo, modelo, sku, precio, precio_antes, estado, stock,
        destacado, nuevo, exclusivo, colores, talla, descripcion, caracteristicas,
        orden, creado, actualizado)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [c.slug, c.nombre, c.marca, c.tipo, c.modelo, c.sku, c.precio, c.precio_antes,
      c.estado, c.stock, c.destacado, c.nuevo, c.exclusivo, c.colores, c.talla,
      c.descripcion, c.caracteristicas, Number(sig.n), ahora(), ahora()]
  );
  const id = Number(r.lastInsertRowid);

  // Fotos que ya se subieron antes de guardar el producto
  await asignarFotos(id, datos.fotos);
  return ok(res, { id, producto: await C.productoParaPanel(id), mensaje: 'Producto creado correctamente.' });
}

async function editarProducto(req, res, id) {
  await auth.exigir(req, 'productos');
  const existe = await uno('SELECT id FROM productos WHERE id = ?', [Number(id)]);
  if (!existe) return fallo(res, 404, 'Ese producto ya no existe.');

  const datos = await cuerpoJson(req);
  const c = await leerCamposProducto(datos, id);
  await correr(
    `UPDATE productos SET slug=?, nombre=?, marca=?, tipo=?, modelo=?, sku=?, precio=?,
       precio_antes=?, estado=?, stock=?, destacado=?, nuevo=?, exclusivo=?, colores=?,
       talla=?, descripcion=?, caracteristicas=?, actualizado=? WHERE id=?`,
    [c.slug, c.nombre, c.marca, c.tipo, c.modelo, c.sku, c.precio, c.precio_antes,
      c.estado, c.stock, c.destacado, c.nuevo, c.exclusivo, c.colores, c.talla,
      c.descripcion, c.caracteristicas, ahora(), Number(id)]
  );

  // Las fotos solo se tocan si el formulario las mandó: así una edición
  // rápida de precio nunca puede borrar la galería sin querer.
  if (Array.isArray(datos.fotos)) await asignarFotos(Number(id), datos.fotos);

  return ok(res, { producto: await C.productoParaPanel(Number(id)), mensaje: 'Cambios guardados correctamente.' });
}

/* Deja la galería exactamente como la mandó el panel, respetando el orden.
   La primera de la lista es la principal. */
async function asignarFotos(productoId, fotos) {
  if (!Array.isArray(fotos)) return;
  const limpias = fotos
    .map((f) => (typeof f === 'string' ? { base: f } : f))
    .filter((f) => f && f.base)
    .map((f) => ({ base: V.nombreDeFoto(f.base), origen: f.origen === 'blob' ? 'blob' : 'local' }))
    .slice(0, 12);

  await correr('DELETE FROM imagenes WHERE producto_id = ?', [productoId]);
  for (const [i, f] of limpias.entries()) {
    await correr(
      'INSERT INTO imagenes (producto_id, base, origen, orden) VALUES (?, ?, ?, ?)',
      [productoId, f.base, f.origen, i]
    );
  }
}

async function duplicarProducto(req, res, id) {
  await auth.exigir(req, 'productos');
  const p = await uno('SELECT * FROM productos WHERE id = ?', [Number(id)]);
  if (!p) return fallo(res, 404, 'Ese producto ya no existe.');

  let slug = p.slug + '-copia';
  let n = 2;
  while (await uno('SELECT id FROM productos WHERE slug = ?', [slug])) slug = p.slug + '-copia-' + n++;

  const sig = await uno('SELECT COALESCE(MAX(orden), 0) + 1 AS n FROM productos');
  const r = await correr(
    `INSERT INTO productos
       (slug, nombre, marca, tipo, modelo, sku, precio, precio_antes, estado, stock,
        destacado, nuevo, exclusivo, colores, talla, descripcion, caracteristicas,
        orden, creado, actualizado)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [slug, p.nombre + ' (copia)', p.marca, p.tipo, p.modelo, null, p.precio, p.precio_antes,
      'oculto', p.stock, 0, p.nuevo, p.exclusivo, p.colores, p.talla, p.descripcion,
      p.caracteristicas, Number(sig.n), ahora(), ahora()]
  );
  const nuevoId = Number(r.lastInsertRowid);
  const fotos = await todos('SELECT base, origen, orden FROM imagenes WHERE producto_id = ? ORDER BY orden', [Number(id)]);
  for (const f of fotos) {
    await correr('INSERT INTO imagenes (producto_id, base, origen, orden) VALUES (?, ?, ?, ?)',
      [nuevoId, f.base, f.origen, f.orden]);
  }
  return ok(res, { id: nuevoId, mensaje: 'Copia creada. Queda oculta hasta que la revises.' });
}

async function borrarProducto(req, res, id) {
  await auth.exigir(req, 'borrar');
  const p = await uno('SELECT nombre FROM productos WHERE id = ?', [Number(id)]);
  if (!p) return fallo(res, 404, 'Ese producto ya no existe.');
  await correr('DELETE FROM imagenes WHERE producto_id = ?', [Number(id)]);
  await correr('DELETE FROM productos WHERE id = ?', [Number(id)]);
  return ok(res, { mensaje: `"${p.nombre}" se eliminó.` });
}

/* Cambios rápidos desde la tabla, sin abrir el formulario entero */
async function cambiarBandera(req, res, id) {
  await auth.exigir(req, 'productos');
  const existe = await uno('SELECT id FROM productos WHERE id = ?', [Number(id)]);
  if (!existe) return fallo(res, 404, 'Ese producto ya no existe.');
  const datos = await cuerpoJson(req);
  const permitidos = { destacado: 'destacado', nuevo: 'nuevo', exclusivo: 'exclusivo' };
  const cambios = [];
  const args = [];
  Object.keys(permitidos).forEach((k) => {
    if (k in datos) { cambios.push(`${permitidos[k]} = ?`); args.push(V.bool(datos[k])); }
  });
  if ('estado' in datos) {
    cambios.push('estado = ?');
    args.push(V.unoDe(datos.estado, ESTADOS_PRODUCTO, 'El estado'));
  }
  if ('orden' in datos) {
    cambios.push('orden = ?');
    args.push(V.entero(datos.orden, { min: 0, max: 100000, campo: 'El orden' }) || 0);
  }
  if (!cambios.length) return fallo(res, 400, 'No hay nada que cambiar.');
  cambios.push('actualizado = ?'); args.push(ahora());
  args.push(Number(id));
  await correr(`UPDATE productos SET ${cambios.join(', ')} WHERE id = ?`, args);
  return ok(res, { mensaje: 'Actualizado.' });
}

/* ═══ MARCAS Y TIPOS (categorías) ══════════════════════════════════════════ */

/* Las dos tablas se manejan igual, así que comparten el código. */
function haceTaxonomia(tabla, etiqueta, campoImagen) {
  const campoProducto = tabla === 'marcas' ? 'marca' : 'tipo';

  return {
    async listar(req, res) {
      await auth.exigir(req, 'contenido');
      const filas = await todos(`SELECT * FROM ${tabla} ORDER BY orden, nombre`);
      const cuentas = await todos(
        `SELECT ${campoProducto} AS k, COUNT(*) AS n FROM productos GROUP BY ${campoProducto}`
      );
      const mapa = new Map(cuentas.map((c) => [c.k, Number(c.n)]));
      return ok(res, { items: filas.map((f) => ({ ...f, productos: mapa.get(f.nombre) || 0 })) });
    },

    async crear(req, res) {
      await auth.exigir(req, 'contenido');
      const d = await cuerpoJson(req);
      const nombre = V.textoObligatorio(d.nombre, `El nombre de ${etiqueta}`, { max: 60 });
      if (await uno(`SELECT id FROM ${tabla} WHERE nombre = ?`, [nombre])) {
        return fallo(res, 409, `Ya existe ${etiqueta} con ese nombre.`);
      }
      const sig = await uno(`SELECT COALESCE(MAX(orden), 0) + 1 AS n FROM ${tabla}`);
      const r = await correr(
        `INSERT INTO ${tabla} (nombre, slug, ${campoImagen}, visible, orden) VALUES (?, ?, ?, ?, ?)`,
        [nombre, V.slug('', nombre), V.textoOpcional(d[campoImagen], { max: 300 }), V.bool(d.visible !== false), Number(sig.n)]
      );
      return ok(res, { id: Number(r.lastInsertRowid), mensaje: 'Creado correctamente.' });
    },

    async editar(req, res, id) {
      await auth.exigir(req, 'contenido');
      const fila = await uno(`SELECT * FROM ${tabla} WHERE id = ?`, [Number(id)]);
      if (!fila) return fallo(res, 404, 'Ya no existe.');
      const d = await cuerpoJson(req);
      const nombre = V.textoObligatorio(d.nombre, `El nombre de ${etiqueta}`, { max: 60 });
      const choque = await uno(`SELECT id FROM ${tabla} WHERE nombre = ? AND id <> ?`, [nombre, Number(id)]);
      if (choque) return fallo(res, 409, `Ya existe ${etiqueta} con ese nombre.`);

      // Lo que el formulario no manda se queda como estaba: antes, guardar
      // sin tocar esos campos reiniciaba el orden a 0 y reactivaba las ocultas.
      const visible = 'visible' in d ? V.bool(d.visible) : fila.visible;
      const orden = 'orden' in d ? (V.entero(d.orden, { campo: 'El orden' }) || 0) : fila.orden;
      const imagen = campoImagen in d ? V.textoOpcional(d[campoImagen], { max: 300 }) : fila[campoImagen];
      await correr(
        `UPDATE ${tabla} SET nombre = ?, slug = ?, ${campoImagen} = ?, visible = ?, orden = ? WHERE id = ?`,
        [nombre, V.slug('', nombre), imagen, visible, orden, Number(id)]
      );
      // Si cambió el nombre, los productos tienen que seguir apuntando bien
      if (fila.nombre !== nombre) {
        await correr(`UPDATE productos SET ${campoProducto} = ? WHERE ${campoProducto} = ?`, [nombre, fila.nombre]);
      }
      return ok(res, { mensaje: 'Cambios guardados correctamente.' });
    },

    async borrar(req, res, id) {
      await auth.exigir(req, 'borrar');
      const fila = await uno(`SELECT * FROM ${tabla} WHERE id = ?`, [Number(id)]);
      if (!fila) return fallo(res, 404, 'Ya no existe.');
      const usa = await uno(`SELECT COUNT(*) AS n FROM productos WHERE ${campoProducto} = ?`, [fila.nombre]);
      const n = Number(usa.n);
      const url = new URL(req.url, 'http://x');
      if (n > 0 && url.searchParams.get('forzar') !== '1') {
        return fallo(res, 409,
          `"${fila.nombre}" tiene ${n} producto${n === 1 ? '' : 's'} asociado${n === 1 ? '' : 's'}.`,
          { requiereConfirmacion: true, productos: n });
      }
      if (n > 0) {
        // Los productos NO se borran. Si el dueño eligió a dónde moverlos, se
        // mueven; si no, y es una categoría (que es obligatoria), se quedan
        // ocultos para que no salgan rotos a la tienda.
        const destino = url.searchParams.get('mover');
        const valido = destino && await uno(`SELECT nombre FROM ${tabla} WHERE nombre = ? AND id <> ?`, [destino, Number(id)]);
        if (valido) {
          await correr(`UPDATE productos SET ${campoProducto} = ? WHERE ${campoProducto} = ?`, [destino, fila.nombre]);
        } else if (tabla === 'tipos') {
          await correr(
            `UPDATE productos SET tipo = NULL, estado = 'oculto', actualizado = ? WHERE tipo = ?`,
            [ahora(), fila.nombre]
          );
        } else {
          await correr('UPDATE productos SET marca = NULL WHERE marca = ?', [fila.nombre]);
        }
      }
      await correr(`DELETE FROM ${tabla} WHERE id = ?`, [Number(id)]);
      return ok(res, { mensaje: `"${fila.nombre}" se eliminó.` });
    },
  };
}

const marcas = haceTaxonomia('marcas', 'una marca', 'logo');
const tipos = haceTaxonomia('tipos', 'una categoría', 'imagen');

/* ═══ AJUSTES (contenido de la home, contacto, redes, SEO…) ════════════════ */

/* Cada bloque se valida con su propia forma: si se guardara tal cual lo que
   llega, el panel podría dejar la home rota. */
const FORMAS = {
  identidad: (d) => ({
    marca: V.textoObligatorio(d.marca, 'El nombre del negocio', { max: 60 }),
    razonSocial: V.textoOpcional(d.razonSocial, { max: 90 }),
    ciudad: V.textoObligatorio(d.ciudad, 'La ciudad', { max: 60 }),
    region: V.textoOpcional(d.region, { max: 60 }),
    pais: V.textoOpcional(d.pais, { max: 4 }) || 'CO',
    descripcionCorta: V.texto(d.descripcionCorta, { max: 180 }),
    direccion: V.textoOpcional(d.direccion, { max: 160 }),
    correo: d.correo ? V.correo(d.correo) : null,
  }),
  whatsapp: (d) => ({
    numero: V.telefono(d.numero, { obligatorio: true }),
    visible: V.textoObligatorio(d.visible, 'El WhatsApp que se muestra', { max: 30 }),
  }),
  redes: (d) => {
    const salida = {};
    ['instagram', 'tiktok', 'facebook'].forEach((red) => {
      const r = (d && d[red]) || {};
      // Tiene que ser una dirección completa: un "instagram.com/x" sin
      // https:// se pegaría al dominio de la tienda y no llevaría a ninguna parte.
      let enlace = null;
      if (r.url) {
        enlace = V.url(r.url, { campo: 'El enlace de ' + red });
        if (!/^https?:\/\//i.test(enlace)) {
          throw new V.ErrorDeDatos(`El enlace de ${red} tiene que empezar por https://`);
        }
      }
      salida[red] = {
        usuario: V.texto(r.usuario, { max: 60 }).replace(/^@/, ''),
        url: enlace || '',
        // Una red sin enlace no puede quedar encendida: saldría un botón roto
        activa: !!(enlace && V.bool(r.activa)),
      };
    });
    return salida;
  },
  sitio: (d) => ({ url: V.url(d.url, { obligatoria: true, campo: 'La dirección del sitio' }) }),
  moneda: (d) => ({
    codigo: V.textoOpcional(d.codigo, { max: 6 }) || 'COP',
    locale: V.textoOpcional(d.locale, { max: 12 }) || 'es-CO',
  }),
  colores: (d) => {
    const salida = {};
    Object.entries(d || {}).slice(0, 40).forEach(([nombre, valor]) => {
      const n = V.texto(nombre, { max: 40 });
      if (n) salida[n] = V.hex(valor, `El color "${n}"`);
    });
    return salida;
  },
  carrusel: (d) => (Array.isArray(d) ? d : []).slice(0, 8).map((s, i) => {
    const dia = {
      titulo: V.textoObligatorio(s.titulo, `El título de la diapositiva ${i + 1}`, { max: 60 }),
      cta: V.texto(s.cta, { max: 30 }) || 'Comprar ahora',
    };
    if (s.imagen) {
      dia.imagen = V.texto(s.imagen, { max: 200 });
      dia.posicion = V.texto(s.posicion, { max: 20 }) || '50% 42%';
      dia.difuminado = Math.min(12, Math.max(0, Number(s.difuminado) || 0));
      dia.enlace = V.url(s.enlace || 'catalogo.html', { campo: 'El enlace del botón' });
    } else {
      dia.producto = V.textoObligatorio(s.producto, `El producto de la diapositiva ${i + 1}`, { max: 90 });
    }
    if (s.eyebrow) dia.eyebrow = V.texto(s.eyebrow, { max: 60 });
    if (s.texto) dia.texto = V.texto(s.texto, { max: 140 });
    return dia;
  }),
  carruselSegundos: (d) => Math.min(30, Math.max(0, Number(d) || 0)),
  confianza: (d) => (Array.isArray(d) ? d : []).slice(0, 6).map((b) => ({
    icono: V.unoDe(b.icono || 'carrito', ['carrito', 'chat', 'estrella', 'gorra'], 'El icono'),
    titulo: V.textoObligatorio(b.titulo, 'El título del bloque', { max: 40 }),
    texto: V.texto(b.texto, { max: 140 }),
  })),
  pasos: (d) => (Array.isArray(d) ? d : []).slice(0, 5).map((p) => ({
    titulo: V.textoObligatorio(p.titulo, 'El título del paso', { max: 40 }),
    texto: V.texto(p.texto, { max: 160 }),
  })),
  faq: (d) => (Array.isArray(d) ? d : []).slice(0, 15).map((f) => ({
    p: V.textoObligatorio(f.p, 'La pregunta', { max: 140 }),
    r: V.parrafo(f.r, { max: 700 }),
  })),
  checkout: (d) => ({
    pedirCiudad: !!V.bool(d.pedirCiudad),
    pedirDireccion: !!V.bool(d.pedirDireccion),
    pedirNota: !!V.bool(d.pedirNota),
  }),
  seo: (d) => ({
    titulo: V.texto(d.titulo, { max: 65 }),
    descripcion: V.texto(d.descripcion, { max: 165 }),
    imagen: V.textoOpcional(d.imagen, { max: 300 }),
  }),
};

async function verAjuste(req, res, clave) {
  await auth.exigir(req, 'contenido');
  // hasOwnProperty y no "in": con "in" se colaban claves heredadas como
  // "constructor" o "toString" y se escribían filas fuera de esquema.
  if (!Object.prototype.hasOwnProperty.call(FORMAS, clave)) return fallo(res, 404, 'Ese bloque no existe.');
  return ok(res, { clave, valor: await C.leerAjuste(clave) });
}

async function guardarAjusteRuta(req, res, clave) {
  await auth.exigir(req, clave === 'sitio' || clave === 'seo' ? 'config' : 'contenido');
  if (!Object.prototype.hasOwnProperty.call(FORMAS, clave)) return fallo(res, 404, 'Ese bloque no existe.');
  const cuerpo = await cuerpoJson(req);
  const limpio = FORMAS[clave](cuerpo.valor !== undefined ? cuerpo.valor : cuerpo);
  await C.guardarAjuste(clave, limpio);
  return ok(res, { valor: limpio, mensaje: 'Cambios guardados correctamente.' });
}

/* ═══ BANNERS ══════════════════════════════════════════════════════════════ */

async function listarBanners(req, res) {
  await auth.exigir(req, 'contenido');
  return ok(res, { items: await C.listarBanners() });
}

async function guardarBanner(req, res, id) {
  await auth.exigir(req, 'contenido');
  const d = await cuerpoJson(req);
  const campos = [
    V.textoOpcional(d.titulo, { max: 80 }),
    V.textoOpcional(d.texto, { max: 200 }),
    V.textoOpcional(d.imagen, { max: 300 }),
    V.textoOpcional(d.boton, { max: 30 }),
    d.enlace ? V.url(d.enlace, { campo: 'El enlace del banner' }) : null,
    V.bool(d.activo),
    V.entero(d.orden, { campo: 'El orden' }) || 0,
  ];
  if (id) {
    const ya = await uno('SELECT id FROM banners WHERE id = ?', [Number(id)]);
    if (!ya) return fallo(res, 404, 'Ese banner ya no existe.');
    await correr('UPDATE banners SET titulo=?, texto=?, imagen=?, boton=?, enlace=?, activo=?, orden=? WHERE id=?',
      [...campos, Number(id)]);
    return ok(res, { mensaje: 'Cambios guardados correctamente.' });
  }
  const r = await correr('INSERT INTO banners (titulo, texto, imagen, boton, enlace, activo, orden) VALUES (?,?,?,?,?,?,?)', campos);
  return ok(res, { id: Number(r.lastInsertRowid), mensaje: 'Banner creado correctamente.' });
}

async function borrarBanner(req, res, id) {
  await auth.exigir(req, 'contenido');
  await correr('DELETE FROM banners WHERE id = ?', [Number(id)]);
  return ok(res, { mensaje: 'Banner eliminado.' });
}

/* ═══ PEDIDOS ══════════════════════════════════════════════════════════════ */

async function listarPedidos(req, res) {
  await auth.exigir(req, 'pedidos');
  const url = new URL(req.url, 'http://x');
  const estado = url.searchParams.get('estado');
  const filas = estado && ESTADOS_PEDIDO.includes(estado)
    ? await todos('SELECT * FROM pedidos WHERE estado = ? ORDER BY fecha DESC LIMIT 300', [estado])
    : await todos('SELECT * FROM pedidos ORDER BY fecha DESC LIMIT 300');
  return ok(res, { items: filas.map((f) => ({ ...f, items: C.jsonOArray(f.items) })), estados: ESTADOS_PEDIDO });
}

async function cambiarPedido(req, res, id) {
  await auth.exigir(req, 'pedidos');
  const d = await cuerpoJson(req);
  const estado = V.unoDe(d.estado, ESTADOS_PEDIDO, 'El estado del pedido');
  const r = await correr('UPDATE pedidos SET estado = ?, actualizado = ? WHERE id = ?', [estado, ahora(), Number(id)]);
  if (!r.rowsAffected) return fallo(res, 404, 'Ese pedido ya no existe.');
  return ok(res, { mensaje: 'Pedido actualizado.' });
}

/* ═══ USUARIOS ═════════════════════════════════════════════════════════════ */

async function listarUsuarios(req, res) {
  await auth.exigir(req, 'usuarios');
  const filas = await todos('SELECT id, correo, nombre, rol, activo, creado, ultimo_acceso FROM usuarios ORDER BY id');
  return ok(res, { items: filas });
}

async function crearUsuario(req, res) {
  const yo = await auth.exigir(req, 'usuarios');
  const d = await cuerpoJson(req);
  const correo = V.correo(d.correo);
  if (await uno('SELECT id FROM usuarios WHERE correo = ?', [correo])) {
    return fallo(res, 409, 'Ya hay un usuario con ese correo.');
  }
  const problema = auth.revisarFortaleza(d.clave);
  if (problema) return fallo(res, 400, problema);
  const rol = V.unoDe(d.rol || 'editor', ['admin', 'editor'], 'El rol');
  await correr(
    'INSERT INTO usuarios (correo, nombre, hash, rol, activo, creado) VALUES (?, ?, ?, ?, 1, ?)',
    [correo, V.textoObligatorio(d.nombre, 'El nombre', { max: 80 }), auth.hashear(d.clave), rol, ahora()]
  );
  console.log(`[panel] ${yo.correo} creó al usuario ${correo} (${rol})`);
  return ok(res, { mensaje: 'Usuario creado correctamente.' });
}

async function editarUsuario(req, res, id) {
  const yo = await auth.usuarioActual(req);
  if (!yo) throw new auth.ErrorDeAcceso(401, 'Tu sesión se cerró. Vuelve a entrar.');
  const d = await cuerpoJson(req);
  const objetivo = await uno('SELECT * FROM usuarios WHERE id = ?', [Number(id)]);
  if (!objetivo) return fallo(res, 404, 'Ese usuario ya no existe.');

  // Cualquiera puede cambiar SU propia contraseña y su nombre.
  // Tocar a otro, o cambiar roles, es cosa del administrador.
  const esYoMismo = objetivo.id === yo.id;
  if (!esYoMismo && !auth.puede(yo, 'usuarios')) {
    return fallo(res, 403, 'Solo un administrador puede editar a otros usuarios.');
  }

  const cambios = [];
  const args = [];
  if (d.nombre !== undefined) { cambios.push('nombre = ?'); args.push(V.textoObligatorio(d.nombre, 'El nombre', { max: 80 })); }

  if (d.clave) {
    // Para cambiar la propia hay que escribir la actual: si alguien deja la
    // sesión abierta, que no pueda quedarse con la cuenta.
    if (esYoMismo && !auth.verificar(d.claveActual, objetivo.hash)) {
      return fallo(res, 400, 'La contraseña actual no es correcta.');
    }
    if (!esYoMismo && !auth.puede(yo, 'usuarios')) {
      return fallo(res, 403, 'No puedes cambiarle la contraseña a otro usuario.');
    }
    const problema = auth.revisarFortaleza(d.clave);
    if (problema) return fallo(res, 400, problema);
    cambios.push('hash = ?'); args.push(auth.hashear(d.clave));
    // Cambiar la contraseña cierra las demás sesiones de ese usuario
    await correr('DELETE FROM sesiones WHERE usuario_id = ?', [objetivo.id]);
  }

  if (d.rol !== undefined && auth.puede(yo, 'usuarios')) {
    const rol = V.unoDe(d.rol, ['admin', 'editor'], 'El rol');
    if (objetivo.rol === 'admin' && rol !== 'admin' && await esElUltimoAdmin(objetivo.id)) {
      return fallo(res, 409, 'No puedes quitarle el rol al único administrador que queda.');
    }
    cambios.push('rol = ?'); args.push(rol);
  }
  if (d.activo !== undefined && auth.puede(yo, 'usuarios')) {
    if (!V.bool(d.activo) && await esElUltimoAdmin(objetivo.id)) {
      return fallo(res, 409, 'No puedes desactivar al único administrador que queda.');
    }
    cambios.push('activo = ?'); args.push(V.bool(d.activo));
  }

  if (!cambios.length) return fallo(res, 400, 'No hay nada que cambiar.');
  args.push(Number(id));
  await correr(`UPDATE usuarios SET ${cambios.join(', ')} WHERE id = ?`, args);

  // Si me cambié la contraseña a mí mismo, hay que volver a entrar
  if (d.clave && esYoMismo) auth.borrarCookie(res);
  return ok(res, { mensaje: 'Cambios guardados correctamente.', volverAEntrar: !!(d.clave && esYoMismo) });
}

async function esElUltimoAdmin(id) {
  const f = await uno("SELECT COUNT(*) AS n FROM usuarios WHERE rol = 'admin' AND activo = 1 AND id <> ?", [id]);
  return Number(f.n) === 0;
}

async function borrarUsuario(req, res, id) {
  const yo = await auth.exigir(req, 'usuarios');
  if (Number(id) === yo.id) return fallo(res, 409, 'No puedes eliminar tu propio usuario.');
  const objetivo = await uno('SELECT * FROM usuarios WHERE id = ?', [Number(id)]);
  if (!objetivo) return fallo(res, 404, 'Ese usuario ya no existe.');
  if (objetivo.rol === 'admin' && await esElUltimoAdmin(objetivo.id)) {
    return fallo(res, 409, 'No puedes eliminar al único administrador que queda.');
  }
  await correr('DELETE FROM sesiones WHERE usuario_id = ?', [Number(id)]);
  await correr('DELETE FROM usuarios WHERE id = ?', [Number(id)]);
  console.log(`[panel] ${yo.correo} eliminó al usuario ${objetivo.correo}`);
  return ok(res, { mensaje: 'Usuario eliminado.' });
}

/* ═══ LISTAS DE APOYO PARA LOS FORMULARIOS ═════════════════════════════════ */

async function opciones(req, res) {
  await auth.exigir(req, 'productos');
  const [m, t, colores, productos] = await Promise.all([
    C.listarMarcas(), C.listarTipos(), C.leerAjuste('colores'),
    todos('SELECT slug, nombre FROM productos ORDER BY nombre'),
  ]);
  return ok(res, {
    marcas: m.map((x) => x.nombre),
    tipos: t.map((x) => x.nombre),
    colores,
    estados: ESTADOS_PRODUCTO,
    productos,
    imagenesDisponibles: await imagenes.listarBases(),
  });
}

module.exports = {
  entrar, salir, yo, resumen,
  listarProductosPanel, verProducto, crearProducto, editarProducto,
  duplicarProducto, borrarProducto, cambiarBandera,
  marcas, tipos,
  verAjuste, guardarAjusteRuta, FORMAS,
  listarBanners, guardarBanner, borrarBanner,
  listarPedidos, cambiarPedido, ESTADOS_PEDIDO,
  listarUsuarios, crearUsuario, editarUsuario, borrarUsuario,
  opciones,
};
