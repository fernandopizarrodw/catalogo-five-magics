const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..', '..');
const current = JSON.parse(fs.readFileSync(path.join(root, 'data', 'products.json'), 'utf8'));
const backup = JSON.parse(fs.readFileSync(path.join(root, 'backups', 'products.pre-sprint3.2-2026-06-15.json'), 'utf8'));
const currentById = new Map(current.map(item => [item.id, item]));
const backupById = new Map(backup.map(item => [item.id, item]));
const allowed = new Set(['designFamilyId', 'megadethSection', 'megadethAlbum', 'megadethEra', 'megadethDesignType', 'isDesignDuplicateCandidate', 'curationNotes']);
const stable = value => JSON.stringify(value);
const errors = [];
const changedIds = [];

for (const [id, item] of currentById) {
    const old = backupById.get(id);
    if (!old) errors.push(`Producto nuevo inesperado: ${id}`);
    const keys = new Set([...Object.keys(old || {}), ...Object.keys(item)]);
    const changedKeys = [...keys].filter(key => stable(old?.[key]) !== stable(item[key]));
    if (changedKeys.length) changedIds.push(id);
    const illegal = changedKeys.filter(key => !allowed.has(key));
    if (illegal.length) errors.push(`ID ${id}: cambios no permitidos en ${illegal.join(', ')}`);
}

const ids = current.map(item => item.id);
const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
if (current.length !== 290) errors.push(`Total incorrecto: ${current.length}`);
if (duplicateIds.length) errors.push(`IDs duplicados: ${duplicateIds.join(', ')}`);
if (changedIds.length !== 123) errors.push(`Cards modificadas: ${changedIds.length}, esperado 123`);

const megadeth = current.filter(item => String(item.band).toLowerCase() === 'megadeth');
const fields = [...allowed];
for (const item of megadeth) {
    for (const field of fields) if (!(field in item)) errors.push(`ID ${item.id}: falta ${field}`);
}

const hashes = {};
for (const file of ['index.html', 'js/app.js', 'styles/main.css']) {
    hashes[file] = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
}

const result = { valid: errors.length === 0, totalProducts: current.length, duplicateIds, changedCards: changedIds.length, megadethCards: megadeth.length, visualFileHashes: hashes, errors };
console.log(JSON.stringify(result, null, 2));
if (errors.length) process.exitCode = 1;
