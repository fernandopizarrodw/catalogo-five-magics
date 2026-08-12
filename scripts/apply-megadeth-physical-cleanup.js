'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PRODUCTS_PATH = path.join(ROOT, 'data', 'products.json');
const CSV_PATH = path.join(ROOT, 'reports', 'megadeth-curation-editable-2026-08-12.csv');
const CONFIG_PATH = path.join(ROOT, 'js', 'band-archives-config.js');
const APPLY = process.argv.includes('--apply');

function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = '';
    let quoted = false;
    for (let index = 0; index < text.length; index += 1) {
        const char = text[index];
        if (quoted) {
            if (char === '"' && text[index + 1] === '"') {
                cell += '"';
                index += 1;
            } else if (char === '"') quoted = false;
            else cell += char;
        } else if (char === '"') quoted = true;
        else if (char === ',') {
            row.push(cell);
            cell = '';
        } else if (char === '\n') {
            row.push(cell.replace(/\r$/, ''));
            if (row.some(value => value !== '')) rows.push(row);
            row = [];
            cell = '';
        } else cell += char;
    }
    if (cell || row.length) {
        row.push(cell);
        rows.push(row);
    }
    const headers = rows.shift().map(header => header.replace(/^\uFEFF/, ''));
    return rows.map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] || ''])));
}

function isBack(variant) {
    return variant?.role === 'back' || /dorso|back/i.test(String(variant?.name || ''));
}

const configs = require(CONFIG_PATH);
const megadeth = configs.find(config => config.band === 'Megadeth');
const retiredIds = new Set(megadeth?.retiredDesignIds || []);
if (!retiredIds.size) throw new Error('No hay diseños Megadeth retirados en la configuración.');

const rows = parseCsv(fs.readFileSync(CSV_PATH, 'utf8'));
const rowsById = new Map(rows.map(row => [row.design_id, row]));
const missingIds = [...retiredIds].filter(id => !rowsById.has(id));
if (missingIds.length) throw new Error(`Faltan designId en el CSV: ${missingIds.join(', ')}`);

const targetPaths = new Set([...retiredIds].map(id => rowsById.get(id).imagen_principal));
const protectedPaths = new Set(rows
    .filter(row => !retiredIds.has(row.design_id) && targetPaths.has(row.imagen_principal))
    .map(row => row.imagen_principal));

// Estas cards representan exclusivamente el diseño retirado o una duplicación
// histórica de ese mismo diseño. Sus dorsos/presentaciones también se retiran.
const removeWholeProductIds = new Set([6032, 6027, 6026, 6025, 405, 5030, 5050]);
const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, 'utf8'));
const removedProducts = products.filter(product => removeWholeProductIds.has(Number(product.id)));
const deleteCandidates = new Set(targetPaths);
removedProducts.forEach(product => {
    const sharedWithPreservedDesign = protectedPaths.has(String(product.img || ''));
    if (sharedWithPreservedDesign) return;
    if (product.img) deleteCandidates.add(product.img);
    (product.variants || []).forEach(variant => {
        if (variant?.img) deleteCandidates.add(variant.img);
    });
});

const nextProducts = products
    .filter(product => !removeWholeProductIds.has(Number(product.id)))
    .map(product => {
        const variants = Array.isArray(product.variants) ? product.variants : [];
        const nextVariants = variants.filter(variant => {
            const image = String(variant?.img || '');
            return !targetPaths.has(image)
                && !(deleteCandidates.has(image) && !protectedPaths.has(image));
        });
        const next = { ...product };
        if (Array.isArray(product.variants)) next.variants = nextVariants;
        if (targetPaths.has(String(product.img || ''))) {
            const fallback = nextVariants.find(variant => variant?.img && !isBack(variant))
                || nextVariants.find(variant => variant?.img);
            if (!fallback) throw new Error(`El producto ${product.id} quedó sin portada válida.`);
            next.img = fallback.img;
        }
        return next;
    });

const remainingReferences = new Set();
nextProducts.forEach(product => {
    if (product.img) remainingReferences.add(product.img);
    (product.variants || []).forEach(variant => {
        if (variant?.img) remainingReferences.add(variant.img);
    });
});

const filesToDelete = [...deleteCandidates]
    .filter(relativePath => !protectedPaths.has(relativePath) && !remainingReferences.has(relativePath))
    .sort();
const retainedSharedFiles = [...deleteCandidates]
    .filter(relativePath => protectedPaths.has(relativePath) || remainingReferences.has(relativePath))
    .sort();

const missingFiles = filesToDelete.filter(relativePath => !fs.existsSync(path.join(ROOT, relativePath)));
if (missingFiles.length) throw new Error(`Faltan archivos físicos: ${missingFiles.join(', ')}`);

const result = {
    mode: APPLY ? 'apply' : 'dry-run',
    retiredDesigns: retiredIds.size,
    removedProducts: removedProducts.map(product => Number(product.id)),
    removedVariantReferences: products.reduce((total, product) => total + (product.variants || []).filter(variant => targetPaths.has(String(variant?.img || ''))).length, 0),
    reassignedProductCovers: products.filter(product => targetPaths.has(String(product.img || '')) && !removeWholeProductIds.has(Number(product.id))).map(product => Number(product.id)),
    filesToDelete,
    retainedSharedFiles
};

if (APPLY) {
    fs.writeFileSync(PRODUCTS_PATH, `${JSON.stringify(nextProducts, null, 4)}\n`, 'utf8');
    filesToDelete.forEach(relativePath => {
        const absolutePath = path.resolve(ROOT, relativePath);
        const imagesRoot = `${path.resolve(ROOT, 'images')}${path.sep}`;
        if (!absolutePath.startsWith(imagesRoot)) throw new Error(`Ruta fuera de images: ${absolutePath}`);
        fs.unlinkSync(absolutePath);
    });
}

console.log(JSON.stringify(result, null, 2));
