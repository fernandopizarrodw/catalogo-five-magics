const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const productsPath = path.join(root, 'data', 'products.json');
const planPath = path.join(__dirname, 'sprint3_2_metadata_plan.json');
const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
const byId = new Map(plan.map(item => [item.id, item.metadata]));
let changed = 0;

for (const product of products) {
    const metadata = byId.get(product.id);
    if (!metadata) continue;
    Object.assign(product, metadata);
    changed += 1;
}

if (changed !== 123) throw new Error(`Se esperaban 123 cards modificadas y se encontraron ${changed}.`);
fs.writeFileSync(productsPath, JSON.stringify(products, null, 2) + '\n');
console.log(`Sprint 3.2 aplicado a ${changed} cards Megadeth.`);
