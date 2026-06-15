const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const products = JSON.parse(fs.readFileSync(path.join(root, 'data', 'products.json'), 'utf8'));
const plan = JSON.parse(fs.readFileSync(path.join(__dirname, 'megadeth_classification_plan.json'), 'utf8'));
const byId = new Map(products.map(product => [product.id, product]));

const escapeHtml = value => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const sections = ['unclassified', 'albums', 'original-fmd', 'vic-rattlehead', 'dave-mustaine', 'tours', 'members'];

const cards = plan.map(item => {
    const product = byId.get(item.id);
    const images = [...new Set([product?.img, ...(product?.variants || []).map(variant => variant.img)].filter(Boolean))];
    const imageMarkup = images.slice(0, 6).map(image => `
        <img src="../../${escapeHtml(image)}" alt="${escapeHtml(item.name)}">
    `).join('');
    const albumStatus = item.proposed.megadethSection === 'albums'
        ? `<div class="album-review"><strong>Subclasificación pendiente</strong><span>Álbum: ${escapeHtml(item.album || 'A definir')}</span><span>Tipo: tapa / single / diseño asociado</span></div>`
        : '';

    return `
        <article class="card" data-section="${escapeHtml(item.proposed.megadethSection)}" data-review="${item.reviewRequired}">
            <div class="images">${imageMarkup}</div>
            <div class="copy">
                <span class="id">ID ${item.id} · ${escapeHtml(item.legacyCategory)} · ${escapeHtml(item.garments.join(', '))}</span>
                <h2>${escapeHtml(item.name)}</h2>
                <p><strong>Propuesta:</strong> ${escapeHtml(item.proposed.megadethSection)}</p>
                <p><strong>Álbum actual:</strong> ${escapeHtml(item.album || 'Sin definir')}</p>
                <p><strong>Motivo:</strong> ${escapeHtml(item.reason)}</p>
                ${albumStatus}
            </div>
        </article>
    `;
}).join('');

const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Revisión visual Megadeth FMD</title>
<style>
body{margin:0;background:#080808;color:#eee;font:15px Arial,sans-serif}.head{position:sticky;top:0;z-index:3;padding:18px;background:#111;border-bottom:1px solid #333}.head h1{margin:0 0 8px}.filters{display:flex;gap:7px;flex-wrap:wrap}.filters button{padding:8px 10px;background:#1b1b1b;color:#fff;border:1px solid #444;border-radius:7px;cursor:pointer}.filters button:hover{border-color:#39ff14}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:14px;padding:16px}.card{background:#121212;border:1px solid #2b2b2b;border-radius:12px;overflow:hidden}.images{display:flex;gap:5px;overflow-x:auto;padding:8px;background:#050505}.images img{width:145px;height:180px;object-fit:cover;border-radius:7px}.copy{padding:13px}.copy h2{font-size:18px;margin:8px 0}.copy p{margin:6px 0;color:#bbb}.id{font-size:11px;color:#39ff14}.album-review{display:grid;gap:4px;margin-top:10px;padding:9px;border:1px solid #e8432e;border-radius:7px;color:#ffd1ca}.hidden{display:none}@media(max-width:600px){.grid{grid-template-columns:1fr;padding:8px}.images img{width:125px;height:155px}}</style>
</head>
<body>
<div class="head"><h1>Revisión visual Megadeth · 123 cards</h1><p>Usá los botones para ver cada grupo. Las cards de Álbumes muestran qué subclasificación falta definir.</p><div class="filters"><button data-filter="all">Todo</button>${sections.map(section => `<button data-filter="${section}">${section}</button>`).join('')}<button data-filter="review">Solo revisar</button></div></div>
<main class="grid">${cards}</main>
<script>document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{const f=b.dataset.filter;document.querySelectorAll('.card').forEach(c=>c.classList.toggle('hidden',f!=='all'&&(f==='review'?c.dataset.review!=='true':c.dataset.section!==f)))})</script>
</body></html>`;

fs.writeFileSync(path.join(__dirname, 'megadeth_visual_review.html'), html);
console.log('megadeth_visual_review.html generado');
