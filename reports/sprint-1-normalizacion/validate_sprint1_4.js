const fs = require('fs');
const path = require('path');

const root = process.cwd();
const reportDir = path.join(root, 'reports', 'sprint-1-normalizacion');
const products = JSON.parse(fs.readFileSync(path.join(root, 'data', 'products.json'), 'utf8'));
const backup = JSON.parse(fs.readFileSync(path.join(root, 'backups', 'products.pre-sprint1.4-2026-06-15.json'), 'utf8'));
const plan = JSON.parse(fs.readFileSync(path.join(reportDir, 'sprint1_4_metadata_plan.json'), 'utf8'));
const reportPath = path.join(reportDir, 'INFORME_SPRINT_1_4_CIERRE.md');
const csvPath = path.join(reportDir, 'sprint1_4_productos_modificados.csv');
const coverageCsvPath = path.join(reportDir, 'sprint1_4_cobertura_por_banda.csv');
const metadataFields = [
    'band', 'universe', 'album', 'garments', 'collections', 'campaigns',
    'commercialPriority', 'visibilityTier', 'legacyCategory', 'tags'
];
const deepMegadethCategories = new Set([
    'VicRattlehead', 'Album', 'Singles', 'Dave Mustaine', 'Musician', 'Tour', 'Dorsales', 'Orígenes'
]);
const productById = new Map(products.map(product => [String(product.id), product]));
const backupById = new Map(backup.map(product => [String(product.id), product]));
const fullIds = new Set(plan.fullMigrations.map(item => String(item.id)));
const backfillIds = new Set(plan.tagBackfills.map(item => String(item.id)));
const planIds = new Set([...fullIds, ...backfillIds]);
const errors = [];

if (products.length !== 290) errors.push(`Cantidad actual incorrecta: ${products.length}.`);
if (backup.length !== 290) errors.push(`Cantidad del backup incorrecta: ${backup.length}.`);
if (plan.fullMigrations.length !== 56 || plan.tagBackfills.length !== 97 || planIds.size !== 153) {
    errors.push('Alcance del plan incorrecto.');
}

const duplicateIds = [...products.reduce((counts, product) => {
    const id = String(product.id);
    counts.set(id, (counts.get(id) || 0) + 1);
    return counts;
}, new Map()).entries()].filter(([, count]) => count > 1);
if (duplicateIds.length) errors.push(`IDs duplicados: ${duplicateIds.map(([id]) => id).join(', ')}.`);

const changed = products.filter(product => JSON.stringify(product) !== JSON.stringify(backupById.get(String(product.id))));
const changedIds = changed.map(product => String(product.id));
const unexpectedChanges = changedIds.filter(id => !planIds.has(id));
const unchangedPlan = [...planIds].filter(id => !changedIds.includes(id));
if (changed.length !== 153) errors.push(`Cantidad modificada incorrecta: ${changed.length}.`);
if (unexpectedChanges.length) errors.push(`Cambios fuera del lote: ${unexpectedChanges.join(', ')}.`);
if (unchangedPlan.length) errors.push(`Productos del plan sin cambios: ${unchangedPlan.join(', ')}.`);

let imageReferences = 0;
const missingImages = [];
function scanImages(value, productId) {
    if (typeof value === 'string' && /\.(jpe?g|png|webp|gif|avif)$/i.test(value)) {
        imageReferences += 1;
        if (!/^https?:\/\//i.test(value) && !fs.existsSync(path.resolve(root, value.replace(/^\.\//, '')))) {
            missingImages.push(`${productId}: ${value}`);
        }
        return;
    }
    if (Array.isArray(value)) return value.forEach(item => scanImages(item, productId));
    if (value && typeof value === 'object') Object.values(value).forEach(item => scanImages(item, productId));
}
products.forEach(product => scanImages(product, product.id));
if (missingImages.length) errors.push(`Hay ${missingImages.length} imagenes inexistentes.`);

const categoryChanges = [];
const imageChanges = [];
const variantChanges = [];
for (const product of products) {
    const previous = backupById.get(String(product.id));
    if (!previous) continue;
    if (product.category !== previous.category) categoryChanges.push(product.id);
    if (JSON.stringify(product.img) !== JSON.stringify(previous.img)) imageChanges.push(product.id);
    if (JSON.stringify(product.variants) !== JSON.stringify(previous.variants)) variantChanges.push(product.id);
}
if (categoryChanges.length) errors.push(`Categorias modificadas: ${categoryChanges.length}.`);
if (imageChanges.length) errors.push(`Imagenes principales modificadas: ${imageChanges.length}.`);
if (variantChanges.length) errors.push(`Variantes modificadas: ${variantChanges.length}.`);

for (const id of fullIds) {
    const product = productById.get(id);
    metadataFields.forEach(field => {
        if (!Object.prototype.hasOwnProperty.call(product, field)) errors.push(`${id} no tiene ${field}.`);
    });
    if (product.legacyCategory !== product.category) errors.push(`${id} tiene legacyCategory inconsistente.`);
}
for (const id of backfillIds) {
    const product = productById.get(id);
    if (!Array.isArray(product.tags) || !product.tags.length) errors.push(`${id} no recibio tags.`);
}

const normalized = products.filter(product => 'commercialPriority' in product);
const pending = products.filter(product => !('commercialPriority' in product));
const normalizedWithoutTags = normalized.filter(product => !Array.isArray(product.tags) || !product.tags.length);
if (normalized.length !== 200) errors.push(`Cobertura normalizada incorrecta: ${normalized.length}.`);
if (pending.length !== 90) errors.push(`Pendientes incorrectos: ${pending.length}.`);
if (normalizedWithoutTags.length) errors.push(`Hay ${normalizedWithoutTags.length} normalizados sin tags.`);

function associatedDesigns(product) {
    const images = new Set();
    if (product.img) images.add(product.img);
    (product.variants || []).forEach(variant => {
        if (variant.img) images.add(variant.img);
    });
    return images.size;
}

function coverageBand(product) {
    if (product.band) return product.band;
    if (deepMegadethCategories.has(product.category) || product.id === 6022) return 'Megadeth';
    if (product.category === 'Personalizados') return 'Sin banda / revision manual';
    return product.category || 'Sin banda / revision manual';
}

const coverage = [...products.reduce((groups, product) => {
    const band = coverageBand(product);
    const row = groups.get(band) || { band, cards: 0, normalized: 0, pending: 0, designs: 0 };
    row.cards += 1;
    row['commercialPriority' in product ? 'normalized' : 'pending'] += 1;
    row.designs += associatedDesigns(product);
    groups.set(band, row);
    return groups;
}, new Map()).values()].sort((a, b) => b.cards - a.cards || a.band.localeCompare(b.band));

const priorityBands = ['Avenged Sevenfold', 'Black Sabbath', 'Sodom', 'Testament', 'Gojira', 'AC/DC', 'Pantera'];
const priorityCoverage = coverage.filter(row => priorityBands.includes(row.band));
const personalizedCoverage = products
    .filter(product => product.category === 'Personalizados' && product.band)
    .reduce((groups, product) => {
        const row = groups.get(product.band) || { band: product.band, cards: 0, normalized: 0, pending: 0, designs: 0 };
        row.cards += 1;
        row.normalized += 1;
        row.designs += associatedDesigns(product);
        groups.set(product.band, row);
        return groups;
    }, new Map());
const ambiguous = pending.filter(product => product.category === 'Personalizados');
const deepMegadeth = pending.filter(product => deepMegadethCategories.has(product.category) || product.id === 6022);

const cell = value => Array.isArray(value) ? (value.length ? value.join('; ') : '-') : (value ?? '-');
const csvCell = value => `"${String(cell(value)).replace(/"/g, '""')}"`;
const coverageTable = rows => rows.map(row =>
    `| ${row.band} | ${row.cards} | ${row.normalized} | ${row.pending} | ${row.designs} |`
).join('\n');
const fullRows = plan.fullMigrations.map(item => {
    const product = productById.get(String(item.id));
    return `| ${product.id} | Migracion completa | ${product.name} | ${product.band} | ${cell(product.universe)} | ${cell(product.album)} | ${cell(product.garments)} | ${product.visibilityTier} | ${product.commercialPriority} |`;
});
const backfillRows = plan.tagBackfills.map(item => {
    const product = productById.get(String(item.id));
    return `| ${product.id} | Backfill tags | ${product.name} | ${product.band || '-'} | ${cell(product.tags)} |`;
});
const ambiguousLines = ambiguous.map(product => `- \`${product.id}\` ${product.name}: no se asigna banda sin evidencia suficiente o no corresponde a una banda.`).join('\n');

const report = `# Informe Sprint 1.4 - Cierre y auditoria de cobertura

Fecha: 2026-06-15

## Que significa banda completamente migrada

Una banda esta completamente migrada cuando el 100% de sus **cards/productos** tiene metadata. Las imagenes y variantes no son productos independientes: pertenecen a una card y heredan conceptualmente su metadata.

- Card/producto: un objeto dentro de \`products.json\`.
- Imagen/diseno asociado: imagen principal o variante dentro de esa card.
- La cantidad de disenos puede ser mayor que la cantidad de cards.

## Resultado auditado

- Estado: **${errors.length ? 'FALLIDO' : 'VALIDADO'}**
- Productos/cards totales: **${products.length}**
- Cards normalizadas: **${normalized.length} / ${products.length} (${((normalized.length / products.length) * 100).toFixed(1)}%)**
- Cards pendientes: **${pending.length}**
- Migraciones completas Sprint 1.4: **${plan.fullMigrations.length}**
- Backfills de tags Sprint 1.4: **${plan.tagBackfills.length}**
- Cards modificadas totales Sprint 1.4: **${changed.length}**
- Cambios fuera del lote: **${unexpectedChanges.length}**
- IDs duplicados: **${duplicateIds.length}**
- Categorias modificadas: **${categoryChanges.length}**
- Rutas principales modificadas: **${imageChanges.length}**
- Variantes modificadas: **${variantChanges.length}**
- Referencias de imagen verificadas: **${imageReferences}**
- Imagenes inexistentes: **${missingImages.length}**
- Cards normalizadas sin tags: **${normalizedWithoutTags.length}**

## Cobertura prioritaria por banda

| Banda | Cards totales | Normalizadas | Pendientes | Imagenes/disenos asociados |
|---|---:|---:|---:|---:|
${coverageTable(priorityCoverage)}

## Cobertura total por banda

| Banda | Cards totales | Normalizadas | Pendientes | Imagenes/disenos asociados |
|---|---:|---:|---:|---:|
${coverageTable(coverage)}

## Personalizados asociados a bandas

| Banda | Cards | Normalizadas | Pendientes | Imagenes/disenos asociados |
|---|---:|---:|---:|---:|
${coverageTable([...personalizedCoverage.values()].sort((a, b) => a.band.localeCompare(b.band)))}

## Productos modificados Sprint 1.4

### Migraciones completas

| ID | Operacion | Producto | Banda | Universe | Album | Garments | Tier | Priority |
|---:|---|---|---|---|---|---|---|---:|
${fullRows.join('\n')}

### Backfill de tags

| ID | Operacion | Producto | Banda | Tags |
|---:|---|---|---|---|
${backfillRows.join('\n')}

## Pendientes despues de Sprint 1.4

- Archivo profundo Megadeth pendiente: **${deepMegadeth.length} cards**.
- Personalizados ambiguos/no asociables a banda: **${ambiguous.length} cards**.
- Total pendiente: **${pending.length} cards**.

### Revision manual recomendada

${ambiguousLines}

## Recomendacion concreta para Sprint 2

Completar primero las **${deepMegadeth.length} cards del archivo profundo Megadeth** antes de construir vitrinas visuales. Megadeth es el nucleo comercial y crear vitrinas ahora produciria universos y prioridades incompletos. Despues de esa migracion, iniciar vitrinas con datos globales consistentes.

## Errores

${errors.length ? errors.map(error => `- ${error}`).join('\n') : '- Ninguno.'}
`;

const modifiedHeaders = ['id', 'operation', 'name', 'band', 'universe', 'album', 'garments', 'collections', 'campaigns', 'commercialPriority', 'visibilityTier', 'legacyCategory', 'tags'];
const modifiedRows = [...plan.fullMigrations, ...plan.tagBackfills].map(item => {
    const product = productById.get(String(item.id));
    return modifiedHeaders.map(header => csvCell(header === 'operation' ? item.operation : product[header])).join(',');
});
const coverageHeaders = ['band', 'cards', 'normalized', 'pending', 'designs'];
const coverageRows = coverage.map(row => coverageHeaders.map(header => csvCell(row[header])).join(','));
fs.writeFileSync(reportPath, report, 'utf8');
fs.writeFileSync(csvPath, `${modifiedHeaders.join(',')}\n${modifiedRows.join('\n')}\n`, 'utf8');
fs.writeFileSync(coverageCsvPath, `${coverageHeaders.join(',')}\n${coverageRows.join('\n')}\n`, 'utf8');

console.log(JSON.stringify({
    status: errors.length ? 'FALLIDO' : 'VALIDADO',
    products: products.length,
    normalized: normalized.length,
    pending: pending.length,
    fullMigrations: plan.fullMigrations.length,
    tagBackfills: plan.tagBackfills.length,
    changedProducts: changed.length,
    changesOutsideBatch: unexpectedChanges.length,
    duplicateIds: duplicateIds.length,
    categoryChanges: categoryChanges.length,
    imageChanges: imageChanges.length,
    variantChanges: variantChanges.length,
    imageReferences,
    missingImages: missingImages.length,
    normalizedWithoutTags: normalizedWithoutTags.length,
    deepMegadethPending: deepMegadeth.length,
    ambiguousPending: ambiguous.length,
    errors
}, null, 2));

if (errors.length) process.exitCode = 1;
