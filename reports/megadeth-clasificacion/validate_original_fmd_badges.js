const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const current = JSON.parse(fs.readFileSync(path.join(root, 'data', 'products.json'), 'utf8'));
const backup = JSON.parse(fs.readFileSync(path.join(root, 'backups', 'products.pre-original-fmd-badges-2026-06-15.json'), 'utf8'));
const allowedProduct = new Set(['fmdBadge', 'fmdBadgeDescription']);
const allowedVariant = new Set(['fmdBadge', 'fmdBadgeDescription']);
const stable = value => JSON.stringify(value);
const errors = [];
const changedProducts = [];
let changedVariants = 0;

for (let i = 0; i < current.length; i++) {
    const product = current[i];
    const old = backup[i];
    const productKeys = new Set([...Object.keys(product), ...Object.keys(old)]);
    const illegalProductChanges = [...productKeys].filter(key => key !== 'variants' && stable(product[key]) !== stable(old[key]) && !allowedProduct.has(key));
    if (illegalProductChanges.length) errors.push(`ID ${product.id}: cambios no permitidos ${illegalProductChanges.join(', ')}`);
    if ([...allowedProduct].some(key => stable(product[key]) !== stable(old[key]))) changedProducts.push(product.id);

    const variants = product.variants || [];
    const oldVariants = old.variants || [];
    if (variants.length !== oldVariants.length) errors.push(`ID ${product.id}: cambió cantidad de variantes`);
    for (let v = 0; v < variants.length; v++) {
        const keys = new Set([...Object.keys(variants[v]), ...Object.keys(oldVariants[v] || {})]);
        const changedKeys = [...keys].filter(key => stable(variants[v][key]) !== stable(oldVariants[v]?.[key]));
        const illegal = changedKeys.filter(key => !allowedVariant.has(key));
        if (illegal.length) errors.push(`ID ${product.id} variante ${v}: cambios no permitidos ${illegal.join(', ')}`);
        if (changedKeys.some(key => allowedVariant.has(key))) changedVariants += 1;
    }
}

const ids = current.map(item => item.id);
const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
if (current.length !== 290) errors.push(`Total incorrecto: ${current.length}`);
if (duplicateIds.length) errors.push(`IDs duplicados: ${duplicateIds.join(', ')}`);

const result = { valid: errors.length === 0, totalProducts: current.length, duplicateIds, changedProductBadges: changedProducts.length, changedVariantBadges: changedVariants, errors };
console.log(JSON.stringify(result, null, 2));
if (errors.length) process.exitCode = 1;
