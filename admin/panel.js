/* ═══════════════════════════════════════════════════════════════════════════
   PANEL DE ADMINISTRACIÓN · EXCLUSIVE CAPS MED
   ───────────────────────────────────────────────────────────────────────────
   JavaScript plano, sin librerías, igual que la tienda. Cada sección es una
   función que devuelve HTML y engancha sus eventos.

   Nada de lo que hay aquí protege: la seguridad está en el servidor. Esto
   solo evita que se vean botones que de todos modos no funcionarían.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var YO = null;
  var PERMISOS = [];
  var OPCIONES = { marcas: [], tipos: [], colores: {}, estados: [], productos: [] };

  /* ── Utilidades ───────────────────────────────────────────────────────── */
  var $ = function (s, d) { return (d || document).querySelector(s); };
  var $$ = function (s, d) { return Array.prototype.slice.call((d || document).querySelectorAll(s)); };

  function esc(t) {
    return String(t === null || t === undefined ? '' : t)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  var pesos = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
  function precioTexto(v) {
    if (v === null || v === undefined || v === '') return '<span style="color:var(--tx-3)">Por WhatsApp</span>';
    return esc(pesos.format(v).replace(/ /g, ' '));
  }

  function fecha(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' · ' + d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  }

  var puede = function (p) { return PERMISOS.indexOf(p) >= 0; };
  var icono = function (id) { return '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#' + id + '"></use></svg>'; };

  /* ── Mensajes flotantes ───────────────────────────────────────────────── */
  function avisar(texto, tipo) {
    var caja = $('#mensajes');
    var el = document.createElement('div');
    el.className = 'mensaje mensaje--' + (tipo || 'ok');
    el.textContent = (tipo === 'error' ? '✕  ' : '✓  ') + texto;
    caja.appendChild(el);
    setTimeout(function () { el.remove(); }, tipo === 'error' ? 6000 : 3200);
  }

  /* ── Confirmación ─────────────────────────────────────────────────────── */
  function confirmar(opciones) {
    return new Promise(function (resolver) {
      var velo = document.createElement('div');
      velo.className = 'velo';
      velo.innerHTML =
        '<div class="dialogo" role="dialog" aria-modal="true" aria-labelledby="dlg-t">' +
        '<h2 id="dlg-t">' + esc(opciones.titulo) + '</h2>' +
        '<p>' + esc(opciones.texto) + '</p>' +
        '<div class="dialogo-botones">' +
        '<button type="button" class="btn btn--linea" data-no>' + esc(opciones.cancelar || 'Cancelar') + '</button>' +
        '<button type="button" class="btn ' + (opciones.peligro ? 'btn--peligro' : 'btn--primario') + '" data-si>' +
        esc(opciones.aceptar || 'Confirmar') + '</button>' +
        '</div></div>';
      document.body.appendChild(velo);
      $('[data-si]', velo).focus();

      function cerrar(valor) {
        velo.remove();
        document.removeEventListener('keydown', tecla);
        resolver(valor);
      }
      function tecla(e) { if (e.key === 'Escape') cerrar(false); }
      document.addEventListener('keydown', tecla);
      $('[data-si]', velo).addEventListener('click', function () { cerrar(true); });
      $('[data-no]', velo).addEventListener('click', function () { cerrar(false); });
      velo.addEventListener('click', function (e) { if (e.target === velo) cerrar(false); });
    });
  }

  /* ── Llamadas a la API ────────────────────────────────────────────────── */
  function api(metodo, ruta, cuerpo) {
    return fetch('/api/admin' + ruta, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (r.status === 401) {
          avisar('Tu sesión se cerró. Vuelve a entrar.', 'error');
          setTimeout(function () { location.href = '/admin/login'; }, 900);
          throw new Error('sesion');
        }
        if (!r.ok) {
          var e = new Error(d.error || 'No fue posible completar la operación.');
          e.datos = d;
          e.estado = r.status;
          throw e;
        }
        return d;
      });
    }, function () {
      throw new Error('No hay conexión con el servidor. Revisa tu internet.');
    });
  }

  /* Envuelve una acción: muestra el error si falla, nunca deja pensar que
     algo se guardó cuando en realidad falló. */
  function intentar(promesa, exito) {
    return promesa.then(function (d) {
      if (exito !== false) avisar((d && d.mensaje) || 'Listo.');
      return d;
    }).catch(function (e) {
      if (e.message !== 'sesion') avisar(e.message, 'error');
      throw e;
    });
  }

  /* ── Menú lateral ─────────────────────────────────────────────────────── */
  var SECCIONES = [
    { id: 'tablero', titulo: 'Tablero', icono: 'i-tablero' },
    { grupo: 'Catálogo' },
    { id: 'productos', titulo: 'Productos', icono: 'i-gorra', permiso: 'productos' },
    { id: 'tipos', titulo: 'Categorías', icono: 'i-etiqueta', permiso: 'contenido' },
    { id: 'marcas', titulo: 'Marcas', icono: 'i-marca', permiso: 'contenido' },
    { id: 'destacados', titulo: 'Destacados', icono: 'i-estrella', permiso: 'productos' },
    { grupo: 'Contenido' },
    { id: 'inicio', titulo: 'Página de inicio', icono: 'i-casa', permiso: 'contenido' },
    { id: 'banners', titulo: 'Banners', icono: 'i-banner', permiso: 'contenido' },
    { id: 'contacto', titulo: 'Contacto', icono: 'i-telefono', permiso: 'contenido' },
    { id: 'redes', titulo: 'Redes sociales', icono: 'i-red', permiso: 'contenido' },
    { grupo: 'Tienda' },
    { id: 'pedidos', titulo: 'Pedidos', icono: 'i-caja', permiso: 'pedidos', contador: 'pedidosNuevos' },
    { id: 'config', titulo: 'Configuración', icono: 'i-tuerca', permiso: 'config' },
    { id: 'usuarios', titulo: 'Administradores', icono: 'i-gente', permiso: 'usuarios' },
  ];

  function pintarNav(contadores) {
    var html = SECCIONES.filter(function (s) {
      return s.grupo || !s.permiso || puede(s.permiso);
    }).map(function (s) {
      if (s.grupo) return '<div class="nav-titulo">' + esc(s.grupo) + '</div>';
      var n = contadores && s.contador ? contadores[s.contador] : 0;
      return '<a href="#/' + s.id + '" data-seccion="' + s.id + '">' + icono(s.icono) +
        '<span>' + esc(s.titulo) + '</span>' +
        (n ? '<span class="marca-nueva">' + n + '</span>' : '') + '</a>';
    }).join('');
    html += '<div class="nav-titulo">Tienda pública</div>' +
      '<a href="/index.html" target="_blank" rel="noopener">' + icono('i-ojo') + '<span>Ver tienda</span></a>';
    $('#nav').innerHTML = html;
  }

  function marcarNav(id) {
    $$('#nav a[data-seccion]').forEach(function (a) {
      if (a.dataset.seccion === id) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  /* ── Encabezado ───────────────────────────────────────────────────────── */
  function encabezar(titulo, migas, acciones) {
    $('#titulo').textContent = titulo;
    $('#migas').textContent = migas || 'Panel';
    $('#acciones').innerHTML = acciones || '';
    document.title = titulo + ' · Panel EXCLUSIVE CAPS MED';
  }

  var contenido = function () { return $('#contenido'); };
  var cargando = function () { contenido().innerHTML = '<div class="cargando">Cargando…</div>'; };

  function errorDeCarga(e) {
    contenido().innerHTML =
      '<div class="tarjeta"><div class="vacio"><h3>No pudimos cargar esta sección</h3>' +
      '<p>' + esc(e.message) + '</p>' +
      '<button type="button" class="btn btn--primario" onclick="location.reload()">Reintentar</button>' +
      '</div></div>';
  }

  /* ═══ TABLERO ═════════════════════════════════════════════════════════ */
  function vistaTablero() {
    encabezar('Tablero', 'Panel');
    cargando();
    api('GET', '/resumen').then(function (d) {
      var r = d.resumen;
      var cifras = [
        { n: r.productos, t: 'Productos en catálogo' },
        { n: r.sinPrecio, t: 'Sin precio cargado', alerta: r.sinPrecio > 0 },
        { n: r.destacados, t: 'Destacados en la portada' },
        { n: r.pedidosNuevos, t: 'Pedidos sin revisar', alerta: r.pedidosNuevos > 0 },
      ];
      var pendientes = [];
      if (r.sinPrecio) pendientes.push(r.sinPrecio + ' producto(s) todavía muestran «Precio por WhatsApp» porque no tienen precio cargado.');
      if (r.sinFoto) pendientes.push(r.sinFoto + ' producto(s) no tienen ninguna foto.');
      if (r.ocultos) pendientes.push(r.ocultos + ' producto(s) están ocultos y no se ven en la tienda.');
      if (r.agotados) pendientes.push(r.agotados + ' producto(s) figuran como agotados.');

      contenido().innerHTML =
        '<div class="cifras">' + cifras.map(function (c) {
          return '<div class="cifra' + (c.alerta ? ' alerta' : '') + '"><b>' + c.n + '</b><span>' + esc(c.t) + '</span></div>';
        }).join('') + '</div>' +

        (pendientes.length
          ? '<div class="tarjeta"><h2>Pendientes</h2><p class="sub">Cosas que conviene revisar.</p><ul style="margin:0;padding-left:18px;color:var(--tx-2);font-size:14px">' +
            pendientes.map(function (p) { return '<li style="margin-bottom:5px">' + esc(p) + '</li>'; }).join('') + '</ul></div>'
          : '<div class="tarjeta"><h2>Todo en orden</h2><p class="sub">No hay nada pendiente por revisar.</p></div>') +

        '<div class="tarjeta"><h2>Últimos pedidos</h2><p class="sub">Los cinco más recientes.</p>' +
        (d.ultimosPedidos.length
          ? '<div class="tabla-caja"><table><thead><tr><th>Referencia</th><th>Fecha</th><th>Cliente</th><th>Total</th><th>Estado</th></tr></thead><tbody>' +
            d.ultimosPedidos.map(function (p) {
              return '<tr><td data-columna="Ref."><b>' + esc(p.referencia) + '</b></td>' +
                '<td data-columna="Fecha">' + esc(fecha(p.fecha)) + '</td>' +
                '<td data-columna="Cliente">' + esc(p.cliente || '—') + '</td>' +
                '<td data-columna="Total">' + precioTexto(p.total) + '</td>' +
                '<td data-columna="Estado">' + etiquetaPedido(p.estado) + '</td></tr>';
            }).join('') + '</tbody></table></div>'
          : '<div class="vacio"><p>Todavía no hay pedidos registrados.</p></div>') +
        '</div>';
    }).catch(errorDeCarga);
  }

  function etiquetaPedido(e) {
    var clases = { nuevo: 'azul', pendiente: 'aviso', confirmado: 'ok', enviado: 'ok', completado: 'gris', cancelado: 'error' };
    return '<span class="etiqueta etiqueta--' + (clases[e] || 'gris') + '">' + esc(e) + '</span>';
  }

  /* ═══ PRODUCTOS ═══════════════════════════════════════════════════════ */
  var filtroProductos = { texto: '', estado: '', marca: '', tipo: '' };

  function vistaProductos() {
    encabezar('Productos', 'Catálogo',
      '<a class="btn btn--primario" href="#/producto/nuevo">' + icono('i-mas') + ' Nuevo producto</a>');
    cargando();
    Promise.all([api('GET', '/productos'), cargarOpciones()]).then(function (r) {
      var lista = r[0].productos;
      contenido().innerHTML =
        '<div class="filtros">' +
        '<input type="search" id="f-texto" placeholder="Buscar por nombre, marca o referencia…" value="' + esc(filtroProductos.texto) + '">' +
        '<select id="f-estado"><option value="">Todos los estados</option>' +
        ['disponible', 'agotado', 'oculto'].map(function (e) {
          return '<option value="' + e + '"' + (filtroProductos.estado === e ? ' selected' : '') + '>' + e + '</option>';
        }).join('') + '</select>' +
        '<select id="f-marca"><option value="">Todas las marcas</option>' +
        OPCIONES.marcas.map(function (m) {
          return '<option' + (filtroProductos.marca === m ? ' selected' : '') + '>' + esc(m) + '</option>';
        }).join('') + '</select>' +
        '<select id="f-tipo"><option value="">Todos los tipos</option>' +
        OPCIONES.tipos.map(function (t) {
          return '<option' + (filtroProductos.tipo === t ? ' selected' : '') + '>' + esc(t) + '</option>';
        }).join('') + '</select>' +
        '</div><div id="tabla-productos"></div>';

      function repintar() {
        var t = filtroProductos.texto.toLowerCase();
        var vistos = lista.filter(function (p) {
          if (filtroProductos.estado && p.estado !== filtroProductos.estado) return false;
          if (filtroProductos.marca && p.marca !== filtroProductos.marca) return false;
          if (filtroProductos.tipo && p.tipo !== filtroProductos.tipo) return false;
          if (!t) return true;
          return [p.nombre, p.marca, p.tipo, p.sku, p.modelo].join(' ').toLowerCase().indexOf(t) >= 0;
        });
        $('#tabla-productos').innerHTML = vistos.length ? tablaProductos(vistos) :
          '<div class="tarjeta"><div class="vacio"><h3>Ningún producto coincide</h3><p>Prueba con otra búsqueda o quita los filtros.</p></div></div>';
        engancharTabla(lista);
      }

      $('#f-texto').addEventListener('input', function () { filtroProductos.texto = this.value; repintar(); });
      ['estado', 'marca', 'tipo'].forEach(function (k) {
        $('#f-' + k).addEventListener('change', function () { filtroProductos[k] = this.value; repintar(); });
      });
      repintar();
    }).catch(errorDeCarga);
  }

  function tablaProductos(lista) {
    return '<div class="tabla-caja"><table><thead><tr>' +
      '<th style="width:60px">Foto</th><th>Producto</th><th>Marca</th><th>Tipo</th>' +
      '<th>Precio</th><th>Estado</th><th>Etiquetas</th><th></th></tr></thead><tbody>' +
      lista.map(function (p) {
        var foto = p.imagenes && p.imagenes[0]
          ? '<img class="miniatura" src="/assets/img/' + esc(p.imagenes[0]) + '-160.webp" alt="" loading="lazy" onerror="this.src=\'/assets/img/' + esc(p.imagenes[0]) + '-400.webp\'">'
          : '<div class="sin-foto">sin foto</div>';
        var estados = { disponible: 'ok', agotado: 'aviso', oculto: 'gris' };
        var etiquetas = [
          p.destacado ? '<span class="etiqueta etiqueta--azul">Destacado</span>' : '',
          p.nuevo ? '<span class="etiqueta etiqueta--gris">Nuevo</span>' : '',
          p.exclusivo ? '<span class="etiqueta etiqueta--gris">Exclusivo</span>' : '',
        ].filter(Boolean).join(' ');
        return '<tr data-id="' + p.id + '">' +
          '<td>' + foto + '</td>' +
          '<td><b>' + esc(p.nombre) + '</b><br><small style="color:var(--tx-3)">' + esc(p.slug) + '</small></td>' +
          '<td data-columna="Marca">' + esc(p.marca || '—') + '</td>' +
          '<td data-columna="Tipo">' + esc(p.tipo || '—') + '</td>' +
          '<td data-columna="Precio">' + precioTexto(p.precio) + '</td>' +
          '<td data-columna="Estado"><span class="etiqueta etiqueta--' + (estados[p.estado] || 'gris') + '">' + esc(p.estado) + '</span></td>' +
          '<td data-columna="Etiquetas">' + (etiquetas || '<span style="color:var(--tx-3)">—</span>') + '</td>' +
          '<td class="acciones">' +
          '<a class="btn btn--linea btn--sm" href="#/producto/' + p.id + '">Editar</a>' +
          '<button type="button" class="btn btn--linea btn--sm" data-duplicar>Duplicar</button>' +
          (puede('borrar') ? '<button type="button" class="btn btn--suave btn--sm" data-borrar style="color:var(--error)">Eliminar</button>' : '') +
          '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function engancharTabla(lista) {
    $$('#tabla-productos [data-duplicar]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.closest('tr').dataset.id;
        intentar(api('POST', '/productos/' + id + '/duplicar')).then(function () { vistaProductos(); });
      });
    });
    $$('#tabla-productos [data-borrar]').forEach(function (b) {
      b.addEventListener('click', function () {
        var tr = b.closest('tr');
        var nombre = $('b', tr).textContent;
        confirmar({
          titulo: '¿Eliminar este producto?',
          texto: '«' + nombre + '» se borrará del catálogo y de la tienda. Esta acción no se puede deshacer.',
          aceptar: 'Sí, eliminar', peligro: true,
        }).then(function (si) {
          if (!si) return;
          intentar(api('DELETE', '/productos/' + tr.dataset.id)).then(function () { vistaProductos(); });
        });
      });
    });
  }

  function cargarOpciones() {
    return api('GET', '/opciones').then(function (d) { OPCIONES = d; return d; });
  }

  /* ═══ FORMULARIO DE PRODUCTO ══════════════════════════════════════════ */
  function vistaProducto(id) {
    var esNuevo = id === 'nuevo';
    encabezar(esNuevo ? 'Nuevo producto' : 'Editar producto', 'Catálogo · Productos');
    cargando();

    var pedir = esNuevo ? Promise.resolve({ producto: productoVacio() }) : api('GET', '/productos/' + id);
    Promise.all([pedir, cargarOpciones()]).then(function (r) {
      var p = r[0].producto;
      var fotos = (p.imagenes || []).map(function (b) { return { base: b }; });
      contenido().innerHTML = formularioProducto(p, esNuevo);
      engancharFormulario(p, fotos, esNuevo);
    }).catch(errorDeCarga);
  }

  function productoVacio() {
    return {
      id: null, slug: '', nombre: '', marca: OPCIONES.marcas[0] || '', tipo: '', modelo: '', sku: '',
      precio: null, precioAntes: null, estado: 'disponible', stock: null,
      destacado: false, nuevo: true, exclusivo: false, colores: [], talla: '',
      descripcion: '', caracteristicas: [], imagenes: [],
    };
  }

  function formularioProducto(p, esNuevo) {
    var colores = Object.keys(OPCIONES.colores || {});
    return '<form id="f-producto" novalidate>' +
      '<div class="tarjeta"><h2>Datos básicos</h2>' +
      campo('nombre', 'Nombre del producto', p.nombre, { max: 140, requerido: true, ayuda: 'Es el que se ve en la tienda y arma la dirección de la ficha.' }) +
      '<div class="fila fila--2">' +
      select('marca', 'Marca', p.marca, [''].concat(OPCIONES.marcas)) +
      select('tipo', 'Tipo de gorra', p.tipo, [''].concat(OPCIONES.tipos), true) +
      '</div>' +
      '<div class="fila fila--3">' +
      campo('modelo', 'Modelo del fabricante', p.modelo, { max: 60, ayuda: 'Opcional. Ej: 9FIFTY' }) +
      campo('sku', 'Tu referencia', p.sku, { max: 60, ayuda: 'Opcional.' }) +
      campo('talla', 'Talla', p.talla, { max: 80, ayuda: 'Opcional.' }) +
      '</div></div>' +

      '<div class="tarjeta"><h2>Precio y disponibilidad</h2>' +
      '<div class="fila fila--3">' +
      campo('precio', 'Precio', p.precio, { tipo: 'text', ayuda: 'Solo el número. Déjalo vacío para «Precio por WhatsApp».' }) +
      campo('precioAntes', 'Precio anterior', p.precioAntes, { tipo: 'text', ayuda: 'Opcional, para mostrar descuento.' }) +
      campo('stock', 'Stock', p.stock, { tipo: 'number', ayuda: 'Opcional.' }) +
      '</div>' +
      select('estado', 'Estado', p.estado, ['disponible', 'agotado', 'oculto'], true,
        'Un producto oculto no aparece en la tienda ni tiene ficha.') +
      '<div style="margin-top:12px">' +
      interruptor('destacado', 'Destacado (sale en la portada)', p.destacado) +
      interruptor('nuevo', 'Mostrar la etiqueta NUEVO', p.nuevo) +
      interruptor('exclusivo', 'Mostrar la etiqueta EXCLUSIVO', p.exclusivo) +
      '</div></div>' +

      '<div class="tarjeta"><h2>Fotos</h2>' +
      '<p class="sub">La primera es la principal. Arrastra o toca para subir; varios ángulos de la misma gorra van todos aquí, en el mismo producto.</p>' +
      '<div class="galeria" id="galeria"></div>' +
      '<input type="file" id="archivo" accept="image/jpeg,image/png,image/webp" multiple hidden>' +
      '</div>' +

      '<div class="tarjeta"><h2>Descripción</h2>' +
      area('descripcion', 'Descripción', p.descripcion, 1200, 'Una o dos frases. Solo lo que se ve en la foto.') +
      area('caracteristicas', 'Características (una por línea)', (p.caracteristicas || []).join('\n'), 1500,
        'Entre 3 y 6 puntos cortos y verificables.') +
      '<label class="campo"><span>Colores</span><div style="display:flex;flex-wrap:wrap;gap:6px">' +
      colores.map(function (c) {
        var puesto = (p.colores || []).indexOf(c) >= 0;
        return '<label class="interruptor" style="margin:0;padding:5px 10px;border:1px solid var(--linea-2);border-radius:var(--r-full)">' +
          '<input type="checkbox" name="color" value="' + esc(c) + '"' + (puesto ? ' checked' : '') + '>' +
          '<span style="display:inline-flex;align-items:center;gap:6px"><i style="width:12px;height:12px;border-radius:50%;background:' +
          esc(OPCIONES.colores[c]) + ';border:1px solid rgba(0,0,0,.15)"></i>' + esc(c) + '</span></label>';
      }).join('') + '</div></label></div>' +

      '<div class="tarjeta" style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">' +
      '<a class="btn btn--linea" href="#/productos">Cancelar</a>' +
      (esNuevo ? '' : '<a class="btn btn--linea" href="/gorra-' + esc(p.slug) + '.html" target="_blank" rel="noopener">' + icono('i-ojo') + ' Vista previa</a>') +
      '<button type="submit" class="btn btn--primario" id="guardar">' + (esNuevo ? 'Crear producto' : 'Guardar cambios') + '</button>' +
      '</div></form>';
  }

  function campo(nombre, etiqueta, valor, o) {
    o = o || {};
    var v = valor === null || valor === undefined ? '' : valor;
    return '<label class="campo"><span>' + esc(etiqueta) + (o.requerido ? ' *' : '') +
      (o.max ? '<span class="contador" data-para="' + nombre + '"></span>' : '') + '</span>' +
      '<input type="' + (o.tipo || 'text') + '" name="' + nombre + '" value="' + esc(v) + '"' +
      (o.max ? ' maxlength="' + o.max + '"' : '') + '>' +
      (o.ayuda ? '<small class="campo-ayuda">' + esc(o.ayuda) + '</small>' : '') + '</label>';
  }

  function area(nombre, etiqueta, valor, max, ayuda) {
    return '<label class="campo"><span>' + esc(etiqueta) +
      '<span class="contador" data-para="' + nombre + '"></span></span>' +
      '<textarea name="' + nombre + '" maxlength="' + max + '">' + esc(valor || '') + '</textarea>' +
      (ayuda ? '<small class="campo-ayuda">' + esc(ayuda) + '</small>' : '') + '</label>';
  }

  function select(nombre, etiqueta, valor, opciones, requerido, ayuda) {
    return '<label class="campo"><span>' + esc(etiqueta) + (requerido ? ' *' : '') + '</span><select name="' + nombre + '">' +
      opciones.map(function (o) {
        return '<option value="' + esc(o) + '"' + (String(valor || '') === String(o) ? ' selected' : '') + '>' +
          (o === '' ? '— sin definir —' : esc(o)) + '</option>';
      }).join('') + '</select>' +
      (ayuda ? '<small class="campo-ayuda">' + esc(ayuda) + '</small>' : '') + '</label>';
  }

  function interruptor(nombre, etiqueta, puesto) {
    return '<label class="interruptor"><input type="checkbox" name="' + nombre + '"' + (puesto ? ' checked' : '') +
      '><span>' + esc(etiqueta) + '</span></label>';
  }

  function engancharFormulario(p, fotos, esNuevo) {
    var forma = $('#f-producto');
    contadores(forma);

    function pintarGaleria() {
      $('#galeria').innerHTML = fotos.map(function (f, i) {
        return '<div class="foto' + (i === 0 ? ' principal' : '') + '" data-i="' + i + '">' +
          (i === 0 ? '<span class="foto-marca">Principal</span>' : '') +
          '<img src="/assets/img/' + esc(f.base) + '-400.webp" alt="" loading="lazy">' +
          '<div class="foto-barra">' +
          (i > 0 ? '<button type="button" data-izq title="Mover a la izquierda">◀</button>' : '') +
          (i > 0 ? '<button type="button" data-principal title="Usar como principal">★</button>' : '') +
          (i < fotos.length - 1 ? '<button type="button" data-der title="Mover a la derecha">▶</button>' : '') +
          '<button type="button" class="quitar" data-quitar title="Quitar del producto">✕</button>' +
          '</div></div>';
      }).join('') +
        '<button type="button" class="subir" id="btn-subir"><span style="font-size:22px">+</span><span>Subir fotos</span>' +
        '<small style="font-weight:400">JPG, PNG o WEBP · máx. 9 MB</small></button>';

      $$('#galeria [data-i]').forEach(function (el) {
        var i = Number(el.dataset.i);
        var b;
        if ((b = $('[data-izq]', el))) b.addEventListener('click', function () { mover(i, i - 1); });
        if ((b = $('[data-der]', el))) b.addEventListener('click', function () { mover(i, i + 1); });
        if ((b = $('[data-principal]', el))) b.addEventListener('click', function () { mover(i, 0); });
        if ((b = $('[data-quitar]', el))) {
          b.addEventListener('click', function () {
            fotos.splice(i, 1);
            pintarGaleria();
          });
        }
      });
      $('#btn-subir').addEventListener('click', function () { $('#archivo').click(); });
    }

    function mover(de, a) {
      if (a < 0 || a >= fotos.length) return;
      var x = fotos.splice(de, 1)[0];
      fotos.splice(a, 0, x);
      pintarGaleria();
    }

    pintarGaleria();

    $('#archivo').addEventListener('change', function () {
      var lista = Array.prototype.slice.call(this.files || []);
      this.value = '';
      subirVarias(lista);
    });

    function subirVarias(archivos) {
      if (!archivos.length) return;
      var boton = $('#btn-subir');
      var total = archivos.length;
      var hechas = 0;
      boton.disabled = true;

      function siguiente() {
        if (!archivos.length) {
          boton.disabled = false;
          pintarGaleria();
          if (hechas) avisar(hechas + (hechas === 1 ? ' foto subida.' : ' fotos subidas.'));
          return;
        }
        var f = archivos.shift();
        boton.querySelector('span:last-of-type').textContent = 'Subiendo ' + (hechas + 1) + ' de ' + total + '…';
        if (f.size > 9 * 1024 * 1024) {
          avisar('«' + f.name + '» pesa más de 9 MB. Súbela más liviana.', 'error');
          return siguiente();
        }
        var lector = new FileReader();
        lector.onload = function () {
          api('POST', '/imagenes', { datos: lector.result, nombre: f.name })
            .then(function (d) { fotos.push({ base: d.base, origen: d.origen }); hechas++; })
            .catch(function (e) { if (e.message !== 'sesion') avisar(e.message, 'error'); })
            .then(siguiente);
        };
        lector.onerror = function () { avisar('No pude leer «' + f.name + '».', 'error'); siguiente(); };
        lector.readAsDataURL(f);
      }
      siguiente();
    }

    forma.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var d = new FormData(forma);
      var cuerpo = {
        nombre: d.get('nombre'), marca: d.get('marca'), tipo: d.get('tipo'),
        modelo: d.get('modelo'), sku: d.get('sku'), talla: d.get('talla'),
        precio: d.get('precio'), precioAntes: d.get('precioAntes'), stock: d.get('stock'),
        estado: d.get('estado'),
        destacado: !!d.get('destacado'), nuevo: !!d.get('nuevo'), exclusivo: !!d.get('exclusivo'),
        descripcion: d.get('descripcion'),
        caracteristicas: String(d.get('caracteristicas') || '').split('\n'),
        colores: d.getAll('color'),
        fotos: fotos,
      };
      if (!esNuevo) cuerpo.slug = p.slug;

      var boton = $('#guardar');
      boton.disabled = true;
      boton.textContent = 'Guardando…';
      var peticion = esNuevo ? api('POST', '/productos', cuerpo) : api('PUT', '/productos/' + p.id, cuerpo);
      intentar(peticion).then(function () {
        location.hash = '#/productos';
      }).catch(function () {
        boton.disabled = false;
        boton.textContent = esNuevo ? 'Crear producto' : 'Guardar cambios';
      });
    });
  }

  /* Contadores de caracteres */
  function contadores(raiz) {
    $$('.contador', raiz).forEach(function (c) {
      // Dentro de SU propio campo, no el primero que aparezca en la tarjeta:
      // con varias diapositivas iguales, todos marcaban el mismo número.
      var caja = c.closest('.campo') || raiz;
      var campo = caja.querySelector('[name="' + c.dataset.para + '"]');
      if (!campo) return;
      var max = Number(campo.getAttribute('maxlength')) || 0;
      function pinta() {
        c.textContent = campo.value.length + (max ? ' / ' + max : '');
        c.classList.toggle('pasado', max && campo.value.length >= max);
      }
      campo.addEventListener('input', pinta);
      pinta();
    });
  }

  /* ═══ CATEGORÍAS Y MARCAS ═════════════════════════════════════════════ */
  function vistaTaxonomia(tabla, titulo, etiquetaImagen) {
    encabezar(titulo, 'Catálogo',
      '<button type="button" class="btn btn--primario" id="btn-nuevo">' + icono('i-mas') + ' Nueva</button>');
    cargando();
    api('GET', '/' + tabla).then(function (d) {
      contenido().innerHTML =
        '<div class="tarjeta"><p class="sub">Si cambias el nombre, los productos que la usan se actualizan solos.</p>' +
        (d.items.length
          ? '<div class="tabla-caja"><table><thead><tr><th>Nombre</th><th>Productos</th><th>Visible</th><th></th></tr></thead><tbody>' +
            d.items.map(function (x) {
              return '<tr data-id="' + x.id + '">' +
                '<td><b>' + esc(x.nombre) + '</b></td>' +
                '<td data-columna="Productos">' + x.productos + '</td>' +
                '<td data-columna="Visible">' + (x.visible ? '<span class="etiqueta etiqueta--ok">Sí</span>' : '<span class="etiqueta etiqueta--gris">Oculta</span>') + '</td>' +
                '<td class="acciones">' +
                '<button type="button" class="btn btn--linea btn--sm" data-editar>Editar</button>' +
                (puede('borrar') ? '<button type="button" class="btn btn--suave btn--sm" data-borrar style="color:var(--error)">Eliminar</button>' : '') +
                '</td></tr>';
            }).join('') + '</tbody></table></div>'
          : '<div class="vacio"><h3>Todavía no hay ninguna</h3></div>') +
        '</div>';

      function abrir(item) {
        var forma = document.createElement('div');
        forma.className = 'velo';
        forma.innerHTML = '<form class="dialogo" id="f-tax"><h2>' + (item ? 'Editar' : 'Nueva') + '</h2>' +
          campo('nombre', 'Nombre', item ? item.nombre : '', { max: 60, requerido: true }) +
          campo(etiquetaImagen, etiquetaImagen === 'logo' ? 'Logo (nombre de archivo)' : 'Imagen (nombre de archivo)',
            item ? item[etiquetaImagen] : '', { max: 300, ayuda: 'Opcional.' }) +
          interruptor('visible', 'Se muestra en la tienda', item ? !!item.visible : true) +
          '<div class="dialogo-botones"><button type="button" class="btn btn--linea" data-no>Cancelar</button>' +
          '<button type="submit" class="btn btn--primario">Guardar</button></div></form>';
        document.body.appendChild(forma);
        $('[name=nombre]', forma).focus();
        $('[data-no]', forma).addEventListener('click', function () { forma.remove(); });
        $('#f-tax', forma).addEventListener('submit', function (ev) {
          ev.preventDefault();
          var fd = new FormData(this);
          var cuerpo = { nombre: fd.get('nombre'), visible: !!fd.get('visible') };
          cuerpo[etiquetaImagen] = fd.get(etiquetaImagen);
          var peticion = item ? api('PUT', '/' + tabla + '/' + item.id, cuerpo) : api('POST', '/' + tabla, cuerpo);
          intentar(peticion).then(function () { forma.remove(); vistaTaxonomia(tabla, titulo, etiquetaImagen); });
        });
      }

      $('#btn-nuevo').addEventListener('click', function () { abrir(null); });
      $$('[data-editar]').forEach(function (b) {
        b.addEventListener('click', function () {
          abrir(d.items.filter(function (x) { return String(x.id) === b.closest('tr').dataset.id; })[0]);
        });
      });
      $$('[data-borrar]').forEach(function (b) {
        b.addEventListener('click', function () {
          var tr = b.closest('tr');
          var item = d.items.filter(function (x) { return String(x.id) === tr.dataset.id; })[0];
          function borrar(forzar) {
            return api('DELETE', '/' + tabla + '/' + item.id + (forzar ? '?forzar=1' : ''));
          }
          borrar(false).then(function (r) {
            avisar(r.mensaje);
            vistaTaxonomia(tabla, titulo, etiquetaImagen);
          }).catch(function (e) {
            if (e.datos && e.datos.requiereConfirmacion) {
              confirmar({
                titulo: '¿Eliminar de todos modos?',
                texto: e.message + ' Los productos NO se borran, pero se quedan sin ese dato y tendrás que asignarles otro.',
                aceptar: 'Sí, eliminar', peligro: true,
              }).then(function (si) {
                if (!si) return;
                intentar(borrar(true)).then(function () { vistaTaxonomia(tabla, titulo, etiquetaImagen); });
              });
            } else if (e.message !== 'sesion') avisar(e.message, 'error');
          });
        });
      });
    }).catch(errorDeCarga);
  }

  /* ═══ DESTACADOS ══════════════════════════════════════════════════════ */
  function vistaDestacados() {
    encabezar('Destacados', 'Catálogo');
    cargando();
    api('GET', '/productos').then(function (d) {
      var lista = d.productos;
      contenido().innerHTML =
        '<div class="tarjeta"><h2>Qué se muestra en la portada</h2>' +
        '<p class="sub">Marca las gorras que quieres resaltar. Los cambios se ven en la tienda al instante.</p>' +
        '<div class="tabla-caja"><table><thead><tr><th style="width:60px"></th><th>Producto</th>' +
        '<th style="width:110px">Destacado</th><th style="width:90px">Nuevo</th><th style="width:110px">Exclusivo</th></tr></thead><tbody>' +
        lista.map(function (p) {
          var foto = p.imagenes && p.imagenes[0]
            ? '<img class="miniatura" src="/assets/img/' + esc(p.imagenes[0]) + '-160.webp" alt="" loading="lazy">'
            : '<div class="sin-foto">—</div>';
          return '<tr data-id="' + p.id + '"><td>' + foto + '</td>' +
            '<td><b>' + esc(p.nombre) + '</b>' + (p.estado === 'oculto' ? ' <span class="etiqueta etiqueta--gris">oculto</span>' : '') + '</td>' +
            ['destacado', 'nuevo', 'exclusivo'].map(function (k) {
              return '<td data-columna="' + k.charAt(0).toUpperCase() + k.slice(1) + '">' +
                '<label class="interruptor" style="margin:0"><input type="checkbox" data-campo="' + k + '"' +
                (p[k] ? ' checked' : '') + '></label></td>';
            }).join('') + '</tr>';
        }).join('') + '</tbody></table></div></div>';

      $$('#contenido [data-campo]').forEach(function (c) {
        c.addEventListener('change', function () {
          var id = c.closest('tr').dataset.id;
          var cuerpo = {};
          cuerpo[c.dataset.campo] = c.checked;
          api('PATCH', '/productos/' + id, cuerpo)
            .then(function () { avisar('Actualizado.'); })
            .catch(function (e) { c.checked = !c.checked; if (e.message !== 'sesion') avisar(e.message, 'error'); });
        });
      });
    }).catch(errorDeCarga);
  }

  /* ═══ BLOQUES DE CONTENIDO (formularios generados) ════════════════════ */
  function guardarBloque(clave, valor, despues) {
    return intentar(api('PUT', '/ajustes/' + clave, { valor: valor })).then(despues || function () {});
  }

  function vistaInicio() {
    encabezar('Página de inicio', 'Contenido');
    cargando();
    Promise.all([
      api('GET', '/ajustes/carrusel'), api('GET', '/ajustes/confianza'),
      api('GET', '/ajustes/pasos'), api('GET', '/ajustes/faq'),
      api('GET', '/ajustes/carruselSegundos'), cargarOpciones(),
    ]).then(function (r) {
      var carrusel = r[0].valor || [];
      var confianza = r[1].valor || [];
      var pasos = r[2].valor || [];
      var faq = r[3].valor || [];
      var segundos = r[4].valor;

      contenido().innerHTML =
        '<div class="tarjeta"><h2>Carrusel de la portada</h2>' +
        '<p class="sub">Lo primero que ve quien entra. Máximo 8 diapositivas.</p>' +
        '<div id="carrusel"></div>' +
        '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">' +
        '<button type="button" class="btn btn--linea" id="add-dia">+ Añadir diapositiva</button>' +
        '<label class="campo" style="margin:0 0 0 auto"><span>Segundos por diapositiva</span>' +
        '<input type="number" id="segundos" min="0" max="30" value="' + esc(segundos) + '" style="width:110px"></label>' +
        '</div>' +
        '<div style="margin-top:14px;text-align:right"><button type="button" class="btn btn--primario" id="g-carrusel">Guardar carrusel</button></div>' +
        '</div>' +

        bloqueLista('confianza', 'Bloques de confianza', 'Las cuatro razones para comprarte. Solo lo que puedas sostener.', confianza,
          [{ n: 'titulo', e: 'Título', max: 40 }, { n: 'texto', e: 'Texto', max: 140 }]) +

        bloqueLista('pasos', 'Cómo comprar', 'Los pasos que ve el cliente.', pasos,
          [{ n: 'titulo', e: 'Título', max: 40 }, { n: 'texto', e: 'Texto', max: 160 }]) +

        bloqueLista('faq', 'Preguntas frecuentes', 'Salen en la portada y también las lee Google.', faq,
          [{ n: 'p', e: 'Pregunta', max: 140 }, { n: 'r', e: 'Respuesta', max: 700, area: true }]);

      pintarCarrusel();
      function pintarCarrusel() {
        $('#carrusel').innerHTML = carrusel.map(function (s, i) {
          return '<div class="tarjeta" style="background:var(--papel);box-shadow:none;margin-bottom:10px" data-dia="' + i + '">' +
            '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">' +
            '<b style="font-size:13px">Diapositiva ' + (i + 1) + '</b>' +
            '<div class="mover" style="margin-left:auto;display:flex;gap:4px">' +
            '<button type="button" class="btn btn--linea btn--sm" data-sube ' + (i === 0 ? 'disabled' : '') + '>↑</button>' +
            '<button type="button" class="btn btn--linea btn--sm" data-baja ' + (i === carrusel.length - 1 ? 'disabled' : '') + '>↓</button>' +
            '<button type="button" class="btn btn--suave btn--sm" data-quita style="color:var(--error)">Quitar</button>' +
            '</div></div>' +
            (s.imagen
              ? campo('imagen', 'Foto de fondo', s.imagen, { max: 200, ayuda: 'Nombre del archivo en assets/img, sin el -760.webp' }) +
                '<div class="fila fila--2">' +
                campo('posicion', 'Encuadre', s.posicion || '50% 42%', { max: 20 }) +
                campo('difuminado', 'Desenfoque (px)', s.difuminado || 0, { tipo: 'number' }) + '</div>' +
                campo('enlace', 'Enlace del botón', s.enlace || 'catalogo.html', { max: 200 })
              : select('producto', 'Producto', s.producto, OPCIONES.productos.map(function (x) { return x.slug; }), true)) +
            campo('eyebrow', 'Rótulo pequeño', s.eyebrow, { max: 60 }) +
            campo('titulo', 'Título', s.titulo, { max: 60, requerido: true }) +
            campo('texto', 'Frase corta', s.texto, { max: 140 }) +
            campo('cta', 'Texto del botón', s.cta || 'Comprar ahora', { max: 30 }) +
            '</div>';
        }).join('');
        contadores($('#carrusel'));
        $$('#carrusel [data-dia]').forEach(function (el) {
          var i = Number(el.dataset.dia);
          $('[data-sube]', el).addEventListener('click', function () { leerCarrusel(); var x = carrusel.splice(i, 1)[0]; carrusel.splice(i - 1, 0, x); pintarCarrusel(); });
          $('[data-baja]', el).addEventListener('click', function () { leerCarrusel(); var x = carrusel.splice(i, 1)[0]; carrusel.splice(i + 1, 0, x); pintarCarrusel(); });
          $('[data-quita]', el).addEventListener('click', function () { leerCarrusel(); carrusel.splice(i, 1); pintarCarrusel(); });
        });
      }

      function leerCarrusel() {
        $$('#carrusel [data-dia]').forEach(function (el, i) {
          var s = carrusel[i];
          $$('input, select', el).forEach(function (c) {
            if (!c.name) return;
            s[c.name] = c.type === 'number' ? Number(c.value) : c.value;
          });
        });
      }

      $('#add-dia').addEventListener('click', function () {
        leerCarrusel();
        carrusel.push({ producto: (OPCIONES.productos[0] || {}).slug || '', titulo: '', cta: 'Comprar ahora' });
        pintarCarrusel();
      });

      $('#g-carrusel').addEventListener('click', function () {
        leerCarrusel();
        var boton = this;
        boton.disabled = true;
        boton.textContent = 'Guardando…';
        // Un solo aviso y SOLO si las dos cosas se guardaron de verdad: antes
        // salía el visto verde del primer guardado aunque el segundo fallara.
        api('PUT', '/ajustes/carruselSegundos', { valor: Number($('#segundos').value) || 0 })
          .then(function () { return api('PUT', '/ajustes/carrusel', { valor: carrusel }); })
          .then(function () { avisar('Carrusel guardado correctamente.'); })
          .catch(function (e) { if (e.message !== 'sesion') avisar(e.message, 'error'); })
          .then(function () { boton.disabled = false; boton.textContent = 'Guardar carrusel'; });
      });

      engancharBloques({ confianza: confianza, pasos: pasos, faq: faq });
    }).catch(errorDeCarga);
  }

  /* Genera una tarjeta con una lista editable de objetos simples */
  function bloqueLista(clave, titulo, sub, datos, campos) {
    return '<div class="tarjeta" data-bloque="' + clave + '"><h2>' + esc(titulo) + '</h2><p class="sub">' + esc(sub) + '</p>' +
      '<div class="lista"></div>' +
      '<div style="display:flex;gap:8px;margin-top:12px;justify-content:space-between;flex-wrap:wrap">' +
      '<button type="button" class="btn btn--linea" data-add>+ Añadir</button>' +
      '<button type="button" class="btn btn--primario" data-guardar>Guardar</button></div>' +
      '<script type="application/json" data-campos>' + JSON.stringify(campos) + '</' + 'script></div>';
  }

  function engancharBloques(datos) {
    $$('[data-bloque]').forEach(function (caja) {
      var clave = caja.dataset.bloque;
      var lista = datos[clave];
      var campos = JSON.parse($('[data-campos]', caja).textContent);

      function pinta() {
        $('.lista', caja).innerHTML = lista.map(function (item, i) {
          return '<div class="tarjeta" style="background:var(--papel);box-shadow:none;margin-bottom:10px" data-i="' + i + '">' +
            '<div style="display:flex;gap:4px;justify-content:flex-end;margin-bottom:6px">' +
            '<button type="button" class="btn btn--linea btn--sm" data-sube ' + (i === 0 ? 'disabled' : '') + '>↑</button>' +
            '<button type="button" class="btn btn--linea btn--sm" data-baja ' + (i === lista.length - 1 ? 'disabled' : '') + '>↓</button>' +
            '<button type="button" class="btn btn--suave btn--sm" data-quita style="color:var(--error)">Quitar</button></div>' +
            campos.map(function (c) {
              return c.area
                ? area(c.n, c.e, item[c.n], c.max)
                : campo(c.n, c.e, item[c.n], { max: c.max, requerido: true });
            }).join('') + '</div>';
        }).join('');
        contadores(caja);
        $$('.lista [data-i]', caja).forEach(function (el) {
          var i = Number(el.dataset.i);
          $('[data-sube]', el).addEventListener('click', function () { leer(); var x = lista.splice(i, 1)[0]; lista.splice(i - 1, 0, x); pinta(); });
          $('[data-baja]', el).addEventListener('click', function () { leer(); var x = lista.splice(i, 1)[0]; lista.splice(i + 1, 0, x); pinta(); });
          $('[data-quita]', el).addEventListener('click', function () { leer(); lista.splice(i, 1); pinta(); });
        });
      }

      function leer() {
        $$('.lista [data-i]', caja).forEach(function (el, i) {
          campos.forEach(function (c) {
            var campo = el.querySelector('[name="' + c.n + '"]');
            if (campo) lista[i][c.n] = campo.value;
          });
        });
      }

      $('[data-add]', caja).addEventListener('click', function () {
        leer();
        var nuevo = {};
        campos.forEach(function (c) { nuevo[c.n] = ''; });
        if (clave === 'confianza') nuevo.icono = 'carrito';
        lista.push(nuevo);
        pinta();
      });
      $('[data-guardar]', caja).addEventListener('click', function () {
        leer();
        guardarBloque(clave, lista);
      });
      pinta();
    });
  }

  /* ═══ BANNERS ═════════════════════════════════════════════════════════ */
  function vistaBanners() {
    encabezar('Banners', 'Contenido',
      '<button type="button" class="btn btn--primario" id="btn-nuevo">' + icono('i-mas') + ' Nuevo banner</button>');
    cargando();
    api('GET', '/banners').then(function (d) {
      contenido().innerHTML = '<div class="tarjeta">' +
        '<p class="sub">Un banner desactivado no se muestra en la tienda.</p>' +
        (d.items.length
          ? '<div class="tabla-caja"><table><thead><tr><th>Título</th><th>Texto</th><th>Activo</th><th></th></tr></thead><tbody>' +
            d.items.map(function (b) {
              return '<tr data-id="' + b.id + '"><td><b>' + esc(b.titulo || '—') + '</b></td>' +
                '<td data-columna="Texto">' + esc((b.texto || '').slice(0, 60)) + '</td>' +
                '<td data-columna="Activo">' + (b.activo ? '<span class="etiqueta etiqueta--ok">Sí</span>' : '<span class="etiqueta etiqueta--gris">No</span>') + '</td>' +
                '<td class="acciones"><button type="button" class="btn btn--linea btn--sm" data-editar>Editar</button>' +
                '<button type="button" class="btn btn--suave btn--sm" data-borrar style="color:var(--error)">Eliminar</button></td></tr>';
            }).join('') + '</tbody></table></div>'
          : '<div class="vacio"><h3>Todavía no hay banners</h3><p>Créalos cuando tengas una promoción que anunciar.</p></div>') +
        '</div>';

      function abrir(b) {
        b = b || { titulo: '', texto: '', imagen: '', boton: '', enlace: '', activo: 1 };
        var velo = document.createElement('div');
        velo.className = 'velo';
        velo.innerHTML = '<form class="dialogo" style="max-width:480px"><h2>' + (b.id ? 'Editar' : 'Nuevo') + ' banner</h2>' +
          campo('titulo', 'Título', b.titulo, { max: 80 }) +
          area('texto', 'Texto', b.texto, 200) +
          campo('imagen', 'Imagen', b.imagen, { max: 300, ayuda: 'Nombre del archivo en assets/img.' }) +
          '<div class="fila fila--2">' + campo('boton', 'Texto del botón', b.boton, { max: 30 }) +
          campo('enlace', 'Enlace', b.enlace, { max: 300 }) + '</div>' +
          interruptor('activo', 'Se muestra en la tienda', !!b.activo) +
          '<div class="dialogo-botones"><button type="button" class="btn btn--linea" data-no>Cancelar</button>' +
          '<button type="submit" class="btn btn--primario">Guardar</button></div></form>';
        document.body.appendChild(velo);
        $('[data-no]', velo).addEventListener('click', function () { velo.remove(); });
        $('form', velo).addEventListener('submit', function (ev) {
          ev.preventDefault();
          var fd = new FormData(this);
          var cuerpo = {
            titulo: fd.get('titulo'), texto: fd.get('texto'), imagen: fd.get('imagen'),
            boton: fd.get('boton'), enlace: fd.get('enlace'), activo: !!fd.get('activo'),
          };
          intentar(b.id ? api('PUT', '/banners/' + b.id, cuerpo) : api('POST', '/banners', cuerpo))
            .then(function () { velo.remove(); vistaBanners(); });
        });
      }

      $('#btn-nuevo').addEventListener('click', function () { abrir(null); });
      $$('[data-editar]').forEach(function (x) {
        x.addEventListener('click', function () {
          abrir(d.items.filter(function (b) { return String(b.id) === x.closest('tr').dataset.id; })[0]);
        });
      });
      $$('[data-borrar]').forEach(function (x) {
        x.addEventListener('click', function () {
          confirmar({ titulo: '¿Eliminar el banner?', texto: 'Dejará de mostrarse en la tienda.', aceptar: 'Sí, eliminar', peligro: true })
            .then(function (si) {
              if (!si) return;
              intentar(api('DELETE', '/banners/' + x.closest('tr').dataset.id)).then(vistaBanners);
            });
        });
      });
    }).catch(errorDeCarga);
  }

  /* ═══ CONTACTO ════════════════════════════════════════════════════════ */
  function vistaContacto() {
    encabezar('Contacto', 'Contenido');
    cargando();
    Promise.all([api('GET', '/ajustes/whatsapp'), api('GET', '/ajustes/identidad')]).then(function (r) {
      var w = r[0].valor;
      var id = r[1].valor;
      contenido().innerHTML =
        '<form class="tarjeta" id="f-wa"><h2>WhatsApp</h2>' +
        '<p class="sub">Cambiar el número aquí actualiza TODOS los botones de la tienda: header, menú, fichas, carrito y pie de página. No hay que tocar nada más.</p>' +
        '<div class="fila fila--2">' +
        campo('numero', 'Número (formato internacional, sin +)', w.numero, { max: 20, requerido: true, ayuda: '57 para Colombia. Ej: 573222544571' }) +
        campo('visible', 'Cómo se muestra', w.visible, { max: 30, requerido: true, ayuda: 'Ej: 322 254 4571' }) +
        '</div><div style="text-align:right"><button class="btn btn--primario">Guardar WhatsApp</button></div></form>' +

        '<form class="tarjeta" id="f-id"><h2>Datos del negocio</h2>' +
        '<div class="fila fila--2">' +
        campo('marca', 'Nombre del negocio', id.marca, { max: 60, requerido: true }) +
        campo('razonSocial', 'Razón social', id.razonSocial, { max: 90 }) +
        '</div><div class="fila fila--3">' +
        campo('ciudad', 'Ciudad', id.ciudad, { max: 60, requerido: true }) +
        campo('region', 'Departamento', id.region, { max: 60 }) +
        campo('correo', 'Correo (opcional)', id.correo, { tipo: 'email', max: 160 }) +
        '</div>' +
        campo('direccion', 'Dirección (opcional)', id.direccion, { max: 160, ayuda: 'Solo si algún día abres punto físico.' }) +
        area('descripcionCorta', 'Descripción corta', id.descripcionCorta, 180, 'Sale en el pie de página y en los buscadores.') +
        '<div style="text-align:right"><button class="btn btn--primario">Guardar datos</button></div></form>';
      contadores(contenido());

      $('#f-wa').addEventListener('submit', function (ev) {
        ev.preventDefault();
        var fd = new FormData(this);
        guardarBloque('whatsapp', { numero: fd.get('numero'), visible: fd.get('visible') });
      });
      $('#f-id').addEventListener('submit', function (ev) {
        ev.preventDefault();
        var fd = new FormData(this);
        guardarBloque('identidad', {
          marca: fd.get('marca'), razonSocial: fd.get('razonSocial'), ciudad: fd.get('ciudad'),
          region: fd.get('region'), pais: id.pais, correo: fd.get('correo'),
          direccion: fd.get('direccion'), descripcionCorta: fd.get('descripcionCorta'),
        });
      });
    }).catch(errorDeCarga);
  }

  /* ═══ REDES ═══════════════════════════════════════════════════════════ */
  function vistaRedes() {
    encabezar('Redes sociales', 'Contenido');
    cargando();
    api('GET', '/ajustes/redes').then(function (d) {
      var r = d.valor;
      var redes = [['instagram', 'Instagram'], ['tiktok', 'TikTok'], ['facebook', 'Facebook']];
      contenido().innerHTML = '<form class="tarjeta" id="f-redes"><h2>Enlaces</h2>' +
        '<p class="sub">Una red apagada, o sin enlace, no se muestra en la tienda. No quedan botones vacíos.</p>' +
        redes.map(function (x) {
          var v = r[x[0]] || { usuario: '', url: '', activa: false };
          return '<div class="tarjeta" style="background:var(--papel);box-shadow:none;margin-bottom:10px">' +
            '<b style="font-size:14px">' + x[1] + '</b>' +
            '<div class="fila fila--2" style="margin-top:8px">' +
            campo(x[0] + '-usuario', 'Usuario', v.usuario, { max: 60, ayuda: 'Sin la @' }) +
            campo(x[0] + '-url', 'Enlace', v.url, { max: 300, ayuda: 'Dirección completa, empezando por https://' }) +
            '</div>' + interruptor(x[0] + '-activa', 'Mostrar en la tienda', v.activa) + '</div>';
        }).join('') +
        '<div style="text-align:right"><button class="btn btn--primario">Guardar redes</button></div></form>';

      $('#f-redes').addEventListener('submit', function (ev) {
        ev.preventDefault();
        var fd = new FormData(this);
        var valor = {};
        redes.forEach(function (x) {
          valor[x[0]] = {
            usuario: fd.get(x[0] + '-usuario'),
            url: fd.get(x[0] + '-url'),
            activa: !!fd.get(x[0] + '-activa'),
          };
        });
        guardarBloque('redes', valor);
      });
    }).catch(errorDeCarga);
  }

  /* ═══ PEDIDOS ═════════════════════════════════════════════════════════ */
  function vistaPedidos() {
    encabezar('Pedidos', 'Tienda');
    cargando();
    api('GET', '/pedidos').then(function (d) {
      contenido().innerHTML = '<div class="tarjeta">' +
        '<p class="sub">Cada vez que un cliente cierra su pedido por WhatsApp queda registrado aquí.</p>' +
        (d.items.length
          ? '<div class="tabla-caja"><table><thead><tr><th>Referencia</th><th>Fecha</th><th>Cliente</th><th>Productos</th><th>Total</th><th>Estado</th></tr></thead><tbody>' +
            d.items.map(function (p) {
              return '<tr data-id="' + p.id + '"><td><b>' + esc(p.referencia) + '</b></td>' +
                '<td data-columna="Fecha">' + esc(fecha(p.fecha)) + '</td>' +
                '<td data-columna="Cliente">' + esc(p.cliente || '—') + '<br><small style="color:var(--tx-3)">' + esc(p.telefono || '') + '</small></td>' +
                '<td data-columna="Pidió"><small>' + p.items.map(function (i) { return esc(i.cantidad + '× ' + i.nombre); }).join('<br>') + '</small></td>' +
                '<td data-columna="Total">' + precioTexto(p.total) + '</td>' +
                '<td data-columna="Estado"><select data-estado>' + d.estados.map(function (e) {
                  return '<option' + (p.estado === e ? ' selected' : '') + '>' + e + '</option>';
                }).join('') + '</select></td></tr>';
            }).join('') + '</tbody></table></div>'
          : '<div class="vacio"><h3>Todavía no hay pedidos</h3><p>Aparecerán aquí en cuanto un cliente cierre uno desde la tienda.</p></div>') +
        '</div>';

      $$('[data-estado]').forEach(function (s) {
        s.addEventListener('change', function () {
          var id = s.closest('tr').dataset.id;
          intentar(api('PATCH', '/pedidos/' + id, { estado: s.value })).catch(function () { vistaPedidos(); });
        });
      });
    }).catch(errorDeCarga);
  }

  /* ═══ CONFIGURACIÓN ═══════════════════════════════════════════════════ */
  function vistaConfig() {
    encabezar('Configuración', 'Tienda');
    cargando();
    Promise.all([api('GET', '/ajustes/sitio'), api('GET', '/ajustes/seo'), api('GET', '/ajustes/checkout')]).then(function (r) {
      var sitio = r[0].valor, seo = r[1].valor, che = r[2].valor;
      contenido().innerHTML =
        '<form class="tarjeta" id="f-sitio"><h2>Dirección del sitio</h2>' +
        '<p class="sub">Se usa en los enlaces que Google lee y en los que van dentro del mensaje de WhatsApp. Cámbiala cuando compres el dominio.</p>' +
        campo('url', 'Dirección', sitio.url, { max: 300, requerido: true, ayuda: 'Ej: https://exclusivecapsmed.com' }) +
        '<div style="text-align:right"><button class="btn btn--primario">Guardar</button></div></form>' +

        '<form class="tarjeta" id="f-seo"><h2>Buscadores</h2>' +
        '<p class="sub">Cómo se ve la tienda en Google. Si los dejas vacíos se usan los textos por defecto.</p>' +
        campo('titulo', 'Título', seo.titulo, { max: 65, ayuda: 'Máximo 65 caracteres o Google lo corta.' }) +
        area('descripcion', 'Descripción', seo.descripcion, 165, 'Máximo 165 caracteres.') +
        campo('imagen', 'Imagen al compartir', seo.imagen, { max: 300, ayuda: 'Opcional.' }) +
        '<div style="text-align:right"><button class="btn btn--primario">Guardar</button></div></form>' +

        '<form class="tarjeta" id="f-che"><h2>Datos que se le piden al cliente</h2>' +
        '<p class="sub">Antes de armar el mensaje de WhatsApp.</p>' +
        interruptor('pedirCiudad', 'Pedir la ciudad', che.pedirCiudad) +
        interruptor('pedirDireccion', 'Pedir la dirección', che.pedirDireccion) +
        interruptor('pedirNota', 'Permitir dejar una nota', che.pedirNota) +
        '<div style="text-align:right"><button class="btn btn--primario">Guardar</button></div></form>';
      contadores(contenido());

      $('#f-sitio').addEventListener('submit', function (ev) {
        ev.preventDefault(); guardarBloque('sitio', { url: new FormData(this).get('url') });
      });
      $('#f-seo').addEventListener('submit', function (ev) {
        ev.preventDefault();
        var fd = new FormData(this);
        guardarBloque('seo', { titulo: fd.get('titulo'), descripcion: fd.get('descripcion'), imagen: fd.get('imagen') });
      });
      $('#f-che').addEventListener('submit', function (ev) {
        ev.preventDefault();
        var fd = new FormData(this);
        guardarBloque('checkout', {
          pedirCiudad: !!fd.get('pedirCiudad'), pedirDireccion: !!fd.get('pedirDireccion'), pedirNota: !!fd.get('pedirNota'),
        });
      });
    }).catch(errorDeCarga);
  }

  /* ═══ USUARIOS ════════════════════════════════════════════════════════ */
  function vistaUsuarios() {
    encabezar('Administradores', 'Tienda',
      '<button type="button" class="btn btn--primario" id="btn-nuevo">' + icono('i-mas') + ' Nuevo usuario</button>');
    cargando();
    api('GET', '/usuarios').then(function (d) {
      contenido().innerHTML = '<div class="tarjeta">' +
        '<p class="sub">Un <b>administrador</b> puede todo. Un <b>editor</b> puede cambiar productos y contenido, pero no borrar ni tocar la configuración o los usuarios.</p>' +
        '<div class="tabla-caja"><table><thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Último acceso</th><th></th></tr></thead><tbody>' +
        d.items.map(function (u) {
          return '<tr data-id="' + u.id + '"><td><b>' + esc(u.nombre) + '</b>' + (u.id === YO.id ? ' <span class="etiqueta etiqueta--azul">tú</span>' : '') + '</td>' +
            '<td data-columna="Correo">' + esc(u.correo) + '</td>' +
            '<td data-columna="Rol"><span class="etiqueta etiqueta--' + (u.rol === 'admin' ? 'azul' : 'gris') + '">' + esc(u.rol) + '</span>' +
            (u.activo ? '' : ' <span class="etiqueta etiqueta--gris">inactivo</span>') + '</td>' +
            '<td data-columna="Entró">' + esc(u.ultimo_acceso ? fecha(u.ultimo_acceso) : 'nunca') + '</td>' +
            '<td class="acciones"><button type="button" class="btn btn--linea btn--sm" data-clave>Contraseña</button>' +
            (u.id === YO.id ? '' : '<button type="button" class="btn btn--suave btn--sm" data-borrar style="color:var(--error)">Eliminar</button>') +
            '</td></tr>';
        }).join('') + '</tbody></table></div></div>';

      $('#btn-nuevo').addEventListener('click', function () {
        var velo = document.createElement('div');
        velo.className = 'velo';
        velo.innerHTML = '<form class="dialogo"><h2>Nuevo usuario</h2>' +
          campo('nombre', 'Nombre', '', { max: 80, requerido: true }) +
          campo('correo', 'Correo', '', { tipo: 'email', max: 160, requerido: true }) +
          campo('clave', 'Contraseña', '', { tipo: 'text', max: 80, requerido: true, ayuda: 'Mínimo 10 caracteres, con letras y números.' }) +
          select('rol', 'Rol', 'editor', ['editor', 'admin'], true) +
          '<div class="dialogo-botones"><button type="button" class="btn btn--linea" data-no>Cancelar</button>' +
          '<button type="submit" class="btn btn--primario">Crear</button></div></form>';
        document.body.appendChild(velo);
        $('[data-no]', velo).addEventListener('click', function () { velo.remove(); });
        $('form', velo).addEventListener('submit', function (ev) {
          ev.preventDefault();
          var fd = new FormData(this);
          intentar(api('POST', '/usuarios', {
            nombre: fd.get('nombre'), correo: fd.get('correo'), clave: fd.get('clave'), rol: fd.get('rol'),
          })).then(function () { velo.remove(); vistaUsuarios(); });
        });
      });

      $$('[data-clave]').forEach(function (b) {
        b.addEventListener('click', function () {
          var id = b.closest('tr').dataset.id;
          var esYo = Number(id) === YO.id;
          var velo = document.createElement('div');
          velo.className = 'velo';
          velo.innerHTML = '<form class="dialogo"><h2>Cambiar contraseña</h2>' +
            (esYo ? campo('claveActual', 'Tu contraseña actual', '', { tipo: 'password', requerido: true }) : '') +
            campo('clave', 'Contraseña nueva', '', { tipo: 'text', max: 80, requerido: true, ayuda: 'Mínimo 10 caracteres, con letras y números.' }) +
            (esYo ? '<p class="aviso aviso--info">Al cambiarla tendrás que volver a entrar.</p>' : '') +
            '<div class="dialogo-botones"><button type="button" class="btn btn--linea" data-no>Cancelar</button>' +
            '<button type="submit" class="btn btn--primario">Cambiar</button></div></form>';
          document.body.appendChild(velo);
          $('[data-no]', velo).addEventListener('click', function () { velo.remove(); });
          $('form', velo).addEventListener('submit', function (ev) {
            ev.preventDefault();
            var fd = new FormData(this);
            intentar(api('PUT', '/usuarios/' + id, { clave: fd.get('clave'), claveActual: fd.get('claveActual') }))
              .then(function (r) {
                velo.remove();
                if (r.volverAEntrar) setTimeout(function () { location.href = '/admin/login'; }, 1200);
                else vistaUsuarios();
              });
          });
        });
      });

      $$('[data-borrar]').forEach(function (b) {
        b.addEventListener('click', function () {
          var tr = b.closest('tr');
          confirmar({
            titulo: '¿Eliminar este usuario?',
            texto: 'Perderá el acceso al panel inmediatamente.',
            aceptar: 'Sí, eliminar', peligro: true,
          }).then(function (si) {
            if (!si) return;
            intentar(api('DELETE', '/usuarios/' + tr.dataset.id)).then(vistaUsuarios);
          });
        });
      });
    }).catch(errorDeCarga);
  }

  /* ═══ ENRUTADO ════════════════════════════════════════════════════════ */
  function ir() {
    var ruta = (location.hash || '#/tablero').replace(/^#\/?/, '').split('/');
    var seccion = ruta[0] || 'tablero';
    marcarNav(seccion);
    cerrarLateral();
    window.scrollTo(0, 0);

    var def = SECCIONES.filter(function (s) { return s.id === seccion; })[0];
    if (def && def.permiso && !puede(def.permiso)) {
      contenido().innerHTML = '<div class="tarjeta"><div class="vacio"><h3>Sin permiso</h3>' +
        '<p>Tu usuario no tiene acceso a esta sección.</p></div></div>';
      encabezar('Sin permiso', 'Panel');
      return;
    }

    switch (seccion) {
      case 'productos': return vistaProductos();
      case 'producto': return vistaProducto(ruta[1]);
      case 'tipos': return vistaTaxonomia('tipos', 'Categorías', 'imagen');
      case 'marcas': return vistaTaxonomia('marcas', 'Marcas', 'logo');
      case 'destacados': return vistaDestacados();
      case 'inicio': return vistaInicio();
      case 'banners': return vistaBanners();
      case 'contacto': return vistaContacto();
      case 'redes': return vistaRedes();
      case 'pedidos': return vistaPedidos();
      case 'config': return vistaConfig();
      case 'usuarios': return vistaUsuarios();
      default: return vistaTablero();
    }
  }

  /* ── Menú en móvil ────────────────────────────────────────────────────── */
  function cerrarLateral() {
    $('#lateral').classList.remove('abierto');
    $('#btn-menu').setAttribute('aria-expanded', 'false');
    var velo = $('.velo-lateral');
    if (velo) velo.remove();
  }

  function abrirLateral() {
    $('#lateral').classList.add('abierto');
    $('#btn-menu').setAttribute('aria-expanded', 'true');
    var velo = document.createElement('div');
    velo.className = 'velo-lateral';
    velo.addEventListener('click', cerrarLateral);
    document.body.appendChild(velo);
  }

  /* ── Arranque ─────────────────────────────────────────────────────────── */
  api('GET', '/yo').then(function (d) {
    YO = d.usuario;
    PERMISOS = d.permisos;
    $('#quien-nombre').textContent = YO.nombre;
    $('#quien-rol').textContent = YO.rol === 'admin' ? 'Administrador' : 'Editor';
    return api('GET', '/resumen').catch(function () { return { resumen: {} }; });
  }).then(function (d) {
    pintarNav(d.resumen);
    window.addEventListener('hashchange', ir);
    ir();
  }).catch(function (e) {
    if (e.message !== 'sesion') {
      contenido().innerHTML = '<div class="tarjeta"><div class="vacio"><h3>No pudimos abrir el panel</h3><p>' +
        esc(e.message) + '</p></div></div>';
    }
  });

  // El enlace a la sección actual no cambia el hash, así que "ir" no corre y
  // el cajón se quedaba abierto tapando la pantalla.
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest ? ev.target.closest('#nav a[data-seccion]') : null;
    if (a) cerrarLateral();
  });

  $('#btn-menu').addEventListener('click', function () {
    if ($('#lateral').classList.contains('abierto')) cerrarLateral();
    else abrirLateral();
  });

  $('#btn-salir').addEventListener('click', function () {
    confirmar({ titulo: '¿Cerrar sesión?', texto: 'Tendrás que volver a escribir tu correo y tu contraseña.', aceptar: 'Cerrar sesión' })
      .then(function (si) {
        if (!si) return;
        api('POST', '/salir').then(function () { location.href = '/admin/login'; })
          .catch(function () { location.href = '/admin/login'; });
      });
  });
})();
