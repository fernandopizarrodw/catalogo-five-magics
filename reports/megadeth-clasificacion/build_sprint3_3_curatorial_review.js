const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const products = JSON.parse(fs.readFileSync(path.join(root, 'data', 'products.json'), 'utf8'));
const megadeth = products.filter(item => String(item.band).toLowerCase() === 'megadeth');
const outputDir = __dirname;

const isManualReview = item => item.curationNotes?.includes('Revisar') || item.curationNotes?.includes('pendiente');
const grouped = Object.groupBy(megadeth, item => item.designFamilyId);
const multiFamilyIds = new Set(Object.entries(grouped).filter(([, items]) => items.length > 1).map(([id]) => id));
const reviewSet = megadeth.filter(item => isManualReview(item) || multiFamilyIds.has(item.designFamilyId));

const csvEscape = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
const csvHeader = [
    'ID', 'nombre', 'imagenPrincipal', 'garments', 'categoryActual',
    'designFamilyIdActual', 'megadethSectionActual', 'megadethAlbumActual',
    'megadethEraActual', 'megadethDesignTypeActual', 'isDesignDuplicateCandidate',
    'curationNotes', 'designFamilyIdCorregido', 'megadethSectionCorregido',
    'megadethAlbumCorregido', 'megadethDesignTypeCorregido',
    'decisionFinal', 'notaFernando'
];
const csvRows = reviewSet.map(item => [
    item.id, item.name, item.img, (item.garments || []).join('|'), item.category,
    item.designFamilyId, item.megadethSection, item.megadethAlbum,
    item.megadethEra, item.megadethDesignType, item.isDesignDuplicateCandidate,
    item.curationNotes, '', '', '', '', '', ''
].map(csvEscape).join(','));
fs.writeFileSync(path.join(outputDir, 'sprint3_3_curatorial_review.csv'), [csvHeader.join(','), ...csvRows].join('\n') + '\n');

const escapeHtml = value => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
const sections = ['albums', 'vic_rattlehead', 'dave_mustaine', 'original_fmd', 'reimagined_fmd', 'tours', 'members', 'logos', 'other'];
const types = ['album_cover', 'single', 'tour', 'vic', 'dave', 'member', 'original_fmd', 'reimagined_fmd', 'logo_typographic', 'front_back_set', 'other'];

function card(item) {
    const images = [...new Set([item.img, ...(item.variants || []).map(variant => variant.img)].filter(Boolean))];
    return `<article class="card" data-id="${item.id}">
        <div class="images">${images.slice(0, 8).map(image => `<img src="../../${escapeHtml(image)}" alt="${escapeHtml(item.name)}">`).join('')}</div>
        <div class="copy">
            <span class="id">ID ${item.id} · ${escapeHtml((item.garments || []).join(', '))} · ${escapeHtml(item.category)}</span>
            <h3>${escapeHtml(item.name)}</h3>
            <div class="current">
                <span>Familia: <b>${escapeHtml(item.designFamilyId)}</b></span>
                <span>Sección: <b>${escapeHtml(item.megadethSection)}</b></span>
                <span>Álbum: <b>${escapeHtml(item.megadethAlbum || 'Sin definir')}</b></span>
                <span>Tipo: <b>${escapeHtml(item.megadethDesignType)}</b></span>
            </div>
            <p class="note">${escapeHtml(item.curationNotes)}</p>
            <div class="edit">
                <label>Familia corregida<input data-field="designFamilyIdCorregido" value="${escapeHtml(item.designFamilyId)}"></label>
                <label>Sección corregida<select data-field="megadethSectionCorregido"><option value="">Mantener actual</option>${sections.map(value => `<option>${value}</option>`).join('')}</select></label>
                <label>Álbum corregido<input data-field="megadethAlbumCorregido" placeholder="Vacío = mantener actual"></label>
                <label>Tipo corregido<select data-field="megadethDesignTypeCorregido"><option value="">Mantener actual</option>${types.map(value => `<option>${value}</option>`).join('')}</select></label>
                <label>Decisión final<select data-field="decisionFinal"><option value="">Pendiente</option><option>confirmar</option><option>corregir</option><option>mantener-separada</option><option>posible-fusion-futura</option></select></label>
                <label>Nota de Fernando<textarea data-field="notaFernando"></textarea></label>
            </div>
        </div>
    </article>`;
}

const multiFamilies = [...multiFamilyIds].sort().map(familyId => `
    <section class="family">
        <h2>${escapeHtml(familyId)} <span>${grouped[familyId].length} cards relacionadas</span></h2>
        <div class="cards">${grouped[familyId].map(card).join('')}</div>
    </section>
`).join('');
const manualCards = megadeth.filter(isManualReview).map(card).join('');

const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sprint 3.3 · Revisión curatorial Megadeth</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#080808;color:#eee;font:14px Arial,sans-serif}.head{position:sticky;top:0;z-index:5;padding:14px 18px;background:#111;border-bottom:1px solid #333}.head h1{margin:0 0 6px}.actions{display:flex;gap:8px;flex-wrap:wrap}.actions button{padding:9px 12px;border:1px solid #39ff14;border-radius:7px;background:#132416;color:#fff;cursor:pointer}.block{padding:18px}.block>h1{border-bottom:2px solid #e8432e;padding-bottom:8px}.family{margin:0 0 24px;padding:12px;border:1px solid #333;border-radius:12px;background:#0e0e0e}.family h2{margin:0 0 12px;font-size:18px}.family h2 span{color:#39ff14;font-size:12px}.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:12px}.card{min-width:0;overflow:hidden;border:1px solid #292929;border-radius:10px;background:#151515}.images{display:flex;gap:5px;overflow-x:auto;padding:7px;background:#050505}.images img{width:145px;height:180px;object-fit:cover;border-radius:6px}.copy{padding:12px}.id{font-size:11px;color:#39ff14}.copy h3{margin:7px 0 10px}.current{display:grid;gap:4px;color:#bbb;font-size:12px}.note{padding:7px;background:#25120e;color:#ffc1b5;border-radius:6px}.edit{display:grid;grid-template-columns:1fr 1fr;gap:7px}.edit label{display:grid;gap:3px;color:#aaa;font-size:11px}.edit input,.edit select,.edit textarea{width:100%;padding:7px;border:1px solid #444;border-radius:5px;background:#090909;color:#fff}.edit textarea{min-height:55px}.manual-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:12px}.saved{color:#39ff14}.export-panel{display:none;padding:18px;background:#111;border-bottom:1px solid #444}.export-panel.active{display:block}.export-panel textarea{width:100%;height:260px;padding:10px;background:#050505;color:#fff;border:1px solid #555}.export-panel p{color:#bbb}@media(max-width:650px){.block{padding:8px}.cards,.manual-grid{grid-template-columns:1fr}.edit{grid-template-columns:1fr}.images img{width:125px;height:155px}}
</style></head><body>
<div class="head"><h1>Sprint 3.3 · Revisión curatorial Megadeth</h1><p>Los cambios se guardan solamente en este navegador. Exportá el CSV cuando termines.</p><div class="actions"><button id="exportCsvBtn">DESCARGAR CSV CORREGIDO</button><button id="copyCsvBtn">COPIAR CSV AL PORTAPAPELES</button><button id="showCsvBtn">MOSTRAR CSV MANUAL</button><button id="exportJsonBtn">DESCARGAR RESPALDO JSON</button><button id="clearLocalBtn">BORRAR CAMBIOS LOCALES</button><span class="saved" id="saved"></span></div></div>
<div class="export-panel" id="exportPanel"><p>Respaldo manual: seleccioná todo este contenido y copialo si el navegador bloquea las descargas.</p><textarea id="exportTextarea" readonly></textarea></div>
<main>
<div class="block"><h1>16 familias con varias cards</h1>${multiFamilies}</div>
<div class="block"><h1>35 cards para revisión manual</h1><div class="manual-grid">${manualCards}</div></div>
</main>
<script>
const key='fmd-sprint3-3-curation';let state=JSON.parse(localStorage.getItem(key)||'{}');const fields=[...document.querySelectorAll('[data-field]')];const savedEl=document.getElementById('saved');
fields.forEach(el=>{const id=el.closest('.card').dataset.id;const f=el.dataset.field;if(state[id]?.[f]!=null)el.value=state[id][f];el.oninput=()=>{state[id]??={};state[id][f]=el.value;localStorage.setItem(key,JSON.stringify(state));savedEl.textContent='Cambios guardados localmente';setTimeout(()=>savedEl.textContent='',1400)}})
const q=v=>'"'+String(v??'').replaceAll('"','""')+'"';const headers=${JSON.stringify(csvHeader)};const baseData=${JSON.stringify(Object.fromEntries(megadeth.map(item => [String(item.id), [item.id,item.name,item.img,(item.garments||[]).join('|'),item.category,item.designFamilyId,item.megadethSection,item.megadethAlbum,item.megadethEra,item.megadethDesignType,item.isDesignDuplicateCandidate,item.curationNotes]])))};
function buildRows(){const rows=[];document.querySelectorAll('.card').forEach(c=>{if(rows.some(r=>String(r[0])===c.dataset.id))return;const id=c.dataset.id;const data=state[id]||{};rows.push([...baseData[id],data.designFamilyIdCorregido||'',data.megadethSectionCorregido||'',data.megadethAlbumCorregido||'',data.megadethDesignTypeCorregido||'',data.decisionFinal||'',data.notaFernando||''])});return rows}
function buildCsv(){return [headers.join(','),...buildRows().map(r=>r.map(q).join(','))].join('\\r\\n')}
function downloadFile(content,name,type){const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
document.getElementById('exportCsvBtn').onclick=()=>downloadFile('\\ufeff'+buildCsv(),'sprint3_3_curatorial_review_corregido.csv','text/csv;charset=utf-8');
document.getElementById('copyCsvBtn').onclick=async()=>{const csv=buildCsv();try{await navigator.clipboard.writeText(csv);savedEl.textContent='CSV copiado al portapapeles'}catch(e){document.getElementById('exportTextarea').value=csv;document.getElementById('exportPanel').classList.add('active');document.getElementById('exportTextarea').select();savedEl.textContent='No se pudo copiar: CSV mostrado abajo'}};
document.getElementById('showCsvBtn').onclick=()=>{document.getElementById('exportTextarea').value=buildCsv();document.getElementById('exportPanel').classList.toggle('active');document.getElementById('exportTextarea').select()};
document.getElementById('exportJsonBtn').onclick=()=>downloadFile(JSON.stringify({storageKey:key,exportedAt:new Date().toISOString(),state,rows:buildRows()},null,2),'sprint3_3_curatorial_backup.json','application/json');
document.getElementById('clearLocalBtn').onclick=()=>{if(confirm('¿Borrar todos los cambios curatoriales guardados localmente?')){localStorage.removeItem(key);location.reload()}};
</script></body></html>`;

fs.writeFileSync(path.join(outputDir, 'sprint3_3_curatorial_board.html'), html);
fs.writeFileSync(path.join(outputDir, 'sprint3_3_summary.json'), JSON.stringify({
    csvCards: reviewSet.length,
    manualReviewCards: megadeth.filter(isManualReview).length,
    multiCardFamilies: multiFamilyIds.size,
    productsJsonModified: false,
    productionFilesModified: false
}, null, 2) + '\n');
console.log(`Sprint 3.3 generado: ${reviewSet.length} cards únicas en CSV.`);
