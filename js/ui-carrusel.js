/* ═══════════════════════════════════════════════════════════════════════════
   EXCLUSIVE CAPS MED · carrusel de la portada
   El desplazamiento lo hace el navegador con scroll-snap: aquí solo van los
   puntos, las flechas, el teclado y el paso automático. Así se desliza con el
   dedo de forma natural y sigue funcionando aunque este archivo no cargue.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var ECM = (window.ECM = window.ECM || {});
  var u = ECM.u;

  function iniciar() {
    var carrusel = u.$('#carrusel');
    var pista = u.$('#carrusel-pista');
    var zonaPuntos = u.$('#carrusel-puntos');
    if (!carrusel || !pista) return;

    var slides = u.$$('.dia', pista);
    if (slides.length < 2) {
      // Con una sola diapositiva no hay nada que controlar
      var mando = u.$('.carrusel-mando', carrusel);
      if (mando) mando.hidden = true;
      return;
    }

    var actual = 0;
    var temporizador = null;
    var detenido = false;   // el usuario tomó el control: no volver a rotar

    var reducido = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var segundos = Number(ECM.CONFIG.carruselSegundos);
    if (!isFinite(segundos) || segundos <= 0 || reducido) segundos = 0;

    /* ── Puntos ────────────────────────────────────────────────────────── */
    zonaPuntos.innerHTML = slides.map(function (s, i) {
      return '<button type="button" class="carrusel-punto" role="tab"' +
             ' aria-selected="' + (i === 0) + '"' +
             ' aria-label="Ver la diapositiva ' + (i + 1) + ' de ' + slides.length + '"></button>';
    }).join('');
    var puntos = u.$$('.carrusel-punto', zonaPuntos);

    function marcar(i) {
      actual = i;
      puntos.forEach(function (b, n) { b.setAttribute('aria-selected', String(n === i)); });
      // Lo que no se ve no debe ser alcanzable con el tabulador
      slides.forEach(function (s, n) {
        u.$$('a, button', s).forEach(function (el) {
          if (n === i) el.removeAttribute('tabindex');
          else el.setAttribute('tabindex', '-1');
        });
      });
    }

    // Mientras dura un desplazamiento provocado por un botón, el listener de
    // scroll NO manda: si no, a mitad de la animación calcula la diapositiva
    // intermedia y el punto se queda una posición atrás.
    var moviendo = null;

    function irA(i, suave) {
      var n = (i + slides.length) % slides.length;
      clearTimeout(moviendo);
      moviendo = setTimeout(function () { moviendo = null; sincronizar(); }, 700);
      pista.scrollTo({ left: slides[n].offsetLeft, behavior: suave === false ? 'auto' : 'smooth' });
      marcar(n);
    }

    /* ── Los puntos siguen a la posición real al deslizar con el dedo ──── */
    function sincronizar() {
      var i = Math.round(pista.scrollLeft / pista.clientWidth);
      if (slides[i] && i !== actual) marcar(i);
    }

    var pendiente = false;
    pista.addEventListener('scroll', function () {
      if (moviendo || pendiente) return;
      pendiente = true;
      requestAnimationFrame(function () {
        pendiente = false;
        sincronizar();
      });
    }, { passive: true });

    if ('onscrollend' in pista) {
      pista.addEventListener('scrollend', function () {
        clearTimeout(moviendo);
        moviendo = null;
        sincronizar();
      });
    }

    /* ── Paso automático ───────────────────────────────────────────────── */
    function arrancar() {
      if (!segundos || detenido) return;
      parar();
      temporizador = setInterval(function () { irA(actual + 1); }, segundos * 1000);
    }
    function parar() { if (temporizador) { clearInterval(temporizador); temporizador = null; } }

    // Si el usuario toca, desliza o usa el teclado, deja de rotar solo: nada
    // más molesto que la diapositiva cambiando mientras se lee.
    function tomarControl() { detenido = true; parar(); }

    ['pointerdown', 'touchstart', 'wheel'].forEach(function (ev) {
      pista.addEventListener(ev, tomarControl, { passive: true });
    });

    carrusel.addEventListener('mouseenter', parar);
    carrusel.addEventListener('mouseleave', arrancar);
    carrusel.addEventListener('focusin', parar);
    carrusel.addEventListener('focusout', function (e) {
      if (!carrusel.contains(e.relatedTarget)) arrancar();
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) parar(); else arrancar();
    });

    /* ── Mandos ────────────────────────────────────────────────────────── */
    puntos.forEach(function (b, i) {
      b.addEventListener('click', function () { tomarControl(); irA(i); });
    });
    u.$$('[data-ir]', carrusel).forEach(function (b) {
      b.addEventListener('click', function () {
        tomarControl();
        irA(actual + Number(b.getAttribute('data-ir')));
      });
    });

    carrusel.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); tomarControl(); irA(actual + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); tomarControl(); irA(actual - 1); }
    });

    // Al girar el teléfono cambia el ancho: hay que recolocar la diapositiva
    window.addEventListener('resize', u.debounce(function () { irA(actual, false); }, 150));

    marcar(0);
    arrancar();
  }

  ECM.Carrusel = { iniciar: iniciar };
})();
