const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const productsPath = path.join(root, 'data', 'products.json');
const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
const plan = JSON.parse(fs.readFileSync(path.join(__dirname, 'original_fmd_badge_plan.json'), 'utf8'));
const byId = new Map(plan.map(item => [item.id, item]));
let productChanges = 0;
let variantChanges = 0;

for (const product of products) {
    const item = byId.get(product.id);
    if (!item) continue;
    if (item.mode === 'card') {
        product.fmdBadge = item.cardMetadata.fmdBadge;
        product.fmdBadgeDescription = item.cardMetadata.fmdBadgeDescription;
        productChanges += 1;
    } else {
        for (const variantMetadata of item.variantMetadata) {
            const variant = product.variants?.[variantMetadata.variantIndex];
            if (!variant) throw new Error(`ID ${product.id}: variante inexistente ${variantMetadata.variantIndex}`);
            variant.fmdBadge = variantMetadata.fmdBadge;
            variant.fmdBadgeDescription = variantMetadata.fmdBadgeDescription;
            variantChanges += 1;
        }
    }
}

fs.writeFileSync(productsPath, JSON.stringify(products, null, 2) + '\n');
console.log(`Original FMD aplicado: ${productChanges} cards completas, ${variantChanges} variantes.`);
