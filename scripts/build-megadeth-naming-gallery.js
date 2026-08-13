'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const catalog = require('../js/catalog-design.js');
const archives = require('../js/band-archives-config.js');

const ROOT = path.resolve(__dirname, '..');
const PRODUCTS_PATH = path.join(ROOT, 'data', 'products.json');
const OUTPUT_PATH = path.join(ROOT, 'reports', 'megadeth-nombres-categorias-2026-08-12.html');
const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, 'utf8'));
const megadethConfig = archives.find(config => config.slug === 'megadeth') || {};
const retired = new Set(megadethConfig.retiredDesignIds || []);

function normalize(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function getBand(product) {
    return String(product?.band || (['Album', 'Musician', 'Tour', 'VicRattlehead', 'Singles', 'Dorsales', 'Dave Mustaine', 'Hoodies FMD', 'Buzo Cuello Redondo'].includes(product?.category) ? 'Megadeth' : '')).trim();
}

function buildExplicitIds(sourceProducts) {
    const ids = {};
    sourceProducts.forEach(product => {
        const variants = Array.isArray(product.variants) && product.variants.length
            ? product.variants
            : [{ img: product.img, name: product.name, garmentCategory: product.category }];
        const groups = new Map();
        variants.forEach((variant, variantIndex) => {
            if (catalog.isBackVariant(variant)) return;
            const conceptName = catalog.getConceptName(product, variant);
            const garment = catalog.getGarment(variant, product);
            const key = `${normalize(conceptName)}|${garment}`;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push({ variant, variantIndex, conceptName });
        });
        groups.forEach(entries => {
            if (entries.length <= 1) return;
            const meaningful = entries.filter(entry => !/(frente\s+y\s+dorso|combo|full\s+art|hoodies?\s+models?)/i.test(entry.variant?.name || ''));
            if (meaningful.length <= 1) return;
            entries.forEach(entry => {
                ids[`${product.id}:${entry.variantIndex}`] = `cd-${catalog.slugify(getBand(product))}-${catalog.slugify(entry.conceptName)}--p${product.id}-v${entry.variantIndex + 1}`;
            });
        });
    });
    return ids;
}

function resolveDesignId({ product, conceptName, transitionId, slugify }) {
    const familyId = String(product?.designFamilyId || '').trim();
    if (familyId && !/^megadeth-card-\d+$/i.test(familyId)) return `cd-${slugify(familyId)}--${slugify(conceptName)}`;
    return `cd-${transitionId}--p${product.id}`;
}

const megadethProducts = products.filter(product => normalize(getBand(product)) === 'megadeth');
const productsById = new Map(products.map(product => [Number(product.id), product]));
const designs = catalog.buildCatalogDesigns(megadethProducts, {
    explicitDesignIds: buildExplicitIds(megadethProducts),
    resolveDesignId
}).filter(design => design.front?.image && !retired.has(design.designId));

const curated = megadethConfig.curatedDesignCategories || {};
const reimaginedCollection = (megadethConfig.collections || []).find(collection => collection.id === 'originals');
const reimaginedBadges = new Set((reimaginedCollection?.match?.badges || []).map(normalize));
const suspiciousPattern = /(^|\b)(v\d+|lineup|edition|edicion|frente|negra?|blanca?|alternative|alternativa|art|arte)(\b|$)/i;

function inferredCategory(design) {
    if (curated[design.designId]) return curated[design.designId];
    if ((design.badges || []).some(badge => reimaginedBadges.has(normalize(badge)))) return 'Reimaginados FMD';
    const sources = design.sourceProductIds.map(id => productsById.get(Number(id))).filter(Boolean);
    const albums = [...new Set(sources.map(product => product.album).filter(Boolean))];
    if (albums.length === 1) return albums[0];
    const categories = [...new Set(sources.map(product => product.category).filter(Boolean))];
    if (categories.some(value => value === 'VicRattlehead')) return 'Vic Rattlehead';
    if (categories.some(value => ['Dave Mustaine', 'Musician'].includes(value))) return 'Dave Mustaine / miembros';
    if (categories.some(value => ['Tour', 'Orígenes'].includes(value))) return 'Tours / clásicos';
    return 'Otro / revisar';
}

const galleryData = designs.map(design => {
    const sources = design.sourceProductIds.map(id => productsById.get(Number(id))).filter(Boolean);
    const category = inferredCategory(design);
    return {
        designId: design.designId,
        name: design.publicName,
        image: `../${design.front.image.replace(/^\/+/, '')}`,
        sourceIds: design.sourceProductIds,
        albums: [...new Set(sources.map(product => product.album).filter(Boolean))],
        sourceCategories: [...new Set(sources.map(product => product.category).filter(Boolean))],
        badges: design.badges || [],
        currentCategory: category,
        inReimagined: category === 'Reimaginados FMD',
        suspiciousName: suspiciousPattern.test(design.publicName)
    };
}).sort((a, b) => Number(b.suspiciousName) - Number(a.suspiciousName) || a.name.localeCompare(b.name, 'es'));

const duplicateDesignIds = galleryData
    .map(item => item.designId)
    .filter((designId, index, all) => all.indexOf(designId) !== index);
const missingImages = galleryData
    .filter(item => !fs.existsSync(path.join(ROOT, item.image.replace(/^\.\.\//, ''))))
    .map(item => `${item.designId}: ${item.image}`);
if (duplicateDesignIds.length || missingImages.length) {
    throw new Error([
        duplicateDesignIds.length ? `designIds duplicados: ${[...new Set(duplicateDesignIds)].join(', ')}` : '',
        missingImages.length ? `Imágenes faltantes:\n${missingImages.join('\n')}` : ''
    ].filter(Boolean).join('\n'));
}

const categories = [
    'Killing Is My Business... and Business Is Good!',
    "Peace Sells... but Who's Buying?",
    'So Far, So Good... So What!',
    'Rust in Peace',
    'Countdown to Extinction',
    'Youthanasia',
    'Hidden Treasures',
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
    'Vic Rattlehead',
    'Dave Mustaine / miembros',
    'Tours / clásicos',
    'Reimaginados FMD',
    'Otro / revisar'
];

function inline(value) {
    return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Nombres y categorías Megadeth · FMD</title><style>
:root{color-scheme:dark;--green:#39ff14;--gold:#d8ad48;--red:#ff665c;--panel:#111;--line:#343434;--muted:#aaa}*{box-sizing:border-box}body{margin:0;background:#070707;color:#f4f4f4;font:15px/1.4 Arial,sans-serif}.top{position:sticky;top:0;z-index:10;padding:16px clamp(12px,3vw,34px);background:rgba(7,7,7,.97);border-bottom:1px solid #292929}.head{display:flex;justify-content:space-between;gap:15px;align-items:end}.head h1{margin:0;font-size:clamp(1.45rem,3vw,2.3rem)}.head p{margin:4px 0 0;color:var(--muted)}#stats{color:var(--green);font-weight:900}.toolbar{display:grid;grid-template-columns:minmax(220px,1.4fr) repeat(2,minmax(175px,.7fr));gap:8px;margin-top:13px}.toolbar input,.toolbar select,.card input,.card select,.card textarea{width:100%;padding:10px;border:1px solid #414141;border-radius:8px;background:#161616;color:#fff}.actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:9px}.btn{padding:9px 13px;border:1px solid #484848;border-radius:8px;background:#181818;color:#fff;font-weight:900;cursor:pointer}.btn.primary{background:var(--green);border-color:var(--green);color:#030803}.notice{margin:14px clamp(12px,3vw,34px) 0;padding:11px 13px;border:1px solid #705d2f;border-radius:9px;background:#19160d;color:#ead49a}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(285px,1fr));gap:17px;padding:18px clamp(12px,3vw,34px) 40px}.card{overflow:hidden;border:1px solid var(--line);border-radius:13px;background:var(--panel)}.card.changed{border-color:var(--green)}.card.suspicious{box-shadow:inset 0 0 0 2px rgba(255,102,92,.18)}.media{position:relative;width:100%;aspect-ratio:4/5;padding:0;border:0;background:#000;cursor:zoom-in}.media img{width:100%;height:100%;object-fit:contain}.flag{position:absolute;top:8px;left:8px;padding:4px 7px;border-radius:6px;background:#170706;border:1px solid var(--red);color:#ff9b95;font-size:.66rem;font-weight:900}.flag.re{left:auto;right:8px;background:#1c1606;border-color:var(--gold);color:#f4d37f}.copy{display:grid;gap:9px;padding:13px}.id{color:var(--green);font:700 .7rem Consolas,monospace;overflow-wrap:anywhere}.copy h2{margin:0;font-size:1.08rem}.meta{font-size:.78rem;color:#bbb}.field{display:grid;gap:4px;font-size:.76rem;font-weight:800}.card textarea{min-height:62px;resize:vertical}.load{text-align:center;padding:0 20px 35px}.empty{grid-column:1/-1;padding:50px;text-align:center;color:#aaa}.lightbox{position:fixed;inset:0;z-index:30;display:none;place-items:center;background:rgba(0,0,0,.94);padding:20px}.lightbox.open{display:grid}.lightbox img{max-width:92vw;max-height:88vh}.lightbox button{position:absolute;right:15px;top:15px;width:44px;height:44px;border-radius:50%;background:#111;color:#fff;border:1px solid #555;font-size:1.4rem}@media(max-width:700px){.top{position:relative}.head{display:block}.toolbar{grid-template-columns:1fr}.grid{grid-template-columns:1fr}.media{aspect-ratio:1/1}.actions .btn{flex:1}}
</style></head><body><header class="top"><div class="head"><div><h1>NOMBRES Y CATEGORÍAS · MEGADETH</h1><p>Corregí nombres públicos y decidí qué pertenece realmente a Reimaginados FMD.</p></div><div id="stats"></div></div><div class="toolbar"><input id="search" type="search" placeholder="Buscar nombre, designId, álbum..."><select id="category"><option value="">Todas las categorías actuales</option></select><select id="review"><option value="">Todos los diseños</option><option value="suspicious">Nombres a revisar</option><option value="reimagined">Actualmente en Reimaginados</option><option value="changed">Con cambios</option></select></div><div class="actions"><button class="btn" id="clear">Limpiar filtros</button><button class="btn primary" id="json">EXPORTAR CAMBIOS JSON</button><button class="btn" id="csv">EXPORTAR CAMBIOS CSV</button><button class="btn" id="reset">Borrar cambios</button></div></header><div class="notice"><strong>No modifica el catálogo.</strong> Los cambios se guardan en este navegador y se exportan por designId. Dejá el nombre vacío o la categoría sin cambios cuando no quieras modificar ese diseño.</div><main class="grid" id="grid"></main><div class="load" id="loadWrap"><button class="btn" id="more">VER MÁS DISEÑOS</button></div><div class="lightbox" id="lightbox"><button>×</button><img alt=""></div><script>
const DESIGNS=${inline(galleryData)},CATEGORIES=${inline(categories)},KEY='fmd-megadeth-nombres-categorias-v1',PAGE=48;let limit=PAGE;const state=load(),grid=document.getElementById('grid'),search=document.getElementById('search'),category=document.getElementById('category'),review=document.getElementById('review');function load(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return {}}}function save(){localStorage.setItem(KEY,JSON.stringify(state));stats()}function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}function decision(id){return state[id]||{name:'',category:'',note:''}}function changed(id){const d=decision(id);return !!(d.name.trim()||d.category||d.note.trim())}function options(selected){return '<option value="">Sin cambio</option>'+CATEGORIES.map(v=>'<option '+(selected===v?'selected ':'')+'value="'+esc(v)+'">'+esc(v)+'</option>').join('')}[...new Set(DESIGNS.map(x=>x.currentCategory))].sort((a,b)=>a.localeCompare(b,'es')).forEach(v=>category.insertAdjacentHTML('beforeend','<option value="'+esc(v)+'">'+esc(v)+'</option>'));function match(x){const q=norm(search.value);if(q&&!norm([x.name,x.designId,x.currentCategory,...x.albums,...x.sourceCategories].join(' ')).includes(q))return false;if(category.value&&x.currentCategory!==category.value)return false;if(review.value==='suspicious'&&!x.suspiciousName)return false;if(review.value==='reimagined'&&!x.inReimagined)return false;if(review.value==='changed'&&!changed(x.designId))return false;return true}function card(x){const d=decision(x.designId);return '<article class="card '+(x.suspiciousName?'suspicious ':'')+(changed(x.designId)?'changed':'')+'" data-id="'+esc(x.designId)+'"><button class="media"><img src="'+esc(x.image)+'" alt="'+esc(x.name)+'" loading="lazy">'+(x.suspiciousName?'<span class="flag">REVISAR NOMBRE</span>':'')+(x.inReimagined?'<span class="flag re">REIMAGINADOS</span>':'')+'</button><div class="copy"><div class="id">'+esc(x.designId)+'</div><h2>'+esc(x.name)+'</h2><div class="meta"><strong>Categoría actual:</strong> '+esc(x.currentCategory)+'<br><strong>Álbum:</strong> '+esc(x.albums.join(' · ')||'Sin álbum')+'<br><strong>Origen:</strong> '+esc(x.sourceIds.join(', '))+'</div><label class="field">Nuevo nombre público<input data-name value="'+esc(d.name)+'" placeholder="Dejar vacío para conservar"></label><label class="field">Nueva categoría<select data-category>'+options(d.category)+'</select></label><label class="field">Nota opcional<textarea data-note placeholder="Aclaración para aplicar el cambio">'+esc(d.note)+'</textarea></label></div></article>'}function render(){const all=DESIGNS.filter(match),visible=all.slice(0,limit);grid.innerHTML=visible.length?visible.map(card).join(''):'<div class="empty">No hay diseños con estos filtros.</div>';document.getElementById('loadWrap').hidden=visible.length>=all.length;document.getElementById('more').textContent='VER MÁS DISEÑOS ('+visible.length+' DE '+all.length+')';bind();stats(all.length)}function bind(){document.querySelectorAll('.card').forEach(el=>{const id=el.dataset.id,x=DESIGNS.find(v=>v.designId===id);el.querySelector('[data-name]').addEventListener('input',e=>{state[id]={...decision(id),name:e.target.value};save();el.classList.toggle('changed',changed(id))});el.querySelector('[data-category]').addEventListener('change',e=>{state[id]={...decision(id),category:e.target.value};save();el.classList.toggle('changed',changed(id));if(review.value==='changed')render()});el.querySelector('[data-note]').addEventListener('input',e=>{state[id]={...decision(id),note:e.target.value};save();el.classList.toggle('changed',changed(id))});el.querySelector('.media').addEventListener('click',()=>open(x))})}function output(){return DESIGNS.filter(x=>changed(x.designId)).map(x=>({design_id:x.designId,nombre_actual:x.name,nombre_publico_nuevo:decision(x.designId).name.trim(),categoria_actual:x.currentCategory,categoria_curada_nueva:decision(x.designId).category,nota:decision(x.designId).note.trim(),imagen_principal:x.image.startsWith('../')?x.image.slice(3):x.image,ids_origen:x.sourceIds}))}function stats(count){document.getElementById('stats').textContent=output().length+' cambios · '+(Number.isInteger(count)?count:DESIGNS.filter(match).length)+' visibles · '+DESIGNS.length+' diseños'}function download(name,text,type){const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),500)}document.getElementById('json').onclick=()=>download('megadeth-nombres-categorias-fmd.json',JSON.stringify({generatedAt:new Date().toISOString(),count:output().length,changes:output()},null,2),'application/json');document.getElementById('csv').onclick=()=>{const rows=output(),heads=['design_id','nombre_actual','nombre_publico_nuevo','categoria_actual','categoria_curada_nueva','nota','imagen_principal','ids_origen'],q=v=>'"'+String(Array.isArray(v)?v.join(' | '):v??'').replace(/"/g,'""')+'"',nl=String.fromCharCode(13,10);download('megadeth-nombres-categorias-fmd.csv',String.fromCharCode(65279)+[heads,...rows.map(r=>heads.map(k=>r[k]))].map(r=>r.map(q).join(',')).join(nl),'text/csv;charset=utf-8')};document.getElementById('clear').onclick=()=>{search.value='';category.value='';review.value='';limit=PAGE;render()};document.getElementById('reset').onclick=()=>{if(!confirm('¿Borrar todos los cambios guardados?'))return;Object.keys(state).forEach(k=>delete state[k]);save();render()};document.getElementById('more').onclick=()=>{limit+=PAGE;render()};[search,category,review].forEach(el=>el.addEventListener(el===search?'input':'change',()=>{limit=PAGE;render()}));const lightbox=document.getElementById('lightbox');function open(x){lightbox.querySelector('img').src=x.image;lightbox.querySelector('img').alt=x.name;lightbox.classList.add('open')}function close(){lightbox.classList.remove('open');lightbox.querySelector('img').src=''}lightbox.querySelector('button').onclick=close;lightbox.onclick=e=>{if(e.target===lightbox)close()};document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});render();
</script></body></html>`;

const inlineScript = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0]?.[1] || '';
new vm.Script(inlineScript, { filename: 'megadeth-nombres-categorias-inline.js' });
fs.writeFileSync(OUTPUT_PATH, html, 'utf8');
console.log(`Galería generada: ${path.relative(ROOT, OUTPUT_PATH)} (${galleryData.length} diseños; ${galleryData.filter(item => item.inReimagined).length} en Reimaginados FMD; ${galleryData.filter(item => item.suspiciousName).length} nombres marcados)`);
