// === CONFIGURACIÓN DE PRECIOS ===
const PRECIOS = {
    simple: 37000,
    doble: 42000
};
const FECHA_VIGENCIA = "Diciembre 2025";
const WHATSAPP = "541169667685";

let db = [];

// Cargar productos desde JSON
async function loadProducts() {
    try {
        const response = await fetch('data/products.json');
        if (!response.ok) throw new Error('Error cargando productos');
        db = await response.json();
        filterProducts(); // Renderizar después de cargar
    } catch (error) {
        console.error('Error:', error);
        // Fallback para desarrollo local
        db = [];
    }
}

function formatPrecio(tipo) {
    return '$' + PRECIOS[tipo].toLocaleString('es-AR');
}

function openPackWhatsapp(packName, packIncludes, packPrice) {
    // Blindaje anti-NaN: ignorar precio vacío o inválido
    let msg = `Hola FMD, quiero información sobre el pack ${packName}`;
    
    // Si hay detalles del pack, incluirlos en el mensaje
    if (packIncludes && packIncludes.trim()) {
        msg += `\n${packIncludes}`;
    }
    
    window.location.href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;
}

const BASE_URL = window.location.origin + window.location.pathname;
const DORSO_CATEGORIES = new Set(['Album','Tour','Musician','VicRattlehead','Personalizados','Dorsales']);

let selectedDorsoChips = new Set();
let selectedBacks = new Set();

function toggleChip(el){
    try{
        const val = el.dataset.val;
        if(!val) return;
        if(selectedDorsoChips.has(val)){
            selectedDorsoChips.delete(val);
            el.classList.remove('active');
        } else {
            selectedDorsoChips.add(val);
            el.classList.add('active');
        }
        updateDobleWaLink();
    }catch(e){console.warn(e)}
}

function buildDobleMessage(){
    const base = currentProduct
        ? `Hola FMD, quiero DOBLE ESTAMPA de: ${currentProduct.name}`
        : `Hola FMD, quiero DOBLE ESTAMPA`;

    const images = currentProduct ? getImages(currentProduct) : [];
    const variant = images?.[currentSlide]?.name ? `\nVariante: ${images[currentSlide].name}` : '';

    const chips = selectedDorsoChips.size
        ? `\nDorso (ideas): ${Array.from(selectedDorsoChips).join(' + ')}`
        : '';

    const backs = selectedBacks.size
        ? `\nEjemplos elegidos: ${Array.from(selectedBacks).join(' | ')}`
        : '';

    const input = (document.getElementById('dorsoCustomInput')?.value || '').trim();
    const custom = input ? `\nDetalle personalizado: ${input}` : '';

    return `${base}${variant}${chips}${backs}${custom}\n\nTalle: ___  Color: ___  Ciudad: ___`;
}

function updateDobleWaLink(){
    const btn = document.getElementById('btnDobleAction');
    if(!btn) return;
    const text = buildDobleMessage();
    btn.href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;
}

function renderBackExamples(){
    const row = document.getElementById('backsRow');
    if(!row) return;
    const list = (currentProduct && currentProduct.backs && currentProduct.backs.length) ? currentProduct.backs : [];
    if(!list || !list.length){ row.innerHTML = ''; return; }
    row.innerHTML = list.slice(0,6).map((p, i)=>{
        const src = p.img || p;
        let name = p.name || src.split('/').pop();
        name = name.replace(/[-_]/g,' ').replace(/\.jpg|\.png/i,'');
        return `<img src="${src}" class="thumb-dorso" data-name="${name}" data-src="${src}" alt="dorso-${i}">`;
    }).join('');
    row.querySelectorAll('.thumb-dorso').forEach(el=>{
        el.onclick = function(){
            const name = this.dataset.name || this.dataset.src;
            if(selectedBacks.has(name)){
                selectedBacks.delete(name);
                this.classList.remove('selected');
            } else {
                selectedBacks.add(name);
                this.classList.add('selected');
            }
            updateDobleWaLink();
        };
    });
}

// === ELEMENTOS DOM ===
const productsGrid = document.getElementById('productsGrid');
const categoryNav = document.getElementById('categoryNav');
const modal = document.getElementById('modal');
const carousel = document.getElementById('carousel');
const carouselDots = document.getElementById('carouselDots');
const searchInput = document.getElementById('searchInput');
const searchClear = document.getElementById('searchClear');
const zoomOverlay = document.getElementById('zoomOverlay');
const zoomImg = document.getElementById('zoomImg');
const viewGridBtn = document.getElementById('viewGrid');
const viewGalleryBtn = document.getElementById('viewGallery');

let currentProduct = null;
let currentSlide = 0;
let scrollPosition = 0;
let isScrolling = false;
let scrollTimeout;
let currentView = 'grid';
let currentCategory = 'Album';
let currentSearch = '';

function setView(view) {
    currentView = view;
    if (view === 'gallery') {
        productsGrid.classList.add('gallery-view');
        viewGalleryBtn.classList.add('active');
        viewGridBtn.classList.remove('active');
    } else {
        productsGrid.classList.remove('gallery-view');
        viewGridBtn.classList.add('active');
        viewGalleryBtn.classList.remove('active');
    }
}

viewGridBtn.addEventListener('click', function() {
    setView('grid');
});
viewGalleryBtn.addEventListener('click', function() {
    setView('gallery');
});

function getImages(p) {
    return (p.variants && p.variants.length > 0) ? p.variants : [{ img: p.img, name: '' }];
}

function openModal(id) {
    currentProduct = db.find(p => p.id === id);
    if (!currentProduct) return;

    scrollPosition = window.pageYOffset;
    document.body.classList.add('modal-open');
    document.body.style.top = `-${scrollPosition}px`;

    history.pushState({ modal: true, id }, '', `#producto-${id}`);
    currentSlide = 0;
    const images = getImages(currentProduct);

    carousel.innerHTML = images.map(v => `
        <div class="carousel-slide"><img src="${v.img}" alt="${currentProduct.name}"></div>
    `).join('');

    carouselDots.innerHTML = images.length > 1 ? images.map((_, i) => `<div class="carousel-dot${i === 0 ? ' active' : ''}" data-index="${i}"></div>`).join('') : '';

    carousel.scrollLeft = 0;
    selectedDorsoChips.clear();
    selectedBacks.clear();
    document.querySelectorAll('#chipsRow .chip').forEach(c => c.classList.remove('active'));
    const dorsoInput = document.getElementById('dorsoCustomInput');
    if(dorsoInput) dorsoInput.value = '';
    updateModalInfo();
    modal.classList.add('active');
    try { showScrollHintIfNeeded(); } catch (e) { }
}

function showScrollHintIfNeeded(){
    const modalBody = modal.querySelector('.modal-body');
    if(!modalBody) return;
    if(modalBody.scrollHeight <= modalBody.clientHeight) return;
    if(document.querySelector('.scroll-hint')) return;

    const hint = document.createElement('div');
    hint.className = 'scroll-hint';
    hint.setAttribute('aria-hidden','true');
    hint.textContent = 'Deslizar ↓';
    document.body.appendChild(hint);

    const removeHint = () => {
        if(!hint) return;
        hint.classList.add('hide');
        setTimeout(() => { if(hint.parentNode) hint.parentNode.removeChild(hint); }, 220);
    };

    modalBody.addEventListener('scroll', removeHint, { passive: true, once: true });
}

function closeModal() {
    if (!modal.classList.contains('active')) return;
    modal.classList.remove('active');
    try { const existing = document.querySelector('.scroll-hint'); if(existing) existing.remove(); } catch(e){}
    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('top');
    window.scrollTo(0, scrollPosition);
    closeZoom();
}

function openZoom(src) {
    zoomImg.src = src;
    zoomOverlay.style.display = 'flex';
    setTimeout(() => zoomOverlay.classList.add('active'), 10);
}

function closeZoom() {
    zoomOverlay.classList.remove('active');
    setTimeout(() => { zoomOverlay.style.display = 'none'; }, 300);
}

carousel.addEventListener('scroll', () => {
    isScrolling = true;
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => { isScrolling = false; }, 50);
    const newSlide = Math.round(carousel.scrollLeft / carousel.offsetWidth);
    if (newSlide !== currentSlide) {
        currentSlide = newSlide;
        updateModalInfo();
    }
}, { passive: true });

carousel.addEventListener('click', (e) => {
    if (isScrolling) return;
    const img = e.target.closest('img');
    if (img) openZoom(img.src);
});

function goToSlide(index) {
    carousel.scrollTo({ left: index * carousel.offsetWidth, behavior: 'smooth' });
}

document.getElementById('carouselPrev').onclick = () => goToSlide(Math.max(currentSlide - 1, 0));
document.getElementById('carouselNext').onclick = () => {
    const images = getImages(currentProduct);
    goToSlide(Math.min(currentSlide + 1, images.length - 1));
};

function updateModalInfo() {
    if (!currentProduct) return;
    const images = getImages(currentProduct);
    document.getElementById('modalName').textContent = currentProduct.name;
    document.getElementById('modalMeta').textContent = `${currentProduct.year} · ${currentProduct.category}`;
    document.getElementById('modalDesc').textContent = currentProduct.desc || '';
    document.getElementById('modalPrice').textContent = formatPrecio(currentProduct.tipoPrecio || 'simple');
    const pSimple = formatPrecio('simple');
    const pDoble = formatPrecio('doble');
    const elSimple = document.getElementById('modalPrecioSimple');
    const elDoble = document.getElementById('modalPrecioDoble');
    if(elSimple) elSimple.textContent = pSimple;
    if(elDoble) elDoble.textContent = pDoble;
    document.getElementById('modalCounter').textContent = `${currentSlide + 1}/${images.length}`;
    const shouldShowBadge = currentProduct.tipoPrecio === 'doble' || DORSO_CATEGORIES.has(currentProduct.category);
    document.getElementById('badgeDoble').style.display = shouldShowBadge ? 'block' : 'none';
    const vName = images[currentSlide]?.name || '';
    document.getElementById('variantName').textContent = vName;
    document.getElementById('variantName').style.display = vName ? 'block' : 'none';
    const msg = `Hola FMD, quiero más información sobre ${currentProduct.name}`;
    document.getElementById('modalWaBtn').href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;
    renderBackExamples();
    updateDobleWaLink();
    document.querySelectorAll('.carousel-dot').forEach((dot, i) => { dot.classList.toggle('active', i === currentSlide); });
    updateShareLinks();
}

function filterProducts() {
    let filtered = db.filter(p => p.category === currentCategory);
    if (currentSearch) {
        filtered = filtered.filter(p => {
            const name = (p.name || '').toLowerCase();
            const desc = (p.desc || '').toLowerCase();
            return name.includes(currentSearch) || desc.includes(currentSearch);
        });
    }
    renderFilteredProducts(filtered);
}

function renderFilteredProducts(filtered) {
    document.getElementById('productsCount').textContent = `${filtered.length} diseños`;
    productsGrid.innerHTML = filtered.map(p => {
        const hasVariants = p.variants && p.variants.length > 1;
        const showDorsoBadge = DORSO_CATEGORIES.has(p.category);
        const isDorsoIdea = p.category === 'Dorsales';
        return `<div class="product-card" onclick="openModal(${p.id})">
            ${hasVariants ? `<span class="variants-badge">${p.variants.length} diseños <span style='font-size:1.2em;margin-left:6px;'>➔</span></span>` : ''}
            ${showDorsoBadge ? `<span class="dorso-badge">Dorso personalizable</span>` : ''}
            <img src="${p.img}" class="product-img" loading="lazy">
            <div class="product-info">
                <div class="product-name">${p.name}</div>
                <div class="product-meta">${p.year} · ${p.category}</div>
                <div class="product-price-row">
                    ${
                        isDorsoIdea
                        ? `<span class="product-envio" style="color:var(--magic-green);border:1px solid rgba(57,255,20,.25);">Solo doble estampa</span>`
                        : `<span class="product-price">${formatPrecio(p.tipoPrecio || 'simple')}</span><span class="product-envio">Envío gratis llevando 2+</span><div style="font-size:0.62rem;color:var(--text-muted);margin-top:2px;">1 unidad: consultar por envío</div>`
                    }
                </div>
            </div>
        </div>`;
    }).join('');
    setView(currentView);
}

searchInput.addEventListener('input', (e) => {
    currentSearch = e.target.value.toLowerCase();
    searchClear.classList.toggle('visible', currentSearch.length > 0);
    filterProducts();
});

searchClear.onclick = () => { searchInput.value = ''; currentSearch = ''; searchClear.classList.remove('visible'); filterProducts(); };

categoryNav.addEventListener('click', (e) => {
    if (e.target.classList.contains('cat-btn')) {
        document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentCategory = e.target.dataset.cat;
        filterProducts();
        const productsSection = document.querySelector('.products-section');
        const header = document.querySelector('header');
        if (productsSection) {
            const sectionTop = productsSection.getBoundingClientRect().top + window.pageYOffset;
            const headerHeight = header ? header.offsetHeight : 0;
            window.scrollTo({
                top: sectionTop - headerHeight - 9,
                behavior: 'smooth'
            });
        }
    }
});

function getProductUrl(){
    const base = (location.origin === "null" || !location.origin)
        ? location.href.split('#')[0]
        : location.origin + location.pathname;
    return currentProduct ? `${base}#producto-${currentProduct.id}` : base;
}

function copyProductLink() {
    if(!currentProduct) return;
    const url = getProductUrl();
    navigator.clipboard.writeText(url).then(() => {
        const toast = document.getElementById('shareToast');
        toast.textContent = '✓ Link copiado al portapapeles';
        toast.classList.add('visible');
        setTimeout(() => toast.classList.remove('visible'), 2000);
    });
}

function updateShareLinks() {
    if (!currentProduct) return;
    const images = getImages(currentProduct);
    const variant = images?.[currentSlide]?.name ? `\nVariante: ${images[currentSlide].name}` : '';
    const msg = `Mirá este diseño:\n${currentProduct.name}${variant}\n${getProductUrl()}`;
    document.getElementById('btnShareWa').href = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    
    // Actualizar meta tags dinámicamente para compartir el producto
    const productUrl = `https://catalogo.fivemagicsdesigns.com/#producto-${currentProduct.id}`;
    const productImage = images[currentSlide]?.img || currentProduct.img;
    const year = currentProduct.year ? ` (${currentProduct.year})` : '';
    const desc = currentProduct.desc ? currentProduct.desc.substring(0, 100) : 'Diseño exclusivo premium';
    
    document.querySelector('meta[property="og:title"]').setAttribute('content', `${currentProduct.name} - Five Magics Designs`);
    document.querySelector('meta[property="og:description"]').setAttribute('content', `${currentProduct.name}${year} • ${currentProduct.category}\n${desc}...`);
    document.querySelector('meta[property="og:image"]').setAttribute('content', productImage);
    document.querySelector('meta[property="og:url"]').setAttribute('content', productUrl);
    
    document.querySelector('meta[name="twitter:title"]').setAttribute('content', currentProduct.name);
    document.querySelector('meta[name="twitter:description"]').setAttribute('content', `${currentProduct.category}${year}`);
    document.querySelector('meta[name="twitter:image"]').setAttribute('content', productImage);
}

function openImageModal(src, alt) {
    const imgModal = document.getElementById('imageModal');
    document.getElementById('imageModalImg').src = src;
    imgModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeImageModal() {
    document.getElementById('imageModal').classList.remove('active');
    if (!modal.classList.contains('active')) document.body.style.overflow = '';
}

document.getElementById('modalClose').onclick = closeModal;
document.getElementById('zoomClose').onclick = closeZoom;
zoomOverlay.onclick = (e) => { if(e.target.id === 'zoomContainer' || e.target === zoomOverlay) closeZoom(); };
window.addEventListener('popstate', () => { if(modal.classList.contains('active')) closeModal(); });

// Modal drag scroll para móvil
(function enableModalDragScroll(){
    const modalBody = modal.querySelector('.modal-body');
    if(!modal || !modalBody) return;
    let touchStartY = 0;
    let dragging = false;
    let scrollAnim = null;
    let scrollTarget = null;

    modal.addEventListener('touchstart', (e) => {
        const tag = e.target.tagName;
        if(['BUTTON','A','INPUT','SELECT','TEXTAREA','LABEL'].includes(tag)) { dragging = false; return; }
        touchStartY = e.touches[0].clientY;
        dragging = true;
    }, { passive: true });

    function scheduleSmoothScroll(delta){
        if (scrollTarget == null) scrollTarget = modalBody.scrollTop;
        scrollTarget += delta;
        if (!scrollAnim) {
            function step(){
                const current = modalBody.scrollTop;
                const dist = scrollTarget - current;
                const stepAmount = dist * 0.22;
                if (Math.abs(dist) > 0.6){
                    modalBody.scrollTop = current + stepAmount;
                    scrollAnim = requestAnimationFrame(step);
                } else {
                    modalBody.scrollTop = scrollTarget;
                    scrollTarget = null;
                    scrollAnim = null;
                }
            }
            scrollAnim = requestAnimationFrame(step);
        }
    }

    modal.addEventListener('touchmove', (e) => {
        if(!dragging) return;
        const currentY = e.touches[0].clientY;
        const delta = touchStartY - currentY;
        if(Math.abs(delta) > 1){
            touchStartY = currentY;
            e.preventDefault();
            scheduleSmoothScroll(delta);
        }
    }, { passive: false });

    modal.addEventListener('touchend', () => {
        dragging = false;
        if(scrollAnim){ cancelAnimationFrame(scrollAnim); scrollAnim = null; scrollTarget = null; }
    });
})();

// Inicializar comportamiento de pestañas
(function initSizeTabs(){
    document.querySelectorAll('.tab-btn').forEach(btn=>{
        btn.addEventListener('click', function(){
            const tab = this.dataset.tab;
            if(!tab) return;
            document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
            const el = document.getElementById('tab-' + tab);
            if(el) el.classList.add('active');
        });
    });
})();

// Enlazar input personalizado
const dorsoInputLive = document.getElementById('dorsoCustomInput');
if(dorsoInputLive) dorsoInputLive.addEventListener('input', updateDobleWaLink);

// Cargar producto desde URL hash (#producto-123)
function loadProductFromHash() {
    const hash = window.location.hash.replace('#', '');
    if (hash.startsWith('producto-')) {
        const productId = parseInt(hash.split('-')[1]);
        const product = db.find(p => p.id === productId);
        if (product) {
            currentProduct = product;
            currentSlide = 0;
            updateShareLinks();
            openModal(productId);
        }
    }
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    setView('grid');
    // Pequeño delay para asegurar que db está lleno
    setTimeout(loadProductFromHash, 500);
});

// Escuchar cambios en hash (si usuario navega directamente a #producto-123)
window.addEventListener('hashchange', loadProductFromHash);
