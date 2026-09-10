# EXCLUSIVE CAPS MED · manual

Tu tienda tiene dos partes:

- **La tienda**, que es lo que ve el cliente.
- **El panel**, en `/admin`, donde tú cambias todo sin tocar código.

Ya no hay que editar archivos para cambiar la tienda. Todo se hace desde el
panel y se ve al instante.

---

## Lo más importante en 30 segundos

| Quiero… | Voy a… |
|---|---|
| Entrar al panel | `tudominio.com/admin` |
| Agregar una gorra | Productos → **+ Nuevo producto** |
| Cambiar un precio | Productos → Editar → Precio |
| Que una gorra no se vea | Productos → Editar → Estado: **oculto** |
| Cambiar el WhatsApp | Contacto → WhatsApp |
| Cambiar el correo | Contacto → Datos del negocio |
| Cambiar el carrusel de la portada | Página de inicio |
| Cambiar las fotos de "Colecciones" | Colecciones |
| Anunciar una promoción | Banners |
| Ver los pedidos | Pedidos |
| Cambiar mi contraseña | **Mi cuenta** |
| Ver a dónde llevar un pedido | Pedidos → columna **Entrega** |

---

## 1. Entrar al panel

Ve a `tudominio.com/admin`. Si no has entrado, te lleva a la pantalla de
ingreso. **Escribir la dirección a mano no sirve para colarse**: sin sesión el
panel no se entrega, ni siquiera a medias.

Si te equivocas de contraseña varias veces seguidas, el ingreso se bloquea
15 minutos. Es a propósito: así nadie puede probar contraseñas a lo bruto.

**Tu contraseña no está escrita en ninguna parte del proyecto.** Se guarda
convertida en un código que no se puede revertir. Si la pierdes, se crea un
usuario nuevo desde la consola (ver el punto 9).

---

## 2. Productos

Es la sección que más vas a usar.

### Agregar una gorra

**Productos → + Nuevo producto.** Lo mínimo que hace falta es el **nombre** y
el **tipo de gorra**. Todo lo demás es opcional.

Al guardar, la gorra aparece sola en:

- el catálogo
- su marca y su categoría
- el buscador
- su propia ficha, con su dirección web
- el mapa del sitio que lee Google

No hay que regenerar nada ni tocar ningún archivo.

### Precios

Escribe solo el número: `165000` o `165.000`, da igual. Si lo dejas **vacío**,
la tienda muestra «Precio por WhatsApp» en vez de inventar una cifra.

El *precio anterior* es para mostrar un descuento tachado. Tiene que ser mayor
que el precio actual o el panel no te deja guardar.

### Estados

| Estado | Qué pasa |
|---|---|
| **disponible** | Se ve y se puede agregar al carrito |
| **agotado** | Se ve, pero marcado como agotado y sin botón de compra |
| **oculto** | **No aparece en la tienda** y su ficha responde «no existe» |

Usa **oculto** para preparar una gorra antes de publicarla.

### Fotos

Toca **Subir fotos** dentro del producto. Puedes subir varias a la vez. La
primera de la fila es la principal; con **★** pones otra de principal y con
**◀ ▶** las reordenas.

**Varios ángulos de la misma gorra van todos en el mismo producto**, no como
productos separados. Para eso está la galería.

Las fotos se recortan y optimizan solas: se generan cuatro tamaños para que
carguen rápido en celular. Acepta JPG, PNG y WEBP hasta 9 MB.

Al quitar una foto de un producto, el archivo no se borra: sigue disponible por
si la quieres usar en otra gorra.

### Duplicar

**Duplicar** copia una gorra entera con sus fotos. La copia queda **oculta**
hasta que la revises, para que no se te escape a la tienda a medio hacer.

### Eliminar

Siempre pregunta antes. No se puede deshacer.

---

## 3. Categorías y marcas

Las categorías son los tipos de gorra (Béisbol, Trucker, Snapback, Dad Hat,
Fitted). Puedes crear, renombrar, ocultar y eliminar.

**Si le cambias el nombre a una categoría o a una marca, los productos que la
usaban se actualizan solos.** No se rompe nada.

**Si intentas eliminar una que tiene productos**, el panel te avisa cuántos son
y te pregunta. Si aceptas, los productos NO se borran, pero como la categoría
es obligatoria **quedan ocultos** hasta que les asignes otra. Así nunca sale a
la tienda un producto a medio armar.

Una categoría o marca **oculta** desaparece de los filtros de la tienda.

---

## 4. Página de inicio

Aquí editas la portada sin tocar código.

### Carrusel

Las diapositivas que rotan arriba. Cada una tiene un **«Qué muestra»** con dos
opciones, y se cambia cuando quieras:

- **Una gorra del catálogo**: la eliges y el carrusel toma su foto y su enlace.
  Las gorras ocultas salen marcadas: si eliges una, esa diapositiva no se ve en
  la tienda, y el panel te lo avisa.
- **Una foto que yo elija**: usa una foto suelta. Lleva la **foto de fondo**, el
  `encuadre` (qué parte de la foto se ve) y el `desenfoque` (cuánto se difumina
  el fondo, de 0 a 12; la primera está en 1).

Al cambiar de una a otra no se pierde nada: el título y los textos se quedan, y
si vuelves atrás recuperas la gorra o la foto que tenías.

La foto se elige con el botón **Subir foto** o **Elegir una que ya tengo**, y
se ve al lado mientras la escoges. Ya no hay que escribir el nombre del
archivo a mano.

Los campos tienen límite de caracteres y el panel te muestra el contador, para
que un título largo no rompa el diseño.

> El velo claro que va entre la foto y el texto está calculado para que el
> titular se lea encima de cualquier foto, incluso sobre una gorra negra. Está
> en `css/paginas.css`; si lo aclaras, mide el contraste otra vez.

### Bloques de confianza, cómo comprar y preguntas frecuentes

Se editan igual: añadir, reordenar con ↑ ↓, quitar y guardar. Las preguntas
frecuentes también alimentan lo que Google muestra en sus resultados.

**Escribe solo lo que puedas sostener.** Si cambias tus condiciones de envío o
de pago, edítalas aquí antes de prometerlas.

---

## 4 bis. Colecciones

La tira de pósters de la portada: va después del bloque de Medellín y antes de
«Con las que trabajamos», más o menos a media página. Cada
tarjeta es una foto grande con un nombre y una nota; al tocarla, el cliente
abre WhatsApp preguntando justo por esa colección.

**Colecciones → Editar** para cambiar la foto o el texto de una;
**+ Nueva colección** para añadir; **↑ ↓** para cambiar el orden en que salen.

- La foto se sube o se escoge de las que ya tiene la tienda, igual que en el
  carrusel. Al subir una se recorta a cuadrado y en la tarjeta se ve la parte
  del centro, así que deja lo importante en el medio.
- **Se muestra en la portada** apagado deja la colección guardada pero fuera
  de la tienda.
- Arriba de la lista se editan los tres textos del encabezado: el rótulo
  pequeño, el título grande y la frase de abajo.

Si borras todas las colecciones, **la sección entera desaparece de la
portada**: no queda un título con un hueco debajo.

---

## 4 ter. Banners

Son las tarjetas de promoción que salen **entre el carrusel de arriba y
«La selección»**, o sea lo primero que ve el cliente después de la portada.
Cada una lleva foto, título, texto y un botón con su enlace.

Están pensados para algo puntual: un 2x1, un envío gratis esta semana, una
gorra que acaba de llegar. **Si no hay ninguno activo, la sección no existe**,
así que la portada no cambia mientras no los uses.

El interruptor **Se muestra en la tienda** te deja dejarlos listos y
encenderlos cuando toque, sin volver a escribirlos.

---

## 5. Destacados

Una tabla con todas las gorras y tres casillas: **Destacado**, **Nuevo** y
**Exclusivo**. Marcar o desmarcar guarda al instante.

- *Destacado*: sale en la selección de la portada. **Caben 8**: si marcas más, salen las 8 primeras de la lista.
- *Nuevo* y *Exclusivo*: solo pintan una etiqueta en la tarjeta.

---

## 6. Contacto y redes

### WhatsApp

Cambiar el número aquí **actualiza toda la tienda de una vez**: el encabezado,
el menú, las fichas, el carrito, el cierre del pedido y el pie de página. No
hay que tocar nada más.

El número va en formato internacional y sin el signo `+`: `57` para Colombia,
por ejemplo `573222544571`.

### Redes

Instagram, TikTok y Facebook. Cada una tiene un interruptor, y las tres salen de verdad en el menú, en la franja de entregas y en el pie.

**Una red apagada, o sin enlace, no se muestra en la tienda.** Nunca queda un
botón que no lleva a ninguna parte.

---

## 7. Pedidos

Cuando un cliente cierra su pedido por WhatsApp, queda registrado aquí con su
referencia, la fecha, sus datos, **a dónde hay que llevarlo** (ciudad,
dirección y la nota que haya escrito), lo que pidió y el total.

**El total lo calcula el servidor con tus precios**, no el navegador del
cliente: así nadie puede manipularlo desde su teléfono.

Los estados son: nuevo → pendiente → confirmado → enviado → completado, o
cancelado. Son para tu control interno; el cliente no los ve.

> El registro va «a fondo perdido» a propósito: si el servidor falla, el cliente
> puede mandar su mensaje de WhatsApp igual. Nunca se le bloquea la compra por
> un problema nuestro.

---

## 8. Configuración

- **Dirección del sitio**: cámbiala cuando compres el dominio. Se usa en los
  enlaces que lee Google y en los que van dentro del mensaje de WhatsApp.
- **Buscadores**: título y descripción con los que sale en Google. Si los dejas
  vacíos se usan los de siempre.
- **Datos que se le piden al cliente** antes de armar el mensaje.

El **correo** se pone en Contacto → Datos del negocio. Si lo dejas vacío, la
fila del correo simplemente no aparece en el pie de página.

---

## 9. Administradores

Hay dos roles:

| | Administrador | Editor |
|---|---|---|
| Productos y contenido | Sí | Sí |
| Pedidos | Sí | Sí |
| Eliminar cosas | Sí | **No** |
| Configuración | Sí | **No** |
| Crear y borrar usuarios | Sí | **No** |

Esto no es solo esconder botones: el servidor rechaza la operación aunque
alguien intente saltarse la pantalla.

No se puede quedar la tienda sin ningún administrador: el panel te lo impide.

Al cambiar tu contraseña se cierran todas tus otras sesiones y tienes que
volver a entrar. La tuya se cambia en **Mi cuenta**, que es la única sección
que ve también un editor.

### Crear tu usuario

Desde el computador, en la carpeta del proyecto:

```
node _tools/sembrar.js --admin tu@correo.com --clave "TuContraseña2026"
```

La contraseña la eliges tú: mínimo 10 caracteres, con letras y números. Si
prefieres que te genere una, quita `--clave` y te la enseña **una sola vez**.

### Borrar un usuario

```
node _tools/sembrar.js --borrar-usuario otro@correo.com
```

No te dejará borrar al último administrador que quede.

### Si pierdes la contraseña

Crea otro usuario con el comando de arriba y borra el viejo.

---

## 10. Trabajar en el computador

```
npm install
node _tools/sembrar.js --admin tu@correo.com
node servidor-local.js
```

- Tienda: `http://localhost:5305`
- Panel: `http://localhost:5305/admin`

La base de datos local es el archivo `_datos/tienda.db`. Es solo tuya: no se
sube a producción.

Otros comandos:

```
node _tools/build-images.js     recorta y optimiza las fotos de la carpeta "gorras"
node _tools/build-paginas.js    saca una copia estática del sitio en _estatico/
npm test                        comprueba que todo sigue funcionando
```

### Las pruebas

`npm test` levanta la tienda de verdad sobre una base temporal y desechable y
comprueba unas sesenta cosas: que las páginas carguen, que el panel no se abra
sin sesión, que un editor no pueda borrar, que editar un campo no borre los
demás, que el total del pedido lo calcule el servidor, que la tienda aguante
direcciones y datos raros sin caerse.

**No toca tu base ni la de producción**, así que puedes correrlo con el panel
abierto. Si tocas el código, córrelo antes de publicar: varias de esas pruebas
existen porque el fallo que comprueban llegó a estar publicado.

---

## 11. Publicar en Vercel

Se hace una sola vez.

**1. Base de datos.** Desde la carpeta del proyecto:

```
vercel integration add turso
```

Se abre el navegador para aceptar los términos. Al terminar, Vercel deja solas
las variables `TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN`.

**2. Almacenamiento de fotos.** En el panel de Vercel, pestaña *Storage*, crea
un **Blob**. Deja la variable `BLOB_READ_WRITE_TOKEN`.

> Sin esa variable la tienda funciona igual, pero **no se pueden subir fotos
> nuevas desde el panel**: en Vercel el disco es de solo lectura.

**3. Publicar.**

```
vercel deploy --prod --yes
```

**4. Crear tu usuario en producción.** Primero baja las credenciales una vez:

```
vercel env pull .env.local
```

Y después, con `--produccion`, que es lo que hace que apunte a la base
publicada y no a la tuya:

```
node _tools/sembrar.js --produccion --admin tu@correo.com
```

Eso siembra el catálogo y crea tu usuario **en la base de producción**. El
comando te dice contra qué base está trabajando antes de tocar nada; si no ves
la palabra PRODUCCIÓN, no la estás tocando.

> ⚠️ Sin `--produccion` el comando trabaja contra la base de tu computador y
> te dice «usuario creado» igual. Es el error más fácil de cometer aquí.

> El archivo `.env.local` lleva las claves de producción. No se sube al
> repositorio y el servidor de trabajo no lo sirve por web, pero no lo mandes
> por WhatsApp ni lo dejes en una carpeta compartida.

**5. Comprueba la dirección real.** Entra a la dirección que usa el cliente (no
solo a la que imprime Vercel) y confirma que se ve lo nuevo.

---

### Si la tienda dice «Volvemos enseguida»

Eso significa que el sitio está publicado pero algo del servidor falla. Para
saber qué, abre:

```
tudominio.com/api/estado
```

Te contesta en texto claro qué está puesto y qué falta. Por ejemplo:

```json
{
  "base": "sin configurar",
  "subirFotos": "no",
  "falta": [
    "Falta la base de datos. Corre: vercel integration add turso"
  ]
}
```

Lo más común al publicar por primera vez es justo eso: la tienda subió, pero
todavía no tiene base de datos. Haz el paso 1 y vuelve a publicar.

Esa dirección no enseña ninguna clave: solo dice si cada pieza está puesta.

---

## 12. Cómo está armado (para quien toque el código)

La tienda **no cambió**: sigue siendo HTML, CSS y JavaScript sin librerías, y
sigue leyendo `window.ECM.CONFIG` y `window.ECM.PRODUCTOS` igual que siempre.
Lo único que cambió es de dónde salen esos datos.

```
Antes:  js/config.js + js/productos.js   (escritos a mano)
Ahora:  base de datos   ->   js/datos.js  (lo arma el servidor)
```

```
admin/                el CSS y el JS del panel (no llevan datos)
api/
  index.js            punto de entrada en Vercel
  _panel/             el HTML del panel: index.html y login.html
  _lib/
    db.js             conexión (archivo local o Turso) y esquema
    auth.js           contraseñas, sesiones y permisos
    validar.js        validación y saneado de todo lo que llega
    contenido.js      LA FUENTE DE DATOS ÚNICA: panel y tienda leen de aquí
    imagenes.js       recorte, optimización y almacenamiento de fotos
    publico.js        arma las páginas de la tienda
    rutas-admin.js    la API del panel
    enrutador.js      reparte las peticiones
_tools/
  build-paginas.js    genera el HTML (lo usan la consola Y el servidor)
  build-images.js     procesa las fotos de la carpeta "gorras"
  sembrar.js          pasa la semilla a la base de datos
  semilla/            el catálogo original escrito a mano (solo para sembrar)
pruebas/              las pruebas de "npm test"
_datos/               la base de datos local (no se sube)
_estatico/            copia estática de respaldo (no se sube)
servidor-local.js     servidor para trabajar en el computador
```

**Lo importante:** el HTML de la tienda lo arma `_tools/build-paginas.js`, y ese
mismo archivo lo usan tanto la consola (para la copia estática) como el servidor
(para servir en vivo). No hay dos versiones del HTML que se puedan
desincronizar.

Las páginas se guardan 10 segundos en la caché de Vercel: suficiente para que la
tienda vuele y poco para que veas tus cambios casi al instante.

---

## 13. Seguridad

- Las contraseñas se guardan con **scrypt** y sal propia. No se pueden revertir.
- La sesión va en una cookie **HttpOnly**: el JavaScript de la página no la
  puede leer, así que un ataque de inyección no se la lleva.
- En la base tampoco se guarda el testigo de sesión tal cual, sino su huella.
- **SameSite=Lax** más comprobación de origen: otra página no puede hacer
  operaciones en tu nombre aprovechando que tienes la sesión abierta.
- Máximo 8 intentos de ingreso cada 15 minutos por dirección.
- Todo lo que llega del panel se valida y se limpia antes de tocar la base.
- Las consultas van siempre con parámetros: no se puede inyectar SQL.
- El panel lleva `noindex`: no lo va a listar ningún buscador.
- No hay ninguna contraseña, clave ni testigo escrito en el código.

---

## 14. Pendientes

- [ ] Cargar los precios reales de las 16 gorras (Productos → Editar → Precio).
- [ ] Comprar el dominio y ponerlo en Configuración → Dirección del sitio.
- [ ] Enviar fotos de producto sueltas de las gorras Melos Caps para pasarlas de
      «colección» a producto comprable.
- [ ] Confirmar la disponibilidad real de cada modelo.
- [ ] Definir políticas de envío y pago para poder anunciarlas.
- [ ] Mandar fotos de gorras entregadas a clientes para el mosaico de Entregas
      (nombres que empiecen por `entrega`, en la carpeta «gorras»).
