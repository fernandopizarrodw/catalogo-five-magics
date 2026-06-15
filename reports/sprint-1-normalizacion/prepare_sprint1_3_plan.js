const fs = require('fs');
const path = require('path');

const root = process.cwd();
const products = JSON.parse(fs.readFileSync(path.join(root, 'data', 'products.json'), 'utf8'));
const outputPath = path.join(root, 'reports', 'sprint-1-normalizacion', 'sprint1_3_metadata_plan.json');

const commercial = {
    Pantera: [5126, 410, 411, 412, 413, 414, 415, 4190, 4191, 6008],
    'AC/DC': [302, 303, 60, 5040, 5041, 5042, 5043, 5044, 5045, 5046, 5048, 5049, 5127, 5128, 5052, 5102, 5103, 6010, 6011, 6021],
    'Avenged Sevenfold': [2001, 2002],
    'Black Sabbath': [5003, 6018, 6019],
    Sodom: [5017, 5117],
    Testament: [5123],
    Gojira: [5006]
};
const personalized = {
    Down: [432],
    Flema: [51],
    'Hermetica': [5119],
    'Dream Theater': [305],
    Nirvana: [41],
    Motorhead: [62, 63],
    'Primal Fear': [59],
    'Saltatio Mortis': [54],
    'Symphony X': [43],
    Ramones: [57],
    WASP: [322],
    Wintersun: [53],
    Kanonenfieber: [5130],
    'Black Label Society': [5031]
};
const albumById = {
    4191: 'Vulgar Display of Power',
    302: "The Razors Edge",
    303: 'Power Up',
    5041: 'Black Ice',
    5042: 'Fly on the Wall',
    5043: 'For Those About to Rock We Salute You',
    5044: 'Let There Be Rock',
    5045: 'Let There Be Rock',
    5046: 'Highway to Hell',
    5048: 'For Those About to Rock We Salute You',
    5049: 'High Voltage',
    5127: 'Power Up',
    5052: 'Highway to Hell',
    5102: 'The Razors Edge',
    5103: 'Power Up',
    6021: 'The Razors Edge',
    5017: 'Agent Orange'
};
const universesByBand = {
    Pantera: ['Groove Metal', 'Heavy Metal Classics'],
    'AC/DC': ['Rock Legends', 'Heavy Metal Classics'],
    'Avenged Sevenfold': ['Modern Metal'],
    'Black Sabbath': ['Heavy Metal Classics', 'Rock Legends'],
    Sodom: ['Thrash Metal'],
    Testament: ['Thrash Metal'],
    Gojira: ['Modern Metal'],
    Down: ['Groove Metal', 'Custom Archive'],
    Flema: ['Custom Archive'],
    Hermetica: ['Argentina Heavy', 'Custom Archive'],
    'Dream Theater': ['Modern Metal', 'Custom Archive'],
    Nirvana: ['Rock Legends', 'Custom Archive'],
    Motorhead: ['Heavy Metal Classics', 'Rock Legends', 'Custom Archive'],
    'Primal Fear': ['Heavy Metal Classics', 'Custom Archive'],
    'Saltatio Mortis': ['Modern Metal', 'Custom Archive'],
    'Symphony X': ['Modern Metal', 'Custom Archive'],
    Ramones: ['Rock Legends', 'Custom Archive'],
    WASP: ['Heavy Metal Classics', 'Custom Archive'],
    Wintersun: ['Modern Metal', 'Custom Archive'],
    Kanonenfieber: ['Modern Metal', 'Custom Archive'],
    'Black Label Society': ['Groove Metal', 'Heavy Metal Classics', 'Custom Archive']
};
const archiveByBand = {
    Pantera: 'Pantera Archive',
    'AC/DC': 'AC/DC Archive',
    'Avenged Sevenfold': 'Avenged Sevenfold Archive',
    'Black Sabbath': 'Black Sabbath Archive',
    Sodom: 'Sodom Archive',
    Testament: 'Testament Archive',
    Gojira: 'Gojira Archive'
};
const featuredIds = new Set([
    4191, 6008, 302, 303, 5041, 5044, 5045, 5046, 5049, 5127, 5102, 5103, 6021,
    2001, 2002, 5003, 6018, 6019, 5017, 5123, 5006
]);
const priorityById = {
    4191: 78, 6008: 76, 302: 78, 303: 80, 5041: 76, 5044: 77, 5045: 77, 5046: 82,
    5049: 76, 5127: 80, 5102: 79, 5103: 81, 6021: 77, 2001: 82, 2002: 78, 5003: 82,
    6018: 78, 6019: 77, 5017: 76, 5123: 76, 5006: 78
};

const bandById = new Map();
Object.entries(commercial).forEach(([band, ids]) => ids.forEach(id => bandById.set(id, band)));
Object.entries(personalized).forEach(([band, ids]) => ids.forEach(id => bandById.set(id, band)));
const selectedIds = [...bandById.keys()];

function inferGarments(product) {
    const text = [product.category, product.name, product.img, ...(product.variants || []).flatMap(variant => [
        variant.name, variant.img, variant.garmentCategory
    ])].filter(Boolean).join(' ').toLowerCase();
    if (product.category === 'Hoodies Otras Bandas' || product.name.toLowerCase().startsWith('hoodie ')) return ['hoodie'];
    if (product.category === 'Buzo Cuello Redondo' || product.name.toLowerCase().startsWith('buzo ')) return ['buzo_cuello_redondo'];
    if (text.includes('hoodie') && product.category !== 'Personalizados') return ['remera', 'hoodie'];
    return ['remera'];
}

function inferCollections(band, product, album) {
    const isPersonalized = product.category === 'Personalizados';
    const collections = [isPersonalized ? 'Personalizados FMD' : archiveByBand[band]];
    if (album) collections.push(album);
    if (/\bfmd\b/i.test(`${product.name} ${product.img}`)) collections.push('FMD Editions');
    if (/tour|europe 84/i.test(product.name)) collections.push('Tour Archive');
    if (/angus/i.test(product.name)) collections.push('Angus Young');
    if (/dime|darrell/i.test(product.name)) collections.push('Dimebag Darrell');
    return [...new Set(collections.filter(Boolean))];
}

function inferCampaigns(product) {
    const campaigns = [];
    if (/tour|europe 84/i.test(product.name)) campaigns.push('Tour Archive');
    if (/argentina/i.test(product.name)) campaigns.push('Argentina 2026');
    return campaigns;
}

const plan = selectedIds.map(id => {
    const product = products.find(item => item.id === id);
    if (!product) throw new Error(`No existe el producto ${id}.`);
    if ('commercialPriority' in product) throw new Error(`El producto ${id} ya fue migrado.`);
    const band = bandById.get(id);
    const album = albumById[id] || null;
    const universe = [...universesByBand[band]];
    if (/\bfmd\b/i.test(`${product.name} ${product.img}`)) universe.push('FMD Editions');
    const isPersonalized = product.category === 'Personalizados';
    return {
        id,
        band,
        universe: [...new Set(universe)],
        album,
        garments: inferGarments(product),
        collections: inferCollections(band, product, album),
        campaigns: inferCampaigns(product),
        commercialPriority: priorityById[id] || (isPersonalized ? 56 : 64),
        visibilityTier: featuredIds.has(id) ? 'featured' : 'catalog'
    };
});

if (plan.length !== 54 || new Set(plan.map(item => item.id)).size !== 54) {
    throw new Error('El lote Sprint 1.3 debe contener exactamente 54 IDs unicos.');
}

fs.writeFileSync(outputPath, `${JSON.stringify(plan, null, 2)}\n`, 'utf8');
console.log(`Plan Sprint 1.3 generado con ${plan.length} productos.`);
