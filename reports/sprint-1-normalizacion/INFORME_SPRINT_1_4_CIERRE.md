# Informe Sprint 1.4 - Cierre y auditoria de cobertura

Fecha: 2026-06-15

## Que significa banda completamente migrada

Una banda esta completamente migrada cuando el 100% de sus **cards/productos** tiene metadata. Las imagenes y variantes no son productos independientes: pertenecen a una card y heredan conceptualmente su metadata.

- Card/producto: un objeto dentro de `products.json`.
- Imagen/diseno asociado: imagen principal o variante dentro de esa card.
- La cantidad de disenos puede ser mayor que la cantidad de cards.

## Resultado auditado

- Estado: **VALIDADO**
- Productos/cards totales: **290**
- Cards normalizadas: **200 / 290 (69.0%)**
- Cards pendientes: **90**
- Migraciones completas Sprint 1.4: **56**
- Backfills de tags Sprint 1.4: **97**
- Cards modificadas totales Sprint 1.4: **153**
- Cambios fuera del lote: **0**
- IDs duplicados: **0**
- Categorias modificadas: **0**
- Rutas principales modificadas: **0**
- Variantes modificadas: **0**
- Referencias de imagen verificadas: **750**
- Imagenes inexistentes: **0**
- Cards normalizadas sin tags: **0**

## Cobertura prioritaria por banda

| Banda | Cards totales | Normalizadas | Pendientes | Imagenes/disenos asociados |
|---|---:|---:|---:|---:|
| AC/DC | 22 | 22 | 0 | 30 |
| Pantera | 22 | 22 | 0 | 26 |
| Black Sabbath | 3 | 3 | 0 | 6 |
| Avenged Sevenfold | 2 | 2 | 0 | 13 |
| Sodom | 2 | 2 | 0 | 5 |
| Gojira | 1 | 1 | 0 | 4 |
| Testament | 1 | 1 | 0 | 4 |

## Cobertura total por banda

| Banda | Cards totales | Normalizadas | Pendientes | Imagenes/disenos asociados |
|---|---:|---:|---:|---:|
| Megadeth | 123 | 40 | 83 | 354 |
| Iron Maiden | 39 | 39 | 0 | 52 |
| AC/DC | 22 | 22 | 0 | 30 |
| Pantera | 22 | 22 | 0 | 26 |
| Slayer | 21 | 21 | 0 | 37 |
| Sin banda / revision manual | 7 | 0 | 7 | 8 |
| Metallica | 5 | 5 | 0 | 16 |
| Black Sabbath | 3 | 3 | 0 | 6 |
| Avenged Sevenfold | 2 | 2 | 0 | 13 |
| Black Label Society | 2 | 2 | 0 | 3 |
| Dream Theater | 2 | 2 | 0 | 4 |
| Hermetica | 2 | 2 | 0 | 2 |
| Motorhead | 2 | 2 | 0 | 2 |
| Rhapsody | 2 | 2 | 0 | 2 |
| Sepultura | 2 | 2 | 0 | 2 |
| Sodom | 2 | 2 | 0 | 5 |
| WASP | 2 | 2 | 0 | 4 |
| Alice in Chains | 1 | 1 | 0 | 1 |
| Almafuerte | 1 | 1 | 0 | 1 |
| Amon Amarth | 1 | 1 | 0 | 1 |
| Angra | 1 | 1 | 0 | 3 |
| Aphex Twin | 1 | 1 | 0 | 1 |
| Cacophony | 1 | 1 | 0 | 2 |
| Death | 1 | 1 | 0 | 1 |
| Def Leppard | 1 | 1 | 0 | 4 |
| Down | 1 | 1 | 0 | 2 |
| Exodus | 1 | 1 | 0 | 1 |
| Flema | 1 | 1 | 0 | 1 |
| Gojira | 1 | 1 | 0 | 4 |
| Guns N' Roses | 1 | 1 | 0 | 3 |
| Hawthorne | 1 | 1 | 0 | 1 |
| Helloween | 1 | 1 | 0 | 3 |
| Jason Becker | 1 | 1 | 0 | 2 |
| Judas Priest | 1 | 1 | 0 | 1 |
| Kanonenfieber | 1 | 1 | 0 | 1 |
| Lethal | 1 | 1 | 0 | 1 |
| Nightwish | 1 | 1 | 0 | 1 |
| Nirvana | 1 | 1 | 0 | 1 |
| Ozzy Osbourne | 1 | 1 | 0 | 1 |
| Primal Fear | 1 | 1 | 0 | 1 |
| Rammstein | 1 | 1 | 0 | 1 |
| Ramones | 1 | 1 | 0 | 1 |
| Saltatio Mortis | 1 | 1 | 0 | 1 |
| Sundenrausch | 1 | 1 | 0 | 1 |
| Symphony X | 1 | 1 | 0 | 1 |
| Testament | 1 | 1 | 0 | 4 |
| Wintersun | 1 | 1 | 0 | 1 |

## Personalizados asociados a bandas

| Banda | Cards | Normalizadas | Pendientes | Imagenes/disenos asociados |
|---|---:|---:|---:|---:|
| Almafuerte | 1 | 1 | 0 | 1 |
| Amon Amarth | 1 | 1 | 0 | 1 |
| Aphex Twin | 1 | 1 | 0 | 1 |
| Black Label Society | 1 | 1 | 0 | 2 |
| Down | 1 | 1 | 0 | 2 |
| Dream Theater | 1 | 1 | 0 | 2 |
| Flema | 1 | 1 | 0 | 1 |
| Hermetica | 1 | 1 | 0 | 1 |
| Jason Becker | 1 | 1 | 0 | 2 |
| Judas Priest | 1 | 1 | 0 | 1 |
| Kanonenfieber | 1 | 1 | 0 | 1 |
| Motorhead | 2 | 2 | 0 | 2 |
| Nirvana | 1 | 1 | 0 | 1 |
| Primal Fear | 1 | 1 | 0 | 1 |
| Ramones | 1 | 1 | 0 | 1 |
| Saltatio Mortis | 1 | 1 | 0 | 1 |
| Symphony X | 1 | 1 | 0 | 1 |
| WASP | 2 | 2 | 0 | 4 |
| Wintersun | 1 | 1 | 0 | 1 |

## Productos modificados Sprint 1.4

### Migraciones completas

| ID | Operacion | Producto | Banda | Universe | Album | Garments | Tier | Priority |
|---:|---|---|---|---|---|---|---|---:|
| 5001 | Migracion completa | Alice in Chains | Alice in Chains | Rock Legends | Dirt | remera | featured | 78 |
| 5002 | Migracion completa | Angra | Angra | Heavy Metal Classics; Modern Metal | - | remera | featured | 78 |
| 5004 | Migracion completa | Def Leppard | Def Leppard | Rock Legends; Heavy Metal Classics | - | remera | featured | 78 |
| 5005 | Migracion completa | Dream Theater | Dream Theater | Modern Metal | Parasomnia | remera | featured | 78 |
| 5007 | Migracion completa | Guns N' Roses | Guns N' Roses | Rock Legends | - | remera | featured | 78 |
| 5008 | Migracion completa | Hawthorne | Hawthorne | Modern Metal | - | remera | catalog | 64 |
| 5009 | Migracion completa | Helloween | Helloween | Heavy Metal Classics | - | remera | featured | 78 |
| 5010 | Migracion completa | HermÃ©tica | Hermetica | Argentina Heavy | Acido Argentino | remera | featured | 78 |
| 5011 | Migracion completa | Lethal | Lethal | Argentina Heavy | - | remera | catalog | 64 |
| 5012 | Migracion completa | Nightwish | Nightwish | Modern Metal; Heavy Metal Classics | Once | remera | featured | 78 |
| 5013 | Migracion completa | Ozzy Osbourne | Ozzy Osbourne | Heavy Metal Classics; Rock Legends | - | remera | featured | 78 |
| 5014 | Migracion completa | Rammstein | Rammstein | Modern Metal | - | remera | featured | 78 |
| 5015 | Migracion completa | Sepultura | Sepultura | Groove Metal; Thrash Metal | Roots | remera | featured | 78 |
| 6012 | Migracion completa | Hoodie Sepultura | Sepultura | Groove Metal; Thrash Metal | Roots | hoodie | featured | 78 |
| 5018 | Migracion completa | SÃ¼ndenrausch | Sundenrausch | Modern Metal | - | remera | catalog | 64 |
| 5200 | Migracion completa | Cacophony | Cacophony | Heavy Metal Classics | - | remera | featured | 78 |
| 6001 | Migracion completa | Hoodie Black Label | Black Label Society | Groove Metal; Heavy Metal Classics | - | hoodie | featured | 78 |
| 6002 | Migracion completa | Hoodie Dimebag Fire | Pantera | Groove Metal; Heavy Metal Classics | - | hoodie | featured | 78 |
| 6003 | Migracion completa | Hoodie Exodus | Exodus | Thrash Metal | - | hoodie | featured | 78 |
| 6009 | Migracion completa | Hoodie Rhapsody | Rhapsody | Heavy Metal Classics | - | hoodie | featured | 78 |
| 6017 | Migracion completa | Hoodie Rhapsody V1 | Rhapsody | Heavy Metal Classics | - | hoodie | featured | 78 |
| 6016 | Migracion completa | Hoodie Death | Death | Modern Metal | - | hoodie | featured | 78 |
| 5122 | Migracion completa | Aphex Twin | Aphex Twin | Custom Archive | - | remera | catalog | 52 |
| 312 | Migracion completa | Jason Becker | Jason Becker | Heavy Metal Classics; Custom Archive | - | remera | catalog | 52 |
| 5057 | Migracion completa | Hoodie Killing Original | Megadeth | Megadeth Vault; Thrash Metal | Killing Is My Business... and Business Is Good! | hoodie | featured | 78 |
| 5061 | Migracion completa | Hoodie Peace Sells | Megadeth | Megadeth Vault; Thrash Metal | Peace Sells... but Who's Buying? | hoodie | featured | 78 |
| 5056 | Migracion completa | Hoodie Dave SFSGSW Era | Megadeth | Megadeth Vault; Thrash Metal | So Far, So Good... So What! | hoodie | catalog | 64 |
| 5062 | Migracion completa | Hoodie Rust in Peace | Megadeth | Megadeth Vault; Thrash Metal | Rust in Peace | hoodie | featured | 78 |
| 5071 | Migracion completa | Hoodie Rust in Peace 1990 | Megadeth | Megadeth Vault; Thrash Metal | Rust in Peace | hoodie | featured | 78 |
| 5055 | Migracion completa | Hoodie Countdown | Megadeth | Megadeth Vault; Thrash Metal | Countdown to Extinction | hoodie | featured | 78 |
| 5064 | Migracion completa | Hoodie Youthanasia | Megadeth | Megadeth Vault; Thrash Metal | Youthanasia | hoodie | featured | 78 |
| 5065 | Migracion completa | Hoodie Cryptic Writings | Megadeth | Megadeth Vault; Thrash Metal | Cryptic Writings | hoodie | featured | 78 |
| 5066 | Migracion completa | Hoodie Dystopia | Megadeth | Megadeth Vault; Thrash Metal | Dystopia | hoodie | featured | 78 |
| 5059 | Migracion completa | Hoodie Megadeth Final | Megadeth | Megadeth Vault; Thrash Metal | - | hoodie | featured | 78 |
| 5060 | Migracion completa | Hoodie Megadeth Blanco | Megadeth | Megadeth Vault; Thrash Metal | - | hoodie | featured | 78 |
| 5063 | Migracion completa | Hoodie Vic Father | Megadeth | Megadeth Vault; Thrash Metal | - | hoodie | catalog | 64 |
| 5067 | Migracion completa | Hoodie Made to Kill | Megadeth | Megadeth Vault; Thrash Metal | - | hoodie | catalog | 64 |
| 5068 | Migracion completa | Hoodie I Don't Care | Megadeth | Megadeth Vault; Thrash Metal | - | hoodie | catalog | 64 |
| 5069 | Migracion completa | Hoodie Let There Be Shred | Megadeth | Megadeth Vault; Thrash Metal | - | hoodie | catalog | 64 |
| 5070 | Migracion completa | Hoodie Tipping Point | Megadeth | Megadeth Vault; Thrash Metal | - | hoodie | catalog | 64 |
| 5072 | Migracion completa | Hoodie Vic Promo Tour 2026 | Megadeth | Megadeth Vault; Thrash Metal | - | hoodie | featured | 78 |
| 5073 | Migracion completa | Hoodie Vic Digital DLB | Megadeth | Megadeth Vault; Thrash Metal | - | hoodie | catalog | 64 |
| 5074 | Migracion completa | Hoodie Merch Tour V1 | Megadeth | Megadeth Vault; Thrash Metal | - | hoodie | featured | 78 |
| 5075 | Migracion completa | Hoodie Vic Militar | Megadeth | Megadeth Vault; Thrash Metal | - | hoodie | catalog | 64 |
| 5076 | Migracion completa | Hoodie Guitarra Argentina | Megadeth | Megadeth Vault; Thrash Metal | - | hoodie | catalog | 64 |
| 7001 | Migracion completa | Buzo Rust in Peace FMD | Megadeth | Megadeth Vault; Thrash Metal; FMD Editions | Rust in Peace | buzo_cuello_redondo | featured | 78 |
| 7002 | Migracion completa | Buzo Rust in Peace | Megadeth | Megadeth Vault; Thrash Metal | Rust in Peace | buzo_cuello_redondo | featured | 78 |
| 7003 | Migracion completa | Buzo Rust Formation FMD | Megadeth | Megadeth Vault; Thrash Metal; FMD Editions | Rust in Peace | buzo_cuello_redondo | featured | 78 |
| 7004 | Migracion completa | Buzo Countdown to Extinction FMD | Megadeth | Megadeth Vault; Thrash Metal; FMD Editions | Countdown to Extinction | buzo_cuello_redondo | featured | 78 |
| 7005 | Migracion completa | Buzo Killing is My Business FMD | Megadeth | Megadeth Vault; Thrash Metal; FMD Editions | Killing Is My Business... and Business Is Good! | buzo_cuello_redondo | featured | 78 |
| 7006 | Migracion completa | Buzo So Far So Good FMD | Megadeth | Megadeth Vault; Thrash Metal; FMD Editions | So Far, So Good... So What! | buzo_cuello_redondo | featured | 78 |
| 7007 | Migracion completa | Buzo Youthanasia FMD | Megadeth | Megadeth Vault; Thrash Metal; FMD Editions | Youthanasia | buzo_cuello_redondo | featured | 78 |
| 7008 | Migracion completa | Buzo Dave Mustaine FMD | Megadeth | Megadeth Vault; Thrash Metal; FMD Editions | - | buzo_cuello_redondo | catalog | 64 |
| 7009 | Migracion completa | Buzo Guitarra Argentina FMD | Megadeth | Megadeth Vault; Thrash Metal; FMD Editions | - | buzo_cuello_redondo | catalog | 64 |
| 7010 | Migracion completa | Buzo Tour FMD | Megadeth | Megadeth Vault; Thrash Metal; FMD Editions | - | buzo_cuello_redondo | featured | 78 |
| 7014 | Migracion completa | Buzo Megadeth Blanco FMD | Megadeth | Megadeth Vault; Thrash Metal; FMD Editions | - | buzo_cuello_redondo | catalog | 64 |

### Backfill de tags

| ID | Operacion | Producto | Banda | Tags |
|---:|---|---|---|---|
| 5077 | Backfill tags | Hoodie Rusted Pieces | Megadeth | Megadeth; Megadeth Vault; Thrash Metal; FMD Editions; hoodie; Original FMD; Invierno 2026 |
| 302 | Backfill tags | AC/DC Money Talks | AC/DC | AC/DC; Rock Legends; Heavy Metal Classics; The Razors Edge; remera; AC/DC Archive |
| 303 | Backfill tags | AC/DC Angus PWRD UP | AC/DC | AC/DC; Rock Legends; Heavy Metal Classics; Power Up; remera; AC/DC Archive; Angus Young |
| 5101 | Backfill tags | AC/DC Holy Shit | AC/DC | AC/DC; Rock Legends; Heavy Metal Classics; remera; AC/DC Archive; FMD Editions |
| 1 | Backfill tags | Killing Is my bussines | Megadeth | Megadeth; Megadeth Vault; Thrash Metal; FMD Editions; Killing Is My Business... and Business Is Good!; remera; buzo_cuello_redondo; Megadeth Albums |
| 2 | Backfill tags | Peace Sells | Megadeth | Megadeth; Megadeth Vault; Thrash Metal; FMD Editions; Peace Sells... but Who's Buying?; remera; Megadeth Albums |
| 4 | Backfill tags | Rust in Peace | Megadeth | Megadeth; Megadeth Vault; Thrash Metal; FMD Editions; Rust in Peace; remera; Megadeth Albums |
| 46 | Backfill tags | Dimebag Darrell BN | Pantera | Pantera; Groove Metal; Heavy Metal Classics; remera; Pantera Archive; Dimebag Darrell |
| 47 | Backfill tags | Dimebag Darrell Color | Pantera | Pantera; Groove Metal; Heavy Metal Classics; remera; Pantera Archive; Dimebag Darrell |
| 48 | Backfill tags | Dimebag Darrell Guitar Gold | Pantera | Pantera; Groove Metal; Heavy Metal Classics; remera; Pantera Archive; Dimebag Darrell |
| 323 | Backfill tags | Dimebag Tribute Edition v1 | Pantera | Pantera; Groove Metal; Heavy Metal Classics; remera; Pantera Archive; Dimebag Darrell |
| 324 | Backfill tags | Dime CFH Fuego Edition | Pantera | Pantera; Groove Metal; Heavy Metal Classics; Cowboys from Hell; remera; Pantera Archive; Dimebag Darrell |
| 326 | Backfill tags | Dimebag Darrell Abbott White | Pantera | Pantera; Groove Metal; Heavy Metal Classics; remera; Pantera Archive; Dimebag Darrell |
| 327 | Backfill tags | Dimebag Darrell Homenaje | Pantera | Pantera; Groove Metal; Heavy Metal Classics; remera; Pantera Archive; Dimebag Darrell |
| 328 | Backfill tags | Pantera 101 Live | Pantera | Pantera; Groove Metal; Heavy Metal Classics; Official Live: 101 Proof; remera; Pantera Archive |
| 329 | Backfill tags | Pantera Darrell v2 | Pantera | Pantera; Groove Metal; Heavy Metal Classics; remera; Pantera Archive; Dimebag Darrell |
| 307 | Backfill tags | Iron Maiden - Live After Death | Iron Maiden | Iron Maiden; Heavy Metal Classics; Live After Death; remera; Archivo Maiden |
| 308 | Backfill tags | Iron Maiden | Iron Maiden | Iron Maiden; Heavy Metal Classics; remera; Archivo Maiden |
| 7034 | Backfill tags | Iron Maiden - Eddie v1 | Iron Maiden | Iron Maiden; Heavy Metal Classics; remera; Archivo Maiden; Eddie |
| 408 | Backfill tags | Iron Maiden - Eddie v2 | Iron Maiden | Iron Maiden; Heavy Metal Classics; remera; Archivo Maiden; Eddie |
| 409 | Backfill tags | Iron Maiden - Eddie v3 | Iron Maiden | Iron Maiden; Heavy Metal Classics; remera; Archivo Maiden; Eddie |
| 5125 | Backfill tags | Iron Maiden - Eddie v4 | Iron Maiden | Iron Maiden; Heavy Metal Classics; remera; Archivo Maiden; Eddie |
| 5126 | Backfill tags | Dimebag Darrell Live | Pantera | Pantera; Groove Metal; Heavy Metal Classics; remera; Pantera Archive; Dimebag Darrell |
| 410 | Backfill tags | Dimebag Logo Fuego | Pantera | Pantera; Groove Metal; Heavy Metal Classics; remera; Pantera Archive; Dimebag Darrell |
| 411 | Backfill tags | Guitar Dimebag | Pantera | Pantera; Groove Metal; Heavy Metal Classics; remera; Pantera Archive; Dimebag Darrell |
| 412 | Backfill tags | Pantera Art | Pantera | Pantera; Groove Metal; Heavy Metal Classics; remera; Pantera Archive |
| 413 | Backfill tags | Pantera Band v1 | Pantera | Pantera; Groove Metal; Heavy Metal Classics; remera; Pantera Archive |
| 414 | Backfill tags | Pantera Snake v1 | Pantera | Pantera; Groove Metal; Heavy Metal Classics; remera; Pantera Archive |
| 415 | Backfill tags | Pantera Snake v2 | Pantera | Pantera; Groove Metal; Heavy Metal Classics; remera; Pantera Archive |
| 417 | Backfill tags | Phil Anselmo v1 | Pantera | Pantera; Groove Metal; Heavy Metal Classics; remera; Pantera Archive; Phil Anselmo |
| 418 | Backfill tags | Pantera Tour 2000 | Pantera | Pantera; Groove Metal; Heavy Metal Classics; remera; Pantera Archive; Tour Archive |
| 4190 | Backfill tags | Phil Emblem | Pantera | Pantera; Groove Metal; Heavy Metal Classics; remera; Pantera Archive |
| 4191 | Backfill tags | Vulgar FMD | Pantera | Pantera; Groove Metal; Heavy Metal Classics; FMD Editions; Vulgar Display of Power; remera; Pantera Archive |
| 60 | Backfill tags | AC/DC Europe 84 | AC/DC | AC/DC; Rock Legends; Heavy Metal Classics; remera; AC/DC Archive; Tour Archive |
| 5118 | Backfill tags | Almafuerte En Vida | Almafuerte | Almafuerte; Argentina Heavy; Custom Archive; remera; Personalizados FMD |
| 310 | Backfill tags | Amon Amarth | Amon Amarth | Amon Amarth; Modern Metal; Custom Archive; remera; Personalizados FMD |
| 432 | Backfill tags | Down | Down | Down; Groove Metal; Custom Archive; remera; Personalizados FMD |
| 51 | Backfill tags | Flema | Flema | Flema; Custom Archive; remera; Personalizados FMD |
| 5119 | Backfill tags | HermÃ©tica | Hermetica | Hermetica; Argentina Heavy; Custom Archive; remera; Personalizados FMD |
| 305 | Backfill tags | John Petrucci | Dream Theater | Dream Theater; Modern Metal; Custom Archive; remera; Personalizados FMD |
| 5120 | Backfill tags | Judas Priest | Judas Priest | Judas Priest; Heavy Metal Classics; Custom Archive; remera; Personalizados FMD |
| 41 | Backfill tags | Kurt Nirvana | Nirvana | Nirvana; Rock Legends; Custom Archive; remera; Personalizados FMD |
| 62 | Backfill tags | Lemmy Stone Deaf Forever | Motorhead | Motorhead; Heavy Metal Classics; Rock Legends; Custom Archive; remera; Personalizados FMD |
| 63 | Backfill tags | Motorhead | Motorhead | Motorhead; Heavy Metal Classics; Rock Legends; Custom Archive; remera; Personalizados FMD |
| 59 | Backfill tags | Primal Fear | Primal Fear | Primal Fear; Heavy Metal Classics; Custom Archive; remera; Personalizados FMD |
| 54 | Backfill tags | Saltatio Mortis | Saltatio Mortis | Saltatio Mortis; Modern Metal; Custom Archive; remera; Personalizados FMD |
| 43 | Backfill tags | Symphony X | Symphony X | Symphony X; Modern Metal; Custom Archive; remera; Personalizados FMD |
| 57 | Backfill tags | The Ramones | Ramones | Ramones; Rock Legends; Custom Archive; remera; Personalizados FMD |
| 58 | Backfill tags | WASP | WASP | WASP; Heavy Metal Classics; Custom Archive; remera; Personalizados FMD |
| 322 | Backfill tags | WASP v2 | WASP | WASP; Heavy Metal Classics; Custom Archive; remera; Personalizados FMD |
| 53 | Backfill tags | Wintersun | Wintersun | Wintersun; Modern Metal; Custom Archive; remera; Personalizados FMD |
| 5130 | Backfill tags | Kanonenfiebe Argentina | Kanonenfieber | Kanonenfieber; Modern Metal; Custom Archive; remera; Personalizados FMD; Argentina 2026 |
| 1059 | Backfill tags | Kill 'Em All | Metallica | Metallica; Thrash Metal; Heavy Metal Classics; Kill 'Em All; remera; Metallica Albums |
| 1060 | Backfill tags | Ride the Lightning | Metallica | Metallica; Thrash Metal; Heavy Metal Classics; Ride the Lightning; remera; Metallica Albums |
| 1061 | Backfill tags | Master of Puppets | Metallica | Metallica; Thrash Metal; Heavy Metal Classics; Master of Puppets; remera; Metallica Albums |
| 1062 | Backfill tags | ...And Justice for All | Metallica | Metallica; Thrash Metal; Heavy Metal Classics; ...And Justice for All; remera; Metallica Archive |
| 1063 | Backfill tags | Metallica Early Years | Metallica | Metallica; Thrash Metal; Heavy Metal Classics; remera; Metallica Archive |
| 2001 | Backfill tags | Avenged Sevenfold Collection | Avenged Sevenfold | Avenged Sevenfold; Modern Metal; remera; Avenged Sevenfold Archive |
| 2002 | Backfill tags | Avenged Sevenfold Dorsos | Avenged Sevenfold | Avenged Sevenfold; Modern Metal; remera; Avenged Sevenfold Archive |
| 5003 | Backfill tags | Black Sabbath | Black Sabbath | Black Sabbath; Heavy Metal Classics; Rock Legends; remera; Black Sabbath Archive |
| 5006 | Backfill tags | Gojira | Gojira | Gojira; Modern Metal; remera; Gojira Archive |
| 5017 | Backfill tags | Sodom - Agent Orange | Sodom | Sodom; Thrash Metal; Agent Orange; remera; Sodom Archive |
| 5117 | Backfill tags | Sodom - Logo | Sodom | Sodom; Thrash Metal; remera; Sodom Archive |
| 5123 | Backfill tags | Testament | Testament | Testament; Thrash Metal; remera; Testament Archive |
| 5031 | Backfill tags | Black Label | Black Label Society | Black Label Society; Groove Metal; Heavy Metal Classics; Custom Archive; remera; Personalizados FMD |
| 5032 | Backfill tags | Iron Maiden Book | Iron Maiden | Iron Maiden; Heavy Metal Classics; The Book of Souls; remera; Archivo Maiden |
| 5033 | Backfill tags | Iron Maiden Can I | Iron Maiden | Iron Maiden; Heavy Metal Classics; Seventh Son of a Seventh Son; remera; Archivo Maiden |
| 5034 | Backfill tags | Iron Maiden The Book | Iron Maiden | Iron Maiden; Heavy Metal Classics; The Book of Souls; remera; Archivo Maiden |
| 5035 | Backfill tags | Iron Maiden Brave | Iron Maiden | Iron Maiden; Heavy Metal Classics; Brave New World; remera; Archivo Maiden |
| 5036 | Backfill tags | Iron Maiden Killers | Iron Maiden | Iron Maiden; Heavy Metal Classics; Killers; remera; Archivo Maiden |
| 5037 | Backfill tags | Iron Maiden Somewhere | Iron Maiden | Iron Maiden; Heavy Metal Classics; Somewhere in Time; remera; Archivo Maiden |
| 5038 | Backfill tags | Iron Maiden Fear | Iron Maiden | Iron Maiden; Heavy Metal Classics; Fear of the Dark; remera; Archivo Maiden |
| 5040 | Backfill tags | Angus Young V1 | AC/DC | AC/DC; Rock Legends; Heavy Metal Classics; remera; AC/DC Archive; Angus Young |
| 5041 | Backfill tags | Black Ice | AC/DC | AC/DC; Rock Legends; Heavy Metal Classics; Black Ice; remera; AC/DC Archive |
| 5042 | Backfill tags | Fly on the Wall | AC/DC | AC/DC; Rock Legends; Heavy Metal Classics; Fly on the Wall; remera; AC/DC Archive |
| 5043 | Backfill tags | For Those Remastered | AC/DC | AC/DC; Rock Legends; Heavy Metal Classics; For Those About to Rock We Salute You; remera; AC/DC Archive |
| 5044 | Backfill tags | Let There Be Rock (Black) | AC/DC | AC/DC; Rock Legends; Heavy Metal Classics; Let There Be Rock; remera; AC/DC Archive |
| 5045 | Backfill tags | Let There Be Rock (White) | AC/DC | AC/DC; Rock Legends; Heavy Metal Classics; Let There Be Rock; remera; AC/DC Archive |
| 5046 | Backfill tags | Highway to Hell V1 | AC/DC | AC/DC; Rock Legends; Heavy Metal Classics; Highway to Hell; remera; AC/DC Archive |
| 5047 | Backfill tags | AC/DC Argentina | AC/DC | AC/DC; Rock Legends; Heavy Metal Classics; remera; AC/DC Archive; Edicion Argentina; Argentina 2026 |
| 5048 | Backfill tags | For Those Angus | AC/DC | AC/DC; Rock Legends; Heavy Metal Classics; For Those About to Rock We Salute You; remera; AC/DC Archive; Angus Young |
| 5049 | Backfill tags | High Voltage | AC/DC | AC/DC; Rock Legends; Heavy Metal Classics; High Voltage; remera; AC/DC Archive |
| 5127 | Backfill tags | Power Up | AC/DC | AC/DC; Rock Legends; Heavy Metal Classics; Power Up; remera; AC/DC Archive |
| 5128 | Backfill tags | Angus Black & White | AC/DC | AC/DC; Rock Legends; Heavy Metal Classics; remera; AC/DC Archive; Angus Young |
| 5052 | Backfill tags | Highway Circular | AC/DC | AC/DC; Rock Legends; Heavy Metal Classics; Highway to Hell; remera; AC/DC Archive |
| 5102 | Backfill tags | Are You Ready | AC/DC | AC/DC; Rock Legends; Heavy Metal Classics; The Razors Edge; remera; AC/DC Archive |
| 5103 | Backfill tags | AC/DC PWR UP | AC/DC | AC/DC; Rock Legends; Heavy Metal Classics; Power Up; remera; AC/DC Archive |
| 6010 | Backfill tags | Brian Camiseta Argentina | AC/DC | AC/DC; Rock Legends; Heavy Metal Classics; remera; AC/DC Archive; Argentina 2026 |
| 6011 | Backfill tags | Angus Young Electric | AC/DC | AC/DC; Rock Legends; Heavy Metal Classics; remera; AC/DC Archive; Angus Young |
| 6004 | Backfill tags | Hoodie Iron Maiden | Iron Maiden | Iron Maiden; Heavy Metal Classics; hoodie; Archivo Maiden |
| 6005 | Backfill tags | Hoodie Iron Maiden 666 | Iron Maiden | Iron Maiden; Heavy Metal Classics; The Number of the Beast; hoodie; Archivo Maiden |
| 6006 | Backfill tags | Hoodie Iron Maiden Killers v1 | Iron Maiden | Iron Maiden; Heavy Metal Classics; Killers; hoodie; Archivo Maiden |
| 6007 | Backfill tags | Hoodie Iron Maiden Killers v2 | Iron Maiden | Iron Maiden; Heavy Metal Classics; Killers; hoodie; Archivo Maiden |
| 6008 | Backfill tags | Hoodie Pantera | Pantera | Pantera; Groove Metal; Heavy Metal Classics; hoodie; Pantera Archive |
| 6018 | Backfill tags | Hoodie Black Sabbath The End | Black Sabbath | Black Sabbath; Heavy Metal Classics; Rock Legends; hoodie; Black Sabbath Archive |
| 6019 | Backfill tags | Hoodie Black Sabbath Tour | Black Sabbath | Black Sabbath; Heavy Metal Classics; Rock Legends; hoodie; Black Sabbath Archive; Tour Archive |
| 6021 | Backfill tags | Hoodie AC/DC Are You Ready | AC/DC | AC/DC; Rock Legends; Heavy Metal Classics; The Razors Edge; hoodie; AC/DC Archive |

## Pendientes despues de Sprint 1.4

- Archivo profundo Megadeth pendiente: **83 cards**.
- Personalizados ambiguos/no asociables a banda: **7 cards**.
- Total pendiente: **90 cards**.

### Revision manual recomendada

- `49` Bifrost Argentina: no se asigna banda sin evidencia suficiente o no corresponde a una banda.
- `56` Calavera Guitar: no se asigna banda sin evidencia suficiente o no corresponde a una banda.
- `5121` Diego Maradona: no se asigna banda sin evidencia suficiente o no corresponde a una banda.
- `311` Guitarrista Blues: no se asigna banda sin evidencia suficiente o no corresponde a una banda.
- `422` M'era Luna: no se asigna banda sin evidencia suficiente o no corresponde a una banda.
- `50` Slinka Mascota: no se asigna banda sin evidencia suficiente o no corresponde a una banda.
- `421` Stranger Things Original: no se asigna banda sin evidencia suficiente o no corresponde a una banda.

## Recomendacion concreta para Sprint 2

Completar primero las **83 cards del archivo profundo Megadeth** antes de construir vitrinas visuales. Megadeth es el nucleo comercial y crear vitrinas ahora produciria universos y prioridades incompletos. Despues de esa migracion, iniciar vitrinas con datos globales consistentes.

## Errores

- Ninguno.
