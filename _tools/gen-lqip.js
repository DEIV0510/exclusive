/* Convierte _tools/lqip.json (que produce build-images.js) en js/lqip.js.
   Uso:  node _tools/gen-lqip.js                                          */
const fs = require('fs');
const path = require('path');

const entrada = path.join(__dirname, 'lqip.json');
// Fuera de js/: si viviera ahí, el archivo estático taparía la ruta que
// sirve el servidor y las fotos subidas desde el panel perderían su miniatura.
const salida = path.join(__dirname, 'lqip-base.js');

const datos = JSON.parse(fs.readFileSync(entrada, 'utf8'));
const lineas = Object.entries(datos)
  .map(([k, v]) => `  '${k}': '${v}',`)
  .join('\n');

fs.writeFileSync(
  salida,
  `/* GENERADO por _tools/gen-lqip.js — no editar a mano.
   Miniaturas de 24 px en base64 que se pintan borrosas mientras carga la
   foto real. Evitan el rectángulo gris y no cuestan ninguna petición. */

window.ECM = window.ECM || {};

window.ECM.LQIP = {
${lineas}
};
`,
  'utf8'
);

console.log(`_tools/lqip-base.js generado con ${Object.keys(datos).length} imágenes`);
