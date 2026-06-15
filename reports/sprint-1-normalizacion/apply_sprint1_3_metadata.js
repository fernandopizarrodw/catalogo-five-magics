const fs = require('fs');
const path = require('path');

const root = process.cwd();
const productsPath = path.join(root, 'data', 'products.json');
const planPath = path.join(root, 'reports', 'sprint-1-normalizacion', 'sprint1_3_metadata_plan.json');
const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
const allowedTiers = new Set(['hero', 'featured', 'catalog', 'archive', 'hidden']);
const allowedGarments = new Set(['remera', 'hoodie', 'buzo_cuello_redondo']);

if (plan.length !== 54 || new Set(plan.map(item => item.id)).size !== 54) {
    throw new Error('El lote Sprint 1.3 debe contener exactamente 54 IDs unicos.');
}

for (const metadata of plan) {
    const product = products.find(item => item.id === metadata.id);
    if (!product) throw new Error(`No existe el producto ${metadata.id}.`);
    if ('commercialPriority' in product) throw new Error(`El producto ${metadata.id} ya tiene metadata.`);
    if (!allowedTiers.has(metadata.visibilityTier)) throw new Error(`Tier invalido en ${metadata.id}.`);
    if (!metadata.garments.every(item => allowedGarments.has(item))) throw new Error(`Prenda invalida en ${metadata.id}.`);
    if (!Number.isInteger(metadata.commercialPriority) || metadata.commercialPriority < 0 || metadata.commercialPriority > 100) {
        throw new Error(`commercialPriority invalida en ${metadata.id}.`);
    }
    product.band = metadata.band;
    product.universe = [...new Set(metadata.universe)];
    product.album = metadata.album;
    product.garments = [...new Set(metadata.garments)];
    product.collections = [...new Set([...(product.collections || []), ...metadata.collections])];
    product.campaigns = [...new Set(metadata.campaigns)];
    product.commercialPriority = metadata.commercialPriority;
    product.visibilityTier = metadata.visibilityTier;
    product.legacyCategory = product.category;
}

fs.writeFileSync(productsPath, `${JSON.stringify(products, null, 4)}\n`, 'utf8');
console.log(`Metadatos Sprint 1.3 aplicados a ${plan.length} productos.`);
