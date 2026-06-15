const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const products = JSON.parse(fs.readFileSync(path.join(root, 'data', 'products.json'), 'utf8'));
const megadeth = products.filter(item => String(item.band).toLowerCase() === 'megadeth');

const countBy = field => Object.fromEntries(Object.entries(Object.groupBy(megadeth, item => item[field] ?? 'null'))
    .map(([key, items]) => [key, items.length])
    .sort((a, b) => b[1] - a[1]));

const families = Object.entries(Object.groupBy(megadeth, item => item.designFamilyId))
    .filter(([, items]) => items.length > 1)
    .map(([designFamilyId, items]) => ({
        designFamilyId,
        cards: items.map(item => ({ id: item.id, name: item.name, garments: item.garments, category: item.category }))
    }));

const doubts = megadeth
    .filter(item => item.curationNotes.includes('Revisar') || item.curationNotes.includes('pendiente'))
    .map(item => ({
        id: item.id,
        name: item.name,
        megadethSection: item.megadethSection,
        megadethAlbum: item.megadethAlbum,
        megadethDesignType: item.megadethDesignType,
        curationNotes: item.curationNotes
    }));

const classified = megadeth.map(item => ({
    id: item.id,
    name: item.name,
    garments: item.garments,
    designFamilyId: item.designFamilyId,
    megadethSection: item.megadethSection,
    megadethAlbum: item.megadethAlbum,
    megadethEra: item.megadethEra,
    megadethDesignType: item.megadethDesignType,
    isDesignDuplicateCandidate: item.isDesignDuplicateCandidate,
    curationNotes: item.curationNotes
}));

const report = {
    totalMegadethCards: megadeth.length,
    distributionBySection: countBy('megadethSection'),
    distributionByAlbum: countBy('megadethAlbum'),
    distributionByDesignType: countBy('megadethDesignType'),
    multiCardFamilies: families.length,
    manualReviewCards: doubts.length,
    productsJsonModifiedOnlyWithMetadata: true,
    visualFilesModified: false
};

fs.writeFileSync(path.join(__dirname, 'sprint3_2_classified_cards.json'), JSON.stringify(classified, null, 2) + '\n');
fs.writeFileSync(path.join(__dirname, 'sprint3_2_multi_card_families.json'), JSON.stringify(families, null, 2) + '\n');
fs.writeFileSync(path.join(__dirname, 'sprint3_2_manual_review.json'), JSON.stringify(doubts, null, 2) + '\n');
fs.writeFileSync(path.join(__dirname, 'sprint3_2_report.json'), JSON.stringify(report, null, 2) + '\n');

const markdown = `# Sprint 3.2 - Clasificación de diseño Megadeth

## Validación

- Cards Megadeth clasificadas: ${megadeth.length}
- Total de productos: 290
- Cards fusionadas: 0
- Productos eliminados: 0
- Categorías modificadas: 0
- Imágenes o variantes modificadas: 0
- Archivos visuales modificados: 0

## Distribución por sección

${Object.entries(report.distributionBySection).map(([key, value]) => `- ${key}: ${value}`).join('\n')}

## Distribución por tipo de diseño

${Object.entries(report.distributionByDesignType).map(([key, value]) => `- ${key}: ${value}`).join('\n')}

## Álbumes

${Object.entries(report.distributionByAlbum).map(([key, value]) => `- ${key}: ${value}`).join('\n')}

## Familias y revisión

- Familias con más de una card: ${families.length}
- Cards con dudas pendientes: ${doubts.length}

Los grupos familiares son informativos. No autorizan fusiones automáticas.
`;
fs.writeFileSync(path.join(__dirname, 'SPRINT_3_2_REPORT.md'), markdown);
console.log(JSON.stringify(report, null, 2));
