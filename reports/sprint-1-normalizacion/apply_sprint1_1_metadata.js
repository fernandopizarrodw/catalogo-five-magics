const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const productsPath = path.join(root, 'data', 'products.json');
const planPath = path.join(__dirname, 'sprint1_1_metadata_plan.json');

const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));

if (plan.length !== 30) {
    throw new Error(`El lote debe contener 30 productos; contiene ${plan.length}.`);
}

const planIds = plan.map(item => item.id);
if (new Set(planIds).size !== planIds.length) {
    throw new Error('El plan contiene IDs duplicados.');
}

const allowedTiers = new Set(['hero', 'featured', 'catalog', 'archive', 'hidden']);
const allowedGarments = new Set(['remera', 'hoodie', 'buzo_cuello_redondo']);

for (const metadata of plan) {
    const product = products.find(item => item.id === metadata.id);
    if (!product) throw new Error(`No existe el producto ${metadata.id}.`);
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
console.log(`Metadatos aplicados a ${plan.length} productos.`);
