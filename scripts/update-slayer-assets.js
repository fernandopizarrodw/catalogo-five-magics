'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const catalog = require('../js/catalog-design.js');
const manifest = require('./slayer-assets-manifest.js');
const root = path.resolve(__dirname, '..');
const file = path.join(root, 'data/products.json');
const originalText = fs.readFileSync(file, 'utf8');
const before = JSON.parse(originalText);
const after = structuredClone(before);
const updates = [];
const asset = (folder, stem) => `images/slayer/${folder}/${stem}.jpg`;
const resolveId = (product, variant) => {
    if (variant.designId || product.designId) return variant.designId || product.designId;
    const concept = catalog.getConceptName(product, variant);
    const family = product.designFamilyId;
    return family ? `cd-${catalog.slugify(family)}--${catalog.slugify(concept)}`
        : `cd-${catalog.slugify(catalog.getPublicBand(product))}-${catalog.slugify(concept)}--p${product.id}`;
};

// Pin existing identities before adding presentations; variant slots never move.
for (const product of after.filter(p => p.band === 'Slayer')) {
    product.variants.forEach(variant => {
        if (!catalog.isBackVariant(variant)) variant.designId = resolveId(product, variant);
    });
}
for (const row of manifest) {
    const product = after.find(p => p.id === row.product);
    let frontIndex = row.variant;
    if (!Number.isInteger(frontIndex)) {
        frontIndex = product.variants.findIndex(v => v.designId === row.designId && v.img === asset('frente', row.front));
        if (frontIndex < 0) {
            frontIndex = product.variants.length;
            product.variants.push({ name: `${row.publicName} - Remera`, publicName: row.publicName, designId: row.designId, role: 'front', garmentCategory: 'Slayer' });
        }
    }
    const front = product.variants[frontIndex];
    const publicName = catalog.getConceptName(product, front);
    Object.assign(front, {
        img: asset('frente', row.front), role: 'front', color: 'negro',
        selectionLabel: `Frente ${row.label}`, previewLabel: 'Solo frente',
        defaultPrintMode: 'simple', modalOrder: row.product === 7106 && row.variant === 1 ? 10 : 0
    });
    if (row.sleeveOnly) front.garmentStyle = 'sin_mangas';
    if (row.sleeve) front.stylePreviews = [{ img: asset('frente', row.sleeve), garmentStyle: 'sin_mangas', previewLabel: 'Solo frente · Sin mangas' }];
    if (frontIndex === 0) product.img = front.img;
    const report = { key: row.key, productId: product.id, frontIndex, designId: front.designId, front: front.img, sleeve: row.sleeve ? asset('frente', row.sleeve) : row.sleeveOnly ? front.img : null, backs: [] };
    (row.backs || []).forEach((back, index) => {
        const backImage = asset('dorso', back.art);
        let backIndex = product.variants.findIndex(v => v.role === 'back' && v.img === backImage && v.backTargetDesignId === front.designId);
        if (backIndex < 0) { backIndex = product.variants.length; product.variants.push({}); }
        Object.assign(product.variants[backIndex], {
            img: backImage, name: back.label, selectionLabel: back.label, previewLabel: back.label,
            role: 'back', garmentCategory: 'Slayer', backTargetDesignId: front.designId,
            carouselPreview: true, modalOrder: 1 + index / 10,
            stylePreviews: [{ img: asset('dorso', `${back.art}_sin_mangas`), garmentStyle: 'sin_mangas', previewLabel: `${back.label} · Sin mangas` }]
        });
        const backReport = { index: backIndex, image: backImage, label: back.label };
        if (back.double || back.existingDouble) {
            const image = back.existingDouble || asset('dobles', back.double);
            let doubleIndex = product.variants.findIndex(v => v.role === 'front' && v.img === image && v.autoSelectBack === back.label && v.designId === front.designId);
            if (doubleIndex < 0) { doubleIndex = product.variants.length; product.variants.push({}); }
            Object.assign(product.variants[doubleIndex], {
                img: image, name: `${row.label} - Frente y dorso`, publicName, role: 'front',
                designId: front.designId, garmentCategory: 'Slayer', color: 'negro',
                selectionLabel: front.selectionLabel, previewLabel: `Frente + ${back.label.replace(/^Dorso\s+/i, 'dorso ')}`,
                autoSelectBack: back.label, defaultPrintMode: 'double', orderVariantIndex: frontIndex,
                modalOrder: 2 + index / 10
            });
            if (back.sleeveDouble) product.variants[doubleIndex].stylePreviews = [{ img: asset('dobles', back.sleeveDouble), garmentStyle: 'sin_mangas', previewLabel: `Frente + ${back.label.replace(/^Dorso\s+/i, 'dorso ')} · Sin mangas` }];
            backReport.doubleIndex = doubleIndex;
            backReport.doubleImage = image;
        }
        report.backs.push(backReport);
    });
    updates.push(report);
}

// The removed Live Undead front was a second presentation of the same art.
after.find(p => p.id === 7126).variants[0].orderCode = 'SLAYERV3-7126';
const live = after.find(p => p.id === 7117);
live.variants[1].img = live.variants[0].img;
live.variants[1].stylePreviews = structuredClone(live.variants[0].stylePreviews);
live.variants[1].selectionLabel = live.variants[0].selectionLabel;
live.variants[1].defaultPrintMode = 'simple';
live.variants[1].modalOrder = 0;

assert.deepEqual(before.filter(p => p.band !== 'Slayer'), after.filter(p => p.band !== 'Slayer'));
for (const product of after.filter(p => p.band === 'Slayer')) {
    for (const image of [product.img, ...product.variants.flatMap(v => [v.img, ...(v.stylePreviews || []).map(p => p.img)])]) {
        assert(fs.existsSync(path.join(root, image)), `Missing Slayer asset: ${image}`);
    }
}
const renderProduct = p => JSON.stringify(p, null, 2).split('\n').map(line => `  ${line}`).join('\n') + (p.id === before[before.length - 1].id ? '' : ',');
const changes = before.map((product, i) => ({ old: product, next: after[i] })).filter(({ old, next }) => JSON.stringify(old) !== JSON.stringify(next));
const patch = ['*** Begin Patch', `*** Update File: ${file.replace(/\\/g, '/')}`];
const requestedProduct = process.argv.find(arg => arg.startsWith('--product='))?.split('=')[1];
for (const { old, next } of changes.filter(change => !process.argv.includes('--summary') && (!requestedProduct || String(change.old.id) === requestedProduct))) {
    const oldText = renderProduct(old);
    assert(originalText.replace(/\r\n/g, '\n').includes(oldText), `Unexpected JSON formatting for ${old.id}`);
    patch.push('@@', ...oldText.split('\n').map(line => `-${line}`), ...renderProduct(next).split('\n').map(line => `+${line}`));
}
patch.push('*** End Patch');
process.stdout.write(JSON.stringify({ patch: patch.join('\n'), updates, changedProducts: changes.map(c => c.old.id) }));
