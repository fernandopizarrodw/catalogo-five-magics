'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CONTROL_PATH = path.join(ROOT, 'reports', 'catalog_design_control_2026-07-11.json');
const OUTPUT_HTML = path.join(ROOT, 'reports', 'catalog_design_visual_review_2026-07-12.html');
const OUTPUT_CSV = path.join(ROOT, 'reports', 'catalog_design_review_2026-07-12.csv');
const OUTPUT_MD = path.join(ROOT, 'reports', 'catalog_design_review_summary_2026-07-12.md');

const control = JSON.parse(fs.readFileSync(CONTROL_PATH, 'utf8'));

const CASE_LABELS = Object.fromEntries(control.cases.map(item => [item.key, item.label]));
const MANUAL_RESOLUTIONS = {
    'megadeth-lineup-v2': 'Dorso 4:10 asociado manualmente a Lineup V2 porque está fuera de orden en products.json.'
};

const SPECIAL_REVIEW_NOTES = {
    'megadeth-rust-in-peace': 'Confirmar que Frente y V2 Dorso sean compatibles. El hoodie 5062 quedó como preview del mismo diseño.',
    'megadeth-lineup': 'Confirmar que Lineup Dorso corresponda únicamente a este frente.',
    'megadeth-lineup-v2': 'Confirmar visualmente la asociación manual con Lineup Dorso NG.',
    'megadeth-alternate': 'Confirmar que Alternate Dorso corresponda únicamente a Alternate.',
    'megadeth-3d': 'Confirmar que el dorso 3D corresponda únicamente al frente 3D.',
    'metallica-ride-clasico': 'Confirmar que Dorso corresponde a Ride Clásico.',
    'metallica-ride-mas-oscuro': 'Confirmar que Dorso Oscuro corresponde a Ride Más Oscuro.',
    'iron-maiden-eddie-gaucho-argentino': 'Debe quedar una sola entrada con previews de remera, hoodie y buzo.',
    'king-diamond-abigail': 'El nombre público debe ser Abigail; no debe aparecer “diseños sugeridos”.',
    'personalizados-diego-maradona': 'Confirmar código estable DM-5121 y recargo personalizado al conectar el modal.'
};

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function relativeImage(imagePath) {
    return imagePath ? `../${String(imagePath).replace(/\\/g, '/')}` : '';
}

function sourceKey(ref) {
    return `${ref.productId}:${ref.variantIndex}`;
}

function uniqueRefs(refs) {
    const seen = new Set();
    return refs.filter(ref => {
        const key = sourceKey(ref);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function getAllFronts(design) {
    return uniqueRefs(Object.values(design.previewsByGarment).flat());
}

function getFlags(design) {
    const fronts = getAllFronts(design);
    const previewGarments = Object.entries(design.previewsByGarment)
        .filter(([, previews]) => previews.length)
        .map(([garment]) => garment);
    const missingPreviewGarments = design.availableGarments.filter(garment => !previewGarments.includes(garment));
    const flags = [];
    if (fronts.length > 1) flags.push('MÁS DE UN FRENTE AGRUPADO');
    if (design.backOptions.length > 1) flags.push('MÁS DE UN DORSO');
    if (previewGarments.length > 1) flags.push('MISMA IDEA EN VARIAS PRENDAS');
    if (missingPreviewGarments.length) flags.push('PRENDA SIN MOCK');
    if (design.identitySource === 'transition-name') flags.push('AGRUPADO POR NOMBRE');
    if (MANUAL_RESOLUTIONS[design.designId]) flags.push('RESOLUCIÓN MANUAL');
    if (/^(v\d+|rhapsody|3d)$/i.test(design.publicName)) flags.push('NOMBRE A REVISAR');
    return flags;
}

function getReviewPriority(design) {
    const flags = getFlags(design);
    if (flags.includes('RESOLUCIÓN MANUAL') || flags.includes('MÁS DE UN DORSO')) return 'high';
    if (flags.includes('MÁS DE UN FRENTE AGRUPADO') || flags.includes('NOMBRE A REVISAR')) return 'medium';
    return 'normal';
}

function renderImage(ref, title) {
    if (!ref) return '<p class="empty">Sin imagen</p>';
    return `<figure class="visual-ref">
        <img src="${escapeHtml(relativeImage(ref.image))}" alt="${escapeHtml(title)}" loading="lazy">
        <figcaption>
            <strong>${escapeHtml(ref.label)}</strong>
            <span>${escapeHtml(ref.garment)} · origen ${ref.productId}:${ref.variantIndex}</span>
        </figcaption>
    </figure>`;
}

function renderPreviewGroup(design, garment, label) {
    const previews = design.previewsByGarment[garment] || [];
    return `<section class="preview-group">
        <h4>${label} <span>${previews.length} mock${previews.length === 1 ? '' : 's'}</span></h4>
        ${previews.length
            ? `<div class="visual-grid">${previews.map(ref => renderImage(ref, `${design.publicName} - ${label}`)).join('')}</div>`
            : '<p class="empty">Sin mock. La prenda sigue disponible para comprar.</p>'}
    </section>`;
}

function renderDesign(design) {
    const fronts = getAllFronts(design);
    const otherFronts = fronts.filter(ref => sourceKey(ref) !== sourceKey(design.front));
    const flags = getFlags(design);
    const note = SPECIAL_REVIEW_NOTES[design.designId] || MANUAL_RESOLUTIONS[design.designId] || '';
    const caseLabels = design.auditCases.map(key => CASE_LABELS[key] || key);
    const searchText = [design.designId, design.publicName, design.band, ...caseLabels, ...flags].join(' ').toLowerCase();

    return `<article class="design-card priority-${getReviewPriority(design)}" data-design-id="${escapeHtml(design.designId)}" data-cases="${escapeHtml(design.auditCases.join(' '))}" data-search="${escapeHtml(searchText)}">
        <header class="design-head">
            <div>
                <p class="band">${escapeHtml(design.band)}</p>
                <h2>${escapeHtml(design.publicName)}</h2>
                <code>${escapeHtml(design.designId)}</code>
            </div>
            <div class="code-box"><span>Código base</span><strong>${escapeHtml(design.orderCodeBase)}</strong></div>
        </header>

        <div class="flags">${flags.map(flag => `<span>${escapeHtml(flag)}</span>`).join('')}</div>
        ${note ? `<p class="review-note"><strong>Control especial:</strong> ${escapeHtml(note)}</p>` : ''}

        <section class="main-visual">
            <h3>Frente principal</h3>
            ${renderImage(design.front, `${design.publicName} - frente principal`)}
        </section>

        <section>
            <h3>Otros frentes agrupados <span>${otherFronts.length}</span></h3>
            ${otherFronts.length
                ? `<div class="visual-grid">${otherFronts.map(ref => renderImage(ref, `${design.publicName} - frente agrupado`)).join('')}</div>`
                : '<p class="empty">No hay otros frentes agrupados.</p>'}
        </section>

        <section>
            <h3>Dorsos asociados <span>${design.backOptions.length}</span></h3>
            ${design.backOptions.length
                ? `<div class="visual-grid">${design.backOptions.map(ref => renderImage(ref, `${design.publicName} - dorso`)).join('')}</div>`
                : '<p class="empty">Sin dorso específico. Puede definirse por WhatsApp.</p>'}
        </section>

        <section>
            <h3>Prendas disponibles para comprar</h3>
            <div class="garments">${design.availableGarments.map(garment => `<span>${escapeHtml(garment)}</span>`).join('')}</div>
        </section>

        <div class="preview-columns">
            ${renderPreviewGroup(design, 'remera', 'Remera')}
            ${renderPreviewGroup(design, 'hoodie', 'Hoodie')}
            ${renderPreviewGroup(design, 'buzo_cuello_redondo', 'Buzo cuello redondo')}
        </div>

        <dl class="origin-data">
            <div><dt>Productos de origen</dt><dd>${design.sourceProductIds.join(', ')}</dd></div>
            <div><dt>Familias actuales</dt><dd>${escapeHtml(design.designFamilyIds.join(', ') || 'Sin designFamilyId')}</dd></div>
            <div><dt>Método de identidad</dt><dd>${escapeHtml(design.identitySource)}</dd></div>
            <div><dt>Casos auditados</dt><dd>${escapeHtml(caseLabels.join(' · '))}</dd></div>
        </dl>

        <div class="review-controls">
            <label>Decisión
                <select data-review-decision>
                    <option value="pending">Pendiente</option>
                    <option value="confirmed">Confirmar agrupación</option>
                    <option value="split">Separar frentes</option>
                    <option value="back">Corregir dorso</option>
                    <option value="name">Corregir nombre</option>
                </select>
            </label>
            <label>Nota de revisión
                <textarea data-review-note rows="2" placeholder="Escribí la corrección o confirmación"></textarea>
            </label>
        </div>
    </article>`;
}

function renderHtml() {
    const caseOptions = control.cases.map(item => `<option value="${escapeHtml(item.key)}">${escapeHtml(item.label)}</option>`).join('');
    const designCards = control.designs.map(renderDesign).join('\n');
    const embeddedData = JSON.stringify(control).replace(/<\//g, '<\\/');

    return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Revisión visual CatalogDesign FMD</title>
<style>
:root{color-scheme:dark;--bg:#090909;--panel:#121212;--line:#303030;--text:#f5f5f5;--muted:#aaa;--green:#39ff14;--orange:#ffb22e;--red:#ff4938}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-family:Arial,sans-serif}button,select,textarea,input{font:inherit}.page-head{padding:24px;max-width:1500px;margin:auto}.page-head h1{margin:0 0 8px;font-size:clamp(1.6rem,4vw,3rem)}.page-head p{color:var(--muted);max-width:900px;line-height:1.5}.summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:18px}.summary div{background:#151515;border:1px solid var(--line);border-radius:10px;padding:14px}.summary strong{display:block;font-size:1.5rem;color:var(--green)}.toolbar{position:sticky;top:0;z-index:20;background:rgba(9,9,9,.96);border-block:1px solid var(--line);padding:12px 24px;display:grid;grid-template-columns:2fr 1fr auto auto;gap:10px}.toolbar input,.toolbar select,.toolbar button{min-height:42px;border:1px solid #444;border-radius:8px;background:#151515;color:#fff;padding:8px 12px}.toolbar button{cursor:pointer;font-weight:800}.toolbar .primary{background:var(--red);border-color:var(--red)}.board{max-width:1500px;margin:auto;padding:20px;display:grid;gap:18px}.design-card{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:18px;min-width:0}.design-card.priority-high{border-color:var(--red)}.design-card.priority-medium{border-color:var(--orange)}.design-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.design-head h2{margin:3px 0 7px;font-size:1.55rem}.band{margin:0;color:var(--green);font-weight:900;text-transform:uppercase}.design-head code{color:#bbb}.code-box{text-align:right;background:#080808;border:1px solid #333;border-radius:9px;padding:10px 12px}.code-box span{display:block;color:#888;font-size:.72rem;text-transform:uppercase}.code-box strong{color:var(--orange)}.flags,.garments{display:flex;flex-wrap:wrap;gap:6px;margin:14px 0}.flags span,.garments span{border:1px solid #444;border-radius:999px;padding:5px 8px;font-size:.72rem;font-weight:800}.flags span{color:var(--orange)}.garments span{color:var(--green)}.review-note{background:#23120f;border-left:4px solid var(--red);padding:11px;line-height:1.4}.design-card section{border-top:1px solid #252525;padding-top:12px;margin-top:14px}.design-card h3,.design-card h4{margin:0 0 10px}.design-card h3 span,.design-card h4 span{color:#888;font-size:.8rem}.main-visual .visual-ref{max-width:330px}.visual-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px}.visual-ref{margin:0;background:#080808;border:1px solid #292929;border-radius:9px;overflow:hidden}.visual-ref img{width:100%;aspect-ratio:1/1;object-fit:cover;display:block;background:#050505}.visual-ref figcaption{padding:8px}.visual-ref figcaption strong,.visual-ref figcaption span{display:block}.visual-ref figcaption strong{font-size:.8rem}.visual-ref figcaption span{color:#888;font-size:.7rem;margin-top:3px}.empty{color:#777;font-style:italic}.preview-columns{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.preview-group{min-width:0}.origin-data{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:14px 0}.origin-data div{background:#0b0b0b;border-radius:8px;padding:9px}.origin-data dt{color:#888;font-size:.7rem;text-transform:uppercase}.origin-data dd{margin:4px 0 0;overflow-wrap:anywhere}.review-controls{display:grid;grid-template-columns:1fr 2fr;gap:10px;border-top:1px solid #333;padding-top:14px}.review-controls label{display:grid;gap:6px;color:#bbb;font-size:.8rem}.review-controls select,.review-controls textarea{width:100%;background:#080808;color:#fff;border:1px solid #444;border-radius:8px;padding:9px}.is-hidden{display:none!important}
@media(max-width:800px){.summary{grid-template-columns:repeat(2,1fr)}.toolbar{grid-template-columns:1fr 1fr;padding:10px}.toolbar input{grid-column:1/-1}.board{padding:10px}.design-card{padding:13px}.design-head{display:block}.code-box{text-align:left;margin-top:10px}.preview-columns,.origin-data,.review-controls{grid-template-columns:1fr}.visual-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.main-visual .visual-ref{max-width:none}}
@media(max-width:420px){.visual-grid{grid-template-columns:1fr}.toolbar{grid-template-columns:1fr}.toolbar input{grid-column:auto}}
</style>
</head>
<body>
<header class="page-head">
    <p>FIVE MAGICS DESIGNS · HERRAMIENTA LOCAL</p>
    <h1>Revisión visual CatalogDesign</h1>
    <p>Validación humana de las 55 agrupaciones piloto. Esta página no modifica products.json ni el catálogo público. Las decisiones se guardan en localStorage de este navegador.</p>
    <div class="summary">
        <div><strong>${control.summary.catalogDesigns}</strong> diseños</div>
        <div><strong>${control.summary.sourceFrontMocks}</strong> mocks de frente</div>
        <div><strong>${control.summary.sourceProducts}</strong> productos de origen</div>
        <div><strong>${control.summary.validationErrors}</strong> errores técnicos</div>
    </div>
</header>
<div class="toolbar">
    <input id="search" type="search" placeholder="Buscar designId, banda, nombre o alerta">
    <select id="caseFilter"><option value="">Todos los casos</option>${caseOptions}</select>
    <button id="doubtfulOnly" type="button">SOLO A REVISAR</button>
    <button id="exportReview" type="button" class="primary">EXPORTAR REVISIÓN JSON</button>
</div>
<main class="board" id="board">${designCards}</main>
<script id="catalogDesignData" type="application/json">${embeddedData}</script>
<script>
const STORAGE_KEY='fmd_catalog_design_review_2026_07_12';
const cards=[...document.querySelectorAll('.design-card')];
const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');
let doubtfulOnly=false;
for(const card of cards){const id=card.dataset.designId;const state=saved[id]||{};card.querySelector('[data-review-decision]').value=state.decision||'pending';card.querySelector('[data-review-note]').value=state.note||'';}
function persist(){const state={};for(const card of cards){state[card.dataset.designId]={decision:card.querySelector('[data-review-decision]').value,note:card.querySelector('[data-review-note]').value.trim()};}localStorage.setItem(STORAGE_KEY,JSON.stringify(state));return state;}
document.addEventListener('input',event=>{if(event.target.matches('[data-review-decision],[data-review-note]'))persist();});
function applyFilters(){const query=document.getElementById('search').value.trim().toLowerCase();const auditCase=document.getElementById('caseFilter').value;for(const card of cards){const matchesQuery=!query||card.dataset.search.includes(query);const matchesCase=!auditCase||card.dataset.cases.split(' ').includes(auditCase);const isDoubtful=card.classList.contains('priority-high')||card.classList.contains('priority-medium');card.classList.toggle('is-hidden',!(matchesQuery&&matchesCase&&(!doubtfulOnly||isDoubtful)));}}
document.getElementById('search').addEventListener('input',applyFilters);document.getElementById('caseFilter').addEventListener('change',applyFilters);document.getElementById('doubtfulOnly').addEventListener('click',event=>{doubtfulOnly=!doubtfulOnly;event.currentTarget.textContent=doubtfulOnly?'VER TODOS':'SOLO A REVISAR';applyFilters();});
document.getElementById('exportReview').addEventListener('click',()=>{const data={exportedAt:new Date().toISOString(),storageKey:STORAGE_KEY,review:persist()};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'});const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download='catalog_design_revision_2026-07-12.json';document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);});
</script>
</body>
</html>`;
}

function csvCell(value) {
    const text = String(value ?? '');
    return `"${text.replace(/"/g, '""')}"`;
}

function renderCsv() {
    const headers = [
        'designId', 'banda', 'nombre_publico', 'frente_principal', 'otros_frentes_agrupados',
        'dorsos_asociados', 'prendas_disponibles', 'previews_remera', 'previews_hoodie',
        'previews_buzo', 'productos_indices_origen', 'ids_producto_origen', 'codigo_base',
        'metodo_identidad', 'casos', 'alertas', 'decision', 'nota_revision'
    ];
    const rows = control.designs.map(design => {
        const fronts = getAllFronts(design);
        const others = fronts.filter(ref => sourceKey(ref) !== sourceKey(design.front));
        const origins = uniqueRefs([...fronts, ...design.backOptions]).map(ref => `${ref.productId}:${ref.variantIndex}`).join(' | ');
        return [
            design.designId,
            design.band,
            design.publicName,
            design.front?.image || '',
            others.map(ref => `${ref.image} [${ref.productId}:${ref.variantIndex}]`).join(' | '),
            design.backOptions.map(ref => `${ref.image} [${ref.productId}:${ref.variantIndex}]`).join(' | '),
            design.availableGarments.join(' | '),
            design.previewsByGarment.remera.map(ref => ref.image).join(' | '),
            design.previewsByGarment.hoodie.map(ref => ref.image).join(' | '),
            design.previewsByGarment.buzo_cuello_redondo.map(ref => ref.image).join(' | '),
            origins,
            design.sourceProductIds.join(' | '),
            design.orderCodeBase,
            design.identitySource,
            design.auditCases.join(' | '),
            getFlags(design).join(' | '),
            '',
            ''
        ].map(csvCell).join(',');
    });
    return `\uFEFF${[headers.map(csvCell).join(','), ...rows].join('\r\n')}\r\n`;
}

function renderSummary() {
    const multipleBacks = control.designs.filter(design => design.backOptions.length > 1);
    const multipleFronts = control.designs.filter(design => getAllFronts(design).length > 1);
    const manual = control.designs.filter(design => MANUAL_RESOLUTIONS[design.designId]);
    const nameBased = control.designs.filter(design => design.identitySource === 'transition-name');
    const questionable = control.designs.filter(design => ['high', 'medium'].includes(getReviewPriority(design)));
    const list = designs => designs.length ? designs.map(design => `- ${design.designId}: ${design.publicName}`).join('\n') : '- Ninguno';

    return `# Resumen de revisión visual CatalogDesign

Fecha: 12/07/2026  
Estado: herramienta local, no conectada a producción

## Totales

- CatalogDesign: ${control.designs.length}
- Agrupaciones marcadas para revisión prioritaria: ${questionable.length}
- Diseños con más de un frente agrupado: ${multipleFronts.length}
- Diseños con más de un dorso: ${multipleBacks.length}
- Casos resueltos por similitud de nombre: ${nameBased.length}
- Casos con resolución manual: ${manual.length}

## Agrupaciones dudosas

${list(questionable)}

## Diseños con más de un dorso

${list(multipleBacks)}

## Diseños con más de un frente agrupado

${list(multipleFronts)}

## Casos resueltos por similitud de nombre

Los ${nameBased.length} designId del piloto usan identidad transitoria por nombre. La revisión visual debe confirmar cuáles pueden migrarse a identificadores explícitos.

## Casos resueltos manualmente

${manual.map(design => `- ${design.designId}: ${MANUAL_RESOLUTIONS[design.designId]}`).join('\n') || '- Ninguno'}

## Controles especiales solicitados

- Rust in Peace: cinco frentes separados; revisar dorsos dentro de cada entrada.
- Ride the Lightning: seis frentes separados; Ride Clásico y Ride Más Oscuro conservan dorsos independientes.
- Slayer FMD Originals: 29 mocks agrupados en 15 diseños.
- Eddie Gaucho: una entrada con previews en las tres prendas.
- EPICA: 14 mocks agrupados en 9 diseños.
- Rhapsody: 18 mocks agrupados en 12 diseños.
- HammerFall: cinco mocks y cinco diseños.
- King Diamond: nombre público Abigail.
- Diego Maradona: código base DM-5121.
`;
}

fs.writeFileSync(OUTPUT_HTML, renderHtml(), 'utf8');
fs.writeFileSync(OUTPUT_CSV, renderCsv(), 'utf8');
fs.writeFileSync(OUTPUT_MD, renderSummary(), 'utf8');

console.log(JSON.stringify({
    designs: control.designs.length,
    html: path.relative(ROOT, OUTPUT_HTML),
    csv: path.relative(ROOT, OUTPUT_CSV),
    summary: path.relative(ROOT, OUTPUT_MD),
    multipleFrontGroups: control.designs.filter(design => getAllFronts(design).length > 1).length,
    multipleBackGroups: control.designs.filter(design => design.backOptions.length > 1).length,
    manualResolutions: Object.keys(MANUAL_RESOLUTIONS).length
}, null, 2));
