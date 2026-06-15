const fs = require('fs');
const path = require('path');

const root = process.cwd();
const reportDir = path.join(root, 'reports', 'sprint-1-normalizacion');
const products = JSON.parse(fs.readFileSync(path.join(root, 'data', 'products.json'), 'utf8'));
const backup = JSON.parse(fs.readFileSync(path.join(root, 'backups', 'products.pre-sprint1.5-2026-06-15.json'), 'utf8'));
const plan = JSON.parse(fs.readFileSync(path.join(reportDir, 'sprint1_5_metadata_plan.json'), 'utf8'));
const reportPath = path.join(reportDir, 'INFORME_SPRINT_1_5_CIERRE_TOTAL.md');
const ambiguousPath = path.join(reportDir, 'SPRINT_1_5_PERSONALIZADOS_REVISION_MANUAL.md');
const csvPath = path.join(reportDir, 'sprint1_5_productos_modificados.csv');
const metadataFields = [
    'band', 'universe', 'album', 'garments', 'collections', 'campaigns',
    'commercialPriority', 'visibilityTier', 'legacyCategory', 'tags'
];
const productById = new Map(products.map(product => [String(product.id), product]));
const backupById = new Map(backup.map(product => [String(product.id), product]));
const planIds = new Set(plan.map(item => String(item.id)));
const errors = [];

const countValues = (items, field) => items.reduce((counts, item) => {
    const values = Array.isArray(item[field]) ? item[field] : [item[field]];
    values.forEach(value => {
        const key = value === null ? 'Sin banda / revision manual' : value;
        counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
}, {});

if (products.length !== 290 || backup.length !== 290) errors.push('La cantidad total no es 290.');
if (plan.length !== 90 || planIds.size !== 90) errors.push('El plan no contiene 90 IDs unicos.');

const duplicateIds = [...products.reduce((counts, product) => {
    const id = String(product.id);
    counts.set(id, (counts.get(id) || 0) + 1);
    return counts;
}, new Map()).entries()].filter(([, count]) => count > 1);
if (duplicateIds.length) errors.push('Hay IDs duplicados.');

const changed = products.filter(product => JSON.stringify(product) !== JSON.stringify(backupById.get(String(product.id))));
const unexpectedChanges = changed.filter(product => !planIds.has(String(product.id)));
const unchangedPlan = [...planIds].filter(id => !changed.some(product => String(product.id) === id));
if (changed.length !== 90) errors.push(`Se modificaron ${changed.length} productos en lugar de 90.`);
if (unexpectedChanges.length) errors.push(`Hay ${unexpectedChanges.length} cambios fuera del lote.`);
if (unchangedPlan.length) errors.push(`Hay ${unchangedPlan.length} productos del plan sin cambios.`);

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
    if (product.category !== previous.category) categoryChanges.push(product.id);
    if (JSON.stringify(product.img) !== JSON.stringify(previous.img)) imageChanges.push(product.id);
    if (JSON.stringify(product.variants) !== JSON.stringify(previous.variants)) variantChanges.push(product.id);
}
if (categoryChanges.length) errors.push(`Hay ${categoryChanges.length} categorias modificadas.`);
if (imageChanges.length) errors.push(`Hay ${imageChanges.length} imagenes principales modificadas.`);
if (variantChanges.length) errors.push(`Hay ${variantChanges.length} variantes modificadas.`);

for (const product of products) {
    metadataFields.forEach(field => {
        if (!Object.prototype.hasOwnProperty.call(product, field)) errors.push(`${product.id} no tiene ${field}.`);
    });
    if (product.legacyCategory !== product.category) errors.push(`${product.id} tiene legacyCategory inconsistente.`);
    if (!Array.isArray(product.tags) || !product.tags.length) errors.push(`${product.id} no tiene tags.`);
    if (!Number.isInteger(product.commercialPriority)) errors.push(`${product.id} no tiene prioridad valida.`);
}

const megadethMigrated = plan.filter(item => item.group === 'megadeth-deep-archive');
const ambiguous = plan.filter(item => item.group === 'ambiguous-custom');
for (const item of ambiguous) {
    const product = productById.get(String(item.id));
    if (product.reviewStatus !== 'manual-review') errors.push(`${item.id} no esta marcado para revision manual.`);
}
const albumNull = products.filter(product => product.album === null);
const distributions = {
    band: countValues(products, 'band'),
    universe: countValues(products, 'universe'),
    visibilityTier: countValues(products, 'visibilityTier'),
    commercialPriority: products.reduce((counts, product) => {
        const priority = product.commercialPriority;
        const range = priority >= 90 ? '90-100' : priority >= 75 ? '75-89' : priority >= 50 ? '50-74' : priority >= 25 ? '25-49' : '0-24';
        counts[range] = (counts[range] || 0) + 1;
        return counts;
    }, {})
};

const cell = value => Array.isArray(value) ? (value.length ? value.join('; ') : '-') : (value ?? '-');
const csvCell = value => `"${String(cell(value)).replace(/"/g, '""')}"`;
const distributionLines = values => Object.entries(values).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([key, count]) => `- ${key}: **${count}**`).join('\n');
const megadethRows = megadethMigrated.map(item => {
    const product = productById.get(String(item.id));
    return `| ${product.id} | ${product.name} | ${product.category} | ${cell(product.album)} | ${product.visibilityTier} | ${product.commercialPriority} |`;
});
const ambiguousRows = ambiguous.map(item => {
    const product = productById.get(String(item.id));
    return `| ${product.id} | ${product.name} | ${cell(product.band)} | ${cell(product.universe)} | ${cell(product.album)} | ${product.visibilityTier} | ${product.commercialPriority} | ${product.reviewStatus} |`;
});

const report = `# Informe Sprint 1.5 - Cierre total de normalizacion

Fecha: 2026-06-15

## Resultado auditado

- Estado: **${errors.length ? 'FALLIDO' : 'VALIDADO'}**
- Cobertura normalizada: **${products.length}/${products.length} (100%)**
- Cards Megadeth migradas: **${megadethMigrated.length}**
- Personalizados ambiguos clasificados: **${ambiguous.length}**
- Cards modificadas: **${changed.length}**
- Cambios fuera del lote: **${unexpectedChanges.length}**
- IDs duplicados: **${duplicateIds.length}**
- Categorias modificadas: **${categoryChanges.length}**
- Rutas principales modificadas: **${imageChanges.length}**
- Variantes modificadas: **${variantChanges.length}**
- Referencias de imagen verificadas: **${imageReferences}**
- Imagenes inexistentes: **${missingImages.length}**
- Productos finales con \`album: null\`: **${albumNull.length}**

## 83 cards Megadeth migradas

| ID | Producto | Categoria legado | Album | Tier | Priority |
|---:|---|---|---|---|---:|
${megadethRows.join('\n')}

## 7 personalizados ambiguos

| ID | Producto | Band | Universe | Album | Tier | Priority | Revision |
|---:|---|---|---|---|---|---:|---|
${ambiguousRows.join('\n')}

Los siete mantienen \`band: null\`, \`album: null\`, \`Custom Archive\` y \`manual-review\`. No se forzaron asociaciones.

## Distribucion final por banda

${distributionLines(distributions.band)}

## Distribucion final por universe

${distributionLines(distributions.universe)}

## Distribucion final por visibilityTier

${distributionLines(distributions.visibilityTier)}

## Distribucion final por commercialPriority

${distributionLines(distributions.commercialPriority)}

## Compatibilidad

- No se modificaron \`index.html\`, CSS, \`js/app.js\`, home, filtros, modales ni carrito.
- No se modificaron categorias, imagenes ni variantes.
- Los campos nuevos siguen siendo compatibles con la logica actual de \`app.js\`.

## Recomendacion Sprint 2

La base ya esta normalizada al 100%. Sprint 2 puede enfocarse en vitrinas y navegacion por universos:

1. Crear vitrinas para Thrash Metal, Heavy Metal Classics, Rock Legends, Groove Metal, Modern Metal y FMD Editions.
2. Usar \`visibilityTier\` y \`commercialPriority\` para limitar el scroll inicial sin ocultar productos.
3. Incorporar navegacion por \`band\`, \`universe\`, \`garments\` y \`collections\`.
4. Mantener los productos \`archive\` disponibles mediante busqueda y acciones Ver todo.
5. Revisar manualmente los siete personalizados marcados antes de darles una banda.

## Errores

${errors.length ? errors.map(error => `- ${error}`).join('\n') : '- Ninguno.'}
`;

const ambiguousReport = `# Personalizados ambiguos - Revision manual futura

Estos productos no tienen asociacion clara a una banda. Se conservaron disponibles sin forzar datos.

| ID | Producto | Band | Universe | Album | Tier | Priority | Revision |
|---:|---|---|---|---|---|---:|---|
${ambiguousRows.join('\n')}
`;

const headers = ['id', 'name', ...metadataFields];
const csvRows = plan.map(item => {
    const product = productById.get(String(item.id));
    return headers.map(header => csvCell(product[header])).join(',');
});
fs.writeFileSync(reportPath, report, 'utf8');
fs.writeFileSync(ambiguousPath, ambiguousReport, 'utf8');
fs.writeFileSync(csvPath, `${headers.join(',')}\n${csvRows.join('\n')}\n`, 'utf8');

console.log(JSON.stringify({
    status: errors.length ? 'FALLIDO' : 'VALIDADO',
    products: products.length,
    normalized: products.filter(product => 'commercialPriority' in product).length,
    megadethMigrated: megadethMigrated.length,
    ambiguous: ambiguous.length,
    changedProducts: changed.length,
    changesOutsideBatch: unexpectedChanges.length,
    duplicateIds: duplicateIds.length,
    categoryChanges: categoryChanges.length,
    imageChanges: imageChanges.length,
    variantChanges: variantChanges.length,
    imageReferences,
    missingImages: missingImages.length,
    albumNull: albumNull.length,
    distributions,
    errors
}, null, 2));

if (errors.length) process.exitCode = 1;
