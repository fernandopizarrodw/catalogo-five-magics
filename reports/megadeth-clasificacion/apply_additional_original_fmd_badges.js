const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const productsPath = path.join(root, 'data', 'products.json');
const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
const plan = JSON.parse(fs.readFileSync(path.join(__dirname, 'additional_original_fmd_badge_plan.json'), 'utf8'));
const byId = new Map(plan.map(item => [item.id, item]));
let cardBadges = 0;
let variantBadges = 0;

for (const product of products) {
    const item = byId.get(product.id);
    if (!item) continue;
    if (item.mode === 'card') {
        product.fmdBadge = item.fmdBadge;
        product.fmdBadgeDescription = item.fmdBadgeDescription;
        cardBadges += 1;
    } else {
        for (const index of item.variantIndexes) {
            const variant = product.variants?.[index];
            if (!variant) throw new Error(`ID ${product.id}: variante inexistente ${index}`);
            variant.fmdBadge = item.fmdBadge;
            variant.fmdBadgeDescription = item.fmdBadgeDescription;
            variantBadges += 1;
        }
    }
}

fs.writeFileSync(productsPath, JSON.stringify(products, null, 2) + '\n');
console.log(`Badges adicionales aplicados: ${cardBadges} cards, ${variantBadges} variantes.`);
