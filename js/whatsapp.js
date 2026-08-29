/* ═══════════════════════════════════════════════════════════════════════════
   EXCLUSIVE CAPS MED · mensajes de WhatsApp
   Un solo sitio donde se arma el texto. El número sale siempre de
   CONFIG.whatsapp.numero — nunca escrito a mano.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var ECM = (window.ECM = window.ECM || {});
  var u = ECM.u;
  var CONFIG = ECM.CONFIG;

  function precioTexto(p) {
    return u.tienePrecio(p) ? u.formatoPrecio(p.precio) : 'Por confirmar';
  }

  /* ── Saludo general (header, footer, botones sueltos) ────────────────── */
  function general() {
    return u.waUrl('Hola ' + CONFIG.marca + ', quiero información sobre las gorras.');
  }

  /* ── Consulta por un producto ────────────────────────────────────────── */
  function consulta(p, cantidad) {
    var l = [];
    l.push('Hola *' + CONFIG.marca + '*, vi esta gorra en la página y quiero más información.');
    l.push('');
    l.push('*Producto:* ' + p.nombre);
    l.push('*Marca:* ' + p.marca);
    l.push('*Tipo:* ' + p.tipo);
    if (p.sku) l.push('*Referencia:* ' + p.sku);
    if (u.tienePrecio(p)) l.push('*Precio:* ' + u.formatoPrecio(p.precio));
    if (cantidad && cantidad > 1) l.push('*Cantidad:* ' + cantidad);
    l.push('*Enlace:* ' + u.urlAbsoluta(u.urlProducto(p)));
    l.push('');
    l.push(u.tienePrecio(p)
      ? '¿Me confirman disponibilidad, por favor?'
      : '¿Me confirman precio y disponibilidad, por favor?');
    return u.waUrl(l.join('\n'));
  }

  /* ── Aviso de reingreso para un producto agotado ─────────────────────── */
  function avisarme(p) {
    return u.waUrl(
      'Hola *' + CONFIG.marca + '*, la gorra *' + p.nombre + '* aparece agotada.\n' +
      'Enlace: ' + u.urlAbsoluta(u.urlProducto(p)) + '\n\n' +
      '¿Me avisan cuando vuelva a entrar?'
    );
  }

  /* ── Pedido completo del carrito ─────────────────────────────────────── */
  function pedido(datos) {
    var items = ECM.Carrito.items();
    var t = ECM.Carrito.total();
    var l = [];

    l.push('Hola *' + CONFIG.marca + '*, quiero hacer este pedido desde la página.');
    l.push('');
    l.push('*DATOS DEL CLIENTE*');
    l.push('Nombre: ' + datos.nombre);
    l.push('Teléfono: ' + datos.telefono);
    if (datos.ciudad) l.push('Ciudad: ' + datos.ciudad);
    if (datos.direccion) l.push('Dirección: ' + datos.direccion);
    l.push('');
    l.push('*PEDIDO*');

    items.forEach(function (it, i) {
      var p = it.producto;
      l.push('');
      l.push('*' + (i + 1) + ')* ' + p.nombre);
      l.push('Cantidad: ' + it.cantidad);
      l.push('Valor unitario: ' + precioTexto(p));
      l.push('Subtotal: ' + (u.tienePrecio(p)
        ? u.formatoPrecio(p.precio * it.cantidad)
        : 'Por confirmar'));
      l.push(u.urlAbsoluta(u.urlProducto(p)));
    });

    l.push('');
    l.push('*Artículos en total:* ' + ECM.Carrito.unidades());
    if (t.completo) {
      l.push('*Total del pedido:* ' + u.formatoPrecio(t.valor));
    } else if (t.valor > 0) {
      l.push('*Subtotal con precio publicado:* ' + u.formatoPrecio(t.valor));
      l.push('*Total del pedido:* por confirmar (hay artículos sin precio publicado)');
    } else {
      l.push('*Total del pedido:* por confirmar');
    }

    if (datos.nota) {
      l.push('');
      l.push('*Nota:* ' + datos.nota);
    }

    l.push('');
    l.push('Quedo atento(a) para coordinar el pago y la entrega.');

    return { url: u.waUrl(l.join('\n')), texto: l.join('\n') };
  }

  ECM.WA = {
    general: general,
    consulta: consulta,
    avisarme: avisarme,
    pedido: pedido,
  };
})();
