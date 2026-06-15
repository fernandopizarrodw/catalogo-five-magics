const fs = require('fs');
const path = require('path');

const root = process.cwd();
const products = JSON.parse(fs.readFileSync(path.join(root, 'data', 'products.json'), 'utf8'));
const outputPath = path.join(root, 'reports', 'sprint-1-normalizacion', 'sprint1_4_metadata_plan.json');

const bands = {
    'Alice in Chains': [5001],
    Angra: [5002],
    'Def Leppard': [5004],
    'Dream Theater': [5005],
    "Guns N' Roses": [5007],
    Hawthorne: [5008],
    Helloween: [5009],
    Hermetica: [5010],
    Lethal: [5011],
    Nightwish: [5012],
    'Ozzy Osbourne': [5013],
    Rammstein: [5014],
    Sepultura: [5015, 6012],
    Sundenrausch: [5018],
    Cacophony: [5200],
    'Black Label Society': [6001],
    Pantera: [6002],
    Exodus: [6003],
    Rhapsody: [6009, 6017],
    Death: [6016],
    'Aphex Twin': [5122],
    'Jason Becker': [312],
    Megadeth: [
        5057, 5061, 5056, 5062, 5071, 5055, 5064, 5065, 5066, 5059, 5060, 5063, 5067, 5068,
        5069, 5070, 5072, 5073, 5074, 5075, 5076, 7001, 7002, 7003, 7004, 7005, 7006, 7007,
        7008, 7009, 7010, 7014
    ]
};
const universesByBand = {
    'Alice in Chains': ['Rock Legends'],
    Angra: ['Heavy Metal Classics', 'Modern Metal'],
    'Def Leppard': ['Rock Legends', 'Heavy Metal Classics'],
    'Dream Theater': ['Modern Metal'],
    "Guns N' Roses": ['Rock Legends'],
    Hawthorne: ['Modern Metal'],
    Helloween: ['Heavy Metal Classics'],
    Hermetica: ['Argentina Heavy'],
    Lethal: ['Argentina Heavy'],
    Nightwish: ['Modern Metal', 'Heavy Metal Classics'],
    'Ozzy Osbourne': ['Heavy Metal Classics', 'Rock Legends'],
    Rammstein: ['Modern Metal'],
    Sepultura: ['Groove Metal', 'Thrash Metal'],
    Sundenrausch: ['Modern Metal'],
    Cacophony: ['Heavy Metal Classics'],
    'Black Label Society': ['Groove Metal', 'Heavy Metal Classics'],
    Pantera: ['Groove Metal', 'Heavy Metal Classics'],
    Exodus: ['Thrash Metal'],
    Rhapsody: ['Heavy Metal Classics'],
    Death: ['Modern Metal'],
    'Aphex Twin': ['Custom Archive'],
    'Jason Becker': ['Heavy Metal Classics', 'Custom Archive'],
    Megadeth: ['Megadeth Vault', 'Thrash Metal']
};
const albumById = {
    5001: 'Dirt',
    5005: 'Parasomnia',
    5010: 'Acido Argentino',
    5012: 'Once',
    5015: 'Roots',
    6012: 'Roots',
    5057: 'Killing Is My Business... and Business Is Good!',
    5061: "Peace Sells... but Who's Buying?",
    5056: 'So Far, So Good... So What!',
    5062: 'Rust in Peace',
    5071: 'Rust in Peace',
    5055: 'Countdown to Extinction',
    5064: 'Youthanasia',
    5065: 'Cryptic Writings',
    5066: 'Dystopia',
    7001: 'Rust in Peace',
    7002: 'Rust in Peace',
    7003: 'Rust in Peace',
    7004: 'Countdown to Extinction',
    7005: 'Killing Is My Business... and Business Is Good!',
    7006: 'So Far, So Good... So What!',
    7007: 'Youthanasia'
};
const featuredIds = new Set([
    5001, 5002, 5004, 5005, 5007, 5009, 5010, 5012, 5013, 5014, 5015, 5200,
    6001, 6002, 6003, 6009, 6012, 6016, 6017,
    5057, 5061, 5062, 5071, 5055, 5064, 5065, 5066, 5059, 5060, 5072, 5074,
    7001, 7002, 7003, 7004, 7005, 7006, 7007, 7010
]);
const personalizedIds = new Set([5122, 312]);
const bandById = new Map();
Object.entries(bands).forEach(([band, ids]) => ids.forEach(id => bandById.set(id, band)));

function inferGarments(product) {
    if (product.category === 'Hoodies FMD' || product.category === 'Hoodies Otras Bandas') return ['hoodie'];
    if (product.category === 'Buzo Cuello Redondo') return ['buzo_cuello_redondo'];
    return ['remera'];
}

function buildTags(metadata) {
    return [...new Set([
        metadata.band,
        ...metadata.universe,
        metadata.album,
        ...metadata.garments,
        ...metadata.collections,
        ...metadata.campaigns
    ].filter(Boolean))];
}

function buildCollections(band, product, album) {
    const collections = [];
    if (band === 'Megadeth') collections.push('Megadeth Archive');
    else if (personalizedIds.has(product.id)) collections.push('Personalizados FMD');
    else collections.push(`${band} Archive`);
    if (album) collections.push(album);
    if (/\bfmd\b/i.test(`${product.name} ${product.img}`)) collections.push('FMD Editions');
    if (/tour|argentina/i.test(product.name)) collections.push('Tour Archive');
    return [...new Set(collections)];
}

function buildCampaigns(product) {
    const campaigns = [];
    if (/tour/i.test(product.name)) campaigns.push('Tour Archive');
    if (/argentina/i.test(product.name)) campaigns.push('Argentina 2026');
    return campaigns;
}

const fullMigrations = [...bandById.entries()].map(([id, band]) => {
    const product = products.find(item => item.id === id);
    if (!product) throw new Error(`No existe el producto ${id}.`);
    if ('commercialPriority' in product) throw new Error(`El producto ${id} ya fue migrado.`);
    const album = albumById[id] || null;
    const universe = [...universesByBand[band]];
    if (/\bfmd\b/i.test(`${product.name} ${product.img}`)) universe.push('FMD Editions');
    const metadata = {
        id,
        operation: 'full-migration',
        band,
        universe: [...new Set(universe)],
        album,
        garments: inferGarments(product),
        collections: buildCollections(band, product, album),
        campaigns: buildCampaigns(product),
        commercialPriority: featuredIds.has(id) ? 78 : (personalizedIds.has(id) ? 52 : 64),
        visibilityTier: featuredIds.has(id) ? 'featured' : 'catalog'
    };
    metadata.tags = buildTags(metadata);
    return metadata;
});

const tagBackfills = products
    .filter(product => 'commercialPriority' in product && (!Array.isArray(product.tags) || !product.tags.length))
    .map(product => ({
        id: product.id,
        operation: 'tags-backfill',
        tags: buildTags(product)
    }));

const plan = {
    sprint: '1.4',
    fullMigrations,
    tagBackfills
};
const allIds = [...fullMigrations, ...tagBackfills].map(item => item.id);
if (fullMigrations.length !== 56 || tagBackfills.length !== 97 || new Set(allIds).size !== 153) {
    throw new Error(`Alcance inesperado: full=${fullMigrations.length}, tags=${tagBackfills.length}, union=${new Set(allIds).size}.`);
}

fs.writeFileSync(outputPath, `${JSON.stringify(plan, null, 2)}\n`, 'utf8');
console.log(`Plan Sprint 1.4: ${fullMigrations.length} migraciones completas + ${tagBackfills.length} backfills de tags.`);
