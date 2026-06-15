# Sprint 1 - Normalizacion aditiva del catalogo FMD

Fecha de auditoria: 2026-06-14

## Alcance ejecutado

- Se creo un backup completo previo a cambios:
  `backups/products.pre-sprint1-2026-06-14.json`.
- Se verifico que el backup y el archivo original tuvieran el mismo hash SHA-256.
- Se resolvio el ID duplicado `405`.
- No se borraron productos.
- No se modificaron categorias existentes.
- No se realizaron cambios visuales, de home o navegacion.
- No se cargaron metadatos masivamente todavia.

## Conflicto exacto del ID 405

El ID `405` estaba asignado a dos productos:

| ID anterior | Producto | Categoria |
|---|---|---|
| 405 | Vic Tour 2026 | Tour |
| 405 | Iron Maiden - Eddie v1 | Iron Maiden |

Esto provocaba que cualquier apertura por `openModal(405)` pudiera resolver siempre el
primer producto encontrado y hacer inaccesible al segundo.

Resolucion aplicada:

- `Vic Tour 2026` conserva el ID `405`.
- `Iron Maiden - Eddie v1` pasa al ID `7034`.

No existian referencias hardcodeadas a `openModal(405)` fuera de `products.json`.

## Brechas de metadatos

Total actual: `290` productos/cards.

| Campo | Productos con valor | Productos sin valor |
|---|---:|---:|
| band | 102 | 188 |
| tags | 102 | 188 |
| collections | 102 | 188 |
| priority | 104 | 186 |
| variants | 137 | 153 |

Listados exactos disponibles:

- `productos_sin_band.csv`
- `productos_sin_tags.csv`
- `productos_sin_collections.csv`
- `productos_sin_priority.csv`
- `personalizados_candidatos_banda.csv`

## Categorias mezcladas

El campo legado `category` contiene actualmente dimensiones diferentes:

### Categorias que representan bandas

- Iron Maiden
- Slayer
- AC/DC
- Pantera
- Metallica
- Avenged Sevenfold

### Categorias que representan universos internos de Megadeth

- Album
- VicRattlehead
- Dave Mustaine
- Musician
- Tour
- Singles
- Dorsales
- Origenes

### Categorias que representan prendas

- Hoodies FMD
- Hoodies Otras Bandas
- Buzo Cuello Redondo

### Categorias que representan flujo comercial o curaduria

- Personalizados
- Bandas Sugeridas

Por compatibilidad, `category` debe mantenerse sin cambios durante Sprint 1 y copiarse
literalmente a `legacyCategory`.

## Personalizados asociados a bandas

El archivo `personalizados_candidatos_banda.csv` clasifica los 28 productos personalizados.

Candidatos claros de banda/artista:

- Almafuerte En Vida -> Almafuerte
- Amon Amarth -> Amon Amarth
- Black Label -> Black Label Society
- Down -> Down
- Flema -> Flema
- Hermetica -> Hermetica
- Judas Priest -> Judas Priest
- Kanonenfiebe Argentina -> Kanonenfieber
- Kurt Nirvana -> Nirvana
- Lemmy Stone Deaf Forever / Motorhead -> Motorhead
- Primal Fear -> Primal Fear
- Saltatio Mortis -> Saltatio Mortis
- Symphony X -> Symphony X
- The Ramones -> Ramones
- WASP / WASP v2 -> WASP
- Wintersun -> Wintersun

Casos que requieren decision editorial:

- Aphex Twin
- Bifrost Argentina
- Calavera Guitar
- Diego Maradona
- Guitarrista Blues
- Jason Becker
- John Petrucci
- M'era Luna
- Slinka Mascota
- Stranger Things Original

## Esquema aditivo propuesto

```json
{
  "band": "Megadeth",
  "universe": ["Thrash Metal", "FMD Editions"],
  "album": "Rust in Peace",
  "garments": ["remera", "hoodie"],
  "collections": ["Original FMD"],
  "campaigns": ["Invierno 2026"],
  "commercialPriority": 80,
  "visibilityTier": "featured",
  "legacyCategory": "Album"
}
```

### Reglas por campo

`band`

- String canonico de banda o artista principal.
- Usar nombres consistentes: `Iron Maiden`, `AC/DC`, `Black Label Society`.
- No inferir `Megadeth` solo porque la categoria sea una prenda; validar nombre e imagen.

`universe`

- Array de universos editoriales amplios.
- Vocabulario inicial sugerido:
  - Thrash Metal
  - Heavy Metal Classics
  - Rock Legends
  - Modern Metal
  - Argentina Metal
  - FMD Editions

`album`

- String canonico o `null`.
- Solo usar cuando el producto pertenece claramente a un disco.
- No convertir automaticamente diseños de Vic, Dave o tours en albumes por contener una palabra.

`garments`

- Array con prendas realmente representadas en los mocks/variantes actuales.
- Valores permitidos:
  - remera
  - hoodie
  - buzo_cuello_redondo

`collections`

- Array editorial estable y reutilizable.
- Ejemplos: `Original FMD`, `Archivo Maiden`, `Slayer Archive FMD`.
- No usarlo para promociones temporales.

`campaigns`

- Array para acciones temporales.
- Ejemplos: `Dia del Padre 2026`, `Invierno 2026`, `Argentina 2026`.

`commercialPriority`

- Entero de `0` a `100`.
- Independiente del ID, antiguedad y `priority` legado.
- Rango sugerido:
  - 90-100: portada y lanzamientos principales
  - 70-89: destacados comerciales
  - 30-69: catalogo normal
  - 1-29: archivo profundo
  - 0: errores o piezas fuera de circulacion

`visibilityTier`

- `hero`: portada/home principal.
- `featured`: vitrinas y destacados.
- `catalog`: catalogo visible normal.
- `archive`: disponible por busqueda o Ver todo.
- `hidden`: solo errores confirmados; no usar para reducir saturacion.

`legacyCategory`

- Copia literal de `category`.
- Permite migrar filtros futuros sin romper la logica actual.

## Reglas para no perder productos

- `visibilityTier: archive` no elimina ni oculta de la busqueda.
- Ningun producto pasa a `hidden` sin revision manual.
- Los filtros actuales siguen usando `category` hasta una migracion posterior.
- Las nuevas vitrinas deben filtrar por metadatos nuevos y reutilizar los mismos productos.
- Cada lote debe validarse contra cantidad de productos, IDs e imagenes antes y despues.

## Orden de implementacion propuesto

### Lote 1 - Megadeth visible y destacado

- Hero, Original FMD, primeros resultados y lanzamientos.
- Completar todos los campos nuevos.
- Definir reglas que luego se reutilizaran en el archivo profundo.

### Lote 2 - Slayer

- Banda y prendas ya son identificables.
- Agregar universos, colecciones, prioridad comercial y tiers.

### Lote 3 - Iron Maiden

- Separar conceptualmente banda, tour, archivo FMD y prendas mediante metadatos.

### Lote 4 - Metallica, Pantera y AC/DC

- Normalizar bandas y asignar universos.
- Incorporar hoodies relacionados a su banda correspondiente.

### Lote 5 - Hoodies y buzos

- Mantener categorias legado.
- Completar `band`, `garments`, `collections` y `universe`.
- Revisar manualmente piezas que no indiquen banda claramente.

### Lote 6 - Personalizados

- Asignar banda cuando corresponda.
- Mantener una coleccion `Personalizados FMD`.
- Casos no musicales pueden usar banda/artista `null` y universo editorial propio.

### Lote 7 - Bandas sugeridas

- Asignar banda canonica.
- Crear presencia ordenada sin necesidad de una seccion individual por banda.

### Lote 8 - Archivo profundo de Megadeth

- Completar albumes, Vic, Dave, tours, dorsos y miembros.
- Mantener todos los diseños disponibles.
- Usar `archive` para reducir saturacion visual sin perder ventas random.

## Validaciones requeridas por lote

1. JSON valido.
2. IDs unicos.
3. Misma cantidad total de productos.
4. Ninguna imagen principal perdida.
5. `category` sin modificaciones.
6. `legacyCategory` igual a `category`.
7. Valores de enums validos.
8. Sin cambios en home o navegacion.
9. Busqueda y apertura por ID funcionando.
10. Reporte de diferencias antes de aprobar el lote.

