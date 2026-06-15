const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const products = JSON.parse(fs.readFileSync(path.join(root, 'data', 'products.json'), 'utf8'));
const baseDir = path.join(root, 'images', 'fmd-edition-3d');

function walk(dir) {
    const entries = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) entries.push(...walk(full));
        else entries.push(full);
    }
    return entries;
}

const normalizePath = value => String(value || '').replaceAll('\\', '/');
const fmdFiles = new Set(walk(baseDir).map(file => normalizePath(path.relative(root, file))));
const candidates = [];

for (const product of products) {
    const refs = [];
    if (product.img && fmdFiles.has(normalizePath(product.img))) {
        refs.push({ type: 'main', image: normalizePath(product.img), variantIndex: null });
    }
    for (const [index, variant] of (product.variants || []).entries()) {
        if (variant?.img && fmdFiles.has(normalizePath(variant.img))) {
            refs.push({ type: 'variant', image: normalizePath(variant.img), variantIndex: index, variantName: variant.name || null });
        }
    }
    if (refs.length) {
        candidates.push({
            id: product.id,
            name: product.name,
            band: product.band || null,
            category: product.category,
            garments: product.garments || [],
            megadethSection: product.megadethSection || null,
            megadethAlbum: product.megadethAlbum || null,
            megadethDesignType: product.megadethDesignType || null,
            currentFmdBadge: product.fmdBadge || null,
            refs
        });
    }
}

const used = new Set(candidates.flatMap(item => item.refs.map(ref => ref.image)));
const unused = [...fmdFiles].filter(file => !used.has(file)).sort();
const summary = {
    fmdEditionFiles: fmdFiles.size,
    matchedProducts: candidates.length,
    matchedImages: used.size,
    unusedImages: unused.length,
    products: candidates.map(item => ({ id: item.id, name: item.name, refs: item.refs.length }))
};

fs.writeFileSync(path.join(__dirname, 'original_fmd_candidates.json'), JSON.stringify(candidates, null, 2) + '\n');
fs.writeFileSync(path.join(__dirname, 'original_fmd_unused_images.json'), JSON.stringify(unused, null, 2) + '\n');
fs.writeFileSync(path.join(__dirname, 'original_fmd_scan_summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
