# EXCLUSIVE CAPS MED — manual de la tienda

Tienda en línea de gorras. Hecha con HTML, CSS y JavaScript puros: **no necesita
instalar nada, ni base de datos, ni servidor especial**. Se sube a cualquier
hosting y funciona.

---

## Lo más importante en 30 segundos

| Quiero… | Abro… | Y cambio… |
|---|---|---|
| Cambiar el número de WhatsApp | `js/config.js` | `whatsapp.numero` y `whatsapp.visible` |
| Poner precios | `js/productos.js` | el campo `precio` de cada gorra |
| Agregar una gorra nueva | `js/productos.js` | copio un bloque completo |
| Cambiar el Instagram | `js/config.js` | `instagram.usuario` y `instagram.url` |
| Cambiar las preguntas frecuentes | `js/config.js` | la lista `faq` |
| Cambiar el carrusel de la portada | `js/config.js` | la lista `carrusel` |
| Cambiar las colecciones Melos Caps | `js/productos.js` | la lista `COLECCIONES` al final |

Después de tocar `js/productos.js` o el dominio, hay que correr **un solo comando**
(ver [Regenerar la web](#regenerar-la-web)).

---

## 1. Cambiar el número de WhatsApp

Abre `js/config.js` y busca esto:

```js
whatsapp: {
  numero: '573222544571',
  visible: '322 254 4571',
},
```

- `numero`: es el que usan los enlaces. Va en formato internacional, **sin el `+`,
  sin espacios y sin guiones**. El `57` del principio es Colombia.
  Ejemplo: el número `310 555 1234` se escribe `573105551234`.
- `visible`: es como se le muestra al cliente en pantalla. Aquí sí puedes usar espacios.

Con eso queda actualizado **todo**: el botón del menú, la barra de abajo, los
botones de cada gorra, el pie de página y el mensaje del pedido. No hay que
buscar el número en ningún otro archivo.

---

## 2. Poner los precios

Hoy la tienda muestra **"Precio por WhatsApp"** en todas las gorras, porque
todavía no nos pasaste la lista de precios. No se inventó ninguno.

Para activarlos, abre `js/productos.js` y cambia el `null` por el número:

```js
precio: null,        →     precio: 165000,
```

Reglas:
- Solo el número. **Sin `$`, sin puntos y sin comas.** `165000`, no `$165.000`.
- Si quieres mostrar un descuento, usa además `precioAntes: 190000`.

Apenas una gorra tenga precio, la tienda enciende sola:
- el precio en la tarjeta y en la ficha,
- el total del carrito,
- el ordenamiento por precio (menor a mayor y mayor a menor),
- el precio dentro del mensaje de WhatsApp.

Si dejas alguna gorra en `null`, esa seguirá diciendo "Precio por WhatsApp" y el
total del carrito avisará que hay artículos por confirmar. Nunca muestra `$0`.

---

## 3. El carrusel de la portada

Arriba del todo rotan las diapositivas de campaña: foto grande, título, una
frase corta y el botón **Comprar ahora**. Se configuran en `js/config.js`:

```js
carrusel: [
  {
    producto: 'new-era-9fifty-ny-yankees-roses',
    titulo: 'NY Roses',
    texto: 'El clásico NY atravesado por rosas rojas bordadas.',
    cta: 'Comprar ahora',
  },
],
```

La foto y el enlace los toma del producto: tú solo escribes el título de
campaña y la frase. Para quitar una diapositiva borra su bloque; para agregar
otra copia uno y cambia el `producto` por el `slug` de la gorra.

- `carruselSegundos: 6` es lo que dura cada una. Pon `0` para que no rote sola.
- Si dejas la lista vacía, el carrusel se arma solo con las gorras destacadas.
- Deja de rotar apenas el visitante desliza o toca una flecha, y no rota nunca
  si el celular tiene activado "reducir movimiento".

En celular la foto va arriba, en un cuadro a todo el ancho, y el texto debajo
sobre el fondo claro. Se hizo así porque encima de una gorra oscura el titular
no se alcanzaba a leer. En pantallas anchas pasa a dos columnas (texto | foto).

La primera diapositiva es la **portada**: en vez de `producto` lleva `imagen`
(el nombre del archivo en `assets/img`, sin el `-760.webp`) y no lleva `texto`.
Con `posicion` mueves el encuadre: `'50% 3%'` es «centrada a lo ancho, casi
pegada arriba». Súbele el segundo número para bajar el encuadre.

Después de cambiarlo: `node _tools/build-paginas.js`

---

## 3b. Las colecciones de Melos Caps

Debajo del catálogo hay una franja con los pósters de campaña de Melos Caps.
No son productos que se puedan agregar al carrito: cada póster lleva a WhatsApp
para preguntar por esa colección.

Se configuran al final de `js/productos.js`, en la lista `COLECCIONES`:

```js
{ imagen: 'col-haru', nombre: 'Haru', nota: 'Bordados japoneses sobre corona crema' },
```

**¿Por qué no están en el catálogo?** Las fotos que nos pasaste de Melos Caps son
afiches de colección: cada uno muestra la misma gorra en cuatro ángulos sobre un
fondo ilustrado, y uno de ellos dice «coming soon». No hay fotos sueltas de
producto ni nombres comerciales confirmados. Cuando nos pases fotos sobre fondo
limpio y los nombres, las subimos al catálogo como gorras que se pueden comprar.

---

## 3c. El mosaico de «Entregas»

Cerca del final de la portada hay una sección para mostrar **fotos reales de
gorras entregadas a clientes**. Se llena sola: no hay que tocar ningún archivo
de configuración.

1. Guarda las fotos en la misma carpeta `gorras` donde están las de producto.
2. Ponles un nombre que **empiece por `entrega`**: `entrega1.jpg`,
   `entrega-daniela.png`, `entrega 07.jpeg`… el orden del mosaico es el orden
   alfabético de esos nombres.
3. Corre los dos comandos de siempre:

```
node _tools/build-images.js
node _tools/build-paginas.js
```

Las fotos se recortan solas a cuadrado buscando lo importante de la imagen. La
primera ocupa el doble de espacio para que el mosaico no parezca una tabla.

**Mientras no haya ninguna foto**, la sección no muestra un mosaico vacío ni de
relleno: se queda con el título «Míralas de cerca» y el botón de Instagram.

---

## 4. Agregar una gorra nueva

En `js/productos.js`, copia un bloque completo (desde `{` hasta `},`) y pégalo
al principio de la lista para que salga primero. Luego cambia:

| Campo | Qué poner |
|---|---|
| `id` | Un número que no se repita. **Nunca cambies el de una gorra existente**: es la llave del carrito. |
| `slug` | El nombre para la dirección web, en minúsculas y con guiones. Genera el archivo `gorra-<slug>.html` |
| `nombre` | El nombre comercial |
| `marca` | Debe estar escrita igual que en `config.js` → `taxonomia.marcas` |
| `tipo` | Béisbol, Trucker, Snapback, Dad Hat o Fitted |
| `colores` | Los que existan en `config.js` → `taxonomia.colores` |
| `imagenes` | Los nombres de archivo, **sin** el `-400.webp` del final |
| `disponible` | `true` para vender, `false` para mostrarla como AGOTADA |

Si escribes mal una marca, un tipo o un color, la tienda **te avisa en la consola
del navegador** (tecla F12 → pestaña Console) diciendo exactamente qué corregir.

### Marcas y tipos nuevos

Si vas a vender una marca que no está (por ejemplo, Melos Caps), agrégala primero
en `js/config.js`:

```js
marcas: ['New Era', 'Melos Caps', 'Americanino'],
```

Las marcas y los tipos que todavía no tienen productos aparecen como
**"Pronto en catálogo"** y no llevan a un catálogo vacío.

---

## 5. Agregar las fotos de una gorra

1. Deja las fotos originales en una carpeta.
2. Abre `_tools/build-images.js` y agrega una línea por foto en la lista
   `RECORTES`, indicando el recorte que quieres.
3. Corre:

   ```bash
   node _tools/build-images.js
   node _tools/gen-lqip.js
   ```

Esto genera, para cada foto, las versiones de 400, 760 y 1200 píxeles en formato
WebP (el que menos pesa), un JPG de respaldo y la miniatura borrosa que se ve
mientras carga.

**Atajo:** si las fotos ya vienen listas y bien recortadas, solo tienes que
guardarlas en `assets/img/` con los nombres `mi-gorra-400.webp`,
`mi-gorra-760.webp`, `mi-gorra-1200.webp` y `mi-gorra-760.jpg`, y poner
`imagenes: ['mi-gorra']` en el producto.

---

## 6. Regenerar la web

Cada vez que cambies **productos** o el **dominio**, corre:

```bash
node _tools/build-paginas.js
```

Eso vuelve a armar `index.html`, `catalogo.html`, la ficha de cada gorra,
`404.html`, `sitemap.xml`, `robots.txt` y `site.webmanifest`.

> Los archivos `.html` de la raíz **no se editan a mano**: se generan. Si quieres
> cambiar la estructura de una página, edita las plantillas de
> `_tools/plantilla/` y vuelve a correr el comando.

Si cambias solo textos de `js/config.js` (WhatsApp, Instagram, FAQ, beneficios),
la mayoría se actualiza sola al recargar; correr el comando igual no hace daño y
deja el `sitemap` y el schema al día.

---

## 7. Verla en tu computador

```bash
node serve.js
```

Y abre `http://localhost:5305`.

También puedes abrir `index.html` con doble clic: la tienda funciona igual porque
todas las rutas son relativas.

---

## 8. Publicarla en internet

Sube **todo el contenido de la carpeta** (menos `_tools/`, que son las
herramientas de trabajo) a la raíz del hosting.

Antes de publicar, cambia el dominio en `js/config.js`:

```js
sitio: {
  url: 'https://exclusivecapsmed.com',
},
```

y corre `node _tools/build-paginas.js` para que las direcciones del `sitemap`,
las etiquetas `canonical` y las vistas previas de WhatsApp y Facebook queden
apuntando a tu dominio real.

---

## 9. Cómo llega un pedido

1. El cliente agrega gorras al carrito (se le guardan aunque cierre la página).
2. Pulsa **Finalizar pedido por WhatsApp**.
3. Llena nombre, teléfono, ciudad y, si quiere, dirección y una nota.
4. Se le abre WhatsApp con el mensaje ya escrito, dirigido a tu número.

El mensaje te llega así:

```
Hola *EXCLUSIVE CAPS MED*, quiero hacer este pedido desde la página.

*DATOS DEL CLIENTE*
Nombre: Ana Gómez
Teléfono: 3001234567
Ciudad: Medellín
Dirección: Calle 10 #43-20

*PEDIDO*

*1)* New Era 9FIFTY Shohei Ohtani 17
Cantidad: 2
Valor unitario: Por confirmar
Subtotal: Por confirmar
https://exclusivecapsmed.com/gorra-new-era-9fifty-shohei-ohtani-17.html

*Artículos en total:* 2
*Total del pedido:* por confirmar

Quedo atento(a) para coordinar el pago y la entrega.
```

Cuando cargues los precios, las líneas "Por confirmar" se reemplazan solas por
los valores reales.

El carrito **no se vacía** después de enviar: la página no puede saber si el
cliente realmente mandó el mensaje, y vaciarlo le haría perder el pedido.

---

## 10. Qué NO dice la página (y por qué)

La tienda no promete envíos gratis, plazos de entrega, garantías, devoluciones ni
métodos de pago, porque esas políticas todavía no están definidas. Tampoco hay
testimonios ni calificaciones.

Cuando las definas, edita `confianza` y `faq` en `js/config.js` para incluirlas.
Es preferible no prometer nada a prometer algo que después no se pueda cumplir.

---

## 11. Estructura de archivos

```
exclusive-caps-med/
├── index.html, catalogo.html, gorra-*.html, 404.html   ← generados
├── sitemap.xml, robots.txt, site.webmanifest           ← generados
├── serve.js                    servidor para ver la web en tu computador
│
├── css/
│   ├── base.css                colores, tipografías, utilidades
│   ├── componentes.css         botones, tarjetas, carrito, menús
│   └── paginas.css             portada, catálogo, ficha, pie
│
├── js/
│   ├── config.js               ← LO EDITAS TÚ (negocio)
│   ├── productos.js            ← LO EDITAS TÚ (catálogo)
│   ├── lqip.js                 generado
│   ├── nucleo.js               utilidades comunes
│   ├── carrito.js              carrito y su guardado
│   ├── whatsapp.js             armado de los mensajes
│   ├── ui-comunes.js           header, menú, carrito, checkout
│   ├── ui-catalogo.js          tarjetas, filtros, buscador
│   ├── ui-producto.js          galería, zoom, botones de la ficha
│   └── main.js                 arranque
│
├── assets/
│   ├── logo/                   emblema, iconos, portada para redes
│   ├── img/                    fotos de las gorras
│   └── fonts/                  tipografías (no dependen de internet)
│
└── _tools/                     NO se sube al hosting
    ├── build-paginas.js        genera los HTML y el sitemap
    ├── build-images.js         recorta y optimiza las fotos
    ├── gen-lqip.js             miniaturas de carga
    └── plantilla/              trozos de HTML reutilizables
```

---

## 12. Pendientes

- [ ] Cargar los precios reales de las 16 gorras en `js/productos.js`.
- [ ] Comprar el dominio y actualizarlo en `js/config.js` → `sitio.url`.
- [ ] Enviar fotos de producto sueltas de las gorras Melos Caps para pasarlas de
      «colección» a producto comprable.
- [ ] Confirmar disponibilidad real de cada modelo (hoy todas salen disponibles).
- [ ] Definir políticas de envío y pago para poder anunciarlas.
- [ ] Mandar fotos de gorras entregadas a clientes para llenar el mosaico de
      «Entregas» (ver el punto 3c).
