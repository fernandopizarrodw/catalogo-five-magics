'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CSV_PATH = path.join(ROOT, 'reports', 'megadeth-curation-editable-2026-08-12.csv');
const PRODUCTS_PATH = path.join(ROOT, 'data', 'products.json');
const OUTPUT_PATH = path.join(ROOT, 'reports', 'megadeth-curation-gallery-2026-08-12.html');

function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = '';
    let quoted = false;
    for (let index = 0; index < text.length; index += 1) {
        const char = text[index];
        if (quoted) {
            if (char === '"' && text[index + 1] === '"') {
                cell += '"';
                index += 1;
            } else if (char === '"') quoted = false;
            else cell += char;
        } else if (char === '"') quoted = true;
        else if (char === ',') {
            row.push(cell);
            cell = '';
        } else if (char === '\n') {
            row.push(cell.replace(/\r$/, ''));
            if (row.some(value => value !== '')) rows.push(row);
            row = [];
            cell = '';
        } else cell += char;
    }
    if (cell || row.length) {
        row.push(cell);
        rows.push(row);
    }
    const headers = rows.shift().map(header => header.replace(/^\uFEFF/, ''));
    return rows.map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] || ''])));
}

function escapeInlineJson(value) {
    return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

const rows = parseCsv(fs.readFileSync(CSV_PATH, 'utf8'));
const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, 'utf8'));
const productsById = new Map(products.map(product => [String(product.id), product]));
const designs = rows.map(row => {
    const sourceIds = row.ids_origen.split('|').map(value => value.trim()).filter(Boolean);
    const sources = sourceIds.map(id => productsById.get(id)).filter(Boolean);
    return {
        designId: row.design_id,
        slug: row.slug,
        name: row.nombre_visible,
        sourceIds,
        albums: [...new Set(sources.map(product => product.album).filter(Boolean))],
        categories: [...new Set(sources.map(product => product.category).filter(Boolean))],
        tags: row.tags_actuales.split('|').map(value => value.trim()).filter(Boolean),
        image: `../${row.imagen_principal.replace(/^\/+/, '')}`,
        currentFeatured: row.destacado_actual === 'SI',
        visibilityTier: row.visibility_tier_actual,
        commercialPriority: Number(row.commercial_priority_actual) || 0
    };
});

const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Curaduría visual Megadeth · FMD</title>
<style>
:root{color-scheme:dark;--green:#39ff14;--gold:#d6aa43;--red:#e8432e;--panel:#111;--line:#303030;--muted:#a7a7a7}*{box-sizing:border-box}body{margin:0;background:#070707;color:#f4f4f4;font:15px/1.45 Arial,sans-serif}.top{position:sticky;top:0;z-index:20;padding:18px clamp(14px,3vw,36px);background:rgba(7,7,7,.97);border-bottom:1px solid #292929;box-shadow:0 12px 30px #000}.title-row{display:flex;justify-content:space-between;align-items:flex-end;gap:18px}.title-row h1{margin:0;font-size:clamp(1.5rem,3vw,2.5rem)}.title-row p{margin:5px 0 0;color:var(--muted)}.stats{white-space:nowrap;color:var(--green);font-weight:900}.toolbar{display:grid;grid-template-columns:minmax(220px,1.4fr) repeat(2,minmax(170px,.8fr)) auto;gap:9px;margin-top:15px}.toolbar input,.toolbar select,.card select{width:100%;min-height:42px;padding:9px 11px;border:1px solid #3b3b3b;border-radius:8px;background:#151515;color:#fff}.toolbar-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.btn{min-height:39px;padding:8px 13px;border:1px solid #444;border-radius:8px;background:#171717;color:#fff;font-weight:800;cursor:pointer}.btn:hover{border-color:var(--green)}.btn.primary{background:var(--green);border-color:var(--green);color:#050505}.btn.gold{background:var(--gold);border-color:var(--gold);color:#080808}.check-filter{display:flex;align-items:center;gap:7px;padding:0 10px;border:1px solid #3b3b3b;border-radius:8px;background:#151515;white-space:nowrap}.notice{margin:14px clamp(14px,3vw,36px) 0;padding:12px 14px;border:1px solid rgba(214,170,67,.4);border-radius:10px;background:rgba(214,170,67,.08);color:#e9d29a}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(285px,1fr));gap:18px;padding:20px clamp(14px,3vw,36px) 50px}.card{display:flex;flex-direction:column;min-width:0;border:1px solid var(--line);border-radius:14px;overflow:hidden;background:var(--panel);transition:.18s}.card:hover{border-color:#666;transform:translateY(-2px)}.card.selected{border-color:var(--gold);box-shadow:0 0 0 2px rgba(214,170,67,.22)}.media{position:relative;display:block;width:100%;aspect-ratio:4/5;border:0;padding:0;background:#000;cursor:zoom-in}.media img{width:100%;height:100%;display:block;object-fit:contain}.current{position:absolute;top:10px;left:10px;padding:5px 7px;border-radius:6px;background:#151515;border:1px solid var(--green);color:var(--green);font-size:.66rem;font-weight:900}.copy{display:grid;gap:9px;padding:14px}.copy h2{margin:0;font-size:1.12rem;line-height:1.2}.id{color:var(--green);font:700 .72rem/1.35 Consolas,monospace;overflow-wrap:anywhere}.meta{display:grid;gap:5px;color:#ccc;font-size:.82rem}.meta strong{color:#fff}.tags{display:flex;gap:5px;flex-wrap:wrap}.tag{padding:3px 6px;border-radius:999px;background:#222;color:#bbb;font-size:.68rem}.decision{display:grid;gap:8px;padding-top:10px;border-top:1px solid #2d2d2d}.featured-check{display:flex;align-items:center;gap:9px;font-weight:900;color:#fff}.featured-check input{width:20px;height:20px;accent-color:var(--gold)}.category-label{display:grid;gap:5px;color:#ddd;font-size:.78rem;font-weight:800}.empty{grid-column:1/-1;padding:60px 20px;text-align:center;color:#aaa}.lightbox{position:fixed;inset:0;z-index:50;display:none;place-items:center;padding:20px;background:rgba(0,0,0,.94)}.lightbox.open{display:grid}.lightbox img{max-width:min(92vw,900px);max-height:88vh;object-fit:contain}.lightbox button{position:absolute;top:15px;right:15px;width:44px;height:44px;border-radius:50%;border:1px solid #555;background:#111;color:#fff;font-size:1.5rem;cursor:pointer}.lightbox p{position:absolute;bottom:12px;left:50%;transform:translateX(-50%);max-width:90vw;margin:0;padding:7px 12px;border-radius:8px;background:#111;font-weight:800;text-align:center}.footer-note{padding:0 36px 35px;color:#777;text-align:center}@media(max-width:900px){.toolbar{grid-template-columns:1fr 1fr}.toolbar>input{grid-column:1/-1}}@media(max-width:560px){.top{position:relative}.title-row{align-items:flex-start;flex-direction:column}.toolbar{grid-template-columns:1fr}.toolbar>input{grid-column:auto}.grid{grid-template-columns:1fr;padding:14px}.media{aspect-ratio:1/1}.toolbar-actions .btn{flex:1}.stats{white-space:normal}.notice{margin:12px 14px 0}}
.load-more-wrap{display:flex;justify-content:center;padding:0 20px 32px}.load-more-wrap[hidden]{display:none}.load-more-wrap .btn{min-width:230px}
</style>
</head>
<body>
<header class="top">
  <div class="title-row"><div><h1>CURADURÍA VISUAL MEGADETH</h1><p>Marcá los diseños editoriales y asignales una categoría. El avance se guarda automáticamente.</p></div><div class="stats" id="stats"></div></div>
  <div class="toolbar">
    <input id="search" type="search" placeholder="Buscar diseño, ID, tag..." autocomplete="off">
    <select id="albumFilter"><option value="">Todos los álbumes</option></select>
    <select id="categoryFilter"><option value="">Todas las categorías actuales</option></select>
    <label class="check-filter"><input id="selectedOnly" type="checkbox"> Solo destacados</label>
  </div>
  <div class="toolbar-actions">
    <button class="btn" id="clearFilters">Limpiar filtros</button>
    <button class="btn gold" id="exportJson">Exportar selección JSON</button>
    <button class="btn primary" id="exportCsv">Exportar selección CSV</button>
    <button class="btn" id="resetSelection">Borrar selección</button>
  </div>
</header>
<div class="notice">La marca <strong>“Destacado actual”</strong> solo muestra metadata heredada. No selecciona automáticamente el diseño para la nueva curaduría.</div>
<main class="grid" id="grid"></main>
<div class="load-more-wrap" id="loadMoreWrap"><button type="button" class="btn" id="loadMore">VER MÁS DISEÑOS</button></div>
<p class="footer-note">Archivo local de trabajo. No modifica el catálogo ni publica cambios.</p>
<div class="lightbox" id="lightbox" role="dialog" aria-modal="true"><button type="button" aria-label="Cerrar">×</button><img alt=""><p></p></div>
<script>
const DESIGNS=${escapeInlineJson(designs)};
const STORAGE_KEY='fmd-megadeth-curation-v1';
const CURATED_CATEGORIES=[
  '',
  'Destacados Megadeth FMD',
  'Killing Is My Business... and Business Is Good!',
  "Peace Sells... but Who's Buying?",
  'So Far, So Good... So What!',
  'Rust in Peace',
  'Countdown to Extinction',
  'Youthanasia',
  'Cryptic Writings',
  'Risk',
  'The World Needs a Hero',
  'The System Has Failed',
  'United Abominations',
  'Endgame',
  'TH1RT3EN',
  'Super Collider',
  'Dystopia',
  'The Sick, the Dying... and the Dead!',
  'Megadeth (2026)',
  'Singles / EP / recopilatorios',
  'Primeros discos / era clásica',
  'Vic Rattlehead',
  'Dave Mustaine / miembros',
  'Tours / clásicos',
  'Reimaginados FMD',
  'Otro / revisar'
];
const state=loadState();
const grid=document.getElementById('grid');
const search=document.getElementById('search');
const albumFilter=document.getElementById('albumFilter');
const categoryFilter=document.getElementById('categoryFilter');
const selectedOnly=document.getElementById('selectedOnly');
const PAGE_SIZE=48;
let visibleLimit=PAGE_SIZE;
function loadState(){try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');Object.values(saved).forEach(decision=>{if(decision&&decision.category==='Peace Sells')decision.category="Peace Sells... but Who's Buying?"});return saved}catch{return {}}}
function saveState(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state));updateStats()}
function normalize(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))}
function uniqueSorted(values){return [...new Set(values.filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es',{sensitivity:'base'}))}
function fillFilter(select,values){values.forEach(value=>select.insertAdjacentHTML('beforeend','<option value="'+escapeHtml(value)+'">'+escapeHtml(value)+'</option>'))}
fillFilter(albumFilter,uniqueSorted(DESIGNS.flatMap(item=>item.albums)));
fillFilter(categoryFilter,uniqueSorted(DESIGNS.flatMap(item=>item.categories)));
function getDecision(id){return state[id]||{featured:false,category:''}}
function matches(item){const query=normalize(search.value);const text=normalize([item.name,item.designId,item.slug,...item.tags,...item.albums,...item.categories].join(' '));if(query&&!text.includes(query))return false;if(albumFilter.value&&!item.albums.includes(albumFilter.value))return false;if(categoryFilter.value&&!item.categories.includes(categoryFilter.value))return false;if(selectedOnly.checked&&!getDecision(item.designId).featured)return false;return true}
function render(){const filtered=DESIGNS.filter(matches);const visible=filtered.slice(0,visibleLimit);grid.innerHTML=visible.length?visible.map(cardTemplate).join(''):'<div class="empty">No hay diseños con estos filtros.</div>';document.getElementById('loadMoreWrap').hidden=visible.length>=filtered.length;document.getElementById('loadMore').textContent='VER MÁS DISEÑOS ('+visible.length+' DE '+filtered.length+')';bindCards();updateStats(filtered.length)}
function cardTemplate(item){const decision=getDecision(item.designId);const options=CURATED_CATEGORIES.map(value=>'<option value="'+escapeHtml(value)+'" '+(decision.category===value?'selected':'')+'>'+(value?escapeHtml(value):'Sin categoría curada')+'</option>').join('');return '<article class="card '+(decision.featured?'selected':'')+'" data-id="'+escapeHtml(item.designId)+'"><button class="media" type="button" data-lightbox="'+escapeHtml(item.designId)+'"><img src="'+escapeHtml(item.image)+'" alt="'+escapeHtml(item.name)+'" loading="lazy">'+(item.currentFeatured?'<span class="current">DESTACADO ACTUAL</span>':'')+'</button><div class="copy"><div class="id">'+escapeHtml(item.designId)+'</div><h2>'+escapeHtml(item.name)+'</h2><div class="meta"><div><strong>Álbum:</strong> '+escapeHtml(item.albums.join(' · ')||'Sin álbum')+'</div><div><strong>Categoría:</strong> '+escapeHtml(item.categories.join(' · ')||'Sin categoría')+'</div><div><strong>Origen:</strong> '+escapeHtml(item.sourceIds.join(', '))+'</div></div><div class="tags">'+(item.tags.length?item.tags.map(tag=>'<span class="tag">'+escapeHtml(tag)+'</span>').join(''):'<span class="tag">Sin tags</span>')+'</div><div class="decision"><label class="featured-check"><input type="checkbox" data-featured '+(decision.featured?'checked':'')+'> Destacado FMD</label><label class="category-label">Categoría curada<select data-curated-category>'+options+'</select></label></div></div></article>'}
function bindCards(){document.querySelectorAll('.card').forEach(card=>{const id=card.dataset.id;card.querySelector('[data-featured]').addEventListener('change',event=>{state[id]={...getDecision(id),featured:event.target.checked};saveState();card.classList.toggle('selected',event.target.checked);if(selectedOnly.checked)render()});card.querySelector('[data-curated-category]').addEventListener('change',event=>{state[id]={...getDecision(id),category:event.target.value};saveState()});card.querySelector('[data-lightbox]').addEventListener('click',()=>openLightbox(DESIGNS.find(item=>item.designId===id)))})}
function selectedRows(){return DESIGNS.filter(item=>getDecision(item.designId).featured).map(item=>({design_id:item.designId,slug:item.slug,nombre_visible:item.name,categoria_curada:getDecision(item.designId).category,imagen_principal:item.image.startsWith('../')?item.image.slice(3):item.image,ids_origen:item.sourceIds}))}
function updateStats(filteredCount){const selected=selectedRows().length;document.getElementById('stats').textContent=selected+' destacados · '+(Number.isInteger(filteredCount)?filteredCount:DESIGNS.filter(matches).length)+' visibles · '+DESIGNS.length+' totales'}
function download(name,content,type){const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),500)}
document.getElementById('exportJson').addEventListener('click',()=>download('megadeth-destacados-fmd.json',JSON.stringify({generatedAt:new Date().toISOString(),count:selectedRows().length,designs:selectedRows()},null,2),'application/json'));
document.getElementById('exportCsv').addEventListener('click',()=>{const rows=selectedRows();const headers=['design_id','slug','nombre_visible','categoria_curada','imagen_principal','ids_origen'];const cell=value=>'"'+String(Array.isArray(value)?value.join(' | '):value??'').replace(/"/g,'""')+'"';const newline=String.fromCharCode(13,10);download('megadeth-destacados-fmd.csv',String.fromCharCode(65279)+[headers,...rows.map(row=>headers.map(key=>row[key]))].map(row=>row.map(cell).join(',')).join(newline),'text/csv;charset=utf-8')});
document.getElementById('clearFilters').addEventListener('click',()=>{search.value='';albumFilter.value='';categoryFilter.value='';selectedOnly.checked=false;visibleLimit=PAGE_SIZE;render()});
document.getElementById('loadMore').addEventListener('click',()=>{visibleLimit+=PAGE_SIZE;render()});
document.getElementById('resetSelection').addEventListener('click',()=>{if(!confirm('¿Borrar toda la selección y categorías curadas guardadas?'))return;Object.keys(state).forEach(key=>delete state[key]);saveState();render()});
[search,albumFilter,categoryFilter,selectedOnly].forEach(control=>control.addEventListener(control===search?'input':'change',()=>{visibleLimit=PAGE_SIZE;render()}));
const lightbox=document.getElementById('lightbox');function openLightbox(item){lightbox.querySelector('img').src=item.image;lightbox.querySelector('img').alt=item.name;lightbox.querySelector('p').textContent=item.name+' · '+item.designId;lightbox.classList.add('open')}function closeLightbox(){lightbox.classList.remove('open');lightbox.querySelector('img').src=''}lightbox.querySelector('button').addEventListener('click',closeLightbox);lightbox.addEventListener('click',event=>{if(event.target===lightbox)closeLightbox()});document.addEventListener('keydown',event=>{if(event.key==='Escape')closeLightbox()});
render();
</script>
</body>
</html>`;

fs.writeFileSync(OUTPUT_PATH, html, 'utf8');
console.log(`Galería generada: ${path.relative(ROOT, OUTPUT_PATH)} (${designs.length} diseños)`);
