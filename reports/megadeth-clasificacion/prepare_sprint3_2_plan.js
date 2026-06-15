const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const products = JSON.parse(fs.readFileSync(path.join(root, 'data', 'products.json'), 'utf8'));
const classification = JSON.parse(fs.readFileSync(path.join(__dirname, 'megadeth_classification_plan.json'), 'utf8'));
const duplicates = JSON.parse(fs.readFileSync(path.join(__dirname, 'sprint3_1_duplicate_candidates.json'), 'utf8'));

const normalize = value => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
const slug = value => normalize(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const sectionMap = {
    albums: 'albums',
    'vic-rattlehead': 'vic_rattlehead',
    'dave-mustaine': 'dave_mustaine',
    'original-fmd': 'original_fmd',
    'reimagined-fmd': 'reimagined_fmd',
    tours: 'tours',
    members: 'members',
    logos: 'logos',
    other: 'other'
};

const albumYears = {
    'Killing Is My Business... and Business Is Good!': '1985',
    "Peace Sells... but Who's Buying?": '1986',
    'So Far, So Good... So What!': '1988',
    'Rust in Peace': '1990',
    'Countdown to Extinction': '1992',
    'Youthanasia': '1994',
    'Hidden Treasures': '1995',
    'Cryptic Writings': '1997',
    'Risk': '1999',
    'The World Needs a Hero': '2001',
    'The System Has Failed': '2004',
    'United Abominations': '2007',
    'Endgame': '2009',
    'TH1RT3EN': '2011',
    'Super Collider': '2013',
    'Dystopia': '2016',
    'The Sick, the Dying... and the Dead!': '2022',
    'Megadeth (2026)': '2026'
};

const albumHints = [
    ['killing', 'Killing Is My Business... and Business Is Good!'],
    ['kimb', 'Killing Is My Business... and Business Is Good!'],
    ['peace sells', "Peace Sells... but Who's Buying?"],
    ['so far', 'So Far, So Good... So What!'],
    ['sfsgsw', 'So Far, So Good... So What!'],
    ['rust in peace', 'Rust in Peace'],
    ['hangar 18', 'Rust in Peace'],
    ['lucretia', 'Rust in Peace'],
    ['rusted pieces', 'Rust in Peace'],
    ['countdown', 'Countdown to Extinction'],
    ['youthanasia', 'Youthanasia'],
    ['cryptic', 'Cryptic Writings'],
    ['dystopia', 'Dystopia'],
    ['the sick', 'The Sick, the Dying... and the Dead!'],
    ['dogs of chernobyl', 'The Sick, the Dying... and the Dead!'],
    ['tipping point', 'Megadeth (2026)'],
    ['let there be shred', 'Megadeth (2026)'],
    ['i don t care', 'Megadeth (2026)'],
    ['made to kill', 'Megadeth (2026)'],
    ['megadeth final', 'Megadeth (2026)'],
    ['megadeth blanco', 'Megadeth (2026)'],
    ['ultimo disco', 'Megadeth (2026)']
];

const classificationById = new Map(classification.map(item => [item.id, item]));
const familyById = new Map();
for (const group of duplicates) {
    for (const id of group.cardIds) familyById.set(id, `megadeth-${group.designKey}`);
}

function inferAlbum(product, section) {
    if (product.album) return product.album;
    if (section !== 'albums') return null;
    const text = normalize(`${product.name} ${product.img}`);
    const found = albumHints.find(([hint]) => text.includes(hint));
    return found ? found[1] : null;
}

function inferDesignType(product, section) {
    const category = normalize(product.category);
    const text = normalize(`${product.name} ${product.img}`);
    if (text.includes('reimagined') || text.includes('reimaginado')) return 'reimagined_fmd';
    if (section === 'vic_rattlehead') return 'vic';
    if (section === 'dave_mustaine') return 'dave';
    if (section === 'members') return 'member';
    if (section === 'tours') return category === 'dorsales' ? 'front_back_set' : 'tour';
    if (section === 'original_fmd') return 'original_fmd';
    if (section === 'logos') return 'logo_typographic';
    if (section === 'albums') {
        if (category === 'singles') return 'single';
        if (category === 'album') return 'album_cover';
        return 'other';
    }
    return 'other';
}

const megadeth = products.filter(product => normalize(product.band) === 'megadeth');
const plan = megadeth.map(product => {
    const reviewed = classificationById.get(product.id);
    const proposedRaw = reviewed?.proposed?.megadethSection || 'other';
    let section = sectionMap[proposedRaw] || 'other';
    const text = normalize(`${product.name} ${product.img}`);
    if (text.includes('reimagined') || text.includes('reimaginado')) section = 'reimagined_fmd';
    const album = inferAlbum(product, section);
    const familyId = familyById.get(product.id) || `megadeth-card-${product.id}`;
    const duplicateCandidate = familyById.has(product.id);
    const notes = [];
    if (reviewed?.reviewRequired) notes.push(`Revisar sección propuesta: ${section}`);
    if (duplicateCandidate) notes.push(`Familia relacionada detectada: ${familyId}; no fusionar automáticamente`);
    if (section === 'albums' && !album) notes.push('Álbum pendiente de confirmación manual');
    if (!notes.length) notes.push('Clasificación basada en metadata y revisión existente');

    return {
        id: product.id,
        name: product.name,
        metadata: {
            designFamilyId: familyId,
            megadethSection: section,
            megadethAlbum: album,
            megadethEra: album ? (albumYears[album] || null) : null,
            megadethDesignType: inferDesignType(product, section),
            isDesignDuplicateCandidate: duplicateCandidate,
            curationNotes: notes.join('. ')
        },
        sourceReviewRequired: Boolean(reviewed?.reviewRequired)
    };
});

if (plan.length !== 123 || new Set(plan.map(item => item.id)).size !== 123) {
    throw new Error('Sprint 3.2 debe contener exactamente 123 cards Megadeth únicas.');
}

fs.writeFileSync(path.join(__dirname, 'sprint3_2_metadata_plan.json'), JSON.stringify(plan, null, 2) + '\n');
console.log(`Plan Sprint 3.2 generado: ${plan.length} cards.`);
