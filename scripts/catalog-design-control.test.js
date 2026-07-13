'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CONTROL_PATH = path.join(ROOT, 'reports', 'catalog_design_control_2026-07-11.json');
const control = JSON.parse(fs.readFileSync(CONTROL_PATH, 'utf8'));

function getDesign(designId) {
    const design = control.designs.find(item => item.designId === designId);
    assert(design, `No existe ${designId}`);
    return design;
}

function previewCounts(design) {
    return [
        design.previewsByGarment.remera.length,
        design.previewsByGarment.hoodie.length,
        design.previewsByGarment.buzo_cuello_redondo.length
    ];
}

assert.strictEqual(control.status, 'passed');
assert.strictEqual(control.summary.auditCases, 10);
assert.strictEqual(control.summary.sourceProducts, 12);
assert.strictEqual(control.summary.sourceFrontMocks, 86);
assert.strictEqual(control.summary.catalogDesigns, 55);
assert.strictEqual(control.summary.validationErrors, 0);

const expectedCaseCounts = {
    megadeth: 5,
    slayer: 15,
    'iron-maiden': 1,
    metallica: 6,
    epica: 9,
    rhapsody: 12,
    hammerfall: 5,
    'single-design': 1,
    outerwear: 1,
    custom: 1
};

for (const [caseKey, expected] of Object.entries(expectedCaseCounts)) {
    const auditCase = control.cases.find(item => item.key === caseKey);
    assert(auditCase, `Falta el caso ${caseKey}`);
    assert.strictEqual(auditCase.catalogDesigns, expected, `${caseKey}: cantidad inesperada`);
}

const rust = getDesign('megadeth-rust-in-peace');
assert.deepStrictEqual(rust.sourceProductIds, [4, 5062]);
assert.deepStrictEqual(previewCounts(rust), [1, 1, 0]);
assert.strictEqual(rust.backOptions.length, 2);
assert.strictEqual(rust.orderCodeBase, 'RIP-004.V1');
assert(rust.auditCases.includes('megadeth') && rust.auditCases.includes('outerwear'));

const lineupV2 = getDesign('megadeth-lineup-v2');
assert(lineupV2.backOptions.some(back => back.productId === 4 && back.variantIndex === 10));

assert.deepStrictEqual(previewCounts(getDesign('slayer-angel-of-death')), [1, 1, 1]);
assert.deepStrictEqual(previewCounts(getDesign('iron-maiden-eddie-gaucho-argentino')), [1, 1, 1]);
assert.deepStrictEqual(previewCounts(getDesign('metallica-ride-the-lightning')), [1, 1, 1]);
assert.deepStrictEqual(previewCounts(getDesign('metallica-ride-the-lightning-v2')), [1, 1, 0]);
assert.deepStrictEqual(previewCounts(getDesign('epica-omega')), [1, 1, 0]);
assert.deepStrictEqual(previewCounts(getDesign('rhapsody-dawn-of-victory')), [1, 1, 0]);
assert.deepStrictEqual(previewCounts(getDesign('hammerfall-crimson')), [0, 1, 0]);
assert.deepStrictEqual(previewCounts(getDesign('king-diamond-abigail')), [1, 0, 0]);
assert.deepStrictEqual(previewCounts(getDesign('personalizados-diego-maradona')), [1, 0, 0]);

for (const design of control.designs) {
    assert.deepStrictEqual(design.availableGarments, ['remera', 'hoodie', 'buzo_cuello_redondo']);
    assert(design.front?.image, `${design.designId}: frente vacío`);
    assert(design.orderCodeBase, `${design.designId}: código vacío`);
    assert(!/sugerid|Ã|Â|\?|producto|variante|card/i.test(design.publicName), `${design.designId}: nombre interno o dañado`);

    const frontKey = `${design.front.productId}:${design.front.variantIndex}`;
    for (const back of design.backOptions) {
        assert.notStrictEqual(`${back.productId}:${back.variantIndex}`, frontKey, `${design.designId}: dorso usado como frente`);
    }
}

assert.strictEqual(new Set(control.designs.map(design => design.designId)).size, control.designs.length);

console.log(`CatalogDesign control: ${control.designs.length} diseños, 10 casos, validación OK.`);
