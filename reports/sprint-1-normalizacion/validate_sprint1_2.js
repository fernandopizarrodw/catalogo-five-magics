const fs = require('fs');
const path = require('path');

const root = process.cwd();
const reportDir = path.join(root, 'reports', 'sprint-1-normalizacion');
const products = JSON.parse(fs.readFileSync(path.join(root, 'data', 'products.json'), 'utf8'));
const backup = JSON.parse(fs.readFileSync(path.join(root, 'backups', 'products.pre-sprint1.2-2026-06-15.json'), 'utf8'));
const plan = JSON.parse(fs.readFileSync(path.join(reportDir, 'sprint1_2_metadata_plan.json'), 'utf8'));
const reportPath = path.join(reportDir, 'INFORME_SPRINT_1_2.md');
const csvPath = path.join(reportDir, 'sprint1_2_productos_modificados.csv');

const metadataFields = [
    'band', 'universe', 'album', 'garments', 'collections', 'campaigns',
    'commercialPriority', 'visibilityTier', 'legacyCategory'
];
const allowedTiers = new Set(['hero', 'featured', 'catalog', 'archive', 'hidden']);
const allowedGarments = new Set(['remera', 'hoodie', 'buzo_cuello_redondo']);
const allowedUniverses = new Set([
    'Megadeth Vault', 'Thrash Metal', 'Heavy Metal Classics', 'Groove Metal',
    'Rock Legends', 'Modern Metal', 'Argentina Heavy', 'FMD Editions', 'Custom Archive'
]);
const productById = new Map(products.map(product => [String(product.id), product]));
const backupById = new Map(backup.map(product => [String(product.id), product]));
const planIds = new Set(plan.map(item => String(item.id)));
const errors = [];

const countValues = (items, field) => items.reduce((counts, item) => {
    const values = Array.isArray(item[field]) ? item[field] : [item[field]];
    values.forEach(value => {
        const key = value === null ? 'Sin definir' : value;
        counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
}, {});

if (products.length !== 290) errors.push(`Cantidad actual incorrecta: ${products.length}.`);
if (backup.length !== 290) errors.push(`Cantidad del backup incorrecta: ${backup.length}.`);
if (plan.length !== 60 || planIds.size !== 60) errors.push('El plan no contiene 60 IDs unicos.');

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
if (changed.length !== 60) errors.push(`Cantidad modificada incorrecta: ${changed.length}.`);
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

const selected = plan.map(item => productById.get(String(item.id)));
for (const product of selected) {
    const previous = backupById.get(String(product.id));
    metadataFields.forEach(field => {
        if (!Object.prototype.hasOwnProperty.call(product, field)) errors.push(`${product.id} no tiene ${field}.`);
    });
    if (product.category !== previous.category) errors.push(`${product.id} cambio category.`);
    if (product.legacyCategory !== product.category) errors.push(`${product.id} tiene legacyCategory inconsistente.`);
    if (JSON.stringify(product.img) !== JSON.stringify(previous.img)) errors.push(`${product.id} cambio img.`);
    if (JSON.stringify(product.variants) !== JSON.stringify(previous.variants)) errors.push(`${product.id} cambio variants.`);
    if (!allowedTiers.has(product.visibilityTier)) errors.push(`${product.id} tiene visibilityTier invalido.`);
    if (!product.garments.every(value => allowedGarments.has(value))) errors.push(`${product.id} tiene garments invalidos.`);
    if (!product.universe.every(value => allowedUniverses.has(value))) errors.push(`${product.id} tiene universe invalido.`);
    if (!Number.isInteger(product.commercialPriority) || product.commercialPriority < 0 || product.commercialPriority > 100) {
        errors.push(`${product.id} tiene commercialPriority invalida.`);
    }
}

const categoryChanges = products.filter(product => {
    const previous = backupById.get(String(product.id));
    return previous && product.category !== previous.category;
});
const imageChanges = products.filter(product => {
    const previous = backupById.get(String(product.id));
    return previous && JSON.stringify(product.img) !== JSON.stringify(previous.img);
});
if (categoryChanges.length) errors.push(`Cambios de category globales: ${categoryChanges.length}.`);
if (imageChanges.length) errors.push(`Cambios de img globales: ${imageChanges.length}.`);

const priorityRanges = selected.reduce((counts, product) => {
    const priority = product.commercialPriority;
    const range = priority >= 90 ? '90-100' : priority >= 75 ? '75-89' : priority >= 50 ? '50-74' : priority >= 25 ? '25-49' : '0-24';
    counts[range] = (counts[range] || 0) + 1;
    return counts;
}, {});
const distributions = {
    band: countValues(selected, 'band'),
    universe: countValues(selected, 'universe'),
    visibilityTier: countValues(selected, 'visibilityTier'),
    commercialPriority: priorityRanges
};
const semanticDoubts = selected.filter(product => product.album === null);
const cell = value => Array.isArray(value) ? (value.length ? value.join('; ') : '-') : (value ?? '-');
const csvCell = value => `"${String(cell(value)).replace(/"/g, '""')}"`;
const tableRows = selected.map(product =>
    `| ${product.id} | ${product.name} | ${product.band} | ${cell(product.universe)} | ${cell(product.album)} | ${cell(product.garments)} | ${cell(product.collections)} | ${cell(product.campaigns)} | ${product.commercialPriority} | ${product.visibilityTier} | ${product.legacyCategory} |`
);
const distributionLines = values => Object.entries(values).map(([key, count]) => `- ${key}: **${count}**`).join('\n');
const doubtLines = semanticDoubts.map(product => `- \`${product.id}\` ${product.name}: album no definido por falta de evidencia suficiente.`).join('\n');

const report = `# Informe Sprint 1.2 - Segundo lote de metadatos

Fecha: 2026-06-15

## Resultado auditado

- Estado: **${errors.length ? 'FALLIDO' : 'VALIDADO'}**
- Productos totales: **${products.length}**
- Productos modificados: **${changed.length}**
- Cambios fuera del lote: **${unexpectedChanges.length}**
- IDs duplicados: **${duplicateIds.length}**
- Categorias modificadas: **${categoryChanges.length}**
- Referencias principales de imagen modificadas: **${imageChanges.length}**
- Referencias de imagen verificadas: **${imageReferences}**
- Imagenes inexistentes: **${missingImages.length}**

## Distribucion por banda

${distributionLines(distributions.band)}

## Distribucion por universe

${distributionLines(distributions.universe)}

## Distribucion por visibilityTier

${distributionLines(distributions.visibilityTier)}

## Distribucion por commercialPriority

${distributionLines(distributions.commercialPriority)}

## Compatibilidad con app.js

- No se modificaron \`index.html\`, CSS, \`js/app.js\`, filtros ni home.
- \`category\`, IDs, imagenes y variantes se conservaron.
- \`app.js\` puede leer opcionalmente \`band\` y \`collections\`, pero conserva compatibilidad con productos no migrados mediante \`category\`.
- \`universe\`, \`garments\`, \`campaigns\`, \`commercialPriority\`, \`visibilityTier\` y \`legacyCategory\` no controlan actualmente el comportamiento visual.

## Productos modificados y metadata

| ID | Producto | Band | Universe | Album | Garments | Collections | Campaigns | Priority | Tier | Legacy category |
|---:|---|---|---|---|---|---|---|---:|---|---|
${tableRows.join('\n')}

## Dudas semanticas

Se mantuvo \`album: null\` en ${semanticDoubts.length} productos genericos, de personaje, tour o sin evidencia suficiente:

${doubtLines}

## Alcance pendiente segun prioridad

- Slayer: completado.
- Iron Maiden: completado.
- Metallica: completado.
- Pantera: avanzaron 8 productos; quedan productos pendientes para el siguiente lote.
- AC/DC, Avenged Sevenfold, Black Sabbath, Sodom, Testament, Gojira y personalizados clasificables: pendientes para Sprint 1.3.

## Errores

${errors.length ? errors.map(error => `- ${error}`).join('\n') : '- Ninguno.'}
`;

const csvHeaders = ['id', 'name', ...metadataFields];
const csvRows = selected.map(product => csvHeaders.map(header => csvCell(product[header])).join(','));
fs.writeFileSync(reportPath, report, 'utf8');
fs.writeFileSync(csvPath, `${csvHeaders.join(',')}\n${csvRows.join('\n')}\n`, 'utf8');

console.log(JSON.stringify({
    status: errors.length ? 'FALLIDO' : 'VALIDADO',
    products: products.length,
    changedProducts: changed.length,
    changesOutsideBatch: unexpectedChanges.length,
    duplicateIds: duplicateIds.length,
    categoryChanges: categoryChanges.length,
    imageChanges: imageChanges.length,
    imageReferences,
    missingImages: missingImages.length,
    distributions,
    semanticDoubts: semanticDoubts.length,
    errors
}, null, 2));

if (errors.length) process.exitCode = 1;
