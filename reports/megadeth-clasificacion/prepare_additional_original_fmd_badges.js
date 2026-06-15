const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const products = JSON.parse(fs.readFileSync(path.join(root, 'data', 'products.json'), 'utf8'));
const exactTerms = [
    'vic_punk',
    'vic_peace_25_black',
    'vic_my_last_blanco',
    'vic_militar',
    'vic_gaucho_fmd',
    'vic_celeste_y_blanco',
    'vic_bad_omen',
    'vic_and_friends_fmd_edition',
    'ts_v2',
    'ts_v1',
    'dave_and_vic_live',
    'vic_the_arsenal_of_megadeth',
    'vic_symphony',
    'vic_symphony_music',
    'vic_set_the_world_afire',
    'vic_sells',
    'vic_sells_v2',
    'vic_silent_fmd',
    'set_list_show_dorso',
    'dave_final_show_frente',
    'vic_bandera_logo_blanco',
    'peace_sells_live',
    'marty_dave',
    'vic_gaucho_caballo',
    'vic_gaucho_realista'
];
const folderPrefixes = [
    'images/tours/Tour_2026/',
    'images/singles/'
];

const normalize = value => String(value || '').toLowerCase().replace(/\\/g, '/').replace(/\s+/g, '_');
const descriptions = {
    vic_rattlehead: 'Creación exclusiva FMD con Vic como protagonista, pensada para una presencia fuerte y de colección.',
    dave_mustaine: 'Diseño exclusivo FMD con foco en actitud, escenario y energía Mustaine.',
    tours: 'Edición exclusiva FMD con espíritu conmemorativo y presencia fuerte de tour.',
    albums: 'Arte exclusivo FMD con impronta de colección, pensado para llevar esta era a una prenda con presencia.',
    default: 'Creación exclusiva FMD con identidad propia y presencia fuerte en prenda.'
};

function matches(image, name) {
    const text = normalize(`${image || ''} ${name || ''}`);
    const normalizedImage = String(image || '').replace(/\\/g, '/');
    const termHits = exactTerms.filter(term => text.includes(normalize(term)));
    const folderHits = folderPrefixes.filter(prefix => normalizedImage.startsWith(prefix));
    return [...termHits, ...folderHits];
}

function descriptionFor(product) {
    return descriptions[product.megadethSection] || descriptions.default;
}

const plan = [];
for (const product of products.filter(item => String(item.band).toLowerCase() === 'megadeth')) {
    const refs = [];
    const mainHits = matches(product.img, product.name);
    if (mainHits.length) refs.push({ type: 'main', variantIndex: null, image: product.img, name: product.name, hits: mainHits });
    for (const [index, variant] of (product.variants || []).entries()) {
        const hits = matches(variant.img, variant.name);
        if (hits.length) refs.push({ type: 'variant', variantIndex: index, image: variant.img, name: variant.name || null, hits });
    }
    if (!refs.length) continue;

    const variantCount = product.variants?.length || 0;
    const variantIndexes = [...new Set(refs.filter(ref => ref.type === 'variant').map(ref => ref.variantIndex))];
    const hasMain = refs.some(ref => ref.type === 'main');
    const allVariants = variantCount > 0 && variantIndexes.length === variantCount;
    const fullCard = hasMain && (variantCount === 0 || allVariants);

    plan.push({
        id: product.id,
        name: product.name,
        mode: fullCard ? 'card' : 'variants',
        fmdBadge: 'ORIGINAL FMD',
        fmdBadgeDescription: descriptionFor(product),
        variantIndexes: fullCard ? [] : variantIndexes,
        refs
    });
}

fs.writeFileSync(path.join(__dirname, 'additional_original_fmd_badge_plan.json'), JSON.stringify(plan, null, 2) + '\n');
console.log(JSON.stringify({
    products: plan.length,
    fullCardBadges: plan.filter(item => item.mode === 'card').length,
    variantOnlyBadges: plan.filter(item => item.mode === 'variants').length,
    variantBadges: plan.reduce((sum, item) => sum + item.variantIndexes.length, 0)
}, null, 2));
