# Sprint 3.1 - Auditoría de prendas Megadeth

## Estado

- Cards Megadeth auditadas: 123
- `products.json` modificado: no
- Productos eliminados: 0
- Cards fusionadas: 0
- Imágenes modificadas: 0
- Backup: `backups/products.pre-sprint3.1-2026-06-15.json`

## Distribución actual por prenda

- Remera: 90 cards
- Hoodie: 23 cards
- Buzo cuello redondo: 12 cards
- Cards multiprenda explícitas: 2

## Cards multiprenda confirmadas

1. ID 6032 - Rust in Peace / Hangar 18 Reimagined
   - Remera
   - Hoodie
   - 9 variantes

2. ID 1 - Killing Is my bussines
   - Remera
   - Buzo cuello redondo
   - 17 variantes

## Variantes

- Cards sin variantes: 61
- Cards con una variante: 7
- Cards con múltiples variantes: 55

Tener múltiples variantes no implica que deban fusionarse con otra card. Las variantes pueden representar frentes, dorsos, versiones visuales o prendas diferentes.

## Resultado de consistencia

Las 123 cards tienen `garments` coherente con la evidencia detectable en categoría, nombre, imagen y variantes.

No se aplicaron correcciones automáticas porque no se detectaron contradicciones suficientemente claras.

## Duplicados potenciales

Se detectaron 16 grupos con nombres relacionados. Son candidatos para revisión manual, no duplicados confirmados.

Ejemplos:

- Rust in Peace: remera, hoodies y buzos separados.
- Peace Sells: cards de remera y hoodie.
- Youthanasia: cards de remera, hoodie y buzo.
- Vic Militar: remera y hoodie.
- Guitarra Argentina: hoodie y buzo.

Estos grupos prueban que existen cards separadas por prenda, pero no deben fusionarse automáticamente.

## Recomendación

Mantener por ahora una card por producto/prenda existente.

En Sprint 3.2, clasificar el diseño independientemente de la prenda mediante:

- `megadethSection`
- `megadethAlbum`
- `megadethEra`
- `megadethDesignType`
- `megadethDesignGroup`

Después podremos decidir manualmente qué cards comparten realmente el mismo `megadethDesignGroup`.
