const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const products = JSON.parse(fs.readFileSync(path.join(root, 'data', 'products.json'), 'utf8'));
const plan = JSON.parse(fs.readFileSync(path.join(__dirname, 'additional_original_fmd_badge_plan.json'), 'utf8'));

const report = plan.map(item => {
    const product = products.find(entry => entry.id === item.id);
    return {
        id: item.id,
        name: item.name,
        mode: item.mode,
        cardBadge: product?.fmdBadge || null,
        variantBadges: item.mode === 'variants'
            ? item.variantIndexes.map(index => ({
                index,
                name: product?.variants?.[index]?.name || null,
                image: product?.variants?.[index]?.img || null,
                badge: product?.variants?.[index]?.fmdBadge || null
            }))
            : []
    };
});

const summary = {
    products: plan.length,
    fullCardBadges: plan.filter(item => item.mode === 'card').length,
    variantOnlyBadges: plan.filter(item => item.mode === 'variants').length,
    variantBadges: report.reduce((sum, item) => sum + item.variantBadges.length, 0)
};

fs.writeFileSync(path.join(__dirname, 'additional_original_fmd_badge_report.json'), JSON.stringify({ summary, report }, null, 2) + '\n');
const md = `# Additional Original FMD Badges

## Resumen

- Productos detectados: ${summary.products}
- Cards completas marcadas: ${summary.fullCardBadges}
- Cards mixtas con variantes marcadas: ${summary.variantOnlyBadges}
- Variantes marcadas: ${summary.variantBadges}

## Cards completas

${report.filter(item => item.mode === 'card').map(item => `- ID ${item.id} - ${item.name}`).join('\n')}

## Cards mixtas

${report.filter(item => item.mode === 'variants').map(item => `- ID ${item.id} - ${item.name}: ${item.variantBadges.length} variantes`).join('\n')}
`;

fs.writeFileSync(path.join(__dirname, 'ADDITIONAL_ORIGINAL_FMD_BADGE_REPORT.md'), md);
console.log(JSON.stringify(summary, null, 2));
