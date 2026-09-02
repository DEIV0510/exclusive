/* ═══════════════════════════════════════════════════════════════════════════
   EXCLUSIVE CAPS MED · arranque
   Lee <body data-pagina="..."> y enciende solo lo que esa página necesita.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var ECM = (window.ECM = window.ECM || {});
  var u = ECM.u;

  /* ── Bloques que la portada arma desde config.js ─────────────────────── */
  function pintarHome() {
    var CONFIG = ECM.CONFIG;

    // Rejilla de la portada: solo una selección. El catálogo completo vive en
    // catalogo.html; meterlo entero aquí duplicaba el peso de la primera
    // visita sin que el cliente viera nada nuevo.
    var grid = u.$('#home-grid');
    if (grid) {
      var destacados = ECM.PRODUCTOS.filter(function (p) { return p.destacado; });
      var seleccion = (destacados.length ? destacados : ECM.PRODUCTOS).slice(0, 8);
      ECM.Catalogo.pintarRejilla(grid, seleccion, 2);

      var conteo = u.$('#home-conteo');
      if (conteo) {
        var n = ECM.PRODUCTOS.length;
        conteo.textContent = n + (n === 1 ? ' gorra' : ' gorras');
      }
    }

    // Marcas
    var marcas = u.$('#marcas-lista');
    if (marcas) {
      marcas.innerHTML = CONFIG.taxonomia.marcas.map(function (m) {
        var n = ECM.PRODUCTOS.filter(function (p) { return p.marca === m; }).length;
        if (!n) {
          return '<div class="marca marca--pronto">' +
            '<span class="marca-nombre">' + u.esc(m) + '</span>' +
            '<span class="marca-meta">Pronto en catálogo</span></div>';
        }
        return '<a class="marca" href="catalogo.html?marca=' + encodeURIComponent(m) + '">' +
          '<span class="marca-nombre">' + u.esc(m) + '</span>' +
          '<span class="marca-meta">' + n + (n === 1 ? ' modelo' : ' modelos') + '</span></a>';
      }).join('');
    }

    // Bloques de confianza
    var conf = u.$('#confianza');
    if (conf) {
      var iconos = {
        carrito: 'i-carrito', chat: 'i-chat', estrella: 'i-estrella', gorra: 'i-gorra',
      };
      conf.innerHTML = CONFIG.confianza.map(function (b) {
        return '<div class="confianza-item">' + u.icono(iconos[b.icono] || 'i-check-circulo') +
          '<b>' + u.esc(b.titulo) + '</b><p>' + u.esc(b.texto) + '</p></div>';
      }).join('');
    }

    // Cómo comprar
    var pasos = u.$('#pasos');
    if (pasos) {
      pasos.innerHTML = CONFIG.pasos.map(function (p) {
        return '<div class="paso"><div><b>' + u.esc(p.titulo) + '</b>' +
          '<p>' + u.esc(p.texto) + '</p></div></div>';
      }).join('');
    }
  }

  /* ── Arranque ─────────────────────────────────────────────────────────── */
  function iniciar() {
    // Si el catálogo no cargó, se avisa en vez de dejar la página muda
    if (!ECM.PRODUCTOS || !ECM.CONFIG) {
      var g = document.querySelector('#grid, #home-grid');
      if (g) {
        g.innerHTML = '<div class="vacio" style="grid-column:1/-1"><h3>No pudimos cargar el catálogo</h3>' +
          '<p>Recarga la página. Si sigue igual, escríbenos por WhatsApp.</p>' +
          '<div class="vacio-acciones"><button type="button" class="btn btn--primario" ' +
          'onclick="location.reload()">Reintentar</button></div></div>';
      }
      var c = document.getElementById('carga');
      if (c) c.remove();
      return;
    }

    ECM.u.revisarCatalogo();
    ECM.Comunes.iniciar();

    var pagina = document.body.getAttribute('data-pagina');

    if (pagina === 'home') {
      pintarHome();
      if (ECM.Carrusel) ECM.Carrusel.iniciar();
    }
    if (pagina === 'catalogo') ECM.Catalogo.iniciar();
    if (pagina === 'producto') ECM.Producto.iniciar();

    // Enlaces de WhatsApp que se pintaron después del arranque
    var wa = ECM.WA.general();
    u.$$('[data-wa]').forEach(function (a) { if (!a.href || a.href.endsWith('#')) a.href = wa; });

    u.iniciarRevelado();
    u.activarFotos();

    // La pantalla de carga se retira en cuanto hay contenido pintado.
    // El temporizador de 700 ms es una red de seguridad, no una espera.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        setTimeout(ECM.Comunes.quitarCarga, 120);
      });
    });
    setTimeout(ECM.Comunes.quitarCarga, 700);
    window.addEventListener('load', ECM.Comunes.quitarCarga);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
