const fs = require('fs');
const path = require('path');

const root = process.cwd();
const productsPath = path.join(root, 'data', 'products.json');
const planPath = path.join(root, 'reports', 'sprint-1-normalizacion', 'sprint1_5_metadata_plan.json');
const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));

if (plan.length !== 90 || new Set(plan.map(item => item.id)).size !== 90) {
    throw new Error('El plan Sprint 1.5 debe contener 90 IDs unicos.');
}

for (const metadata of plan) {
    const product = products.find(item => item.id === metadata.id);
    if (!product) throw new Error(`No existe el producto ${metadata.id}.`);
    if ('commercialPriority' in product) throw new Error(`El producto ${metadata.id} ya fue migrado.`);
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
    product.reviewStatus = metadata.reviewStatus;
}

fs.writeFileSync(productsPath, `${JSON.stringify(products, null, 4)}\n`, 'utf8');
console.log('Sprint 1.5 aplicado a 90 productos.');
