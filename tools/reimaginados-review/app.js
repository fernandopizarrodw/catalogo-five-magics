async function load() {
  // Prefer image-based listing if available
  let items = [];
  try {
    const r1 = await fetch('reimagined-images.json');
    if (r1.ok) {
      const imgs = await r1.json();
      // normalize to item-like objects
      items = imgs.map(it => ({
        id: null,
        name: it.matches && it.matches[0] ? it.matches[0].name : it.image.split('/').pop(),
        band: it.matches && it.matches[0] ? it.matches[0].name : '',
        collections: it.matches && it.matches[0] ? it.matches[0].collections : [],
        img: it.image,
        desc: ''
      }));
    } else {
      const resp = await fetch('reimagined.json');
      items = await resp.json();
    }
  } catch (e) {
    const resp = await fetch('reimagined.json');
    items = await resp.json();
  }
  const list = document.getElementById('list');
  list.innerHTML = '';
  items.forEach((it, idx) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="thumb"><img src="../../${it.img}" alt="${escapeHtml(it.name)}" onerror="this.style.opacity=0.3"></div>
      <div class="meta">
        <h3>${escapeHtml(it.name)}</h3>
        <p class="band">${escapeHtml(it.band||'')}</p>
        <p class="collections">${escapeHtml((it.collections||[]).join(' | '))}</p>
        <p class="desc">${escapeHtml(it.desc||'').slice(0,200)}</p>
        <label>Resultado:
          <select class="decision">
            <option value="reimagined">Reimaginados FMD</option>
            <option value="dave">Dave Mustaine</option>
            <option value="megadeth-archive">Megadeth Archive</option>
            <option value="other">Otro / Revisar</option>
          </select>
        </label>
        <button class="note">Guardar nota</button>
        <textarea class="note-txt" placeholder="Nota curatorial (opcional)"></textarea>
      </div>
    `;
    // attach data
    card.dataset.index = idx;
    card.dataset.id = it.id;
    list.appendChild(card);
  });
}

function escapeHtml(s){
  return (s||'').replace(/[&<>"']/g,(c)=>({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#39;'
  }[c]));
}

function exportCSV(){
  const rows = [];
  document.querySelectorAll('.card').forEach(card=>{
    const id = card.dataset.id;
    const name = card.querySelector('h3').innerText;
    const decision = card.querySelector('.decision').value;
    const note = card.querySelector('.note-txt').value.replace(/\n/g,' ');
    rows.push([id, '"'+name.replace(/"/g,'""')+'"', decision, '"'+note.replace(/"/g,'""')+'"'].join(','));
  });
  const csv = ['id,name,decision,note'].concat(rows).join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'reimagined-decisions.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function attachHandlers(){
  document.getElementById('export').addEventListener('click', exportCSV);
  document.getElementById('reload').addEventListener('click', ()=>{
    alert('Para regenerar la lista, ejecuta el script en local: scripts/generate-reimagined-json.py');
  });
}

window.addEventListener('DOMContentLoaded', ()=>{ load().then(()=>attachHandlers()); });
