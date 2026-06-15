const fs = require('fs');
const path = require('path');

const root = process.cwd();
const productsPath = path.join(root, 'data', 'products.json');
const planPath = path.join(root, 'reports', 'sprint-1-normalizacion', 'sprint1_4_metadata_plan.json');
const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
const allowedTiers = new Set(['hero', 'featured', 'catalog', 'archive', 'hidden']);
const allowedGarments = new Set(['remera', 'hoodie', 'buzo_cuello_redondo']);
const allIds = [...plan.fullMigrations, ...plan.tagBackfills].map(item => item.id);

if (plan.fullMigrations.length !== 56 || plan.tagBackfills.length !== 97 || new Set(allIds).size !== 153) {
    throw new Error('El plan Sprint 1.4 no tiene el alcance esperado.');
}

for (const metadata of plan.fullMigrations) {
    const product = products.find(item => item.id === metadata.id);
    if (!product) throw new Error(`No existe el producto ${metadata.id}.`);
    if ('commercialPriority' in product) throw new Error(`El producto ${metadata.id} ya tiene metadata.`);
    if (!allowedTiers.has(metadata.visibilityTier)) throw new Error(`Tier invalido en ${metadata.id}.`);
    if (!metadata.garments.every(item => allowedGarments.has(item))) throw new Error(`Prenda invalida en ${metadata.id}.`);
    product.band = metadata.band;
    product.universe = [...new Set(metadata.universe)];
    product.album = metadata.album;
    product.garments = [...new Set(metadata.garments)];
    product.collections = [...new Set([...(product.collections || []), ...metadata.collections])];
    product.campaigns = [...new Set(metadata.campaigns)];
    product.commercialPriority = metadata.commercialPriority;
    product.visibilityTier = metadata.visibilityTier;
    product.legacyCategory = product.category;
    product.tags = [...new Set(metadata.tags)];
}

for (const update of plan.tagBackfills) {
    const product = products.find(item => item.id === update.id);
    if (!product) throw new Error(`No existe el producto ${update.id}.`);
    if (!('commercialPriority' in product)) throw new Error(`Backfill sobre producto no migrado ${update.id}.`);
    product.tags = [...new Set(update.tags)];
}

fs.writeFileSync(productsPath, `${JSON.stringify(products, null, 4)}\n`, 'utf8');
console.log(`Sprint 1.4 aplicado: ${plan.fullMigrations.length} migraciones completas + ${plan.tagBackfills.length} backfills.`);
