const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const productsPath = path.join(root, 'data', 'products.json');
const raw = fs.readFileSync(productsPath, 'utf8');
const eol = '\n';
const products = JSON.parse(raw);

const singlesDir = 'images/iron_maiden/singles originales y fmd edition';

function front(img, name, designId, selectionLabel, fmd = false, publicName = name) {
    return {
        img,
        name,
        publicName,
        selectionLabel,
        designId,
        role: 'front',
        ...(fmd ? {
            fmdBadge: 'EDICIÓN FMD',
            fmdBadgeDescription: 'Reinterpretación visual creada por Five Magics Designs.'
        } : {})
    };
}

function product({ id, designId, name, year, album = null, img, desc, variants, collections = [], campaigns = [], tags = [], priority = 72, badge }) {
    return {
        id,
        designId,
        designSlug: designId,
        category: 'Iron Maiden',
        band: 'Iron Maiden',
        name,
        year,
        album,
        tipoPrecio: 'simple',
        defaultPrintMode: 'frontal',
        isNew: true,
        img,
        desc,
        variants,
        garments: ['remera'],
        collections: ['Archivo Maiden', ...collections],
        campaigns,
        commercialPriority: priority,
        visibilityTier: 'catalog',
        legacyCategory: 'Iron Maiden',
        ...(badge ? { fmdBadge: badge } : {}),
        tags: ['Iron Maiden', ...tags, 'remera']
    };
}

const general = [
    [7266, 'iron-maiden-a-real-dead-one', 'A Real Dead One', '1993', 'A Real Dead One', 'images/iron_maiden/1 REAL 4-5 FOR IG MOCK REMERA.jpg', 'Eddie en vivo inspirado en A Real Dead One.'],
    [7267, 'iron-maiden-eddie-electrico', 'Eddie Eléctrico', '2026', null, 'images/iron_maiden/2 REAL 4-5 FOR IG MOCK REMERA.jpg', 'Eddie atravesado por descargas eléctricas.'],
    [7268, 'iron-maiden-eddies-run-for-your-lives', 'Eddies · Run For Your Lives', '2026', null, 'images/iron_maiden/EDDIES BLUE 4-5 FOR IG MOCK REMERA.jpg', 'Galería monocromática de Eddies para Run For Your Lives.'],
    [7269, 'iron-maiden-eddies-collection-color', 'Eddies Collection · Color', '2026', null, 'images/iron_maiden/EDDIES MANY 4-5 FOR IG MOCK REMERA.jpg', 'Colección de distintas encarnaciones de Eddie a todo color.'],
    [7270, 'iron-maiden-maiden-mania-80-87', 'Maiden Mania · 80–87', '2026', null, 'images/iron_maiden/MAIDEN MANIA 4-5 FOR IG MOCK REMERA.jpg', 'Homenaje visual a los Eddies de la etapa 1980–1987.'],
    [7271, 'iron-maiden-run-for-your-lives-buenos-aires', 'Run For Your Lives · Buenos Aires 2026', '2026', null, 'images/iron_maiden/NUEVO TOUR4-5 FOR IG MOCK REMERA.jpg', 'Eddie Run For Your Lives con las fechas de Buenos Aires 2026.'],
    [7272, 'iron-maiden-seventh-son-eddie', 'Seventh Son · Eddie', '1988', 'Seventh Son of a Seventh Son', 'images/iron_maiden/SEVENTH4-5 FOR IG MOCK REMERA.jpg', 'Eddie inspirado en Seventh Son of a Seventh Son.'],
    [7273, 'iron-maiden-eddie-classic', 'Eddie Clásico', '2026', null, 'images/iron_maiden/eddie one 4-5 FOR IG MOCK REMERA.jpg', 'Retrato clásico de Eddie con campera de cuero.'],
    [7274, 'iron-maiden-legacy-of-the-beast-grid', 'Legacy of the Beast · Eddies', '2026', null, 'images/iron_maiden/eddies cuadricula 4-5 FOR IG MOCK REMERA.jpg', 'Nueve versiones de Eddie reunidas en una grilla Legacy of the Beast.'],
    [7275, 'iron-maiden-the-future-past-world-tour-2024', 'The Future Past World Tour 2024', '2024', null, 'images/iron_maiden/future.jpg', 'Eddie futurista inspirado en The Future Past World Tour 2024.']
].map(([id, designId, name, year, album, img, desc]) => product({
    id, designId, name, year, album, img, desc,
    variants: [front(img, name, designId, 'Frente principal')],
    collections: ['Colección general'],
    campaigns: designId.includes('run-for-your-lives') ? ['Run For Your Lives 2026'] : [],
    tags: [name, album || 'Eddie'],
    priority: designId.includes('buenos-aires') ? 88 : 72
}));

function singleFamily({ id, designId, name, year, album, classic, fmd, desc, priority = 82 }) {
    const variants = [front(`${singlesDir}/${classic}`, `${name} · Arte clásico`, designId, 'Arte clásico', false, name)];
    if (fmd) variants.push(front(`${singlesDir}/${fmd}`, `${name} · Reinterpretación FMD`, designId, 'Reinterpretación FMD', true, name));
    return product({
        id,
        designId,
        name,
        year,
        album,
        img: `${singlesDir}/${classic}`,
        desc,
        variants,
        collections: ['Singles de Iron Maiden', ...(fmd ? ['Reinterpretaciones FMD'] : [])],
        tags: [name, album, 'Single', ...(fmd ? ['Edición FMD'] : [])],
        priority,
        badge: fmd ? 'CLÁSICO + FMD' : 'SINGLE'
    });
}

const singles = [
    singleFamily({ id: 7276, designId: 'iron-maiden-2-minutes-to-midnight-singles', name: '2 Minutes to Midnight', year: '1984', album: 'Powerslave', classic: '2 MINUTES 4-5 FOR IG MOCK REMERA.jpg', fmd: '2 MINUTES FMD4-5 FOR IG MOCK REMERA.jpg', desc: 'Dos interpretaciones de 2 Minutes to Midnight: arte clásico y reinterpretación FMD.', priority: 89 }),
    singleFamily({ id: 7277, designId: 'iron-maiden-aces-high-singles', name: 'Aces High', year: '1984', album: 'Powerslave', classic: 'ACES OR-4-5 FOR IG MOCK REMERA.jpg', fmd: 'FMD ACES 4-5 FOR IG MOCK REMERA.jpg', desc: 'Dos interpretaciones de Aces High: piloto clásico y batalla aérea FMD.', priority: 90 }),
    singleFamily({ id: 7278, designId: 'iron-maiden-bring-your-daughter-single', name: 'Bring Your Daughter… to the Slaughter', year: '1990', album: 'No Prayer for the Dying', classic: 'BRING 4-5 FOR IG MOCK REMERA.jpg', desc: 'Diseño inspirado en el single Bring Your Daughter… to the Slaughter.' }),
    singleFamily({ id: 7279, designId: 'iron-maiden-flight-of-icarus-singles', name: 'Flight of Icarus', year: '1983', album: 'Piece of Mind', classic: 'FLIGHT-4-5 FOR IG MOCK REMERA.jpg', fmd: 'FMD EDITION - 4-5 FOR IG MOCK REMERA.jpg', desc: 'Dos interpretaciones de Flight of Icarus: arte clásico y reinterpretación FMD.', priority: 88 }),
    singleFamily({ id: 7280, designId: 'iron-maiden-number-of-the-beast-singles', name: 'The Number of the Beast', year: '1982', album: 'The Number of the Beast', classic: 'NUMBER 666-4-5 FOR IG MOCK REMERA.jpg', fmd: 'NUMBER FMD 4-5 FOR IG MOCK REMERA.jpg', desc: 'Dos interpretaciones de The Number of the Beast.', priority: 90 }),
    singleFamily({ id: 7281, designId: 'iron-maiden-purgatory-single', name: 'Purgatory', year: '1981', album: 'Killers', classic: 'PURGA 4-5 FOR IG MOCK REMERA.jpg', desc: 'Diseño inspirado en el single Purgatory.' }),
    singleFamily({ id: 7282, designId: 'iron-maiden-sanctuary-single', name: 'Sanctuary', year: '1980', album: 'Iron Maiden', classic: 'SANTUARY 4-5 FOR IG MOCK REMERA.jpg', desc: 'Diseño inspirado en el single Sanctuary.' }),
    singleFamily({ id: 7283, designId: 'iron-maiden-the-evil-that-men-do-single', name: 'The Evil That Men Do', year: '1988', album: 'Seventh Son of a Seventh Son', classic: 'THE EVIL 4-5 FOR IG MOCK REMERA.jpg', desc: 'Diseño inspirado en el single The Evil That Men Do.' }),
    singleFamily({ id: 7284, designId: 'iron-maiden-wasted-years-singles', name: 'Wasted Years', year: '1986', album: 'Somewhere in Time', classic: 'WASTED 4-5 FOR IG MOCK REMERA.jpg', fmd: 'WASTED FMD 4-5 FOR IG MOCK REMERA.jpg', desc: 'Dos interpretaciones de Wasted Years: arte clásico y reinterpretación FMD.', priority: 89 })
];

const canI = products.find(item => item.id === 5033);
if (!canI) throw new Error('No se encontró el producto 5033 de Can I Play with Madness.');
canI.designId = 'cd-iron-maiden-can-i-play-with-madness--p5033';
canI.designSlug = canI.designId;
canI.name = 'Can I Play with Madness';
canI.year = '1988';
canI.img = `${singlesDir}/CAN I PLAY4-5 FOR IG MOCK REMERA.jpg`;
canI.variants = [front(canI.img, 'Can I Play with Madness · Arte clásico', canI.designId, 'Arte clásico', false, canI.name)];
canI.desc = 'Diseño inspirado en el single Can I Play with Madness.';
canI.collections = ['Archivo Maiden', 'Seventh Son of a Seventh Son', 'Singles de Iron Maiden'];
canI.tags = ['Iron Maiden', 'Can I Play with Madness', 'Seventh Son of a Seventh Son', 'Single', 'remera'];
canI.isNew = true;

const run = products.find(item => item.designId === 'iron-maiden-run-to-the-hills');
if (!run) throw new Error('No se encontró la familia Run to the Hills.');
run.img = `${singlesDir}/RUN ORIGINAL 4-5 FOR IG MOCK REMERA.jpg`;
run.name = 'Run to the Hills · Tres versiones';
run.desc = 'Tres interpretaciones de Run to the Hills dentro de una misma familia.';
run.variants = [
    front(run.img, 'Run to the Hills · Arte clásico', run.designId, 'Arte clásico', false, 'Run to the Hills'),
    front(`${singlesDir}/RUN 2 4-5 FOR IG MOCK REMERA.jpg`, 'Run to the Hills · Single', run.designId, 'Arte del single', false, 'Run to the Hills'),
    front(`${singlesDir}/RUN FMD 4-5 FOR IG MOCK REMERA.jpg`, 'Run to the Hills · Reinterpretación FMD', run.designId, 'Reinterpretación FMD', true, 'Run to the Hills'),
    {
        img: 'images/iron_maiden/dorsos opcionales/dorso_666.jpg',
        name: 'Dorso The Number of the Beast',
        selectionLabel: 'Dorso The Number of the Beast',
        role: 'back',
        backTargetDesignId: run.designId
    }
];
run.collections = ['Archivo Maiden', 'The Number of the Beast', 'Canciones clásicas', 'Singles de Iron Maiden', 'Reinterpretaciones FMD'];
run.tags = ['Iron Maiden', 'Run to the Hills', 'The Number of the Beast', '1982', 'Single', 'Edición FMD', 'remera'];
run.fmdBadge = 'TRES VERSIONES';
run.isNew = true;

function requireProduct(id, label) {
    const item = products.find(productItem => Number(productItem.id) === Number(id));
    if (!item) throw new Error(`No se encontró ${label} (${id}).`);
    return item;
}

function setFrontPublicName(productId, publicName) {
    const item = requireProduct(productId, publicName);
    (item.variants || []).forEach(variant => {
        if (variant.role !== 'back') variant.publicName = publicName;
    });
    return item;
}

function addStandaloneFrontToShownComposition(productId, frontImage) {
    const item = requireProduct(productId, `producto ${productId}`);
    const composition = (item.variants || []).find(variant => variant.usesShownComposition === true)
        || item.variants?.[0];
    if (!composition) throw new Error(`El producto ${productId} no tiene mock combinado.`);
    const designId = item.designId || composition.designId;
    const publicName = composition.publicName || item.name;
    item.img = frontImage;
    item.defaultPrintMode = 'frontal';
    item.usesShownComposition = true;
    item.variants = [
        {
            img: frontImage,
            name: `${publicName} · Frente`,
            publicName,
            selectionLabel: 'Frente solo',
            previewLabel: 'Frente solo',
            designId,
            role: 'front',
            garmentCategory: 'Iron Maiden',
            preferredPreview: true,
            modalOrder: 1,
            defaultPrintMode: 'simple'
        },
        {
            ...composition,
            name: `${publicName} · Frente y dorso`,
            publicName,
            selectionLabel: 'Frente y dorso',
            previewLabel: 'Frente y dorso',
            designId,
            role: 'front',
            preferredPreview: false,
            modalOrder: 3,
            defaultPrintMode: 'double',
            usesShownComposition: true
        }
    ];
}

const gaucho = requireProduct(7040, 'Eddie Gaucho Argentino');
gaucho.variants.forEach(variant => {
    const isOuterwear = variant.catalogGarments?.includes('hoodie')
        || variant.catalogGarments?.includes('buzo_cuello_redondo');
    if (isOuterwear) {
        variant.designId = 'cd-iron-maiden-eddie-gaucho-argentino--p7040';
        variant.publicName = 'Eddie Gaucho Argentino';
        variant.role = 'front';
    } else if (variant.designId === 'cd-iron-maiden-eddie-gaucho-argentino--p7040') {
        variant.publicName = 'Eddie Gaucho Argentino';
    } else if (variant.designId === 'iron-maiden-eddie-gaucho-argentino-con-fechas') {
        variant.publicName = 'Eddie Gaucho Argentino · Con fechas';
    }
});

const somewhere = requireProduct(5037, 'Somewhere in Time');
somewhere.designId = 'iron-maiden-somewhere-in-time';
somewhere.designSlug = 'iron-maiden-somewhere-in-time';
somewhere.variants.forEach(variant => {
    if (variant.role === 'back') {
        variant.backTargetDesignId = 'iron-maiden-somewhere-in-time';
    } else {
        variant.designId = 'iron-maiden-somewhere-in-time';
        variant.publicName = 'Somewhere in Time';
    }
});

setFrontPublicName(7242, 'Iron Maiden · 1980');
setFrontPublicName(7258, 'Eddie Tanguero');
setFrontPublicName(7259, 'The Number of the Beast · 666');
setFrontPublicName(7261, 'Iron Maiden · Est. 1975');
setFrontPublicName(7262, 'Piece of Mind · Est. 1975');
addStandaloneFrontToShownComposition(7261, 'images/iron_maiden/remera_iron_maiden_est_1975_frente.jpg');
addStandaloneFrontToShownComposition(7262, 'images/iron_maiden/remera_iron_maiden_est_1975_piece_of_mind_frente.jpg');
setFrontPublicName(7264, 'World Slavery Tour 1984');
setFrontPublicName(7265, 'Eddie vs. Huracán');

[
    { id: 7031, designId: 'iron-maiden-tour-merch-v1-fmd', publicName: 'Eddie Punk Neón · Run For Your Lives' },
    { id: 7032, designId: 'iron-maiden-tour-merch-v2-fmd', publicName: 'Eddie con Hacha · Run For Your Lives' },
    { id: 7033, designId: 'iron-maiden-tour-merch-v3-fmd', publicName: 'Eddie Encadenado · Run For Your Lives' }
].forEach(({ id, designId, publicName }) => {
    const item = requireProduct(id, publicName);
    item.designId = designId;
    item.designSlug = designId;
    item.name = publicName;
    item.variants.forEach(variant => {
        if (variant.role === 'back') variant.backTargetDesignId = designId;
        else {
            variant.designId = designId;
            variant.publicName = publicName;
        }
    });
});

[
    { id: 7034, designId: 'iron-maiden-eddie-v1', publicName: 'Eddie Argentina · Copa y Obelisco' },
    { id: 408, designId: 'iron-maiden-eddie-v2', publicName: 'Eddie Argentina · Ilustración clásica' },
    { id: 409, designId: 'iron-maiden-eddie-v3', publicName: 'Eddie Argentina · Tormenta' },
    { id: 5125, designId: 'iron-maiden-eddie-v4', publicName: 'Eddie Argentina · Relámpagos' }
].forEach(({ id, designId, publicName }) => {
    const item = requireProduct(id, publicName);
    item.designId = designId;
    item.designSlug = designId;
    item.name = publicName;
    item.variants = [{
        img: item.img,
        name: publicName,
        publicName,
        designId,
        role: 'front'
    }];
});

for (const item of [...general, ...singles]) {
    const index = products.findIndex(existing => existing.designId === item.designId);
    if (index >= 0) products[index] = item;
    else products.push(item);
}

const ids = new Set();
for (const item of products) {
    if (ids.has(item.id)) throw new Error(`ID duplicado: ${item.id}`);
    ids.add(item.id);
}

for (const item of [...general, ...singles]) {
    const matches = products.filter(existing => existing.designId === item.designId);
    if (matches.length !== 1) throw new Error(`La familia nueva ${item.designId} aparece ${matches.length} veces.`);
}

fs.writeFileSync(productsPath, JSON.stringify(products, null, 2).replace(/\n/g, eol) + eol, 'utf8');
console.log(`Iron Maiden actualizado: ${general.length} generales, ${singles.length} familias de singles nuevas y 2 familias existentes.`);
