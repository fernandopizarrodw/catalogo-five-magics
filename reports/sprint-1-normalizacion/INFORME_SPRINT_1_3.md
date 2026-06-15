# Informe Sprint 1.3 - Bandas comerciales pendientes

Fecha: 2026-06-15

## Resultado auditado

- Estado: **VALIDADO**
- Productos totales: **290**
- Productos modificados: **54**
- Cambios fuera del lote: **0**
- IDs duplicados: **0**
- Categorias modificadas: **0**
- Rutas principales de imagen modificadas: **0**
- Referencias de imagen verificadas: **750**
- Imagenes inexistentes: **0**
- Productos con `album: null`: **37**
- Personalizados asociados a banda: **15**

## Distribucion por banda

- Pantera: **10**
- AC/DC: **20**
- Avenged Sevenfold: **2**
- Black Sabbath: **3**
- Sodom: **2**
- Testament: **1**
- Gojira: **1**
- Down: **1**
- Flema: **1**
- Hermetica: **1**
- Dream Theater: **1**
- Nirvana: **1**
- Motorhead: **2**
- Primal Fear: **1**
- Saltatio Mortis: **1**
- Symphony X: **1**
- Ramones: **1**
- WASP: **1**
- Wintersun: **1**
- Kanonenfieber: **1**
- Black Label Society: **1**

## Distribucion por universe

- Groove Metal: **12**
- Heavy Metal Classics: **38**
- FMD Editions: **1**
- Rock Legends: **27**
- Modern Metal: **8**
- Thrash Metal: **3**
- Custom Archive: **15**
- Argentina Heavy: **1**

## Distribucion por visibilityTier

- catalog: **33**
- featured: **21**

## Distribucion por commercialPriority

- 50-74: **33**
- 75-89: **21**

## Personalizados asociados a banda

- `432` Down -> **Down**
- `51` Flema -> **Flema**
- `5119` HermÃ©tica -> **Hermetica**
- `305` John Petrucci -> **Dream Theater**
- `41` Kurt Nirvana -> **Nirvana**
- `62` Lemmy Stone Deaf Forever -> **Motorhead**
- `63` Motorhead -> **Motorhead**
- `59` Primal Fear -> **Primal Fear**
- `54` Saltatio Mortis -> **Saltatio Mortis**
- `43` Symphony X -> **Symphony X**
- `57` The Ramones -> **Ramones**
- `322` WASP v2 -> **WASP**
- `53` Wintersun -> **Wintersun**
- `5130` Kanonenfiebe Argentina -> **Kanonenfieber**
- `5031` Black Label -> **Black Label Society**

## Compatibilidad con app.js

- No se modificaron `index.html`, CSS, `js/app.js`, filtros, home, modales ni carrito.
- `category`, IDs, imagenes y variantes se conservaron.
- `app.js` puede leer opcionalmente `band` y `collections`, conservando compatibilidad con productos no migrados mediante `category`.
- Los demas metadatos nuevos no controlan actualmente el comportamiento visual.

## Productos modificados y metadata

| ID | Producto | Band | Universe | Album | Garments | Collections | Campaigns | Priority | Tier | Legacy category |
|---:|---|---|---|---|---|---|---|---:|---|---|
| 5126 | Dimebag Darrell Live | Pantera | Groove Metal; Heavy Metal Classics | - | remera | Pantera Archive; Dimebag Darrell | - | 64 | catalog | Pantera |
| 410 | Dimebag Logo Fuego | Pantera | Groove Metal; Heavy Metal Classics | - | remera | Pantera Archive; Dimebag Darrell | - | 64 | catalog | Pantera |
| 411 | Guitar Dimebag | Pantera | Groove Metal; Heavy Metal Classics | - | remera | Pantera Archive; Dimebag Darrell | - | 64 | catalog | Pantera |
| 412 | Pantera Art | Pantera | Groove Metal; Heavy Metal Classics | - | remera | Pantera Archive | - | 64 | catalog | Pantera |
| 413 | Pantera Band v1 | Pantera | Groove Metal; Heavy Metal Classics | - | remera | Pantera Archive | - | 64 | catalog | Pantera |
| 414 | Pantera Snake v1 | Pantera | Groove Metal; Heavy Metal Classics | - | remera | Pantera Archive | - | 64 | catalog | Pantera |
| 415 | Pantera Snake v2 | Pantera | Groove Metal; Heavy Metal Classics | - | remera | Pantera Archive | - | 64 | catalog | Pantera |
| 4190 | Phil Emblem | Pantera | Groove Metal; Heavy Metal Classics | - | remera | Pantera Archive | - | 64 | catalog | Pantera |
| 4191 | Vulgar FMD | Pantera | Groove Metal; Heavy Metal Classics; FMD Editions | Vulgar Display of Power | remera | Pantera Archive; Vulgar Display of Power; FMD Editions | - | 78 | featured | Pantera |
| 6008 | Hoodie Pantera | Pantera | Groove Metal; Heavy Metal Classics | - | hoodie | Pantera Archive | - | 76 | featured | Hoodies Otras Bandas |
| 302 | AC/DC Money Talks | AC/DC | Rock Legends; Heavy Metal Classics | The Razors Edge | remera | AC/DC Archive; The Razors Edge | - | 78 | featured | AC/DC |
| 303 | AC/DC Angus PWRD UP | AC/DC | Rock Legends; Heavy Metal Classics | Power Up | remera | AC/DC Archive; Power Up; Angus Young | - | 80 | featured | AC/DC |
| 60 | AC/DC Europe 84 | AC/DC | Rock Legends; Heavy Metal Classics | - | remera | AC/DC Archive; Tour Archive | Tour Archive | 64 | catalog | AC/DC |
| 5040 | Angus Young V1 | AC/DC | Rock Legends; Heavy Metal Classics | - | remera | AC/DC Archive; Angus Young | - | 64 | catalog | AC/DC |
| 5041 | Black Ice | AC/DC | Rock Legends; Heavy Metal Classics | Black Ice | remera | AC/DC Archive; Black Ice | - | 76 | featured | AC/DC |
| 5042 | Fly on the Wall | AC/DC | Rock Legends; Heavy Metal Classics | Fly on the Wall | remera | AC/DC Archive; Fly on the Wall | - | 64 | catalog | AC/DC |
| 5043 | For Those Remastered | AC/DC | Rock Legends; Heavy Metal Classics | For Those About to Rock We Salute You | remera | AC/DC Archive; For Those About to Rock We Salute You | - | 64 | catalog | AC/DC |
| 5044 | Let There Be Rock (Black) | AC/DC | Rock Legends; Heavy Metal Classics | Let There Be Rock | remera | AC/DC Archive; Let There Be Rock | - | 77 | featured | AC/DC |
| 5045 | Let There Be Rock (White) | AC/DC | Rock Legends; Heavy Metal Classics | Let There Be Rock | remera | AC/DC Archive; Let There Be Rock | - | 77 | featured | AC/DC |
| 5046 | Highway to Hell V1 | AC/DC | Rock Legends; Heavy Metal Classics | Highway to Hell | remera | AC/DC Archive; Highway to Hell | - | 82 | featured | AC/DC |
| 5048 | For Those Angus | AC/DC | Rock Legends; Heavy Metal Classics | For Those About to Rock We Salute You | remera | AC/DC Archive; For Those About to Rock We Salute You; Angus Young | - | 64 | catalog | AC/DC |
| 5049 | High Voltage | AC/DC | Rock Legends; Heavy Metal Classics | High Voltage | remera | AC/DC Archive; High Voltage | - | 76 | featured | AC/DC |
| 5127 | Power Up | AC/DC | Rock Legends; Heavy Metal Classics | Power Up | remera | AC/DC Archive; Power Up | - | 80 | featured | AC/DC |
| 5128 | Angus Black & White | AC/DC | Rock Legends; Heavy Metal Classics | - | remera | AC/DC Archive; Angus Young | - | 64 | catalog | AC/DC |
| 5052 | Highway Circular | AC/DC | Rock Legends; Heavy Metal Classics | Highway to Hell | remera | AC/DC Archive; Highway to Hell | - | 64 | catalog | AC/DC |
| 5102 | Are You Ready | AC/DC | Rock Legends; Heavy Metal Classics | The Razors Edge | remera | AC/DC Archive; The Razors Edge | - | 79 | featured | AC/DC |
| 5103 | AC/DC PWR UP | AC/DC | Rock Legends; Heavy Metal Classics | Power Up | remera | AC/DC Archive; Power Up | - | 81 | featured | AC/DC |
| 6010 | Brian Camiseta Argentina | AC/DC | Rock Legends; Heavy Metal Classics | - | remera | AC/DC Archive | Argentina 2026 | 64 | catalog | AC/DC |
| 6011 | Angus Young Electric | AC/DC | Rock Legends; Heavy Metal Classics | - | remera | AC/DC Archive; Angus Young | - | 64 | catalog | AC/DC |
| 6021 | Hoodie AC/DC Are You Ready | AC/DC | Rock Legends; Heavy Metal Classics | The Razors Edge | hoodie | AC/DC Archive; The Razors Edge | - | 77 | featured | Hoodies Otras Bandas |
| 2001 | Avenged Sevenfold Collection | Avenged Sevenfold | Modern Metal | - | remera | Avenged Sevenfold Archive | - | 82 | featured | Avenged Sevenfold |
| 2002 | Avenged Sevenfold Dorsos | Avenged Sevenfold | Modern Metal | - | remera | Avenged Sevenfold Archive | - | 78 | featured | Avenged Sevenfold |
| 5003 | Black Sabbath | Black Sabbath | Heavy Metal Classics; Rock Legends | - | remera | Black Sabbath Archive | - | 82 | featured | Bandas Sugeridas |
| 6018 | Hoodie Black Sabbath The End | Black Sabbath | Heavy Metal Classics; Rock Legends | - | hoodie | Black Sabbath Archive | - | 78 | featured | Hoodies Otras Bandas |
| 6019 | Hoodie Black Sabbath Tour | Black Sabbath | Heavy Metal Classics; Rock Legends | - | hoodie | Black Sabbath Archive; Tour Archive | Tour Archive | 77 | featured | Hoodies Otras Bandas |
| 5017 | Sodom - Agent Orange | Sodom | Thrash Metal | Agent Orange | remera | Sodom Archive; Agent Orange | - | 76 | featured | Bandas Sugeridas |
| 5117 | Sodom - Logo | Sodom | Thrash Metal | - | remera | Sodom Archive | - | 64 | catalog | Bandas Sugeridas |
| 5123 | Testament | Testament | Thrash Metal | - | remera | Testament Archive | - | 76 | featured | Bandas Sugeridas |
| 5006 | Gojira | Gojira | Modern Metal | - | remera | Gojira Archive | - | 78 | featured | Bandas Sugeridas |
| 432 | Down | Down | Groove Metal; Custom Archive | - | remera | Personalizados FMD | - | 56 | catalog | Personalizados |
| 51 | Flema | Flema | Custom Archive | - | remera | Personalizados FMD | - | 56 | catalog | Personalizados |
| 5119 | HermÃ©tica | Hermetica | Argentina Heavy; Custom Archive | - | remera | Personalizados FMD | - | 56 | catalog | Personalizados |
| 305 | John Petrucci | Dream Theater | Modern Metal; Custom Archive | - | remera | Personalizados FMD | - | 56 | catalog | Personalizados |
| 41 | Kurt Nirvana | Nirvana | Rock Legends; Custom Archive | - | remera | Personalizados FMD | - | 56 | catalog | Personalizados |
| 62 | Lemmy Stone Deaf Forever | Motorhead | Heavy Metal Classics; Rock Legends; Custom Archive | - | remera | Personalizados FMD | - | 56 | catalog | Personalizados |
| 63 | Motorhead | Motorhead | Heavy Metal Classics; Rock Legends; Custom Archive | - | remera | Personalizados FMD | - | 56 | catalog | Personalizados |
| 59 | Primal Fear | Primal Fear | Heavy Metal Classics; Custom Archive | - | remera | Personalizados FMD | - | 56 | catalog | Personalizados |
| 54 | Saltatio Mortis | Saltatio Mortis | Modern Metal; Custom Archive | - | remera | Personalizados FMD | - | 56 | catalog | Personalizados |
| 43 | Symphony X | Symphony X | Modern Metal; Custom Archive | - | remera | Personalizados FMD | - | 56 | catalog | Personalizados |
| 57 | The Ramones | Ramones | Rock Legends; Custom Archive | - | remera | Personalizados FMD | - | 56 | catalog | Personalizados |
| 322 | WASP v2 | WASP | Heavy Metal Classics; Custom Archive | - | remera | Personalizados FMD | - | 56 | catalog | Personalizados |
| 53 | Wintersun | Wintersun | Modern Metal; Custom Archive | - | remera | Personalizados FMD | - | 56 | catalog | Personalizados |
| 5130 | Kanonenfiebe Argentina | Kanonenfieber | Modern Metal; Custom Archive | - | remera | Personalizados FMD | Argentina 2026 | 56 | catalog | Personalizados |
| 5031 | Black Label | Black Label Society | Groove Metal; Heavy Metal Classics; Custom Archive | - | remera | Personalizados FMD | - | 56 | catalog | Personalizados |

## Dudas semanticas

- `5126` Dimebag Darrell Live: album no definido por falta de evidencia suficiente o porque la card mezcla varios discos.
- `410` Dimebag Logo Fuego: album no definido por falta de evidencia suficiente o porque la card mezcla varios discos.
- `411` Guitar Dimebag: album no definido por falta de evidencia suficiente o porque la card mezcla varios discos.
- `412` Pantera Art: album no definido por falta de evidencia suficiente o porque la card mezcla varios discos.
- `413` Pantera Band v1: album no definido por falta de evidencia suficiente o porque la card mezcla varios discos.
- `414` Pantera Snake v1: album no definido por falta de evidencia suficiente o porque la card mezcla varios discos.
- `415` Pantera Snake v2: album no definido por falta de evidencia suficiente o porque la card mezcla varios discos.
- `4190` Phil Emblem: album no definido por falta de evidencia suficiente o porque la card mezcla varios discos.
- `6008` Hoodie Pantera: album no definido por falta de evidencia suficiente o porque la card mezcla varios discos.
- `60` AC/DC Europe 84: album no definido por falta de evidencia suficiente o porque la card mezcla varios discos.
- `5040` Angus Young V1: album no definido por falta de evidencia suficiente o porque la card mezcla varios discos.
- `5128` Angus Black & White: album no definido por falta de evidencia suficiente o porque la card mezcla varios discos.
- `6010` Brian Camiseta Argentina: album no definido por falta de evidencia suficiente o porque la card mezcla varios discos.
- `6011` Angus Young Electric: album no definido por falta de evidencia suficiente o porque la card mezcla varios discos.
- `2001` Avenged Sevenfold Collection: album no definido por falta de evidencia suficiente o porque la card mezcla varios discos.
- `2002` Avenged Sevenfold Dorsos: album no definido por falta de evidencia suficiente o porque la card mezcla varios discos.
- `5003` Black Sabbath: album no definido por falta de evidencia suficiente o porque la card mezcla varios discos.
- `6018` Hoodie Black Sabbath The End: album no definido por falta de evidencia suficiente o porque la card mezcla varios discos.
- `6019` Hoodie Black Sabbath Tour: album no definido por falta de evidencia suficiente o porque la card mezcla varios discos.
- `5117` Sodom - Logo: album no definido por falta de evidencia suficiente o porque la card mezcla varios discos.
- `5123` Testament: album no definido por falta de evidencia suficiente o porque la card mezcla varios discos.
- `5006` Gojira: album no definido por falta de evidencia suficiente o porque la card mezcla varios discos.
- `432` Down: album no definido por falta de evidencia suficiente o porque la card mezcla varios discos.
- `51` Flema: album no definido por falta de evidencia suficiente o porque la card mezcla varios discos.
- `5119` HermÃ©tica: album no definido por falta de evidencia suficiente o porque la card mezcla varios discos.
- `305` John Petrucci: album no definido por falta de evidencia suficiente o porque la card mezcla varios discos.
- `41` Kurt Nirvana: album no definido por falta de evidencia suficiente o porque la card mezcla varios discos.
- `62` Lemmy Stone Deaf Forever: album no definido por falta de evidencia suficiente o porque la card mezcla varios discos.
- `63` Motorhead: album no definido por falta de evidencia suficiente o porque la card mezcla varios discos.
- `59` Primal Fear: album no definido por falta de evidencia suficiente o porque la card mezcla varios discos.
- `54` Saltatio Mortis: album no definido por falta de evidencia suficiente o porque la card mezcla varios discos.
- `43` Symphony X: album no definido por falta de evidencia suficiente o porque la card mezcla varios discos.
- `57` The Ramones: album no definido por falta de evidencia suficiente o porque la card mezcla varios discos.
- `322` WASP v2: album no definido por falta de evidencia suficiente o porque la card mezcla varios discos.
- `53` Wintersun: album no definido por falta de evidencia suficiente o porque la card mezcla varios discos.
- `5130` Kanonenfiebe Argentina: album no definido por falta de evidencia suficiente o porque la card mezcla varios discos.
- `5031` Black Label: album no definido por falta de evidencia suficiente o porque la card mezcla varios discos.

Decisiones explicitas:

- Flema queda solo en `Custom Archive`: no se fuerza dentro de `Argentina Heavy`.
- John Petrucci se asocia a Dream Theater por la variante de dorso existente.
- Lemmy Stone Deaf Forever se asocia a Motorhead.
- Black Label se asocia a Black Label Society.
- Kanonenfiebe Argentina se normaliza como banda Kanonenfieber, sin modificar el nombre legado del producto.
- Las cards multiproducto de Avenged Sevenfold, Black Sabbath, Testament y Gojira mantienen `album: null`.

## Recomendacion Sprint 1.4

1. Migrar las bandas sugeridas restantes y los hoodies/buzos todav??a sin metadata.
2. Revisar personalizados ambiguos o no musicales por separado, manteniendolos en archivo sin inventar banda.
3. Completar el archivo profundo de Megadeth en lotes por categoria legado.
4. Ejecutar una auditoria global de consistencia de `band`, `universe`, `garments` y prioridades antes de crear vitrinas.

## Errores

- Ninguno.
