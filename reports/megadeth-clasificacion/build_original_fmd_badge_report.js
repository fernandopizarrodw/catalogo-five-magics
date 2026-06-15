const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const products = JSON.parse(fs.readFileSync(path.join(root, 'data', 'products.json'), 'utf8'));
const plan = JSON.parse(fs.readFileSync(path.join(__dirname, 'original_fmd_badge_plan.json'), 'utf8'));

const report = plan.map(item => {
    const product = products.find(entry => entry.id === item.id);
    return {
        id: item.id,
        name: item.name,
        mode: item.mode,
        cardBadge: product?.fmdBadge || null,
        variantBadges: (product?.variants || [])
            .map((variant, index) => variant.fmdBadge ? ({
                index,
                name: variant.name || null,
                image: variant.img || null,
                badge: variant.fmdBadge,
                description: variant.fmdBadgeDescription
            }) : null)
            .filter(Boolean)
    };
});

const summary = {
    productsReviewed: plan.length,
    fullCardBadges: report.filter(item => item.mode === 'card').length,
    variantOnlyBadges: report.filter(item => item.mode === 'variants').length,
    variantBadges: report.reduce((sum, item) => sum + item.variantBadges.length, 0)
};

fs.writeFileSync(path.join(__dirname, 'original_fmd_badge_report.json'), JSON.stringify({ summary, report }, null, 2) + '\n');
const md = `# Original FMD Badges

## Resumen

- Productos revisados: ${summary.productsReviewed}
- Badges en card completa: ${summary.fullCardBadges}
- Cards mixtas con badge solo en variantes: ${summary.variantOnlyBadges}
- Variantes marcadas: ${summary.variantBadges}

## Cards completas

${report.filter(item => item.mode === 'card').map(item => `- ID ${item.id} - ${item.name}`).join('\n')}

## Cards mixtas

${report.filter(item => item.mode === 'variants').map(item => `- ID ${item.id} - ${item.name}: ${item.variantBadges.length} variantes ORIGINAL FMD`).join('\n')}
`;
fs.writeFileSync(path.join(__dirname, 'ORIGINAL_FMD_BADGE_REPORT.md'), md);
console.log(JSON.stringify(summary, null, 2));
