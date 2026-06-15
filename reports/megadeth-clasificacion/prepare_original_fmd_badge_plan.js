const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const candidates = JSON.parse(fs.readFileSync(path.join(__dirname, 'original_fmd_candidates.json'), 'utf8'));
const products = JSON.parse(fs.readFileSync(path.join(root, 'data', 'products.json'), 'utf8'));
const productById = new Map(products.map(item => [item.id, item]));

const descriptions = {
    albums: [
        'Arte exclusivo FMD con impronta de colección, pensado para llevar la era del disco a una prenda con presencia.',
        'Creación FMD de autor con foco en impacto visual, espíritu thrash y lectura premium en prenda.',
        'Diseño exclusivo FMD desarrollado para destacar el concepto visual de esta etapa de Megadeth.'
    ],
    vic_rattlehead: [
        'Creación exclusiva FMD con Vic como protagonista, pensada para una presencia fuerte y de colección.',
        'Arte FMD de autor con estética oscura, filosa y centrada en el universo visual de Vic Rattlehead.',
        'Diseño exclusivo FMD para fans que buscan una versión distinta, intensa y con identidad propia.'
    ],
    dave_mustaine: [
        'Diseño exclusivo FMD con foco en actitud, escenario y energía Mustaine.',
        'Creación FMD de autor pensada para capturar presencia, fuerza y espíritu de frontman.',
        'Arte exclusivo FMD con lectura metalera y carácter de pieza de colección.'
    ],
    tours: [
        'Edición exclusiva FMD con espíritu conmemorativo y presencia fuerte de tour.',
        'Creación FMD de autor pensada como pieza especial para archivo y escenario.',
        'Diseño exclusivo FMD con energía de gira y estética coleccionable.'
    ],
    default: [
        'Creación exclusiva FMD con identidad propia y presencia fuerte en prenda.',
        'Arte FMD de autor desarrollado para esta colección.',
        'Diseño exclusivo FMD pensado para fans que buscan una pieza distinta.'
    ]
};

function descriptionFor(product, index = 0) {
    const pool = descriptions[product.megadethSection] || descriptions.default;
    return pool[index % pool.length];
}

const plan = candidates.map(candidate => {
    const product = productById.get(candidate.id);
    const variantCount = product?.variants?.length || 0;
    const fmdVariantIndexes = candidate.refs
        .filter(ref => ref.type === 'variant' && Number.isInteger(ref.variantIndex))
        .map(ref => ref.variantIndex);
    const hasMainFmd = candidate.refs.some(ref => ref.type === 'main');
    const allVariantsFmd = variantCount > 0 && fmdVariantIndexes.length === variantCount;
    const fullCard = hasMainFmd && (variantCount === 0 || allVariantsFmd);
    const description = descriptionFor(product || candidate, candidate.id);

    return {
        id: candidate.id,
        name: candidate.name,
        mode: fullCard ? 'card' : 'variants',
        cardMetadata: fullCard ? {
            fmdBadge: 'ORIGINAL FMD',
            fmdBadgeDescription: description
        } : {},
        variantMetadata: fullCard ? [] : [...new Set(fmdVariantIndexes)].map(index => ({
            variantIndex: index,
            fmdBadge: 'ORIGINAL FMD',
            fmdBadgeDescription: description
        })),
        refs: candidate.refs
    };
});

if (plan.length !== 20) throw new Error(`Se esperaban 20 candidatos y se generaron ${plan.length}.`);

fs.writeFileSync(path.join(__dirname, 'original_fmd_badge_plan.json'), JSON.stringify(plan, null, 2) + '\n');
console.log(JSON.stringify({
    products: plan.length,
    fullCardBadges: plan.filter(item => item.mode === 'card').length,
    variantOnlyBadges: plan.filter(item => item.mode === 'variants').length,
    variantBadges: plan.reduce((sum, item) => sum + item.variantMetadata.length, 0)
}, null, 2));
