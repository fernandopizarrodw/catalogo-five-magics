const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const productsPath = path.join(root, 'data', 'products.json');
const auditPath = path.join(__dirname, 'sprint3_3_export_audit.json');
const planPath = path.join(__dirname, 'sprint3_3_application_plan.json');
const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));

if (!audit.valid) throw new Error('La exportación Sprint 3.3 no pasó la auditoría.');

const plan = audit.changed.map(item => ({
    id: item.id,
    name: item.name,
    decisionOriginal: item.decision,
    decisionApplied: 'corregir',
    changedFields: item.changedFields,
    metadata: item.effective,
    note: item.note || 'Corrección curatorial confirmada por Fernando en Sprint 3.3'
}));

fs.writeFileSync(planPath, JSON.stringify(plan, null, 2) + '\n');

const byId = new Map(plan.map(item => [item.id, item]));
let changed = 0;
for (const product of products) {
    const correction = byId.get(product.id);
    if (!correction) continue;
    for (const field of correction.changedFields) product[field] = correction.metadata[field];
    product.curationNotes = correction.note;
    changed += 1;
}

if (changed !== plan.length || changed !== 44) {
    throw new Error(`Se esperaban 44 cards corregidas y se aplicaron ${changed}.`);
}

fs.writeFileSync(productsPath, JSON.stringify(products, null, 2) + '\n');
console.log(`Sprint 3.3 aplicado a ${changed} cards.`);
