const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const products = JSON.parse(fs.readFileSync(path.join(root, 'data', 'products.json'), 'utf8'));
const outputDir = __dirname;

const normalize = value => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

function proposeSection(product) {
    const category = normalize(product.category);
    const name = normalize(product.name);
    const collections = normalize((product.collections || []).join(' '));
    const text = `${name} ${normalize(product.img)} ${collections}`;

    if (category === 'vicrattlehead') return ['vic-rattlehead', 'high', 'category legado VicRattlehead'];
    if (category === 'dave mustaine') return ['dave-mustaine', 'high', 'category legado Dave Mustaine'];
    if (category === 'tour' || category === 'dorsales') return ['tours', 'high', `category legado ${product.category}`];
    if (category === 'musician') return ['members', 'high', 'category legado Musician'];
    if (category === 'album') {
        if (/\bvic\b/.test(name)) return ['vic-rattlehead', 'medium', 'nombre principal contiene Vic'];
        if (name.includes('fmd edition') || collections.includes('original fmd')) {
            return ['original-fmd', 'high', 'nombre o colección declara FMD'];
        }
        return ['albums', 'high', 'category legado Album'];
    }

    if (/\bvic\b/.test(name)) return ['vic-rattlehead', 'medium', 'nombre principal contiene Vic'];
    if (/\bdave\b|\bmustaine\b/.test(name)) return ['dave-mustaine', 'medium', 'nombre principal contiene Dave/Mustaine'];
    if (/\btour\b|\bdorso\b/.test(name)) return ['tours', 'medium', 'nombre principal contiene Tour/Dorso'];
    if (name.includes('fmd') || collections.includes('original fmd')) {
        return ['original-fmd', 'medium', 'nombre o colección declara FMD'];
    }
    if (product.album) return ['albums', 'medium', 'card asociada a un álbum'];
    return ['unclassified', 'low', 'sin evidencia suficiente'];
}

function getDesignGroup(product) {
    return product.album || product.name || null;
}

const plan = products
    .filter(product => normalize(product.band) === 'megadeth')
    .map(product => {
        const [megadethSection, confidence, reason] = proposeSection(product);
        return {
            id: product.id,
            code: product.code || null,
            name: product.name,
            legacyCategory: product.category,
            garments: product.garments || [],
            album: product.album || null,
            proposed: {
                megadethSection,
                megadethDesignGroup: getDesignGroup(product)
            },
            confidence,
            reviewRequired: confidence !== 'high',
            reason,
            image: product.img
        };
    })
    .sort((a, b) => a.proposed.megadethSection.localeCompare(b.proposed.megadethSection) || a.name.localeCompare(b.name));

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(
    path.join(outputDir, 'megadeth_classification_plan.json'),
    JSON.stringify(plan, null, 2) + '\n'
);

const csvEscape = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
const csvHeader = [
    'id', 'code', 'name', 'legacyCategory', 'garments', 'album',
    'proposedSection', 'proposedDesignGroup', 'confidence',
    'reviewRequired', 'reason', 'image'
];
const csvRows = plan.map(item => [
    item.id,
    item.code,
    item.name,
    item.legacyCategory,
    item.garments.join('|'),
    item.album,
    item.proposed.megadethSection,
    item.proposed.megadethDesignGroup,
    item.confidence,
    item.reviewRequired,
    item.reason,
    item.image
].map(csvEscape).join(','));
fs.writeFileSync(
    path.join(outputDir, 'megadeth_classification_review.csv'),
    [csvHeader.join(','), ...csvRows].join('\n') + '\n'
);

const counts = {};
for (const item of plan) {
    const section = item.proposed.megadethSection;
    counts[section] = (counts[section] || 0) + 1;
}

const summary = {
    generatedAt: new Date().toISOString(),
    totalMegadethCards: plan.length,
    proposedSections: counts,
    highConfidence: plan.filter(item => item.confidence === 'high').length,
    reviewRequired: plan.filter(item => item.reviewRequired).length,
    productsJsonModified: false
};
fs.writeFileSync(
    path.join(outputDir, 'megadeth_classification_summary.json'),
    JSON.stringify(summary, null, 2) + '\n'
);

console.log(JSON.stringify(summary, null, 2));
