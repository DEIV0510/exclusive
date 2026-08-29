/* ═══════════════════════════════════════════════════════════════════════════
   EXCLUSIVE CAPS MED · modelo del carrito
   Guarda solo { id, cantidad } en localStorage: así, cuando el dueño cambie
   nombres o precios en productos.js, los carritos ya guardados se actualizan
   solos en vez de quedarse con datos viejos.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var ECM = (window.ECM = window.ECM || {});
  var u = ECM.u;

  var CLAVE = 'ecm.carrito.v1';
  var MAX_UNIDADES = 99;

  var lineas = [];        // [{ id, cantidad }]
  var hidratado = false;  // hasta que no se lea, no se escribe nada
  var oyentes = [];

  /* ── Persistencia ────────────────────────────────────────────────────── */
  function cargar() {
    var crudo = u.almacen.leer(CLAVE);
    var datos = [];
    if (crudo) {
      try { datos = JSON.parse(crudo); } catch (e) { datos = []; }
    }
    if (!Array.isArray(datos)) datos = [];

    // Se descarta lo que ya no existe en el catálogo y se sanea la cantidad
    lineas = datos
      .filter(function (l) { return l && buscar(l.id); })
      .map(function (l) {
        var n = parseInt(l.cantidad, 10);
        if (!isFinite(n) || n < 1) n = 1;
        return { id: buscar(l.id).id, cantidad: Math.min(MAX_UNIDADES, n) };
      });

    // Une duplicados por si el almacenamiento venía corrupto
    var unidos = [];
    lineas.forEach(function (l) {
      var y = unidos.filter(function (x) { return x.id === l.id; })[0];
      if (y) y.cantidad = Math.min(MAX_UNIDADES, y.cantidad + l.cantidad);
      else unidos.push(l);
    });
    lineas = unidos;

    hidratado = true;
    return lineas;
  }

  function guardar() {
    if (!hidratado) return;   // guardia de hidratación: nunca borra al arrancar
    u.almacen.escribir(CLAVE, JSON.stringify(lineas));
  }

  /* ── Consultas ───────────────────────────────────────────────────────── */
  function buscar(id) {
    var lista = ECM.PRODUCTOS || [];
    for (var i = 0; i < lista.length; i++) {
      // == a propósito: el id guardado puede venir como texto del almacenamiento
      if (String(lista[i].id) === String(id)) return lista[i];
    }
    return null;
  }

  function items() {
    return lineas.map(function (l) {
      return { producto: buscar(l.id), cantidad: l.cantidad };
    }).filter(function (i) { return i.producto; });
  }

  // Líneas de productos que pasaron a AGOTADO después de guardarse.
  // No se borran solas (el cliente decide), pero sí se marcan y se excluyen
  // del pedido para no pedir algo que ya no hay.
  function agotados() {
    return items().filter(function (i) { return !i.producto.disponible; });
  }

  function pedibles() {
    return items().filter(function (i) { return i.producto.disponible; });
  }

  function unidades() {
    return lineas.reduce(function (s, l) { return s + l.cantidad; }, 0);
  }

  function vacio() { return lineas.length === 0; }

  // Total en pesos y si es o no un total completo.
  // parcial = true cuando hay productos sin precio cargado.
  function total() {
    var suma = 0, parcial = false, conPrecio = 0;
    pedibles().forEach(function (i) {
      if (u.tienePrecio(i.producto)) { suma += i.producto.precio * i.cantidad; conPrecio++; }
      else parcial = true;
    });
    return { valor: suma, parcial: parcial, completo: conPrecio > 0 && !parcial };
  }

  function cantidadDe(id) {
    var l = lineas.filter(function (x) { return String(x.id) === String(id); })[0];
    return l ? l.cantidad : 0;
  }

  /* ── Mutaciones ──────────────────────────────────────────────────────── */
  function agregar(id, cantidad) {
    var p = buscar(id);
    if (!p || !p.disponible) return false;
    cantidad = Math.max(1, parseInt(cantidad, 10) || 1);
    var l = lineas.filter(function (x) { return String(x.id) === String(p.id); })[0];
    if (l) l.cantidad = Math.min(MAX_UNIDADES, l.cantidad + cantidad);
    else lineas.push({ id: p.id, cantidad: Math.min(MAX_UNIDADES, cantidad) });
    guardar();
    avisar();
    return true;
  }

  function fijar(id, cantidad) {
    cantidad = parseInt(cantidad, 10) || 0;
    if (cantidad < 1) return quitar(id);
    var l = lineas.filter(function (x) { return String(x.id) === String(id); })[0];
    if (!l) return false;
    l.cantidad = Math.min(MAX_UNIDADES, cantidad);
    guardar();
    avisar();
    return true;
  }

  function sumar(id, delta) { return fijar(id, cantidadDe(id) + delta); }

  function quitar(id) {
    lineas = lineas.filter(function (x) { return String(x.id) !== String(id); });
    guardar();
    avisar();
    return true;
  }

  function vaciar() {
    lineas = [];
    guardar();
    avisar();
  }

  /* ── Suscripción ─────────────────────────────────────────────────────── */
  function alCambiar(fn) { oyentes.push(fn); }
  function avisar() { oyentes.forEach(function (fn) { fn(); }); }

  // Si el cliente tiene dos pestañas abiertas, el carrito se mantiene igual
  window.addEventListener('storage', function (ev) {
    if (ev.key !== CLAVE) return;
    cargar();
    avisar();
  });

  // Al volver con el botón "atrás", el navegador puede restaurar la página
  // desde su caché sin ejecutar el JS otra vez. Sin esto, la página seguiría
  // con el carrito viejo en memoria y la siguiente escritura borraría lo que
  // el cliente agregó en las páginas siguientes.
  window.addEventListener('pageshow', function (ev) {
    if (!ev.persisted) return;
    cargar();
    avisar();
  });

  ECM.Carrito = {
    cargar: cargar, items: items, agotados: agotados, pedibles: pedibles,
    unidades: unidades, vacio: vacio, total: total,
    cantidadDe: cantidadDe, agregar: agregar, fijar: fijar, sumar: sumar,
    quitar: quitar, vaciar: vaciar, alCambiar: alCambiar,
    almacenamientoDisponible: function () { return u.almacen.disponible; },
  };
})();
