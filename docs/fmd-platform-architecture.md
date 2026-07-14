# FMD Platform Architecture v1

## Objetivo

FMD opera archivos por banda sobre un único catálogo compartido. Una banda nueva se incorpora mediante datos, curaduría y configuración; no mediante una nueva lógica de productos.

## Vocabulario

- **Product**: registro fuente existente en `data/products.json`. Puede contener una o varias imágenes históricas.
- **Design**: arte concreto visible para el cliente. Se representa con `CatalogDesign` y genera una sola card.
- **Preview**: mockup real disponible para visualizar una prenda. No limita qué prendas pueden comprarse.
- **Garment**: prenda seleccionable: remera, hoodie o buzo cuello redondo.
- **Collection**: agrupación editorial opcional. Un diseño puede pertenecer a varias colecciones sin duplicarse.
- **Archive**: instancia pública de una banda configurada en `js/band-archives-config.js`.

## Reglas del motor

1. Existe una sola fuente de productos.
2. Cada card pública representa un diseño reconocible.
3. El mismo diseño no se duplica por prenda.
4. Los mockups existentes se guardan en `previewsByGarment` y no determinan `availableGarments`.
5. Modal, precios, talles, carrito, entrega y WhatsApp son compartidos.
6. Los archivos pueden habilitar colecciones, pero ninguna banda agrega una rama propia de render.
7. `TODOS` es el estado sin filtro; no es metadata de un diseño.
8. Los conteos públicos se calculan desde diseños únicos.

## Flujo

`products.json` -> `CatalogDesign` -> configuración del archivo -> render compartido -> modal -> carrito o WhatsApp.

## Curaduría

- `visibilityTier` define el nivel de exposición.
- `commercialPriority` ordena diseños dentro del mismo nivel.
- El orden alfabético se usa solamente como desempate.
- No se agrega metadata sin una necesidad visible y comprobable.

## Alta de un archivo

1. Revisar los diseños y mockups existentes de la banda.
2. Confirmar que cada arte produzca una sola identidad `CatalogDesign`.
3. Agregar la configuración de banda y, si corresponde, sus colecciones.
4. Ejecutar `scripts/build-band-landings.js`.
5. Verificar búsqueda, prendas, precios, modal, carrito, WhatsApp y regreso al catálogo.
6. Revisar sitemap y metadata antes de publicar.

## Deuda heredada

El catálogo general todavía contiene recorridos especiales anteriores para Megadeth, Slayer, Iron Maiden y EPICA. No deben copiarse a los nuevos archivos. Se eliminan progresivamente solo después de comprobar que el motor compartido conserva diseños, dorsos, precios y navegación.

## Criterio de madurez

Una banda nueva debe requerir configuración y curaduría, no nuevas condiciones por nombre de banda en el motor.
