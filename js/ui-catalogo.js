/* ═══════════════════════════════════════════════════════════════════════════
   EXCLUSIVE CAPS MED · catálogo
   Tarjeta de producto · rejilla · buscador · filtros · orden · estados vacíos
   El estado vive en la URL, así un catálogo filtrado se puede compartir.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var ECM = (window.ECM = window.ECM || {});
  var u = ECM.u;
  var CONFIG = ECM.CONFIG;

  // ¿El dispositivo tiene cursor? Decide si vale la pena cargar la 2ª foto.
  var HAY_CURSOR = !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);

  /* ═══ Tarjeta ═════════════════════════════════════════════════════════ */
  function tarjeta(p, ops) {
    ops = ops || {};
    var agotado = !p.disponible;
    var url = u.urlProducto(p);

    var insignias = [];
    if (agotado) insignias.push('<span class="insignia insignia--agotado">Agotado</span>');
    else if (p.exclusivo) insignias.push('<span class="insignia insignia--exclusivo">Exclusivo</span>');
    else if (p.nuevo) insignias.push('<span class="insignia insignia--nuevo">Nuevo</span>');
    else if (p.destacado) insignias.push('<span class="insignia insignia--destacado">Destacado</span>');

    var alt = p.nombre + ' — gorra ' + p.tipo.toLowerCase() + ' ' + p.marca +
              ' color ' + (p.colores || []).join(' y ').toLowerCase();

    // La segunda foto solo existe donde hay cursor de verdad: en táctil nunca
    // llega a mostrarse (el efecto es :hover) y sin esto se descargaba igual.
    var alterna = (p.imagenes[1] && HAY_CURSOR)
      ? u.figura(p.imagenes[1], p.nombre + ' — vista alterna', { claseCaja: 'foto--alt' })
      : '';

    var precio = u.tienePrecio(p)
      ? '<p class="card-precio cifra">' +
          (p.precioAntes && p.precioAntes > p.precio
            ? '<span class="antes">' + u.formatoPrecio(p.precioAntes) + '</span>' : '') +
          u.formatoPrecio(p.precio) + '</p>'
      : '<p class="card-consultar">Precio por WhatsApp</p>';

    var boton = agotado ? '' :
      '<button type="button" class="card-add" data-agregar="' + p.id + '"' +
      ' aria-label="Agregar ' + u.esc(p.nombre) + ' al carrito">' + u.icono('i-mas') + '</button>';

    // El botón vive en .card-media (no dentro del enlace: un <button> dentro
    // de un <a> es HTML inválido) para que se ancle al pie de la foto y nunca
    // se monte encima del precio.
    return (
      '<article class="card' + (agotado ? ' agotado' : '') + '">' +
        '<div class="card-media">' +
          '<a class="card-foto" href="' + url + '" tabindex="-1" aria-hidden="true">' +
            u.figura(p.imagenes[0], alt, { prioridad: !!ops.prioridad }) + alterna +
          '</a>' +
          (insignias.length ? '<div class="card-insignias">' + insignias.join('') + '</div>' : '') +
          boton +
        '</div>' +
        '<div class="card-cuerpo">' +
          '<span class="card-marca">' + u.esc(p.marca) + '</span>' +
          '<h3 class="card-nombre"><a href="' + url + '">' + u.esc(p.nombre) + '</a></h3>' +
          precio +
        '</div>' +
      '</article>'
    );
  }

  function pintarRejilla(contenedor, lista, cuantasPrioritarias) {
    contenedor.innerHTML = lista.map(function (p, i) {
      return tarjeta(p, { prioridad: i < (cuantasPrioritarias || 0) });
    }).join('');
    u.activarFotos(contenedor);
  }

  /* ═══ Estado de los filtros ═══════════════════════════════════════════ */
  var estado = {
    marcas: [], tipos: [], colores: [],
    q: '',
    orden: 'recientes',
    soloDisponibles: false,
  };
  // Copia provisional mientras el panel está abierto (móvil)
  var borrador = null;

  function claves() { return ['marcas', 'tipos', 'colores']; }

  function contarActivos(e) {
    return e.marcas.length + e.tipos.length + e.colores.length + (e.soloDisponibles ? 1 : 0);
  }

  /* ═══ Filtrado ════════════════════════════════════════════════════════ */
  function textoBuscable(p) {
    if (!p._buscable) {
      p._buscable = u.normalizar([
        p.nombre, p.marca, p.tipo, p.modelo, p.sku,
        (p.colores || []).join(' '), p.descripcion,
        (p.caracteristicas || []).join(' '),
      ].join(' '));
    }
    return p._buscable;
  }

  function aplicar(e) {
    var q = u.normalizar(e.q).trim();
    var palabras = q ? q.split(/\s+/) : [];

    var lista = (ECM.PRODUCTOS || []).filter(function (p) {
      if (e.marcas.length && e.marcas.indexOf(p.marca) === -1) return false;
      if (e.tipos.length && e.tipos.indexOf(p.tipo) === -1) return false;
      if (e.colores.length) {
        var tiene = (p.colores || []).some(function (c) { return e.colores.indexOf(c) !== -1; });
        if (!tiene) return false;
      }
      if (e.soloDisponibles && !p.disponible) return false;
      if (palabras.length) {
        var heno = textoBuscable(p);
        // Todas las palabras deben aparecer: "new era negra" filtra de verdad
        for (var i = 0; i < palabras.length; i++) {
          if (heno.indexOf(palabras[i]) === -1) return false;
        }
      }
      return true;
    });

    // Objeto sin prototipo: si no, un ?orden=__proto__ o ?orden=constructor
    // devolvería una función heredada y el catálogo reventaría al ordenar.
    var ordenes = Object.create(null);
    Object.assign(ordenes, {
      'recientes': function (a, b) { return (b.nuevo === true) - (a.nuevo === true) || a.id - b.id; },
      'destacados': function (a, b) { return (b.destacado === true) - (a.destacado === true) || a.id - b.id; },
      'nombre': function (a, b) { return a.nombre.localeCompare(b.nombre, 'es'); },
      // Los productos sin precio van al final en ambos sentidos
      'precio-asc': function (a, b) {
        var ta = u.tienePrecio(a), tb = u.tienePrecio(b);
        if (!ta && !tb) return a.id - b.id;
        if (!ta) return 1;
        if (!tb) return -1;
        return a.precio - b.precio;
      },
      'precio-desc': function (a, b) {
        var ta = u.tienePrecio(a), tb = u.tienePrecio(b);
        if (!ta && !tb) return a.id - b.id;
        if (!ta) return 1;
        if (!tb) return -1;
        return b.precio - a.precio;
      },
    });
    var cmp = typeof ordenes[e.orden] === 'function' ? ordenes[e.orden] : ordenes.recientes;
    return lista.slice().sort(cmp);
  }

  /* ═══ URL ═════════════════════════════════════════════════════════════ */
  var ORDENES_VALIDOS = ['recientes', 'destacados', 'nombre', 'precio-asc', 'precio-desc'];

  function leerUrl() {
    var p = new URLSearchParams(location.search);
    // getAll + join: así ?marca=A&marca=B no pierde uno de los dos
    function lista(clave, validos) {
      var crudos = p.getAll(clave).join(',');
      var vals = crudos
        ? crudos.split(',').map(function (x) { return x.trim(); }).filter(Boolean)
        : [];
      // Solo se aceptan valores que existan de verdad: un ?marca=Nike dejaría
      // el catálogo vacío sin que el usuario entienda por qué
      if (validos) vals = vals.filter(function (v) { return validos.indexOf(v) !== -1; });
      return vals.filter(function (v, i, a) { return a.indexOf(v) === i; });
    }

    estado.marcas = lista('marca', CONFIG.taxonomia.marcas);
    estado.tipos = lista('tipo', CONFIG.taxonomia.tipos);
    estado.colores = lista('color', Object.keys(CONFIG.taxonomia.colores));
    estado.q = (p.get('q') || '').slice(0, 80);

    var orden = p.get('orden') || 'recientes';
    if (ORDENES_VALIDOS.indexOf(orden) === -1) orden = 'recientes';
    // Ordenar por precio no significa nada mientras no haya precios cargados
    if (orden.indexOf('precio') === 0 && !u.hayPrecios()) orden = 'recientes';
    estado.orden = orden;

    var disp = p.get('disponible');
    estado.soloDisponibles = disp === '1' || disp === 'true';
  }

  function escribirUrl() {
    var p = new URLSearchParams();
    if (estado.marcas.length) p.set('marca', estado.marcas.join(','));
    if (estado.tipos.length) p.set('tipo', estado.tipos.join(','));
    if (estado.colores.length) p.set('color', estado.colores.join(','));
    if (estado.q.trim()) p.set('q', estado.q.trim());
    if (estado.orden !== 'recientes') p.set('orden', estado.orden);
    if (estado.soloDisponibles) p.set('disponible', '1');
    var qs = p.toString();
    // Abierto con doble clic (file://), replaceState lanza SecurityError y
    // dejaría el catálogo sin filtrar desde el primer clic.
    try {
      history.replaceState(null, '', location.pathname + (qs ? '?' + qs : ''));
    } catch (e) { /* sin historial: los filtros siguen funcionando igual */ }
  }

  /* ═══ Render del catálogo ═════════════════════════════════════════════ */
  function render() {
    var grid = u.$('#grid');
    if (!grid) return;

    var lista = aplicar(estado);
    var total = (ECM.PRODUCTOS || []).length;

    if (!total) {
      grid.innerHTML = vacioSinCatalogo();
    } else if (!lista.length) {
      grid.innerHTML = vacioSinResultados();
      var limpiar = u.$('#vacio-limpiar');
      if (limpiar) limpiar.addEventListener('click', function () { limpiarTodo(); });
      u.$$('[data-sugerencia]').forEach(function (b) {
        b.addEventListener('click', function () {
          estado.q = b.getAttribute('data-sugerencia');
          var input = u.$('#buscar');
          if (input) input.value = estado.q;
          sincronizar();
        });
      });
    } else {
      pintarRejilla(grid, lista, 4);
    }

    var info = u.$('#resultados-texto');
    if (info) {
      info.innerHTML = !lista.length
        ? 'Ninguna gorra coincide'
        : lista.length === total
          ? '<b>' + total + '</b> ' + (total === 1 ? 'gorra disponible' : 'gorras disponibles')
          : '<b>' + lista.length + '</b> de ' + total + ' gorras';
    }

    pintarActivos();
    pintarChips();

    var btn = u.$('#btn-filtros');
    if (btn) {
      var n = contarActivos(estado);
      btn.setAttribute('data-activos', String(n));
      var span = btn.querySelector('.n');
      if (span) span.textContent = n;
    }

    var sel = u.$('#orden');
    if (sel && sel.value !== estado.orden) sel.value = estado.orden;
  }

  function sincronizar() {
    escribirUrl();
    render();
  }

  /* ═══ Estados vacíos ══════════════════════════════════════════════════ */
  function vacioSinCatalogo() {
    return '<div class="vacio" style="grid-column:1/-1">' +
      '<img class="vacio-emblema" src="assets/logo/emblema-128.webp" alt="" width="84" height="84">' +
      '<h3>Estamos subiendo la colección</h3>' +
      '<p>Muy pronto vas a ver aquí las gorras disponibles. Mientras tanto, escríbenos y te contamos qué hay.</p>' +
      '<div class="vacio-acciones">' +
        '<a class="btn btn--wa" data-wa href="#">' + u.icono('i-whatsapp') + 'Escribir por WhatsApp</a>' +
      '</div></div>';
  }

  function vacioSinResultados() {
    // Solo se sugieren términos que SÍ devuelven resultados
    var sug = [];
    var marcasConProducto = {};
    var tiposConProducto = {};
    var coloresConProducto = {};
    (ECM.PRODUCTOS || []).forEach(function (p) {
      marcasConProducto[p.marca] = true;
      tiposConProducto[p.tipo] = true;
      (p.colores || []).forEach(function (c) { coloresConProducto[c] = true; });
    });
    sug = Object.keys(marcasConProducto)
      .concat(Object.keys(tiposConProducto))
      .concat(Object.keys(coloresConProducto))
      .slice(0, 5);

    var titulo = estado.q.trim()
      ? 'Sin resultados para «' + u.esc(estado.q.trim()) + '»'
      : 'Ninguna gorra coincide';
    var texto = estado.q.trim()
      ? 'Revisa la escritura o busca por marca, tipo o color.'
      : 'Con los filtros que elegiste no queda nada para mostrar. Prueba quitando alguno.';

    return '<div class="vacio" style="grid-column:1/-1">' +
      '<img class="vacio-emblema" src="assets/logo/emblema-128.webp" alt="" width="84" height="84">' +
      '<h3>' + titulo + '</h3>' +
      '<p>' + texto + '</p>' +
      '<div class="vacio-acciones">' +
        '<button type="button" class="btn btn--primario" id="vacio-limpiar">Limpiar filtros</button>' +
      '</div>' +
      '<div class="chips" style="justify-content:center;margin-top:20px">' +
        sug.map(function (s) {
          return '<button type="button" class="chip" data-sugerencia="' + u.esc(s) + '">' + u.esc(s) + '</button>';
        }).join('') +
      '</div></div>';
  }

  /* ═══ Filtros activos ═════════════════════════════════════════════════ */
  function pintarActivos() {
    var cont = u.$('#activos');
    if (!cont) return;
    var tags = [];
    estado.marcas.forEach(function (v) { tags.push({ g: 'marcas', v: v }); });
    estado.tipos.forEach(function (v) { tags.push({ g: 'tipos', v: v }); });
    estado.colores.forEach(function (v) { tags.push({ g: 'colores', v: v }); });
    if (estado.soloDisponibles) tags.push({ g: 'disponible', v: 'Solo disponibles' });

    cont.innerHTML = tags.map(function (t) {
      return '<button type="button" class="activo-tag" data-quitar-filtro="' + t.g +
        '" data-valor="' + u.esc(t.v) + '" aria-label="Quitar el filtro ' + u.esc(t.v) + '">' +
        u.esc(t.v) + u.icono('i-cerrar') + '</button>';
    }).join('');
  }

  /* ═══ Panel de filtros ════════════════════════════════════════════════ */
  function cuenta(campo, valor) {
    return (ECM.PRODUCTOS || []).filter(function (p) {
      if (campo === 'colores') return (p.colores || []).indexOf(valor) !== -1;
      return p[campo] === valor;
    }).length;
  }

  function pintarChips() {
    var e = borrador || estado;

    var cm = u.$('#chips-marca');
    if (cm) {
      cm.innerHTML = CONFIG.taxonomia.marcas.map(function (m) {
        var n = cuenta('marca', m);
        return '<button type="button" class="chip" data-filtro="marcas" data-valor="' + u.esc(m) + '"' +
          ' aria-pressed="' + (e.marcas.indexOf(m) !== -1) + '"' + (n ? '' : ' disabled') + '>' +
          u.esc(m) + ' <span class="n">' + n + '</span></button>';
      }).join('');
    }

    var ct = u.$('#chips-tipo');
    if (ct) {
      ct.innerHTML = CONFIG.taxonomia.tipos.map(function (t) {
        var n = cuenta('tipo', t);
        return '<button type="button" class="chip" data-filtro="tipos" data-valor="' + u.esc(t) + '"' +
          ' aria-pressed="' + (e.tipos.indexOf(t) !== -1) + '"' + (n ? '' : ' disabled') + '>' +
          u.esc(t) + ' <span class="n">' + n + '</span></button>';
      }).join('');
    }

    var cc = u.$('#chips-color');
    if (cc) {
      var usados = Object.keys(CONFIG.taxonomia.colores).filter(function (c) {
        return cuenta('colores', c) > 0;
      });
      cc.innerHTML = usados.map(function (c) {
        return '<button type="button" class="chip" data-filtro="colores" data-valor="' + u.esc(c) + '"' +
          ' aria-pressed="' + (e.colores.indexOf(c) !== -1) + '">' +
          '<span class="muestra" style="background:' + CONFIG.taxonomia.colores[c] + '"></span>' +
          u.esc(c) + ' <span class="n">' + cuenta('colores', c) + '</span></button>';
      }).join('');
    }

    var cd = u.$('#chips-disponible');
    if (cd) {
      cd.innerHTML = '<button type="button" class="chip" data-filtro="disponible" data-valor="1"' +
        ' aria-pressed="' + !!e.soloDisponibles + '">Solo disponibles</button>';
    }

    // El bloque de precio solo existe si hay precios cargados: un filtro que
    // no filtra nada es la señal más clara de un sitio a medio hacer.
    // Las opciones de orden por precio se ELIMINAN (no se ocultan): Safari
    // ignora el atributo hidden en <option>.
    if (!u.hayPrecios()) {
      var gp = u.$('#grupo-precio');
      if (gp) gp.hidden = true;
      u.$$('[data-orden-precio]').forEach(function (o) { o.remove(); });
    }

    actualizarBotonVer();
  }

  function actualizarBotonVer() {
    var b = u.$('#panel-ver');
    if (!b) return;
    var n = aplicar(borrador || estado).length;
    b.textContent = n === 0 ? 'Sin resultados'
      : n === 1 ? 'Ver 1 gorra' : 'Ver ' + n + ' gorras';
    b.disabled = n === 0;
  }

  var soltarFocoPanel = null;

  function abrirPanel() {
    var p = u.$('#panel');
    if (!p || p.classList.contains('abierto')) return;   // no reabrir sobre sí mismo
    // Copia provisional: en móvil el grid queda tapado, así que los cambios
    // solo se aplican al pulsar "Ver N gorras".
    borrador = JSON.parse(JSON.stringify(estado));
    p.classList.add('abierto');
    u.$('#velo-panel').classList.add('abierto');
    u.$('#btn-filtros').setAttribute('aria-expanded', 'true');
    u.bloquearScroll(true);
    soltarFocoPanel = u.atraparFoco(p);
    pintarChips();
    var sel = u.$('#orden-panel');
    if (sel) sel.value = borrador.orden;
    setTimeout(function () { u.enfocarPrimero(p); }, 60);
  }

  function cerrarPanel(aplicarCambios) {
    var p = u.$('#panel');
    if (!p || !p.classList.contains('abierto')) return;
    if (soltarFocoPanel) { soltarFocoPanel(); soltarFocoPanel = null; }
    if (aplicarCambios && borrador) {
      estado.marcas = borrador.marcas;
      estado.tipos = borrador.tipos;
      estado.colores = borrador.colores;
      estado.soloDisponibles = borrador.soloDisponibles;
      estado.orden = borrador.orden;
    }
    borrador = null;
    p.classList.remove('abierto');
    u.$('#velo-panel').classList.remove('abierto');
    u.$('#btn-filtros').setAttribute('aria-expanded', 'false');
    u.bloquearScroll(false);
    sincronizar();
    var b = u.$('#btn-filtros');
    if (b) b.focus();
  }

  function alternar(grupo, valor) {
    var e = borrador || estado;
    if (grupo === 'disponible') { e.soloDisponibles = !e.soloDisponibles; return; }
    var i = e[grupo].indexOf(valor);
    if (i === -1) e[grupo].push(valor); else e[grupo].splice(i, 1);
  }

  function limpiarTodo() {
    estado.marcas = []; estado.tipos = []; estado.colores = [];
    estado.soloDisponibles = false;
    estado.q = '';
    var input = u.$('#buscar');
    if (input) input.value = '';
    var lim = u.$('#buscar-limpiar');
    if (lim) lim.classList.remove('visible');
    if (borrador) {
      borrador.marcas = []; borrador.tipos = []; borrador.colores = [];
      borrador.soloDisponibles = false;
    }
    sincronizar();
  }

  /* ═══ Inicio ══════════════════════════════════════════════════════════ */
  function iniciar() {
    if (!u.$('#grid')) return;

    leerUrl();

    var input = u.$('#buscar');
    if (input) {
      input.value = estado.q;
      var lim = u.$('#buscar-limpiar');
      if (lim) lim.classList.toggle('visible', !!estado.q);

      input.addEventListener('input', u.debounce(function () {
        estado.q = input.value;
        if (lim) lim.classList.toggle('visible', input.value.length > 0);
        sincronizar();
      }, 170));

      if (lim) lim.addEventListener('click', function () {
        input.value = '';
        estado.q = '';
        lim.classList.remove('visible');
        sincronizar();
        input.focus();
      });
    }

    var sel = u.$('#orden');
    if (sel) {
      sel.value = estado.orden;
      sel.addEventListener('change', function () {
        estado.orden = sel.value;
        sincronizar();
      });
    }

    var btn = u.$('#btn-filtros');
    if (btn) btn.addEventListener('click', abrirPanel);
    var cerrar = u.$('#panel-cerrar');
    if (cerrar) cerrar.addEventListener('click', function () { cerrarPanel(false); });
    var velo = u.$('#velo-panel');
    if (velo) velo.addEventListener('click', function () { cerrarPanel(false); });
    var ver = u.$('#panel-ver');
    if (ver) ver.addEventListener('click', function () { cerrarPanel(true); });
    var limp = u.$('#panel-limpiar');
    if (limp) limp.addEventListener('click', function () {
      if (borrador) {
        borrador.marcas = []; borrador.tipos = []; borrador.colores = [];
        borrador.soloDisponibles = false;
      }
      pintarChips();
    });

    var ordenPanel = u.$('#orden-panel');
    if (ordenPanel) {
      ordenPanel.value = estado.orden;
      ordenPanel.addEventListener('change', function () {
        if (borrador) borrador.orden = ordenPanel.value;
        else { estado.orden = ordenPanel.value; sincronizar(); }
        actualizarBotonVer();
      });
    }

    document.addEventListener('click', function (ev) {
      var chip = ev.target.closest('.chip[data-filtro]');
      if (chip && !chip.disabled) {
        var grupo = chip.getAttribute('data-filtro');
        var valor = chip.getAttribute('data-valor');
        alternar(grupo, valor);
        if (borrador) pintarChips(); else sincronizar();
        // Al repintar los chips se destruye el que acaba de pulsarse: hay que
        // devolverle el foco a su reemplazo o el teclado vuelve al principio.
        var nuevo = u.$$('.chip[data-filtro="' + grupo + '"]').filter(function (c) {
          return c.getAttribute('data-valor') === valor;
        })[0];
        if (nuevo && document.activeElement !== nuevo) nuevo.focus();
        return;
      }
      var quitar = ev.target.closest('[data-quitar-filtro]');
      if (quitar) {
        var g = quitar.getAttribute('data-quitar-filtro');
        var v = quitar.getAttribute('data-valor');
        if (g === 'disponible') estado.soloDisponibles = false;
        else estado[g] = estado[g].filter(function (x) { return x !== v; });
        sincronizar();
        return;
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && u.$('#panel') && u.$('#panel').classList.contains('abierto')) {
        cerrarPanel(false);
      }
    });

    render();
  }

  ECM.Catalogo = {
    iniciar: iniciar,
    tarjeta: tarjeta,
    pintarRejilla: pintarRejilla,
    aplicar: aplicar,
  };
})();
