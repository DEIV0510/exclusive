/* ═══════════════════════════════════════════════════════════════════════════
   EXCLUSIVE CAPS MED · interfaz común
   Pantalla de carga · header · menú móvil · enlaces de CONFIG · carrito
   (drawer) · checkout · footer. Se ejecuta en todas las páginas.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var ECM = (window.ECM = window.ECM || {});
  var u = ECM.u;
  var CONFIG = ECM.CONFIG;
  var Carrito = ECM.Carrito;

  var ultimoFoco = null;
  var soltarFoco = null;

  /* ═══ Pantalla de carga ═══════════════════════════════════════════════ */
  function quitarCarga() {
    var capa = u.$('#carga');
    if (!capa || capa.classList.contains('fuera')) return;
    capa.classList.add('fuera');
    setTimeout(function () { if (capa.parentNode) capa.remove(); }, 360);
  }

  /* ═══ Textos y enlaces que salen de config.js ═════════════════════════ */
  function pintarConfig() {
    var wa = ECM.WA.general();

    u.$$('[data-wa]').forEach(function (a) { a.href = wa; });
    u.$$('[data-wa-numero]').forEach(function (el) { el.textContent = CONFIG.whatsapp.visible; });
    u.$$('[data-wa-tel]').forEach(function (a) {
      a.href = 'tel:+' + CONFIG.whatsapp.numero;
    });
    u.$$('[data-ig]').forEach(function (a) { a.href = CONFIG.instagram.url; });
    u.$$('[data-ig-usuario]').forEach(function (el) {
      el.textContent = '@' + CONFIG.instagram.usuario;
    });
    // TikTok es opcional: si algún día se borra el bloque de config.js, el
    // enlace se quita entero (y su fila del pie) en vez de quedar en "#".
    var tt = CONFIG.tiktok;
    u.$$('[data-tt]').forEach(function (a) {
      if (tt && tt.url) { a.href = tt.url; return; }
      var fuera = a.closest('li') || a;
      fuera.remove();
    });
    u.$$('[data-tt-usuario]').forEach(function (el) {
      if (tt && tt.usuario) el.textContent = '@' + tt.usuario;
    });
    u.$$('[data-marca]').forEach(function (el) { el.textContent = CONFIG.marca; });
    u.$$('[data-ciudad]').forEach(function (el) {
      el.textContent = CONFIG.ciudad + ', Colombia';
    });
    u.$$('[data-anio]').forEach(function (el) {
      el.textContent = new Date().getFullYear();
    });
    u.$$('[data-razon-social]').forEach(function (el) {
      el.textContent = CONFIG.razonSocial;
    });

    // Enlaces del footer a los tipos que sí tienen producto
    var pieTipos = u.$('#pie-tipos');
    if (pieTipos) {
      pieTipos.innerHTML = CONFIG.taxonomia.tipos.map(function (t) {
        var n = (ECM.PRODUCTOS || []).filter(function (p) { return p.tipo === t; }).length;
        return n
          ? '<li><a href="catalogo.html?tipo=' + encodeURIComponent(t) + '">' + u.esc(t) + '</a></li>'
          : '<li><span class="dato-pie">' + u.esc(t) + '</span></li>';
      }).join('');
    }
  }

  /* ═══ Header ══════════════════════════════════════════════════════════ */
  function iniciarHeader() {
    var header = u.$('#header');
    if (header) {
      var solido = false;
      window.addEventListener('scroll', function () {
        var y = window.scrollY > 16;
        if (y !== solido) { solido = y; header.classList.toggle('solido', y); }
      }, { passive: true });
    }

    var btnMenu = u.$('#btn-menu');
    var menu = u.$('#menu');
    if (btnMenu && menu) {
      btnMenu.addEventListener('click', function () {
        var abierto = menu.classList.toggle('abierto');
        btnMenu.setAttribute('aria-expanded', String(abierto));
        btnMenu.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
        u.bloquearScroll(abierto);
      });
      u.$$('a', menu).forEach(function (a) {
        a.addEventListener('click', cerrarMenu);
      });

      // Al pasar a escritorio el botón de menú desaparece, pero el panel no:
      // si se queda abierto tapa la pantalla entera y no hay forma de cerrarlo.
      var anchoEscritorio = window.matchMedia('(min-width: 900px)');
      var alCambiarAncho = function (ev) { if (ev.matches) cerrarMenu(); };
      if (anchoEscritorio.addEventListener) anchoEscritorio.addEventListener('change', alCambiarAncho);
      else if (anchoEscritorio.addListener) anchoEscritorio.addListener(alCambiarAncho);
    }
  }

  function cerrarMenu() {
    var menu = u.$('#menu');
    var btn = u.$('#btn-menu');
    if (!menu || !menu.classList.contains('abierto')) return;
    menu.classList.remove('abierto');
    if (btn) {
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-label', 'Abrir menú');
    }
    u.bloquearScroll(false);
  }

  /* ═══ Carrito (drawer) ════════════════════════════════════════════════ */
  function abrirCarrito() {
    var d = u.$('#carrito');
    if (!d) return;
    ultimoFoco = document.activeElement;
    d.classList.add('abierto');
    d.removeAttribute('inert');
    u.$('#velo-carrito').classList.add('abierto');
    u.bloquearScroll(true);
    soltarFoco = u.atraparFoco(d);
    setTimeout(function () { u.enfocarPrimero(d); }, 60);
  }

  function cerrarCarrito() {
    var d = u.$('#carrito');
    if (!d || !d.classList.contains('abierto')) return;
    d.classList.remove('abierto');
    u.$('#velo-carrito').classList.remove('abierto');
    u.bloquearScroll(false);
    if (soltarFoco) { soltarFoco(); soltarFoco = null; }
    if (ultimoFoco && ultimoFoco.focus) ultimoFoco.focus();
  }

  function pintarContadores() {
    var n = Carrito.unidades();
    u.$$('[data-contador]').forEach(function (el) {
      el.textContent = n > 99 ? '99+' : n;
      el.classList.toggle('activo', n > 0);
    });
    u.$$('[data-carrito-abrir]').forEach(function (b) {
      b.setAttribute('aria-label', n === 0
        ? 'Abrir carrito, vacío'
        : 'Abrir carrito, ' + n + (n === 1 ? ' producto' : ' productos'));
    });
  }

  function pintarCarrito() {
    pintarContadores();

    var cuerpo = u.$('#carrito-cuerpo');
    var pie = u.$('#carrito-pie');
    if (!cuerpo) return;

    // Redibujar el cajón destruye el botón que el usuario acaba de pulsar y el
    // foco se iría al <body>, saltándose la trampa de foco. Se anota cuál era
    // para devolvérselo a su reemplazo al terminar.
    var focoPrevio = null;
    if (document.activeElement && cuerpo.contains(document.activeElement)) {
      var a = document.activeElement;
      focoPrevio = ['data-mas', 'data-menos', 'data-quitar'].reduce(function (acc, attr) {
        return acc || (a.hasAttribute(attr) ? { attr: attr, valor: a.getAttribute(attr) } : null);
      }, null);
    }

    var n = Carrito.unidades();
    var conteo = u.$('#carrito-conteo');
    if (conteo) {
      conteo.textContent = n === 0
        ? 'Sin productos'
        : n + (n === 1 ? ' producto' : ' productos');
    }

    if (Carrito.vacio()) {
      cuerpo.innerHTML =
        '<div class="vacio">' +
          '<img class="vacio-emblema" src="assets/logo/emblema-128.webp" alt="" width="84" height="84" loading="lazy">' +
          '<h3>Tu carrito está vacío</h3>' +
          '<p>Todavía no has agregado ninguna gorra.</p>' +
          '<div class="vacio-acciones">' +
            '<a class="btn btn--primario" href="catalogo.html">Ver catálogo</a>' +
          '</div>' +
        '</div>';
      if (pie) pie.hidden = true;
      return;
    }

    cuerpo.innerHTML = Carrito.items().map(function (it) {
      var p = it.producto;
      var url = u.urlProducto(p);
      var precio = !p.disponible
        ? 'Agotado'
        : u.tienePrecio(p)
          ? u.formatoPrecio(p.precio * it.cantidad)
          : 'Precio por WhatsApp';
      return (
        '<article class="linea-item' + (p.disponible ? '' : ' linea-agotada') + '">' +
          '<a class="linea-foto" href="' + url + '">' +
            '<img src="assets/img/' + p.imagenes[0] + '-400.webp" alt="' + u.esc(p.nombre) + '"' +
            ' loading="lazy" decoding="async" width="72" height="72">' +
          '</a>' +
          '<div class="linea-info">' +
            '<span class="card-marca">' + u.esc(p.marca) + '</span>' +
            '<a class="linea-nombre" href="' + url + '">' + u.esc(p.nombre) + '</a>' +
            '<span class="linea-precio cifra">' + precio + '</span>' +
            '<div class="linea-pie">' +
              '<div class="cantidad">' +
                '<button type="button" data-menos="' + p.id + '" aria-label="Quitar una unidad de ' + u.esc(p.nombre) + '">' +
                  u.icono('i-menos') + '</button>' +
                '<output class="cifra" aria-live="polite">' + it.cantidad + '</output>' +
                '<button type="button" data-mas="' + p.id + '" aria-label="Agregar una unidad de ' + u.esc(p.nombre) + '">' +
                  u.icono('i-mas') + '</button>' +
              '</div>' +
              '<button type="button" class="quitar" data-quitar="' + p.id + '" aria-label="Eliminar ' + u.esc(p.nombre) + ' del carrito">' +
                u.icono('i-basura') + '</button>' +
            '</div>' +
          '</div>' +
        '</article>'
      );
    }).join('');

    if (pie) {
      pie.hidden = false;
      var t = Carrito.total();
      var elTotal = u.$('#carrito-total');
      var elNota = u.$('#carrito-nota');
      if (t.completo) {
        elTotal.textContent = u.formatoPrecio(t.valor);
        elNota.textContent = 'La entrega y el pago se acuerdan por WhatsApp.';
      } else if (t.valor > 0) {
        elTotal.textContent = u.formatoPrecio(t.valor) + ' +';
        elNota.textContent = 'Hay artículos sin precio publicado: te lo confirmamos por WhatsApp.';
      } else {
        elTotal.textContent = 'Por confirmar';
        elNota.textContent = 'Te pasamos el total por WhatsApp al recibir el pedido.';
      }
    }

    // Aviso honesto cuando el navegador no deja guardar (Safari privado)
    var avisoAlmacen = u.$('#carrito-almacen');
    if (avisoAlmacen) avisoAlmacen.hidden = Carrito.almacenamientoDisponible();

    // Si algo del carrito se agotó desde la última visita, se avisa y no se
    // incluye en el pedido; el cliente decide si lo quita o pregunta por él.
    var agotados = Carrito.agotados();
    var avisoAgotado = u.$('#carrito-agotados');
    if (avisoAgotado) {
      avisoAgotado.hidden = agotados.length === 0;
      if (agotados.length) {
        avisoAgotado.textContent = agotados.length === 1
          ? 'Una gorra de tu carrito se agotó y no irá en el pedido.'
          : agotados.length + ' gorras de tu carrito se agotaron y no irán en el pedido.';
      }
    }
    var btnFinalizar = u.$('#carrito-finalizar');
    if (btnFinalizar) {
      var hayPedibles = Carrito.pedibles().length > 0;
      btnFinalizar.disabled = !hayPedibles;
      btnFinalizar.setAttribute('aria-disabled', String(!hayPedibles));
    }

    // Devuelve el foco al mismo control tras el repintado
    if (focoPrevio) {
      var destino = cuerpo.querySelector('[' + focoPrevio.attr + '="' + focoPrevio.valor + '"]');
      if (destino) destino.focus();
      else u.enfocarPrimero(u.$('#carrito'));
    }
  }

  /* ═══ Checkout ════════════════════════════════════════════════════════ */
  function abrirCheckout() {
    if (Carrito.vacio()) {
      u.toast('Agrega al menos una gorra antes de enviar el pedido.', 'aviso');
      return;
    }
    var m = u.$('#checkout');
    if (!m) return;
    ultimoFoco = document.activeElement;

    var t = Carrito.total();
    u.$('#checkout-resumen').innerHTML =
      Carrito.pedibles().map(function (it) {
        var p = it.producto;
        return '<div class="fila-r"><span>' + it.cantidad + ' × ' + u.esc(p.nombre) + '</span>' +
               '<span class="cifra">' + (u.tienePrecio(p)
                 ? u.formatoPrecio(p.precio * it.cantidad)
                 : 'Por confirmar') + '</span></div>';
      }).join('') +
      '<div class="fila-r total"><span>Total</span><span class="cifra">' +
        (t.completo ? u.formatoPrecio(t.valor)
          : t.valor > 0 ? u.formatoPrecio(t.valor) + ' +' : 'Por confirmar') +
      '</span></div>';

    m.classList.add('abierto');
    u.bloquearScroll(true);
    soltarFoco = u.atraparFoco(m);
    setTimeout(function () {
      var n = u.$('#f-nombre');
      if (n) n.focus();
    }, 240);
  }

  function cerrarCheckout() {
    var m = u.$('#checkout');
    if (!m || !m.classList.contains('abierto')) return;
    m.classList.remove('abierto');
    u.bloquearScroll(false);
    if (soltarFoco) { soltarFoco(); soltarFoco = null; }
    if (ultimoFoco && ultimoFoco.focus) ultimoFoco.focus();
  }

  function validar(campo, minimo, mensaje, soloDigitos) {
    var input = u.$('#f-' + campo);
    var err = u.$('#e-' + campo);
    if (!input) return true;
    var v = input.value.trim();
    var largo = soloDigitos ? v.replace(/\D/g, '').length : v.length;
    var ok = largo >= minimo;
    input.setAttribute('aria-invalid', ok ? 'false' : 'true');
    if (err) {
      err.classList.toggle('visible', !ok);
      var s = err.querySelector('span');
      if (s) s.textContent = ok ? '' : mensaje;
    }
    return ok;
  }

  /* Manda el pedido al panel. Silencioso y sin bloquear: la tienda tiene que
     seguir funcionando aunque esto falle. */
  function anotarPedido(datos) {
    if (typeof fetch !== 'function') return;
    try {
      var items = Carrito.pedibles().map(function (l) {
        return { id: l.producto.id, cantidad: l.cantidad };
      });
      if (!items.length) return;
      fetch('/api/pedido', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // keepalive: la petición sobrevive aunque el navegador cambie de
        // pestaña al abrir WhatsApp
        keepalive: true,
        body: JSON.stringify({
          cliente: datos.nombre, telefono: datos.telefono, ciudad: datos.ciudad,
          direccion: datos.direccion, nota: datos.nota, items: items,
        }),
      }).catch(function () { /* sin panel la tienda funciona igual */ });
    } catch (e) { /* idem */ }
  }

  function enviarPedido(ev) {
    ev.preventDefault();
    if (Carrito.vacio()) {
      u.toast('Agrega al menos una gorra antes de enviar el pedido.', 'aviso');
      return;
    }

    var ok = validar('nombre', 3, 'Escribe tu nombre para saber con quién hablamos.');
    ok = validar('telefono', 7, 'Revisa el número: escribe al menos 7 dígitos.', true) && ok;
    if (CONFIG.checkout.pedirCiudad) {
      ok = validar('ciudad', 3, 'Cuéntanos desde qué ciudad escribes.') && ok;
    }
    if (!ok) {
      var malo = u.$('[aria-invalid="true"]');
      if (malo) malo.focus();
      return;
    }

    var datos = {
      nombre: u.$('#f-nombre').value.trim(),
      telefono: u.$('#f-telefono').value.trim(),
      ciudad: u.$('#f-ciudad') ? u.$('#f-ciudad').value.trim() : '',
      direccion: u.$('#f-direccion') ? u.$('#f-direccion').value.trim() : '',
      nota: u.$('#f-nota') ? u.$('#f-nota').value.trim() : '',
    };

    var msg = ECM.WA.pedido(datos);

    // Deja constancia del pedido para que le salga al dueño en el panel. Va a
    // fondo perdido A PROPÓSITO: si el servidor falla, si no hay internet o si
    // la página se abrió con file://, el cliente TIENE que poder mandar su
    // mensaje igual. Nunca se espera a esta petición ni se le avisa de ella.
    anotarPedido(datos);

    var boton = u.$('#checkout-enviar');

    // Bloquear 1,5 s evita que un doble toque abra dos chats
    if (boton) {
      boton.setAttribute('aria-busy', 'true');
      boton.disabled = true;
      var textoOriginal = boton.innerHTML;
      boton.innerHTML = u.icono('i-whatsapp') + '<span>Abriendo WhatsApp…</span>';
      setTimeout(function () {
        boton.removeAttribute('aria-busy');
        boton.disabled = false;
        boton.innerHTML = textoOriginal;
      }, 1500);
    }

    // OJO: no pasar 'noopener' como tercer argumento. Según la especificación,
    // window.open devuelve null cuando se usa, aunque la pestaña se abra bien,
    // y entonces el respaldo saltaría en TODOS los pedidos. La protección se
    // consigue igual anulando opener después.
    var ventana = window.open(msg.url, '_blank');
    if (ventana) { try { ventana.opener = null; } catch (e) { /* otro origen */ } }
    cerrarCheckout();

    if (!ventana) {
      mostrarRespaldo(msg);
    } else {
      // El carrito NO se vacía: la página no puede saber si el mensaje se envió.
      u.toast('Abrimos WhatsApp con tu pedido', 'ok');
    }
  }

  // Si el navegador bloqueó la ventana, el pedido no se pierde
  var soltarFocoRespaldo = null;

  function mostrarRespaldo(msg) {
    var caja = u.$('#respaldo');
    if (!caja) { u.toast('No se abrió WhatsApp. Inténtalo de nuevo.', 'aviso'); return; }
    caja.classList.add('abierto');
    u.bloquearScroll(true);
    soltarFocoRespaldo = u.atraparFoco(caja);
    setTimeout(function () { u.enfocarPrimero(caja); }, 240);

    var abrir = u.$('#respaldo-abrir');
    if (abrir) abrir.href = msg.url;

    var copiar = u.$('#respaldo-copiar');
    if (copiar) {
      copiar.onclick = function () {
        copiarTexto(msg.texto).then(function (ok) {
          u.toast(
            ok ? 'Pedido copiado. Pégalo en el chat.'
               : 'No pudimos copiarlo. Selecciona el texto a mano.',
            ok ? 'ok' : 'aviso'
          );
        });
      };
    }
  }

  // navigator.clipboard no existe fuera de HTTPS (ni en file://): sin este
  // respaldo el botón "Copiar" no haría nada y el cliente se quedaría colgado.
  function copiarTexto(texto) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(texto)
        .then(function () { return true; })
        .catch(function () { return copiarConTextarea(texto); });
    }
    return Promise.resolve(copiarConTextarea(texto));
  }

  function copiarConTextarea(texto) {
    try {
      var ta = document.createElement('textarea');
      ta.value = texto;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) { return false; }
  }

  function cerrarRespaldo() {
    var caja = u.$('#respaldo');
    if (!caja || !caja.classList.contains('abierto')) return;
    caja.classList.remove('abierto');
    u.bloquearScroll(false);
    if (soltarFocoRespaldo) { soltarFocoRespaldo(); soltarFocoRespaldo = null; }
  }

  /* ═══ Rieles que se desplazan de lado ═════════════════════════════════════
     Cada .riel-caja tiene un riel y dos flechas. Las flechas solo se muestran
     hacia el lado al que de verdad queda contenido por ver: si todo cabe en
     pantalla, no aparece ninguna.                                          */
  function iniciarRieles() {
    u.$$('.riel-caja').forEach(function (caja) {
      var riel = u.$('[data-riel]', caja);
      if (!riel) return;
      var izq = u.$('[data-riel-ir="-1"]', caja);
      var der = u.$('[data-riel-ir="1"]', caja);

      function actualizar() {
        var max = riel.scrollWidth - riel.clientWidth;
        // 4 px de holgura: los navegadores redondean el scroll a subpíxeles
        var hayDeSobra = max > 4;
        if (izq) izq.hidden = !hayDeSobra || riel.scrollLeft <= 4;
        if (der) der.hidden = !hayDeSobra || riel.scrollLeft >= max - 4;
      }

      function mover(dir) {
        // Se avanza el 80% de lo visible: siempre queda algo a la vista para
        // no perder el hilo de dónde estabas.
        riel.scrollBy({ left: dir * riel.clientWidth * 0.8, behavior: 'smooth' });
      }

      u.$$('[data-riel-ir]', caja).forEach(function (b) {
        b.addEventListener('click', function () {
          mover(Number(b.getAttribute('data-riel-ir')));
          setTimeout(actualizar, 450);
        });
      });

      riel.addEventListener('scroll', actualizar, { passive: true });
      window.addEventListener('resize', u.debounce(actualizar, 150));

      // El contenido de algunos rieles lo pinta el JS después: se revisa de
      // nuevo cuando cambie y cuando terminen de cargar las imágenes.
      if ('ResizeObserver' in window) new ResizeObserver(actualizar).observe(riel);
      if ('MutationObserver' in window) {
        new MutationObserver(actualizar).observe(riel, { childList: true });
      }
      window.addEventListener('load', actualizar);
      actualizar();
    });
  }

  /* ═══ Eventos ═════════════════════════════════════════════════════════ */
  function conectar() {
    // Delegación: agregar al carrito desde cualquier parte de la página
    document.addEventListener('click', function (ev) {
      var add = ev.target.closest('[data-agregar]');
      if (add) {
        ev.preventDefault();
        var id = add.getAttribute('data-agregar');
        var p = (ECM.PRODUCTOS || []).filter(function (x) { return String(x.id) === id; })[0];
        if (Carrito.agregar(id, 1) && p) {
          u.toast(p.nombre + ' — agregada al carrito', 'ok');
          if (add.classList.contains('card-add')) {
            add.classList.add('hecho');
            add.innerHTML = u.icono('i-check');
            setTimeout(function () {
              add.classList.remove('hecho');
              add.innerHTML = u.icono('i-mas');
            }, 1400);
          }
        }
        return;
      }

      var abrir = ev.target.closest('[data-carrito-abrir]');
      if (abrir) { ev.preventDefault(); abrirCarrito(); return; }

      var mas = ev.target.closest('[data-mas]');
      if (mas) { Carrito.sumar(mas.getAttribute('data-mas'), 1); return; }

      var menos = ev.target.closest('[data-menos]');
      if (menos) { Carrito.sumar(menos.getAttribute('data-menos'), -1); return; }

      var quitar = ev.target.closest('[data-quitar]');
      if (quitar) {
        var qid = quitar.getAttribute('data-quitar');
        var qp = (ECM.PRODUCTOS || []).filter(function (x) { return String(x.id) === qid; })[0];
        Carrito.quitar(qid);
        if (qp) u.toast(qp.nombre + ' — eliminada', 'aviso');
        return;
      }

      if (ev.target.closest('#carrito a[href]')) cerrarCarrito();
    });

    var cerrar = u.$('#carrito-cerrar');
    if (cerrar) cerrar.addEventListener('click', cerrarCarrito);
    var velo = u.$('#velo-carrito');
    if (velo) velo.addEventListener('click', cerrarCarrito);

    var seguir = u.$('#carrito-seguir');
    if (seguir) seguir.addEventListener('click', cerrarCarrito);

    var finalizar = u.$('#carrito-finalizar');
    if (finalizar) finalizar.addEventListener('click', function () {
      cerrarCarrito();
      setTimeout(abrirCheckout, 180);
    });

    var cCerrar = u.$('#checkout-cerrar');
    if (cCerrar) cCerrar.addEventListener('click', cerrarCheckout);
    var cModal = u.$('#checkout');
    if (cModal) cModal.addEventListener('click', function (e) {
      if (e.target === cModal) cerrarCheckout();
    });
    var form = u.$('#checkout-form');
    if (form) form.addEventListener('submit', enviarPedido);

    var rCerrar = u.$('#respaldo-cerrar');
    if (rCerrar) rCerrar.addEventListener('click', cerrarRespaldo);
    var rModal = u.$('#respaldo');
    if (rModal) rModal.addEventListener('click', function (e) {
      if (e.target === rModal) cerrarRespaldo();
    });

    // Campos opcionales según config
    if (!CONFIG.checkout.pedirCiudad) { var c = u.$('#campo-ciudad'); if (c) c.hidden = true; }
    if (!CONFIG.checkout.pedirDireccion) { var d = u.$('#campo-direccion'); if (d) d.hidden = true; }
    if (!CONFIG.checkout.pedirNota) { var n = u.$('#campo-nota'); if (n) n.hidden = true; }

    // Escape cierra lo que esté abierto, de dentro hacia fuera
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (u.$('#respaldo') && u.$('#respaldo').classList.contains('abierto')) return cerrarRespaldo();
      if (u.$('#checkout') && u.$('#checkout').classList.contains('abierto')) return cerrarCheckout();
      if (u.$('#carrito') && u.$('#carrito').classList.contains('abierto')) return cerrarCarrito();
      cerrarMenu();
    });

    Carrito.alCambiar(pintarCarrito);
  }

  /* ═══ Arranque ════════════════════════════════════════════════════════ */
  ECM.Comunes = {
    iniciar: function () {
      document.documentElement.classList.add('js');
      Carrito.cargar();
      pintarConfig();
      iniciarHeader();
      conectar();
      pintarCarrito();
      iniciarRieles();
      u.iniciarRevelado();
      u.activarFotos();
    },
    iniciarRieles: iniciarRieles,
    quitarCarga: quitarCarga,
    abrirCarrito: abrirCarrito,
    cerrarCarrito: cerrarCarrito,
    pintarCarrito: pintarCarrito,
  };
})();
