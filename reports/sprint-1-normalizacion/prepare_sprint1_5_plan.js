const fs = require('fs');
const path = require('path');

const root = process.cwd();
const products = JSON.parse(fs.readFileSync(path.join(root, 'data', 'products.json'), 'utf8'));
const outputPath = path.join(root, 'reports', 'sprint-1-normalizacion', 'sprint1_5_metadata_plan.json');

const ambiguousIds = new Set([49, 56, 5121, 311, 422, 50, 421]);
const albumById = {
    6027: "Peace Sells... but Who's Buying?",
    6026: 'Killing Is My Business... and Business Is Good!',
    3: 'So Far, So Good... So What!',
    5: 'Countdown to Extinction',
    6: 'Youthanasia',
    18: 'Hidden Treasures',
    8: 'Cryptic Writings',
    9: 'Risk',
    10: 'The World Needs a Hero',
    11: 'The System Has Failed',
    12: 'United Abominations',
    13: 'Endgame',
    14: 'TH1RT3EN',
    15: 'Super Collider',
    7: 'Dystopia',
    16: 'The Sick, the Dying... and the Dead!',
    17: 'Megadeth (2026)',
    304: "Peace Sells... but Who's Buying?",
    314: 'Killing Is My Business... and Business Is Good!',
    5124: 'Countdown to Extinction',
    1066: 'Killing Is My Business... and Business Is Good!',
    5024: 'The Sick, the Dying... and the Dead!',
    5025: 'Rust in Peace',
    5027: "Peace Sells... but Who's Buying?",
    5028: 'So Far, So Good... So What!',
    5029: "Peace Sells... but Who's Buying?",
    5051: "Peace Sells... but Who's Buying?",
    5054: "Peace Sells... but Who's Buying?",
    6015: 'So Far, So Good... So What!',
    245: 'The Sick, the Dying... and the Dead!',
    5022: 'The Sick, the Dying... and the Dead!',
    5053: 'Rust in Peace',
    6031: 'Rust in Peace',
    2801: 'Countdown to Extinction',
    2802: 'Rust in Peace',
    2814: 'So Far, So Good... So What!',
    2815: 'Rust in Peace',
    301: "Peace Sells... but Who's Buying?"
};
const catalogIds = new Set([
    6027, 6026, 3, 5, 6, 18, 8, 9, 10, 11, 12, 13, 14, 15, 7, 16, 17,
    304, 314, 5124, 5024, 5025, 5028, 5029, 5051, 6023,
    236, 246, 6015, 245, 5022, 5053, 6031,
    2801, 2802, 2806, 2811, 2814, 2815, 6020,
    29, 30, 31, 39, 40, 300, 301, 320, 405, 6022
]);
const priorityByCategory = {
    Album: 66,
    Singles: 58,
    'Dave Mustaine': 60,
    Musician: 56,
    Tour: 62,
    VicRattlehead: 45,
    Dorsales: 34,
    'Orígenes': 55,
    Personalizados: 30
};

function collectionsFor(product, album, isAmbiguous) {
    if (isAmbiguous) return ['Custom Archive', 'Revision Manual'];
    const collections = ['Megadeth Archive'];
    if (product.category === 'Album') collections.push('Megadeth Albums');
    if (product.category === 'VicRattlehead') collections.push('Vic Rattlehead');
    if (product.category === 'Dave Mustaine') collections.push('Dave Mustaine Spotlight');
    if (product.category === 'Musician') collections.push('Megadeth Members');
    if (product.category === 'Tour' || product.category === 'Dorsales') collections.push('Tour Archive');
    if (product.category === 'Singles') collections.push('Megadeth Singles');
    if (product.category === 'Orígenes') collections.push('Megadeth Origins');
    if (album) collections.push(album);
    if (/\bfmd\b/i.test(`${product.name} ${product.img}`)) collections.push('FMD Editions');
    return [...new Set(collections)];
}

function campaignsFor(product) {
    const campaigns = [];
    if (/argentina|gaucho/i.test(product.name)) campaigns.push('Argentina 2026');
    if (/tour/i.test(product.name) || product.category === 'Dorsales') campaigns.push('Tour Archive');
    return campaigns;
}

function tagsFor(metadata) {
    return [...new Set([
        metadata.band,
        ...metadata.universe,
        metadata.album,
        ...metadata.garments,
        ...metadata.collections,
        ...metadata.campaigns
    ].filter(Boolean))];
}

const pending = products.filter(product => !('commercialPriority' in product));
const plan = pending.map(product => {
    const isAmbiguous = ambiguousIds.has(product.id);
    const album = isAmbiguous ? null : (albumById[product.id] || null);
    const isCatalog = !isAmbiguous && catalogIds.has(product.id);
    const metadata = {
        id: product.id,
        group: isAmbiguous ? 'ambiguous-custom' : 'megadeth-deep-archive',
        band: isAmbiguous ? null : 'Megadeth',
        universe: isAmbiguous ? ['Custom Archive'] : [
            'Megadeth Vault',
            'Thrash Metal',
            ...(/\bfmd\b/i.test(`${product.name} ${product.img}`) ? ['FMD Editions'] : [])
        ],
        album,
        garments: ['remera'],
        collections: collectionsFor(product, album, isAmbiguous),
        campaigns: isAmbiguous ? [] : campaignsFor(product),
        commercialPriority: priorityByCategory[product.category] ?? 55,
        visibilityTier: isCatalog ? 'catalog' : 'archive',
        reviewStatus: isAmbiguous ? 'manual-review' : 'classified'
    };
    metadata.tags = tagsFor(metadata);
    return metadata;
});

if (plan.length !== 90 || plan.filter(item => item.group === 'megadeth-deep-archive').length !== 83 || plan.filter(item => item.group === 'ambiguous-custom').length !== 7) {
    throw new Error('El plan Sprint 1.5 debe contener 83 Megadeth + 7 ambiguos.');
}

fs.writeFileSync(outputPath, `${JSON.stringify(plan, null, 2)}\n`, 'utf8');
console.log('Plan Sprint 1.5 generado: 83 Megadeth + 7 personalizados ambiguos.');
