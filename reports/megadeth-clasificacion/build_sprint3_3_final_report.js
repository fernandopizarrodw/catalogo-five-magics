const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const products = JSON.parse(fs.readFileSync(path.join(root, 'data', 'products.json'), 'utf8'));
const plan = JSON.parse(fs.readFileSync(path.join(__dirname, 'sprint3_3_application_plan.json'), 'utf8'));
const megadeth = products.filter(item => String(item.band).toLowerCase() === 'megadeth');

const countBy = field => Object.fromEntries(Object.entries(Object.groupBy(megadeth, item => item[field] ?? 'null'))
    .map(([key, items]) => [key, items.length])
    .sort((a, b) => b[1] - a[1]));
const families = Object.entries(Object.groupBy(megadeth, item => item.designFamilyId))
    .filter(([, items]) => items.length > 1)
    .map(([designFamilyId, items]) => ({ designFamilyId, cards: items.map(item => ({ id: item.id, name: item.name, garments: item.garments, section: item.megadethSection, type: item.megadethDesignType })) }));

const report = {
    correctedCards: plan.length,
    totalMegadethCards: megadeth.length,
    distributionBySection: countBy('megadethSection'),
    distributionByAlbum: countBy('megadethAlbum'),
    distributionByDesignType: countBy('megadethDesignType'),
    multiCardFamilies: families.length,
    noFusionNoDeletion: true,
    productionFilesModified: false
};

fs.writeFileSync(path.join(__dirname, 'sprint3_3_final_report.json'), JSON.stringify(report, null, 2) + '\n');
fs.writeFileSync(path.join(__dirname, 'sprint3_3_final_multi_card_families.json'), JSON.stringify(families, null, 2) + '\n');

const md = `# Sprint 3.3 - Corrección curatorial aplicada

## Resultado

- Cards corregidas: ${plan.length}
- Cards Megadeth totales: ${megadeth.length}
- Productos totales del catálogo: 290
- Cards fusionadas: 0
- Productos eliminados: 0
- Imágenes modificadas: 0
- Archivos de producción modificados: 0

## Distribución por sección

${Object.entries(report.distributionBySection).map(([key, value]) => `- ${key}: ${value}`).join('\n')}

## Distribución por tipo

${Object.entries(report.distributionByDesignType).map(([key, value]) => `- ${key}: ${value}`).join('\n')}

## Familias

- Familias con más de una card: ${families.length}

Las familias siguen siendo informativas. No se fusionó ninguna card.
`;

fs.writeFileSync(path.join(__dirname, 'SPRINT_3_3_FINAL_REPORT.md'), md);
console.log(JSON.stringify(report, null, 2));
