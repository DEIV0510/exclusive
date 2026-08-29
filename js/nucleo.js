/* ═══════════════════════════════════════════════════════════════════════════
   EXCLUSIVE CAPS MED · núcleo
   Utilidades compartidas por todas las páginas. No toca el DOM por su cuenta.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var ECM = (window.ECM = window.ECM || {});

  // Si config.js no cargó, este archivo no debe reventar: main.js necesita
  // seguir vivo para mostrarle al usuario un mensaje en vez de una página muda.
  var CONFIG = ECM.CONFIG || {
    moneda: { locale: 'es-CO', codigo: 'COP' },
    sitio: { url: '' },
    whatsapp: { numero: '' },
    taxonomia: { marcas: [], tipos: [], colores: {} },
  };

  /* ── Selección ───────────────────────────────────────────────────────── */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  }

  /* ── Texto ───────────────────────────────────────────────────────────── */
  var MAPA_ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return MAPA_ESC[c]; });
  }

  // Quita tildes y pasa a minúsculas: "Béisbol" -> "beisbol"
  function normalizar(t) {
    return String(t == null ? '' : t)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
  }

  function debounce(fn, ms) {
    var t;
    return function () {
      var args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, ms);
    };
  }

  /* ── Precios ──────────────────────────────────────────────────────────────
     Regla central: precio === null significa "todavía no lo sabemos".
     Nunca se muestra $0 ni un guion: se muestra "Precio por WhatsApp".     */
  var fmt = new Intl.NumberFormat(CONFIG.moneda.locale, {
    style: 'currency',
    currency: CONFIG.moneda.codigo,
    maximumFractionDigits: 0,
  });

  function tienePrecio(p) {
    return typeof p.precio === 'number' && isFinite(p.precio) && p.precio > 0;
  }

  function formatoPrecio(valor) {
    return fmt.format(valor).replace(/ /g, ' ');
  }

  // ¿Hay al menos un producto con precio? Decide si se muestran el total,
  // el orden por precio y el filtro de precio.
  function hayPrecios() {
    return ECM.PRODUCTOS.some(tienePrecio);
  }

  /* ── Iconos (sprite inyectado en cada página) ────────────────────────── */
  function icono(id, clase) {
    return '<svg viewBox="0 0 24 24" class="' + (clase || '') + '" aria-hidden="true">' +
           '<use href="#' + id + '"></use></svg>';
  }

  /* ── Imágenes: LQIP + srcset + carga diferida ────────────────────────── */
  function figura(base, alt, ops) {
    ops = ops || {};
    var sizes = ops.sizes || '(min-width:900px) 280px, 46vw';
    var lqip = ECM.LQIP && ECM.LQIP[base];
    var fondo = lqip ? ' style="background-image:url(' + lqip + ')"' : '';
    var carga = ops.prioridad ? 'eager' : 'lazy';
    var prio = ops.prioridad ? ' fetchpriority="high"' : '';
    return (
      '<span class="foto ' + (ops.claseCaja || '') + '"' + fondo + '>' +
        '<picture>' +
          '<source type="image/webp" srcset="' +
            'assets/img/' + base + '-400.webp 400w, ' +
            'assets/img/' + base + '-760.webp 760w, ' +
            'assets/img/' + base + '-1200.webp 1200w" sizes="' + sizes + '">' +
          '<img src="assets/img/' + base + '-760.jpg" alt="' + esc(alt) + '"' +
            ' loading="' + carga + '"' + prio + ' decoding="async" width="760" height="760">' +
        '</picture>' +
      '</span>'
    );
  }

  // Marca cada imagen como lista para que entre con un fundido sobre el LQIP.
  function activarFotos(raiz) {
    $$('.foto img', raiz || document).forEach(function (img) {
      if (img.dataset.listo) return;
      img.dataset.listo = '1';
      if (img.complete && img.naturalWidth > 0) {
        img.classList.add('lista');
      } else {
        img.addEventListener('load', function () { img.classList.add('lista'); }, { once: true });
        img.addEventListener('error', function () { img.classList.add('lista'); }, { once: true });
      }
    });
  }

  /* ── Almacenamiento seguro (modo privado no revienta) ────────────────── */
  var almacen = {
    disponible: (function () {
      try {
        var k = '__ecm_test__';
        localStorage.setItem(k, '1');
        localStorage.removeItem(k);
        return true;
      } catch (e) { return false; }
    })(),
    leer: function (clave) {
      if (!this.disponible) return null;
      try { return localStorage.getItem(clave); } catch (e) { return null; }
    },
    escribir: function (clave, valor) {
      if (!this.disponible) return false;
      try { localStorage.setItem(clave, valor); return true; } catch (e) { return false; }
    },
  };

  /* ── URLs ────────────────────────────────────────────────────────────── */
  function urlProducto(p) { return 'gorra-' + p.slug + '.html'; }
  function urlAbsoluta(rel) {
    var base = String(CONFIG.sitio.url || '').replace(/\/+$/, '');
    return base + '/' + String(rel).replace(/^\/+/, '');
  }
  function waUrl(texto) {
    return 'https://wa.me/' + CONFIG.whatsapp.numero +
           (texto ? '?text=' + encodeURIComponent(texto) : '');
  }

  /* ── Toast ───────────────────────────────────────────────────────────── */
  function toast(texto, tipo) {
    var zona = $('#toasts');
    if (!zona) return;
    var el = document.createElement('div');
    el.className = 'toast toast--' + (tipo || 'ok');
    el.innerHTML = icono(tipo === 'aviso' ? 'i-alerta' : 'i-check-circulo') +
                   '<span>' + esc(texto) + '</span>';
    zona.appendChild(el);
    setTimeout(function () {
      el.classList.add('saliendo');
      setTimeout(function () { el.remove(); }, 200);
    }, 2500);
  }

  /* ── Bloqueo de scroll con contador (varios paneles a la vez) ────────── */
  var bloqueos = 0;
  function bloquearScroll(activar) {
    bloqueos = Math.max(0, bloqueos + (activar ? 1 : -1));
    document.body.style.overflow = bloqueos > 0 ? 'hidden' : '';
  }

  /* ── Trampa de foco para paneles modales ─────────────────────────────── */
  var FOCOS = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

  function atraparFoco(panel) {
    function alTabular(ev) {
      if (ev.key !== 'Tab') return;
      var items = $$(FOCOS, panel).filter(function (el) { return el.offsetParent !== null; });
      if (!items.length) return;
      var primero = items[0], ultimo = items[items.length - 1];
      if (ev.shiftKey && document.activeElement === primero) {
        ev.preventDefault(); ultimo.focus();
      } else if (!ev.shiftKey && document.activeElement === ultimo) {
        ev.preventDefault(); primero.focus();
      }
    }
    panel.addEventListener('keydown', alTabular);
    return function () { panel.removeEventListener('keydown', alTabular); };
  }

  function enfocarPrimero(panel) {
    var el = $$(FOCOS, panel).filter(function (e) { return e.offsetParent !== null; })[0];
    if (el) el.focus();
  }

  /* ── Revelado al hacer scroll ─────────────────────────────────────────────
     Si no hay IntersectionObserver, todo queda visible. Además, una red de
     seguridad muestra lo que quede sin revelar tras 1,5 s: nunca se pierde
     contenido por culpa de la animación.                                   */
  function iniciarRevelado() {
    var items = $$('.revelar');
    if (!items.length) return;

    // Sin IntersectionObserver, con movimiento reducido o con ?sinanim en la
    // URL (útil para revisar la página o tomar capturas), todo entra visible.
    var sinAnimacion =
      !('IntersectionObserver' in window) ||
      location.search.indexOf('sinanim') !== -1 ||
      (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    if (sinAnimacion) {
      items.forEach(function (el) { el.classList.add('visible'); });
      return;
    }
    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.04 });

    items.forEach(function (el) { obs.observe(el); });

    setTimeout(function () {
      $$('.revelar:not(.visible)').forEach(function (el) {
        if (el.getBoundingClientRect().top < window.innerHeight * 1.2) el.classList.add('visible');
      });
    }, 1500);
  }

  /* ── Revisión del catálogo (solo avisa en consola, no rompe nada) ────── */
  function revisarCatalogo() {
    var errores = [];
    var vistos = {};
    (ECM.PRODUCTOS || []).forEach(function (p, i) {
      var d = 'producto[' + i + '] ' + (p.nombre || '(sin nombre)');
      if (p.id == null) errores.push(d + ': falta "id"');
      if (vistos[p.id]) errores.push(d + ': el id ' + p.id + ' está repetido');
      vistos[p.id] = true;
      if (!p.slug) errores.push(d + ': falta "slug"');
      if (CONFIG.taxonomia.marcas.indexOf(p.marca) === -1) {
        errores.push(d + ': la marca "' + p.marca + '" no está en CONFIG.taxonomia.marcas');
      }
      if (CONFIG.taxonomia.tipos.indexOf(p.tipo) === -1) {
        errores.push(d + ': el tipo "' + p.tipo + '" no está en CONFIG.taxonomia.tipos');
      }
      if (!p.imagenes || !p.imagenes.length) errores.push(d + ': no tiene imágenes');
      (p.colores || []).forEach(function (c) {
        if (!CONFIG.taxonomia.colores[c]) {
          errores.push(d + ': el color "' + c + '" no está en CONFIG.taxonomia.colores');
        }
      });
      if (p.precio !== null && !tienePrecio(p)) {
        errores.push(d + ': "precio" debe ser un número mayor que 0, o null');
      }
    });
    if (errores.length) {
      console.warn('[EXCLUSIVE CAPS MED] Revisa js/productos.js:\n· ' + errores.join('\n· '));
    }
    return errores;
  }

  /* ── Exporta ─────────────────────────────────────────────────────────── */
  ECM.u = {
    $: $, $$: $$, esc: esc, normalizar: normalizar, debounce: debounce,
    tienePrecio: tienePrecio, formatoPrecio: formatoPrecio, hayPrecios: hayPrecios,
    icono: icono, figura: figura, activarFotos: activarFotos,
    almacen: almacen, urlProducto: urlProducto, urlAbsoluta: urlAbsoluta, waUrl: waUrl,
    toast: toast, bloquearScroll: bloquearScroll,
    atraparFoco: atraparFoco, enfocarPrimero: enfocarPrimero,
    iniciarRevelado: iniciarRevelado, revisarCatalogo: revisarCatalogo,
  };
})();
