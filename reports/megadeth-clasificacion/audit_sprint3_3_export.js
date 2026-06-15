const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const dir = __dirname;
const products = JSON.parse(fs.readFileSync(path.join(root, 'data', 'products.json'), 'utf8'));
const backup = JSON.parse(fs.readFileSync(path.join(dir, 'sprint3_3_curatorial_backup.json'), 'utf8'));
const csvText = fs.readFileSync(path.join(dir, 'sprint3_3_curatorial_review_corregido.csv'), 'utf8').replace(/^\uFEFF/, '');

function parseCsv(text) {
    const rows = [];
    let row = [], field = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (quoted) {
            if (char === '"' && text[i + 1] === '"') { field += '"'; i++; }
            else if (char === '"') quoted = false;
            else field += char;
        } else if (char === '"') quoted = true;
        else if (char === ',') { row.push(field); field = ''; }
        else if (char === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
        else field += char;
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    const headers = rows.shift();
    return rows.filter(row => row.some(Boolean)).map(row => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])));
}

const csv = parseCsv(csvText);
const productById = new Map(products.map(item => [String(item.id), item]));
const validSections = new Set(['albums', 'vic_rattlehead', 'dave_mustaine', 'original_fmd', 'reimagined_fmd', 'tours', 'members', 'logos', 'other']);
const validTypes = new Set(['album_cover', 'single', 'tour', 'vic', 'dave', 'member', 'original_fmd', 'reimagined_fmd', 'logo_typographic', 'front_back_set', 'other']);
const validDecisions = new Set(['', 'confirmar', 'corregir', 'mantener-separada', 'posible-fusion-futura']);
const issues = [];
const changed = [];
const decisions = {};

for (const row of csv) {
    const product = productById.get(row.ID);
    if (!product) issues.push(`ID inexistente: ${row.ID}`);
    const effective = {
        designFamilyId: row.designFamilyIdCorregido || row.designFamilyIdActual,
        megadethSection: row.megadethSectionCorregido || row.megadethSectionActual,
        megadethAlbum: row.megadethAlbumCorregido || row.megadethAlbumActual || null,
        megadethDesignType: row.megadethDesignTypeCorregido || row.megadethDesignTypeActual
    };
    const changedFields = Object.entries(effective)
        .filter(([key, value]) => String(product?.[key] ?? '') !== String(value ?? ''))
        .map(([key]) => key);
    if (changedFields.length) changed.push({ id: Number(row.ID), name: row.nombre, changedFields, decision: row.decisionFinal, effective, note: row.notaFernando });
    if (!validSections.has(effective.megadethSection)) issues.push(`ID ${row.ID}: sección inválida ${effective.megadethSection}`);
    if (!validTypes.has(effective.megadethDesignType)) issues.push(`ID ${row.ID}: tipo inválido ${effective.megadethDesignType}`);
    if (!validDecisions.has(row.decisionFinal)) issues.push(`ID ${row.ID}: decisión inválida ${row.decisionFinal}`);
    decisions[row.decisionFinal || 'pendiente'] = (decisions[row.decisionFinal || 'pendiente'] || 0) + 1;
}

const duplicateCsvIds = csv.map(row => row.ID).filter((id, index, all) => all.indexOf(id) !== index);
if (duplicateCsvIds.length) issues.push(`IDs duplicados en CSV: ${[...new Set(duplicateCsvIds)].join(', ')}`);
if (csv.length !== 58) issues.push(`CSV contiene ${csv.length} filas; esperado 58`);
if (backup.storageKey !== 'fmd-sprint3-3-curation') issues.push('El respaldo JSON tiene una clave localStorage inesperada');

const report = {
    valid: issues.length === 0,
    csvRows: csv.length,
    jsonStateCards: Object.keys(backup.state || {}).length,
    jsonRows: backup.rows?.length || 0,
    decisions,
    rowsWithEffectiveChanges: changed.length,
    changedMarkedConfirm: changed.filter(item => item.decision === 'confirmar').length,
    changedMarkedCorrect: changed.filter(item => item.decision === 'corregir').length,
    issues,
    changed
};

fs.writeFileSync(path.join(dir, 'sprint3_3_export_audit.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ...report, changed: undefined }, null, 2));
if (issues.length) process.exitCode = 1;
