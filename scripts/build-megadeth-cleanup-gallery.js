'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CSV_PATH = path.join(ROOT, 'reports', 'megadeth-curation-editable-2026-08-12.csv');
const PRODUCTS_PATH = path.join(ROOT, 'data', 'products.json');
const OUTPUT_PATH = path.join(ROOT, 'reports', 'megadeth-cleanup-gallery-2026-08-12.html');

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

function inlineJson(value) {
    return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, 'utf8'));
const productsById = new Map(products.map(product => [String(product.id), product]));
const designs = parseCsv(fs.readFileSync(CSV_PATH, 'utf8')).map(row => {
    const sourceIds = row.ids_origen.split('|').map(value => value.trim()).filter(Boolean);
    const albums = [...new Set(sourceIds
        .map(id => productsById.get(id)?.album)
        .filter(Boolean))];
    return {
        designId: row.design_id,
        slug: row.slug,
        name: row.nombre_visible,
        sourceIds,
        albums,
        currentCategory: row.categoria_album_actual,
        visualCategory: albums.length ? albums.join(' · ') : row.categoria_album_actual,
        tags: row.tags_actuales.split('|').map(value => value.trim()).filter(Boolean),
        image: `../${row.imagen_principal.replace(/^\/+/, '')}`
    };
});

const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Depuración visual Megadeth · FMD</title>
<style>
:root{color-scheme:dark;--green:#39ff14;--gold:#d6aa43;--red:#ff4b3e;--blue:#4bb8ff;--panel:#111;--line:#303030;--muted:#aaa}*{box-sizing:border-box}body{margin:0;background:#070707;color:#f4f4f4;font:15px/1.45 Arial,sans-serif}.top{position:sticky;top:0;z-index:20;padding:18px clamp(14px,3vw,36px);background:rgba(7,7,7,.97);border-bottom:1px solid #292929;box-shadow:0 12px 30px #000}.head{display:flex;align-items:flex-end;justify-content:space-between;gap:18px}.head h1{margin:0;font-size:clamp(1.5rem,3vw,2.4rem)}.head p{margin:5px 0 0;color:var(--muted)}.stats{color:var(--green);font-weight:900}.toolbar{display:grid;grid-template-columns:minmax(220px,1.5fr) minmax(180px,.8fr) minmax(180px,.8fr);gap:9px;margin-top:15px}.toolbar input,.toolbar select,.card select,.card input,.card textarea{width:100%;min-height:42px;padding:9px 11px;border:1px solid #3b3b3b;border-radius:8px;background:#151515;color:#fff}.actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.btn{min-height:40px;padding:8px 13px;border:1px solid #444;border-radius:8px;background:#171717;color:#fff;font-weight:900;cursor:pointer}.btn.primary{background:var(--green);border-color:var(--green);color:#050505}.notice{margin:14px clamp(14px,3vw,36px) 0;padding:12px 14px;border:1px solid rgba(214,170,67,.45);border-radius:10px;background:rgba(214,170,67,.08);color:#ead39d}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(285px,1fr));gap:18px;padding:20px clamp(14px,3vw,36px) 30px}.card{overflow:hidden;border:1px solid var(--line);border-radius:14px;background:var(--panel)}.card[data-status="delete"]{border-color:var(--red);box-shadow:0 0 0 2px rgba(255,75,62,.2)}.card[data-status="duplicate"]{border-color:var(--gold)}.card[data-status="hide"]{border-color:var(--blue)}.media{display:block;width:100%;aspect-ratio:4/5;padding:0;border:0;background:#000;cursor:zoom-in}.media img{display:block;width:100%;height:100%;object-fit:contain}.copy{display:grid;gap:9px;padding:14px}.copy h2{margin:0;font-size:1.08rem;line-height:1.2}.id{color:var(--green);font:700 .72rem/1.35 Consolas,monospace;overflow-wrap:anywhere}.meta{color:#ccc;font-size:.8rem}.tags{display:flex;gap:5px;flex-wrap:wrap}.tag{padding:3px 6px;border-radius:999px;background:#222;color:#bbb;font-size:.67rem}.decision{display:grid;gap:8px;padding-top:10px;border-top:1px solid #2d2d2d}.decision label{display:grid;gap:4px;color:#ddd;font-size:.76rem;font-weight:800}.card textarea{min-height:70px;resize:vertical}.duplicate-field[hidden]{display:none}.load{display:flex;justify-content:center;padding:0 20px 36px}.load[hidden]{display:none}.load .btn{min-width:250px}.empty{grid-column:1/-1;padding:60px 20px;text-align:center;color:#aaa}.lightbox{position:fixed;inset:0;z-index:50;display:none;place-items:center;padding:20px;background:rgba(0,0,0,.94)}.lightbox.open{display:grid}.lightbox img{max-width:min(92vw,900px);max-height:88vh;object-fit:contain}.lightbox button{position:absolute;top:15px;right:15px;width:44px;height:44px;border-radius:50%;border:1px solid #555;background:#111;color:#fff;font-size:1.5rem}.lightbox p{position:absolute;bottom:12px;margin:0;padding:7px 12px;border-radius:8px;background:#111;font-weight:800}@media(max-width:760px){.top{position:relative}.head{align-items:flex-start;flex-direction:column}.toolbar{grid-template-columns:1fr}.grid{grid-template-columns:1fr;padding:14px}.media{aspect-ratio:1/1}.actions .btn{flex:1}.stats{white-space:normal}}
</style>
</head>
<body>
<header class="top"><div class="head"><div><h1>DEPURACIÓN VISUAL MEGADETH</h1><p>Marcá qué conservar, ocultar, revisar como duplicado o eliminar.</p></div><div class="stats" id="stats"></div></div><div class="toolbar"><input id="search" type="search" placeholder="Buscar nombre, ID o tag..."><select id="category"><option value="">Todas las categorías</option></select><select id="status"><option value="">Todos los estados</option><option value="pending">Sin revisar</option><option value="keep">Conservar</option><option value="hide">Ocultar del catálogo</option><option value="duplicate">Revisar duplicado</option><option value="delete">Eliminar</option></select></div><div class="actions"><button class="btn" id="clear">Limpiar filtros</button><button class="btn primary" id="exportJson">EXPORTAR DECISIONES JSON</button><button class="btn" id="exportCsv">EXPORTAR DECISIONES CSV</button><button class="btn" id="reset">Borrar decisiones</button></div></header>
<div class="notice"><strong>Esta herramienta no borra nada.</strong> Solo guarda y exporta tus decisiones por <code>designId</code>. La eliminación real se hace después de validar el archivo exportado.</div>
<main class="grid" id="grid"></main><div class="load" id="loadWrap"><button class="btn" id="load">VER MÁS DISEÑOS</button></div>
<div class="lightbox" id="lightbox"><button type="button" aria-label="Cerrar">×</button><img alt=""><p></p></div>
<script>
const DESIGNS=${inlineJson(designs)};const KEY='fmd-megadeth-cleanup-v1';const PAGE=48;let limit=PAGE;const state=load();const grid=document.getElementById('grid');const search=document.getElementById('search');const category=document.getElementById('category');const status=document.getElementById('status');
function load(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return {}}}function save(){localStorage.setItem(KEY,JSON.stringify(state));stats()}function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}function decision(id){return state[id]||{status:'pending',duplicateOf:'',note:''}}function categories(){return [...new Set(DESIGNS.map(x=>x.visualCategory).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'))}categories().forEach(v=>category.insertAdjacentHTML('beforeend','<option value="'+esc(v)+'">'+esc(v)+'</option>'));
function matches(x){const d=decision(x.designId);const q=norm(search.value);if(q&&!norm([x.name,x.designId,x.visualCategory,x.currentCategory,...x.tags].join(' ')).includes(q))return false;if(category.value!==''&&x.visualCategory!==category.value)return false;if(status.value&&d.status!==status.value)return false;return true}function render(){const filtered=DESIGNS.filter(matches);const visible=filtered.slice(0,limit);grid.innerHTML=visible.length?visible.map(card).join(''):'<div class="empty">No hay diseños con estos filtros.</div>';document.getElementById('loadWrap').hidden=visible.length>=filtered.length;document.getElementById('load').textContent='VER MÁS DISEÑOS ('+visible.length+' DE '+filtered.length+')';bind();stats(filtered.length)}
function card(x){const d=decision(x.designId);return '<article class="card" data-id="'+esc(x.designId)+'" data-status="'+esc(d.status)+'"><button class="media" type="button"><img src="'+esc(x.image)+'" alt="'+esc(x.name)+'" loading="lazy"></button><div class="copy"><div class="id">'+esc(x.designId)+'</div><h2>'+esc(x.name)+'</h2><div class="meta"><strong>Álbum / categoría:</strong> '+esc(x.visualCategory||'Sin categoría')+'<br><strong>Origen:</strong> '+esc(x.sourceIds.join(', '))+'</div><div class="tags">'+(x.tags.length?x.tags.map(t=>'<span class="tag">'+esc(t)+'</span>').join(''):'<span class="tag">Sin tags</span>')+'</div><div class="decision"><label>Decisión<select data-status><option value="pending">Sin revisar</option><option value="keep">Conservar</option><option value="hide">Ocultar del catálogo</option><option value="duplicate">Revisar duplicado</option><option value="delete">Eliminar</option></select></label><label class="duplicate-field" '+(d.status==='duplicate'?'':'hidden')+'>Duplicado de designId<input data-duplicate value="'+esc(d.duplicateOf)+'" placeholder="Pegá el designId que se conserva"></label><label>Nota opcional<textarea data-note placeholder="Motivo o aclaración">'+esc(d.note)+'</textarea></label></div></div></article>'}
function bind(){document.querySelectorAll('.card').forEach(el=>{const id=el.dataset.id;const d=decision(id);const select=el.querySelector('[data-status]');select.value=d.status;select.addEventListener('change',e=>{state[id]={...decision(id),status:e.target.value};el.dataset.status=e.target.value;el.querySelector('.duplicate-field').hidden=e.target.value!=='duplicate';save();if(status.value)render()});el.querySelector('[data-duplicate]').addEventListener('input',e=>{state[id]={...decision(id),duplicateOf:e.target.value.trim()};save()});el.querySelector('[data-note]').addEventListener('input',e=>{state[id]={...decision(id),note:e.target.value};save()});el.querySelector('.media').addEventListener('click',()=>open(DESIGNS.find(x=>x.designId===id)))})}
function decisions(){return DESIGNS.map(x=>({...x,...decision(x.designId)})).filter(x=>x.status!=='pending').map(x=>({design_id:x.designId,nombre_visible:x.name,decision:x.status,duplicado_de:x.duplicateOf||'',nota:x.note||'',imagen_principal:x.image.startsWith('../')?x.image.slice(3):x.image,ids_origen:x.sourceIds}))}function stats(count){const values=Object.values(state);const reviewed=values.filter(x=>x.status&&x.status!=='pending').length;const deleting=values.filter(x=>x.status==='delete').length;const duplicates=values.filter(x=>x.status==='duplicate').length;document.getElementById('stats').textContent=reviewed+' revisados · '+deleting+' eliminar · '+duplicates+' duplicados · '+(Number.isInteger(count)?count:DESIGNS.filter(matches).length)+' visibles'}function download(name,content,type){const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),500)}
document.getElementById('exportJson').addEventListener('click',()=>download('megadeth-depuracion-fmd.json',JSON.stringify({generatedAt:new Date().toISOString(),count:decisions().length,decisions:decisions()},null,2),'application/json'));document.getElementById('exportCsv').addEventListener('click',()=>{const rows=decisions(),heads=['design_id','nombre_visible','decision','duplicado_de','nota','imagen_principal','ids_origen'],cell=v=>'"'+String(Array.isArray(v)?v.join(' | '):v??'').replace(/"/g,'""')+'"',nl=String.fromCharCode(13,10);download('megadeth-depuracion-fmd.csv',String.fromCharCode(65279)+[heads,...rows.map(r=>heads.map(k=>r[k]))].map(r=>r.map(cell).join(',')).join(nl),'text/csv;charset=utf-8')});document.getElementById('clear').addEventListener('click',()=>{search.value='';category.value='';status.value='';limit=PAGE;render()});document.getElementById('reset').addEventListener('click',()=>{if(!confirm('¿Borrar todas las decisiones guardadas?'))return;Object.keys(state).forEach(k=>delete state[k]);save();render()});document.getElementById('load').addEventListener('click',()=>{limit+=PAGE;render()});[search,category,status].forEach(x=>x.addEventListener(x===search?'input':'change',()=>{limit=PAGE;render()}));
const lightbox=document.getElementById('lightbox');function open(x){lightbox.querySelector('img').src=x.image;lightbox.querySelector('img').alt=x.name;lightbox.querySelector('p').textContent=x.name+' · '+x.designId;lightbox.classList.add('open')}function close(){lightbox.classList.remove('open');lightbox.querySelector('img').src=''}lightbox.querySelector('button').addEventListener('click',close);lightbox.addEventListener('click',e=>{if(e.target===lightbox)close()});document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});render();
</script>
</body></html>`;

fs.writeFileSync(OUTPUT_PATH, html, 'utf8');
console.log(`Galería de depuración generada: ${path.relative(ROOT, OUTPUT_PATH)} (${designs.length} diseños)`);
