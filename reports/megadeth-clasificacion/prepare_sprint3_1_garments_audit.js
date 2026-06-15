const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const productsPath = path.join(root, 'data', 'products.json');
const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
const outputDir = __dirname;

const normalize = value => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

function garmentFromText(...values) {
    const text = normalize(values.filter(Boolean).join(' '));
    if (text.includes('hoodie') || text.includes('hoddie') || text.includes('canguro')) return 'hoodie';
    if (text.includes('buzo cuello redondo') || text.includes('buzo_cuello_redondo') || /\bbuzo[_\s-]/.test(text)) {
        return 'buzo_cuello_redondo';
    }
    if (text.includes('remera') || text.includes('shirt') || text.includes('tee')) return 'remera';
    return null;
}

function inferCardGarments(product) {
    const evidence = [];
    const add = (garment, source) => {
        if (garment) evidence.push({ garment, source });
    };

    add(garmentFromText(product.category), `category:${product.category}`);
    add(garmentFromText(product.name, product.img), 'card:name+image');
    for (const garment of product.garments || []) add(garment, 'metadata:garments');
    for (const [index, variant] of (product.variants || []).entries()) {
        add(garmentFromText(variant.garmentCategory), `variant:${index}:garmentCategory`);
        add(garmentFromText(variant.name, variant.img), `variant:${index}:name+image`);
    }

    const inferred = [...new Set(evidence.map(item => item.garment))];
    return { inferred, evidence };
}

function designKey(product) {
    return normalize(product.name)
        .replace(/\b(remera|hoodie|hoddie|buzo|cuello redondo|fmd|edition|original|frente|dorso|doble|oversize|unisex|v\d+)\b/g, ' ')
        .replace(/\b\d{4}\b/g, ' ')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .replace(/\s+/g, '-');
}

const megadeth = products.filter(product => normalize(product.band) === 'megadeth');
const audit = megadeth.map(product => {
    const { inferred, evidence } = inferCardGarments(product);
    const declared = product.garments || [];
    const missingFromDeclared = inferred.filter(garment => !declared.includes(garment));
    const unsupportedDeclared = declared.filter(garment => !inferred.includes(garment));
    const variantGarments = [...new Set((product.variants || [])
        .map(variant => garmentFromText(variant.garmentCategory, variant.name, variant.img))
        .filter(Boolean))];

    return {
        id: product.id,
        code: product.code || null,
        name: product.name,
        legacyCategory: product.category,
        designKey: designKey(product),
        declaredGarments: declared,
        inferredGarments: inferred,
        proposedGarments: inferred.length ? inferred : declared,
        variantGarments,
        variantsCount: (product.variants || []).length,
        missingFromDeclared,
        unsupportedDeclared,
        status: missingFromDeclared.length || unsupportedDeclared.length ? 'review' : 'consistent',
        evidence,
        image: product.img
    };
});

const groups = Object.groupBy(audit.filter(item => item.designKey), item => item.designKey);
const duplicateCandidates = Object.entries(groups)
    .filter(([, items]) => items.length > 1)
    .map(([key, items]) => ({
        designKey: key,
        cardIds: items.map(item => item.id),
        cards: items.map(item => ({
            id: item.id,
            name: item.name,
            legacyCategory: item.legacyCategory,
            proposedGarments: item.proposedGarments,
            variantsCount: item.variantsCount,
            image: item.image
        })),
        recommendation: 'manual-review-only'
    }));

const csvEscape = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
const csvRows = audit.map(item => [
    item.id,
    item.code,
    item.name,
    item.legacyCategory,
    item.declaredGarments.join('|'),
    item.inferredGarments.join('|'),
    item.proposedGarments.join('|'),
    item.variantGarments.join('|'),
    item.variantsCount,
    item.status,
    item.missingFromDeclared.join('|'),
    item.unsupportedDeclared.join('|'),
    item.designKey,
    item.image
].map(csvEscape).join(','));

const csvHeader = [
    'id', 'code', 'name', 'legacyCategory', 'declaredGarments',
    'inferredGarments', 'proposedGarments', 'variantGarments',
    'variantsCount', 'status', 'missingFromDeclared',
    'unsupportedDeclared', 'designKey', 'image'
];

const summary = {
    totalMegadethCards: audit.length,
    consistentCards: audit.filter(item => item.status === 'consistent').length,
    cardsRequiringGarmentReview: audit.filter(item => item.status === 'review').length,
    cardsWithVariants: audit.filter(item => item.variantsCount > 0).length,
    cardsWithMultipleProposedGarments: audit.filter(item => item.proposedGarments.length > 1).length,
    potentialDuplicateGroups: duplicateCandidates.length,
    productsJsonModified: false
};

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, 'sprint3_1_garments_audit.json'), JSON.stringify(audit, null, 2) + '\n');
fs.writeFileSync(path.join(outputDir, 'sprint3_1_garments_review.csv'), [csvHeader.join(','), ...csvRows].join('\n') + '\n');
fs.writeFileSync(path.join(outputDir, 'sprint3_1_duplicate_candidates.json'), JSON.stringify(duplicateCandidates, null, 2) + '\n');
fs.writeFileSync(path.join(outputDir, 'sprint3_1_summary.json'), JSON.stringify(summary, null, 2) + '\n');

console.log(JSON.stringify(summary, null, 2));
