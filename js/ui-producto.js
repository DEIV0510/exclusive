/* ═══════════════════════════════════════════════════════════════════════════
   EXCLUSIVE CAPS MED · ficha de producto
   Galería + zoom · cantidad · botones de compra · barra fija · relacionados
   El HTML de la ficha ya viene servido (bueno para SEO y para quien no tenga
   JS); este archivo solo le añade el comportamiento.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var ECM = (window.ECM = window.ECM || {});
  var u = ECM.u;

  var producto = null;
  var cantidad = 1;

  function actual() {
    var slug = document.body.getAttribute('data-producto');
    return (ECM.PRODUCTOS || []).filter(function (p) { return p.slug === slug; })[0] || null;
  }

  /* ═══ Galería ═════════════════════════════════════════════════════════ */
  function iniciarGaleria() {
    var visor = u.$('#visor');
    if (!visor || !producto) return;

    function mostrar(indice) {
      var base = producto.imagenes[indice];
      if (!base) return;
      var insignias = u.$('.insignias', visor);
      visor.innerHTML =
        (insignias ? insignias.outerHTML : '') +
        u.figura(base, producto.nombre + ' — foto ' + (indice + 1), {
          sizes: '(min-width:900px) 560px, 94vw',
          prioridad: true,
        }) +
        '<span class="zoom-pista">' + u.icono('i-lupa') + 'Toca para ampliar</span>';
      u.activarFotos(visor);
      visor.setAttribute('data-indice', indice);
      u.$$('.mini').forEach(function (m, i) {
        m.setAttribute('aria-current', String(i === indice));
      });
    }

    u.$$('.mini').forEach(function (m, i) {
      m.addEventListener('click', function () { mostrar(i); });
    });

    // Zoom: se abre la imagen grande y se puede desplazar dentro del visor
    function ampliar() {
      var i = parseInt(visor.getAttribute('data-indice') || '0', 10);
      abrirZoom(producto.imagenes[i] || producto.imagenes[0]);
    }
    visor.addEventListener('click', ampliar);
    // El visor es role="button": debe responder a Enter y a Espacio como
    // cualquier botón, o el teclado no puede ampliar la foto.
    visor.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'Spacebar') {
        ev.preventDefault();
        ampliar();
      }
    });

    // Deslizar con el dedo entre fotos
    if (producto.imagenes.length > 1) {
      var x0 = null;
      visor.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
      visor.addEventListener('touchend', function (e) {
        if (x0 === null) return;
        var dx = e.changedTouches[0].clientX - x0;
        x0 = null;
        if (Math.abs(dx) < 45) return;
        var i = parseInt(visor.getAttribute('data-indice') || '0', 10);
        var siguiente = dx < 0 ? i + 1 : i - 1;
        if (siguiente < 0) siguiente = producto.imagenes.length - 1;
        if (siguiente >= producto.imagenes.length) siguiente = 0;
        mostrar(siguiente);
      }, { passive: true });
    }
  }

  function abrirZoom(base) {
    var lb = u.$('#lightbox');
    if (!lb) return;
    u.$('#lightbox-img').src = 'assets/img/' + base + '-1200.webp';
    u.$('#lightbox-img').alt = producto ? producto.nombre + ' — vista ampliada' : '';
    lb.classList.add('abierto');
    u.bloquearScroll(true);
    var cerrar = u.$('#lightbox-cerrar');
    if (cerrar) cerrar.focus();
    // Centra la vista para que el zoom empiece por el medio de la foto
    lb.scrollLeft = (lb.scrollWidth - lb.clientWidth) / 2;
    lb.scrollTop = (lb.scrollHeight - lb.clientHeight) / 2;
  }

  function cerrarZoom() {
    var lb = u.$('#lightbox');
    if (!lb || !lb.classList.contains('abierto')) return;
    lb.classList.remove('abierto');
    u.bloquearScroll(false);
    var visor = u.$('#visor');
    if (visor) visor.focus();
  }

  /* ═══ Cantidad y compra ═══════════════════════════════════════════════ */
  function iniciarCompra() {
    if (!producto) return;

    var salida = u.$('#cantidad');
    function pintarCantidad() {
      if (salida) salida.textContent = cantidad;
      var wa = u.$('#ficha-wa');
      if (wa) wa.href = ECM.WA.consulta(producto, cantidad);
    }

    u.$$('[data-cant]').forEach(function (b) {
      b.addEventListener('click', function () {
        cantidad = Math.max(1, Math.min(99, cantidad + parseInt(b.getAttribute('data-cant'), 10)));
        pintarCantidad();
      });
    });

    var agregar = u.$('#ficha-agregar');
    if (agregar) {
      agregar.addEventListener('click', function () {
        if (ECM.Carrito.agregar(producto.id, cantidad)) {
          u.toast(producto.nombre + ' — agregada al carrito', 'ok');
        }
      });
    }

    var comprar = u.$('#ficha-comprar');
    if (comprar) {
      comprar.addEventListener('click', function () {
        if (ECM.Carrito.agregar(producto.id, cantidad)) ECM.Comunes.abrirCarrito();
      });
    }

    var stickyAdd = u.$('#cs-agregar');
    if (stickyAdd) {
      stickyAdd.addEventListener('click', function () {
        if (ECM.Carrito.agregar(producto.id, cantidad)) {
          u.toast(producto.nombre + ' — agregada al carrito', 'ok');
        }
      });
    }

    pintarCantidad();
  }

  /* ═══ Barra de compra fija ════════════════════════════════════════════
     Solo aparece cuando el bloque de botones original ya salió de la vista:
     así nunca hay dos «Agregar al carrito» visibles a la vez.             */
  function iniciarSticky() {
    var barra = u.$('#compra-sticky');
    var ancla = u.$('#compra-acciones');
    if (!barra || !ancla) return;

    // Se calcula la posición real en cada scroll (con rAF) en vez de usar
    // IntersectionObserver: el observador solo avisa cuando se CRUZA el borde,
    // así que al abrir un enlace con ancla o recargar a media página no
    // dispararía nunca y la barra se quedaría escondida.
    // Visible solo cuando el bloque de botones original ya pasó por encima
    // del viewport. Siempre se mide la posición real, nunca un dato guardado.
    function revisar() {
      barra.classList.toggle('visible', ancla.getBoundingClientRect().bottom < 0);
    }

    // Dos disparadores que se cubren entre sí:
    //  · scroll  -> seguimiento continuo mientras el usuario se desplaza
    //  · observer-> cubre los saltos grandes (enlaces con ancla, restaurar la
    //               posición al volver atrás) donde el scroll llega agrupado
    window.addEventListener('scroll', revisar, { passive: true });
    window.addEventListener('resize', revisar, { passive: true });
    window.addEventListener('pageshow', revisar);
    // scrollend cierra el caso del salto instantáneo hasta arriba, donde el
    // navegador puede agrupar los eventos de scroll y perder el último
    if ('onscrollend' in window) window.addEventListener('scrollend', revisar);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(revisar, {
        threshold: [0, 1],
        rootMargin: '0px 0px -100% 0px',
      }).observe(ancla);
    }

    revisar();
  }

  /* ═══ Relacionados ════════════════════════════════════════════════════ */
  function pintarRelacionados() {
    var cont = u.$('#relacionados');
    if (!cont || !producto) return;

    var otros = (ECM.PRODUCTOS || []).filter(function (p) { return p.id !== producto.id; });
    if (!otros.length) {
      var sec = u.$('#seccion-relacionados');
      if (sec) sec.hidden = true;
      return;
    }
    // Primero los de la misma marca, luego los del mismo tipo
    otros.sort(function (a, b) {
      var pa = (a.marca === producto.marca ? 2 : 0) + (a.tipo === producto.tipo ? 1 : 0);
      var pb = (b.marca === producto.marca ? 2 : 0) + (b.tipo === producto.tipo ? 1 : 0);
      return pb - pa;
    });
    ECM.Catalogo.pintarRejilla(cont, otros.slice(0, 4), 0);
  }

  /* ═══ Inicio ══════════════════════════════════════════════════════════ */
  function iniciar() {
    producto = actual();
    if (!producto) return;

    iniciarGaleria();
    iniciarCompra();
    iniciarSticky();
    pintarRelacionados();

    var lb = u.$('#lightbox');
    if (lb) {
      lb.addEventListener('click', function (e) {
        if (e.target.id !== 'lightbox-img' || e.target.id === 'lightbox-img') cerrarZoom();
      });
      var cerrar = u.$('#lightbox-cerrar');
      if (cerrar) cerrar.addEventListener('click', cerrarZoom);
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && lb.classList.contains('abierto')) cerrarZoom();
      });
    }
  }

  ECM.Producto = { iniciar: iniciar };
})();
