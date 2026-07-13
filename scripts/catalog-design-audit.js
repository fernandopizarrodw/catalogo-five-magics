'use strict';

const fs = require('fs');
const path = require('path');
const {
    buildCatalogDesigns,
    validateCatalogDesigns
} = require('../js/catalog-design.js');

const ROOT = path.resolve(__dirname, '..');
const PRODUCTS_PATH = path.join(ROOT, 'data', 'products.json');
const OUTPUT_JSON = path.join(ROOT, 'reports', 'catalog_design_control_2026-07-11.json');
const OUTPUT_MD = path.join(ROOT, 'reports', 'catalog_design_control_2026-07-11.md');

const AUDIT_CASES = [
    { key: 'megadeth', label: 'Megadeth - Rust in Peace', productIds: [4] },
    { key: 'slayer', label: 'Slayer - FMD Originals', productIds: [7123] },
    { key: 'iron-maiden', label: 'Iron Maiden - Eddie Gaucho', productIds: [7040] },
    { key: 'metallica', label: 'Metallica - Ride the Lightning', productIds: [1060] },
    { key: 'epica', label: 'EPICA', productIds: [5016] },
    { key: 'rhapsody', label: 'Rhapsody', productIds: [5083, 6009, 6017] },
    { key: 'hammerfall', label: 'HammerFall', productIds: [5089] },
    { key: 'single-design', label: 'Banda con un diseño - King Diamond', productIds: [5058] },
    { key: 'outerwear', label: 'Abrigo específico - Hoodie Rust in Peace', productIds: [5062] },
    { key: 'custom', label: 'Personalizado - Diego Maradona', productIds: [5121] }
];

const BACK_TARGET_OVERRIDES = {
    // Está al final de la card, pero corresponde al frente Lineup V2.
    '4:10': 'megadeth-lineup-v2'
};

function loadProducts() {
    return JSON.parse(fs.readFileSync(PRODUCTS_PATH, 'utf8'));
}

function getSelectedProducts(products) {
    const selectedIds = new Set(AUDIT_CASES.flatMap(auditCase => auditCase.productIds));
    const selected = products.filter(product => selectedIds.has(Number(product.id)));
    const foundIds = new Set(selected.map(product => Number(product.id)));
    const missingIds = [...selectedIds].filter(id => !foundIds.has(id));
    if (missingIds.length) throw new Error(`Faltan productos de auditoría: ${missingIds.join(', ')}`);
    return selected;
}

function getAuditCasesForDesign(design) {
    const sourceIds = new Set(design.sourceProductIds);
    return AUDIT_CASES
        .filter(auditCase => auditCase.productIds.some(id => sourceIds.has(id)))
        .map(auditCase => auditCase.key);
}

function assertSourceImagesExist(designs) {
    const missing = [];
    for (const design of designs) {
        const refs = [design.front, ...design.backOptions, ...Object.values(design.previewsByGarment).flat()].filter(Boolean);
        for (const ref of refs) {
            if (!ref.image || !fs.existsSync(path.join(ROOT, ref.image))) {
                missing.push(`${design.designId}: ${ref.image || '(vacía)'}`);
            }
        }
    }
    return missing;
}

function assertStableCodes(firstBuild, secondBuild) {
    const secondCodes = new Map(secondBuild.map(design => [design.designId, design.orderCodeBase]));
    return firstBuild
        .filter(design => secondCodes.get(design.designId) !== design.orderCodeBase)
        .map(design => `${design.designId}: código inestable`);
}

function assertGarmentPolicy(designs) {
    const expected = ['remera', 'hoodie', 'buzo_cuello_redondo'];
    return designs
        .filter(design => expected.some(garment => !design.availableGarments.includes(garment)))
        .map(design => `${design.designId}: availableGarments incompleto`);
}

function countSourceFronts(products) {
    return products.reduce((total, product) => {
        const variants = Array.isArray(product.variants) && product.variants.length ? product.variants : [{ role: 'front' }];
        return total + variants.filter(variant => !/dorso|(^|[\s_.-])back([\s_.-]|$)/i.test(`${variant.name || ''} ${variant.img || ''}`)).length;
    }, 0);
}

function buildControlOutput(products, designs, validationErrors) {
    const cases = AUDIT_CASES.map(auditCase => {
        const caseDesigns = designs.filter(design => design.auditCases.includes(auditCase.key));
        const caseProducts = products.filter(product => auditCase.productIds.includes(Number(product.id)));
        return {
            key: auditCase.key,
            label: auditCase.label,
            sourceProductIds: auditCase.productIds,
            sourceFrontMocks: countSourceFronts(caseProducts),
            catalogDesigns: caseDesigns.length,
            designIds: caseDesigns.map(design => design.designId)
        };
    });

    return {
        generatedAt: new Date().toISOString(),
        status: validationErrors.length ? 'failed' : 'passed',
        modelVersion: 'catalog-design-pilot-1',
        availableGarmentPolicy: ['remera', 'hoodie', 'buzo_cuello_redondo'],
        identityPolicy: 'Preferir designId explícito; transición actual por nombre normalizado con trazabilidad.',
        reviewNotes: [
            'Slayer FMD Originals: 29 mocks de frente se agrupan en 15 diseños; los mocks de la misma idea por prenda no se duplican.',
            'Los designId actuales son transitorios. No se escriben en products.json hasta completar la revisión curatorial.'
        ],
        summary: {
            auditCases: cases.length,
            sourceProducts: products.length,
            sourceFrontMocks: countSourceFronts(products),
            catalogDesigns: designs.length,
            validationErrors: validationErrors.length
        },
        cases,
        validationErrors,
        designs
    };
}

function escapeCell(value) {
    return String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function renderMarkdown(control) {
    const lines = [
        '# Salida de control CatalogDesign',
        '',
        `Fecha: ${control.generatedAt}`,
        `Estado: **${control.status.toUpperCase()}**`,
        '',
        '## Resumen',
        '',
        `- Casos auditados: ${control.summary.auditCases}`,
        `- Productos/cards de origen: ${control.summary.sourceProducts}`,
        `- Mocks de frente de origen: ${control.summary.sourceFrontMocks}`,
        `- Entidades CatalogDesign resultantes: ${control.summary.catalogDesigns}`,
        `- Errores de validación: ${control.summary.validationErrors}`,
        '',
        '## Decisiones visibles en esta salida',
        '',
        ...control.reviewNotes.map(note => `- ${note}`),
        '',
        '## Cobertura por caso',
        '',
        '| Caso | IDs de origen | Mocks de frente | CatalogDesign |',
        '|---|---|---:|---:|',
        ...control.cases.map(item => `| ${escapeCell(item.label)} | ${item.sourceProductIds.join(', ')} | ${item.sourceFrontMocks} | ${item.catalogDesigns} |`),
        '',
        '## Diseños',
        '',
        '| designId | Nombre público | Banda | Frente | Dorsos | Prendas disponibles | Previews R/H/B | IDs origen | Código base |',
        '|---|---|---|---|---|---|---|---|---|',
        ...control.designs.map(design => {
            const previewCounts = [
                design.previewsByGarment.remera.length,
                design.previewsByGarment.hoodie.length,
                design.previewsByGarment.buzo_cuello_redondo.length
            ].join('/');
            const backs = design.backOptions.length
                ? design.backOptions.map(back => back.label).join('; ')
                : 'Ninguno';
            return `| ${escapeCell(design.designId)} | ${escapeCell(design.publicName)} | ${escapeCell(design.band)} | ${escapeCell(design.front?.image)} | ${escapeCell(backs)} | ${design.availableGarments.join(', ')} | ${previewCounts} | ${design.sourceProductIds.join(', ')} | ${escapeCell(design.orderCodeBase)} |`;
        }),
        '',
        '## Validación',
        '',
        ...(control.validationErrors.length
            ? control.validationErrors.map(error => `- ERROR: ${error}`)
            : ['- Cero designId duplicados.', '- Cero dorsos huérfanos.', '- Cero imágenes inexistentes.', '- Códigos base estables.', '- Prendas disponibles independientes de los mocks.']),
        '',
        '## Nota de transición',
        '',
        'Esta salida no modifica `products.json` ni el render público. Los `designId` inferidos sirven para validar el modelo. La migración permanente deberá escribir identificadores explícitos en los datos mediante backup, plan auditable y validador.'
    ];
    return `${lines.join('\n')}\n`;
}

function main() {
    const allProducts = loadProducts();
    const selectedProducts = getSelectedProducts(allProducts);
    const buildOptions = { backTargetOverrides: BACK_TARGET_OVERRIDES };
    const firstBuild = buildCatalogDesigns(selectedProducts, buildOptions);
    const secondBuild = buildCatalogDesigns(selectedProducts, buildOptions);
    const designs = firstBuild.map(design => ({
        ...design,
        auditCases: getAuditCasesForDesign(design)
    }));

    const validationErrors = [
        ...validateCatalogDesigns(designs),
        ...assertSourceImagesExist(designs),
        ...assertStableCodes(firstBuild, secondBuild),
        ...assertGarmentPolicy(designs)
    ];
    const control = buildControlOutput(selectedProducts, designs, validationErrors);

    fs.writeFileSync(OUTPUT_JSON, `${JSON.stringify(control, null, 2)}\n`, 'utf8');
    fs.writeFileSync(OUTPUT_MD, renderMarkdown(control), 'utf8');

    console.log(JSON.stringify({
        status: control.status,
        summary: control.summary,
        outputJson: path.relative(ROOT, OUTPUT_JSON),
        outputMarkdown: path.relative(ROOT, OUTPUT_MD),
        validationErrors
    }, null, 2));

    if (validationErrors.length) process.exitCode = 1;
}

main();
