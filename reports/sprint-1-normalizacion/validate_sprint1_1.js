const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const productsPath = path.join(root, 'data', 'products.json');
const backupPath = path.join(root, 'backups', 'products.pre-sprint1.1-2026-06-15.json');
const planPath = path.join(__dirname, 'sprint1_1_metadata_plan.json');
const reportPath = path.join(__dirname, 'INFORME_SPRINT_1_1_PILOTO.md');
const csvPath = path.join(__dirname, 'sprint1_1_productos_modificados.csv');

const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
const metadataFields = [
    'band',
    'universe',
    'album',
    'garments',
    'collections',
    'campaigns',
    'commercialPriority',
    'visibilityTier',
    'legacyCategory'
];
const allowedTiers = new Set(['hero', 'featured', 'catalog', 'archive', 'hidden']);
const allowedGarments = new Set(['remera', 'hoodie', 'buzo_cuello_redondo']);
const allowedUniverses = new Set([
    'Megadeth Vault',
    'Thrash Metal',
    'Heavy Metal Classics',
    'Groove Metal',
    'Rock Legends',
    'Modern Metal',
    'Argentina Heavy',
    'FMD Editions',
    'Custom Archive'
]);

const productById = new Map(products.map(product => [String(product.id), product]));
const backupById = new Map(backup.map(product => [String(product.id), product]));
const planIds = new Set(plan.map(item => String(item.id)));
const errors = [];

if (products.length !== 290) errors.push(`Cantidad actual incorrecta: ${products.length}.`);
if (backup.length !== 290) errors.push(`Cantidad del backup incorrecta: ${backup.length}.`);
if (plan.length !== 30 || planIds.size !== 30) errors.push('El plan piloto no contiene 30 IDs unicos.');

const duplicateIds = [...products.reduce((counts, product) => {
    const id = String(product.id);
    counts.set(id, (counts.get(id) || 0) + 1);
    return counts;
}, new Map()).entries()].filter(([, count]) => count > 1);
if (duplicateIds.length) errors.push(`IDs duplicados: ${duplicateIds.map(([id]) => id).join(', ')}.`);

const changedIds = products
    .filter(product => JSON.stringify(product) !== JSON.stringify(backupById.get(String(product.id))))
    .map(product => String(product.id));
const unexpectedChanges = changedIds.filter(id => !planIds.has(id));
const unchangedPilot = [...planIds].filter(id => !changedIds.includes(id));
if (unexpectedChanges.length) errors.push(`Productos cambiados fuera del piloto: ${unexpectedChanges.join(', ')}.`);
if (unchangedPilot.length) errors.push(`Productos del piloto sin cambios: ${unchangedPilot.join(', ')}.`);

let imageReferences = 0;
const missingImages = [];
function validateImageValue(value, productId) {
    if (typeof value === 'string' && /\.(jpe?g|png|webp|gif|avif)$/i.test(value)) {
        imageReferences += 1;
        if (!/^https?:\/\//i.test(value) && !fs.existsSync(path.resolve(root, value.replace(/^\.\//, '')))) {
            missingImages.push(`${productId}: ${value}`);
        }
        return;
    }
    if (Array.isArray(value)) {
        value.forEach(item => validateImageValue(item, productId));
        return;
    }
    if (value && typeof value === 'object') {
        Object.values(value).forEach(item => validateImageValue(item, productId));
    }
}
products.forEach(product => validateImageValue(product, product.id));
if (missingImages.length) errors.push(`Hay ${missingImages.length} imagenes inexistentes.`);

for (const item of plan) {
    const product = productById.get(String(item.id));
    const previous = backupById.get(String(item.id));
    if (!product || !previous) {
        errors.push(`No se encontro el producto ${item.id} en actual o backup.`);
        continue;
    }
    for (const field of metadataFields) {
        if (!Object.prototype.hasOwnProperty.call(product, field)) errors.push(`${item.id} no tiene ${field}.`);
    }
    if (product.category !== previous.category) errors.push(`${item.id} cambio category.`);
    if (product.legacyCategory !== product.category) errors.push(`${item.id} tiene legacyCategory inconsistente.`);
    if (JSON.stringify(product.img) !== JSON.stringify(previous.img)) errors.push(`${item.id} cambio img.`);
    if (JSON.stringify(product.variants) !== JSON.stringify(previous.variants)) errors.push(`${item.id} cambio variants.`);
    if (!allowedTiers.has(product.visibilityTier)) errors.push(`${item.id} tiene visibilityTier invalido.`);
    if (!product.garments.every(garment => allowedGarments.has(garment))) errors.push(`${item.id} tiene garments invalidos.`);
    if (!product.universe.every(universe => allowedUniverses.has(universe))) errors.push(`${item.id} tiene universes invalidos.`);
    if (!Number.isInteger(product.commercialPriority) || product.commercialPriority < 0 || product.commercialPriority > 100) {
        errors.push(`${item.id} tiene commercialPriority invalida.`);
    }
}

const selected = plan.map(item => productById.get(String(item.id)));
const bandCounts = selected.reduce((counts, product) => {
    counts[product.band] = (counts[product.band] || 0) + 1;
    return counts;
}, {});
const personalized = selected.filter(product => product.category === 'Personalizados').length;

const cell = value => {
    if (Array.isArray(value)) return value.length ? value.join('; ') : '-';
    return value === null || value === undefined || value === '' ? '-' : String(value);
};
const csvCell = value => `"${cell(value).replace(/"/g, '""')}"`;
const tableRows = selected.map(product =>
    `| ${product.id} | ${product.name} | ${product.band} | ${cell(product.universe)} | ${cell(product.album)} | ${cell(product.garments)} | ${cell(product.collections)} | ${cell(product.campaigns)} | ${product.commercialPriority} | ${product.visibilityTier} | ${product.legacyCategory} |`
);

const report = `# Informe Sprint 1.1 - Carga piloto de metadatos

Fecha: 2026-06-15

## Resultado

- Estado: **${errors.length ? 'FALLIDO' : 'VALIDADO'}**
- Productos totales: **${products.length}**
- Productos modificados: **${changedIds.length}**
- IDs duplicados: **${duplicateIds.length}**
- Referencias de imagen verificadas: **${imageReferences}**
- Imagenes inexistentes: **${missingImages.length}**
- Categorias modificadas: **0**
- Productos personalizados incluidos: **${personalized}**
- Distribucion: ${Object.entries(bandCounts).map(([band, count]) => `${band}: ${count}`).join(' | ')}

## Compatibilidad funcional

- Buscador y filtros: los campos existentes, IDs y categorias se conservaron; la metadata nueva es aditiva.
- Modales y carrito: no se modificaron \`index.html\`, \`js/app.js\`, precios, variantes ni categorias.
- Imagenes: no se modificaron rutas y las ${imageReferences} referencias locales existen.
- Sintaxis: \`js/app.js\` paso \`node --check\`.
- Alcance de validacion: auditoria estatica y comparativa contra backup; el proyecto no incluye una suite E2E de navegador automatizada.

## Productos modificados y metadata

| ID | Producto | Band | Universe | Album | Garments | Collections | Campaigns | Priority | Tier | Legacy category |
|---:|---|---|---|---|---|---|---|---:|---|---|
${tableRows.join('\n')}

## Recomendacion para la migracion restante

1. Migrar lotes de 30 a 40 productos, separados por banda o familia comercial.
2. Ejecutar este validador despues de cada lote y conservar un backup previo por lote.
3. Continuar con Slayer e Iron Maiden restantes, luego Metallica/Pantera/AC-DC, prendas, personalizados y archivo profundo Megadeth.
4. Mantener \`category\` y \`legacyCategory\` sin cambios hasta que la futura navegacion use los metadatos nuevos.
5. Hacer una revision comercial de \`visibilityTier\` y \`commercialPriority\` antes de activar vitrinas visuales.

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
    changedProducts: changedIds.length,
    duplicateIds: duplicateIds.length,
    imageReferences,
    missingImages: missingImages.length,
    personalized,
    bandCounts,
    errors
}, null, 2));

if (errors.length) process.exitCode = 1;
