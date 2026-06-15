const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..', '..');
const current = JSON.parse(fs.readFileSync(path.join(root, 'data', 'products.json'), 'utf8'));
const backup = JSON.parse(fs.readFileSync(path.join(root, 'backups', 'products.pre-sprint3.3-2026-06-15.json'), 'utf8'));
const plan = JSON.parse(fs.readFileSync(path.join(__dirname, 'sprint3_3_application_plan.json'), 'utf8'));
const allowed = new Set(['designFamilyId', 'megadethSection', 'megadethAlbum', 'megadethDesignType', 'curationNotes']);
const currentById = new Map(current.map(item => [item.id, item]));
const backupById = new Map(backup.map(item => [item.id, item]));
const errors = [];
const changedIds = [];
const stable = value => JSON.stringify(value);

for (const [id, item] of currentById) {
    const old = backupById.get(id);
    const keys = new Set([...Object.keys(old || {}), ...Object.keys(item)]);
    const changedKeys = [...keys].filter(key => stable(old?.[key]) !== stable(item[key]));
    if (changedKeys.length) changedIds.push(id);
    const illegal = changedKeys.filter(key => !allowed.has(key));
    if (illegal.length) errors.push(`ID ${id}: cambios no permitidos ${illegal.join(', ')}`);
}

const ids = current.map(item => item.id);
const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
if (current.length !== 290) errors.push(`Total incorrecto: ${current.length}`);
if (duplicateIds.length) errors.push(`IDs duplicados: ${duplicateIds.join(', ')}`);
if (changedIds.length !== 44) errors.push(`Cards corregidas: ${changedIds.length}; esperado 44`);
if (plan.length !== 44) errors.push(`Plan contiene ${plan.length}; esperado 44`);

const hashes = {};
for (const file of ['index.html', 'js/app.js', 'styles/main.css']) {
    hashes[file] = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
}
const result = { valid: errors.length === 0, totalProducts: current.length, duplicateIds, correctedCards: changedIds.length, planCards: plan.length, productionHashes: hashes, errors };
console.log(JSON.stringify(result, null, 2));
if (errors.length) process.exitCode = 1;
