const fs = require('fs');
const path = require('path');

const root = process.cwd();
const products = JSON.parse(fs.readFileSync(path.join(root, 'data', 'products.json'), 'utf8'));
const outputPath = path.join(root, 'reports', 'sprint-1-normalizacion', 'sprint1_2_metadata_plan.json');

const selectedIds = [
    7102, 7103, 7105, 7106, 7108, 7109, 7110, 7111, 7112, 7114, 7115, 7116, 7117, 7118, 7119, 7121,
    307, 308, 7034, 408, 409, 5125, 5032, 5033, 5034, 5035, 5036, 5037, 5038, 6004, 6005, 6006, 6007,
    7011, 7012, 7013, 7016, 7017, 7018, 7019, 7020, 7021, 7022, 7024, 7026, 7027, 7028, 7031, 7032,
    7033, 1062, 1063, 46, 48, 323, 324, 326, 327, 328, 329
];

const albumById = {
    7102: 'Reign in Blood',
    7103: 'South of Heaven',
    7105: 'Hell Awaits',
    7108: 'Show No Mercy',
    7109: 'Show No Mercy',
    7112: 'God Hates Us All',
    7114: 'Seasons in the Abyss',
    7115: 'God Hates Us All',
    7117: 'Live Undead',
    7118: 'Divine Intervention',
    7121: 'Diabolus in Musica',
    307: 'Live After Death',
    5032: 'The Book of Souls',
    5033: 'Seventh Son of a Seventh Son',
    5034: 'The Book of Souls',
    5035: 'Brave New World',
    5036: 'Killers',
    5037: 'Somewhere in Time',
    5038: 'Fear of the Dark',
    6005: 'The Number of the Beast',
    6006: 'Killers',
    6007: 'Killers',
    7012: 'Live After Death',
    7021: 'The Number of the Beast',
    7022: 'Fear of the Dark',
    7024: 'Killers',
    7026: 'Powerslave',
    7027: 'Somewhere in Time',
    7028: 'The Book of Souls',
    1062: '...And Justice for All',
    324: 'Cowboys from Hell',
    328: 'Official Live: 101 Proof'
};

const featuredIds = new Set([
    7102, 7103, 7105, 7108, 7109, 7112, 7114, 7117, 7118, 7121,
    307, 5036, 5038, 6005, 6006, 6007, 7012, 7013, 7016, 7021, 7022, 7024, 7026, 7027, 7028,
    7031, 7032, 7033, 1062, 324, 328
]);

const priorityById = {
    7102: 86, 7103: 85, 7105: 82, 7108: 84, 7109: 81, 7112: 80, 7114: 82, 7117: 78, 7118: 79, 7121: 83,
    307: 82, 5036: 79, 5038: 84, 6005: 78, 6006: 77, 6007: 77, 7012: 80, 7013: 83, 7016: 81, 7021: 82,
    7022: 80, 7024: 78, 7026: 83, 7027: 80, 7028: 78, 7031: 85, 7032: 85, 7033: 85, 1062: 82, 324: 76, 328: 75
};

function inferBand(product) {
    if (product.category === 'Slayer') return 'Slayer';
    if (product.category === 'Iron Maiden' || product.name.includes('Iron Maiden')) return 'Iron Maiden';
    if (product.category === 'Metallica') return 'Metallica';
    if (product.category === 'Pantera') return 'Pantera';
    throw new Error(`No se pudo inferir banda para ${product.id}.`);
}

function inferGarments(product) {
    const text = [product.category, product.name, product.img, ...(product.variants || []).flatMap(variant => [
        variant.name, variant.img, variant.garmentCategory
    ])].filter(Boolean).join(' ').toLowerCase();
    const garments = [];
    if (product.category === 'Hoodies Otras Bandas' || text.includes('hoodie')) garments.push('hoodie');
    if (product.category === 'Buzo Cuello Redondo' || text.includes('buzo')) garments.push('buzo_cuello_redondo');
    if (!garments.length || product.category === 'Slayer' || product.category === 'Iron Maiden' || product.category === 'Metallica' || product.category === 'Pantera') {
        if (!product.name.toLowerCase().startsWith('hoodie ') && !product.name.toLowerCase().startsWith('buzo ')) garments.unshift('remera');
    }
    return [...new Set(garments)];
}

function inferUniverses(band, product) {
    const universes = {
        Slayer: ['Thrash Metal'],
        'Iron Maiden': ['Heavy Metal Classics'],
        Metallica: ['Thrash Metal', 'Heavy Metal Classics'],
        Pantera: ['Groove Metal', 'Heavy Metal Classics']
    }[band];
    const isFmd = /\bfmd\b/i.test(`${product.name} ${product.img}`);
    return isFmd ? [...universes, 'FMD Editions'] : universes;
}

function inferCollections(band, product, album) {
    const collections = {
        Slayer: ['Slayer Archive FMD'],
        'Iron Maiden': ['Archivo Maiden'],
        Metallica: ['Metallica Archive'],
        Pantera: ['Pantera Archive']
    }[band];
    if (album) collections.push(album);
    if (/\bfmd\b/i.test(`${product.name} ${product.img}`)) collections.push('FMD Editions');
    if (/tour/i.test(product.name)) collections.push('Tour Archive');
    if (/eddie/i.test(product.name)) collections.push('Eddie');
    if (/dime|darrell/i.test(product.name)) collections.push('Dimebag Darrell');
    return [...new Set(collections)];
}

function inferCampaigns(product) {
    const campaigns = [];
    if (/tour/i.test(product.name)) campaigns.push('Tour 2026');
    if (/argentina/i.test(product.name)) campaigns.push('Argentina 2026');
    return campaigns;
}

const plan = selectedIds.map(id => {
    const product = products.find(item => item.id === id);
    if (!product) throw new Error(`No existe el producto ${id}.`);
    if ('commercialPriority' in product) throw new Error(`El producto ${id} ya fue migrado.`);
    const band = inferBand(product);
    const album = albumById[id] || null;
    return {
        id,
        band,
        universe: inferUniverses(band, product),
        album,
        garments: inferGarments(product),
        collections: inferCollections(band, product, album),
        campaigns: inferCampaigns(product),
        commercialPriority: priorityById[id] || (band === 'Pantera' ? 62 : 68),
        visibilityTier: featuredIds.has(id) ? 'featured' : 'catalog'
    };
});

if (plan.length !== 60 || new Set(plan.map(item => item.id)).size !== 60) {
    throw new Error('El lote Sprint 1.2 debe contener exactamente 60 IDs unicos.');
}

fs.writeFileSync(outputPath, `${JSON.stringify(plan, null, 2)}\n`, 'utf8');
console.log(`Plan Sprint 1.2 generado con ${plan.length} productos.`);
