// === CONFIGURACIÓN DE PRECIOS ===
const PRECIOS = {
    simple: 37000,
    doble: 42000,
    simple_personalizado: 40000,
    doble_personalizado: 45000
};
const PRECIOS_ENVIO = {
    una_unidad: 5000,
    dos_plus: 0,
    tres_plus: { descuento: 0.10, envio: 0 }
};
const FECHA_VIGENCIA = "Enero 2026";
const WHATSAPP = "541169667685";

let db = [];

function renderLatestReleases(limit = 6) {
    try {
        const latestGrid = document.getElementById('latestGrid');
        if (!latestGrid || !Array.isArray(db) || !db.length) return;
        const latest = db.slice().sort((a,b)=> (b.id||0) - (a.id||0)).slice(0, limit);
        latestGrid.innerHTML = latest.map(p => {
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
    } catch(e) { console.warn('renderLatestReleases error', e); }
}

// Cargar productos desde JSON
async function loadProducts() {
    try {
        const response = await fetch('data/products.json');
        if (!response.ok) throw new Error('Error cargando productos');
        db = await response.json();
        updateCountsUI();
        renderLatestReleases(6);
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
    // Rastrear evento en Google Analytics
    if (typeof gtag !== 'undefined') {
        gtag('event', 'whatsapp_click', {
            'event_category': 'engagement',
            'event_label': `Pack: ${packName}`,
            'value': packPrice || 0
        });
    }
    
    // Blindaje anti-NaN: ignorar precio vacío o inválido
    let msg = `Hola FMD, quiero información sobre el pack ${packName}`;
    
    // Si hay detalles del pack, incluirlos en el mensaje
    if (packIncludes && packIncludes.trim()) {
        msg += `\n${packIncludes}`;
    }
    
    window.location.href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;
}

const BASE_URL = window.location.origin + window.location.pathname;
const DORSO_CATEGORIES = new Set(['Album','Tour','Musician','Metallica','Pantera','Iron Maiden','Avenged Sevenfold']);

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
    // Agregar rastreo de GA al hacer clic
    if(btn.onclick === null) {
        btn.onclick = function() {
            if (typeof gtag !== 'undefined') {
                gtag('event', 'whatsapp_click', {
                    'event_category': 'engagement',
                    'event_label': currentProduct ? `Producto Doble: ${currentProduct.name}` : 'Producto Doble',
                    'product_type': 'doble_estampa'
                });
            }
        };
    }
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
    
    // Añadir click listeners a los dots para que sean navegables
    if (images.length > 1) {
        document.querySelectorAll('.carousel-dot').forEach(dot => {
            dot.addEventListener('click', function() {
                const index = parseInt(this.dataset.index);
                goToSlide(index, true); // smooth = true para clicks en dots
            });
        });
    }

    carousel.scrollLeft = 0;
    selectedDorsoChips.clear();
    selectedBacks.clear();
    document.querySelectorAll('#chipsRow .chip').forEach(c => c.classList.remove('active'));
    const dorsoInput = document.getElementById('dorsoCustomInput');
    if(dorsoInput) dorsoInput.value = '';
    updateModalInfo();
    // Mostrar/ocultar flechas según cantidad de imágenes
    try {
        const prevBtn = document.getElementById('carouselPrev');
        const nextBtn = document.getElementById('carouselNext');
        if (images.length > 1) {
            if(prevBtn) prevBtn.style.display = '';
            if(nextBtn) nextBtn.style.display = '';
        } else {
            if(prevBtn) prevBtn.style.display = 'none';
            if(nextBtn) nextBtn.style.display = 'none';
        }
    } catch (e) { /* no bloquear si falla */ }

    modal.classList.add('active');
    // Adjuntar listeners del carrusel una vez el modal está listo
    attachCarouselListeners();
    // No forzar scroll aquí - dejar que attachCarouselListeners lo maneje
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
    // Remover listeners del carrusel para evitar fugas de memoria
    carousel.removeEventListener('scroll', onCarouselScroll);
    carousel.removeEventListener('click', onCarouselClick);
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

// Event listeners para carousel - se agregan en openModal() después de cargar imágenes
function attachCarouselListeners() {
    // Remover listeners previos si existen
    carousel.removeEventListener('scroll', onCarouselScroll);
    carousel.removeEventListener('click', onCarouselClick);
    
    // Agregar listeners frescos
    carousel.addEventListener('scroll', onCarouselScroll, { passive: true });
    carousel.addEventListener('click', onCarouselClick);
    
    // Forzar scroll a 0 y actualizar state
    carousel.scrollLeft = 0;
}

function onCarouselScroll() {
    if (isScrolling) return;
    
    const slideWidth = carousel.offsetWidth;
    if (slideWidth <= 0) return;
    
    const scrollLeft = carousel.scrollLeft;
    // Calcular qué slide está más visible
    const newSlide = Math.round(scrollLeft / slideWidth);
    const images = getImages(currentProduct);
    const maxSlide = Math.max(0, images.length - 1);
    
    if (newSlide !== currentSlide && newSlide >= 0 && newSlide <= maxSlide) {
        currentSlide = newSlide;
        updateModalInfo();
    }
}

function onCarouselClick(e) {
    if (isScrolling) return;
    const img = e.target.closest('img');
    if (img) openZoom(img.src);
}

function goToSlide(index, smooth = true) {
    const images = getImages(currentProduct);
    if (!images.length) return;
    
    // Asegurar que el índice está dentro del rango válido
    const validIndex = Math.max(0, Math.min(index, images.length - 1));
    currentSlide = validIndex;
    
    // Calcular la posición de scroll
    const slideWidth = carousel.offsetWidth;
    const targetScrollLeft = validIndex * slideWidth;
    
    // Usar scroll suave si se especifica (clicks en flechas/dots)
    // Sin suave para swipes (más responsivo)
    if (smooth && carousel.scrollTo) {
        try {
            carousel.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
        } catch (e) {
            carousel.scrollLeft = targetScrollLeft;
        }
    } else {
        carousel.scrollLeft = targetScrollLeft;
    }
    
    // Actualizar UI
    updateModalInfo();
}

document.getElementById('carouselPrev').addEventListener('click', () => {
    goToSlide(currentSlide - 1, true); // smooth = true para clicks
});

document.getElementById('carouselNext').addEventListener('click', () => {
    goToSlide(currentSlide + 1, true); // smooth = true para clicks
});

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
    let filtered = currentCategory ? db.filter(p => p.category === currentCategory) : db.slice();
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
    const btn = e.target.closest('.cat-btn');
    if (btn) {
        document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCategory = btn.dataset.cat;
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

// Evento para las tarjetas de "Destacados"
document.addEventListener('click', (e) => {
    const featuredCard = e.target.closest('.featured-card');
    if (featuredCard) {
        const categoryToTrigger = featuredCard.dataset.trigger;
        if (categoryToTrigger) {
            // Simular click en el botón de navegación correspondiente
            const navBtn = document.querySelector(`[data-cat="${categoryToTrigger}"]`);
            if (navBtn) navBtn.click();
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

// Cálculo de contadores dinámicos
const MEGADETH_CATS = new Set(['Album','Musician','Tour','VicRattlehead','Singles','Dorsales']);

function computeCounts(){
    const byCategory = db.reduce((acc, p) => {
        const c = p.category || 'Otros';
        acc[c] = (acc[c] || 0) + 1;
        return acc;
    }, {});
    const megadethTotal = db.filter(p => MEGADETH_CATS.has(p.category)).length;
    const totalAll = db.length;
    return { byCategory, megadethTotal, totalAll };
}

function updateCountsUI(){
    try{
        if(!Array.isArray(db) || !db.length) return;
        const { byCategory, megadethTotal, totalAll } = computeCounts();

        // Destacados: badges
        const ftMegadethCard = document.querySelector('.featured-card[data-trigger="Album"]');
        if(ftMegadethCard){
            const badge = ftMegadethCard.querySelector('.featured-badge');
            if(badge) badge.textContent = `${megadethTotal} diseños`;
            const title = ftMegadethCard.querySelector('h3');
            if(title) title.textContent = 'Megadeth';
        }
        const ftPantera = document.querySelector('.featured-card[data-trigger="Pantera"] .featured-badge');
        if(ftPantera) ftPantera.textContent = `${byCategory['Pantera']||0} diseños`;
        const ftIron = document.querySelector('.featured-card[data-trigger="Iron Maiden"] .featured-badge');
        if(ftIron) ftIron.textContent = `${byCategory['Iron Maiden']||0} diseños`;
        const ftMetal = document.querySelector('.featured-card[data-trigger="Metallica"] .featured-badge');
        if(ftMetal) ftMetal.textContent = `${byCategory['Metallica']||0} diseños`;

        // Navegación categorías: badges
        const setNavBadge = (cat, val) => {
            const el = document.querySelector(`.cat-btn[data-cat="${cat}"] .badge`);
            if(el) el.textContent = val;
        };
        setNavBadge('Album', byCategory['Album']||0);
        setNavBadge('Pantera', byCategory['Pantera']||0);
        setNavBadge('Iron Maiden', byCategory['Iron Maiden']||0);
        setNavBadge('Metallica', byCategory['Metallica']||0);
        setNavBadge('Personalizados', byCategory['Personalizados']||0);

        // Filtros: textos con cantidad (y corrección de etiqueta de Megadeth)
        const setPill = (filter, label) => {
            const el = document.querySelector(`.filter-pill[data-filter="${filter}"]`);
            if(el) el.textContent = label;
        };
        setPill('all', `Todo (${totalAll})`);
        setPill('Album', `Álbumes Megadeth (${byCategory['Album']||0})`);
        setPill('Pantera', `Pantera (${byCategory['Pantera']||0})`);
        setPill('Iron Maiden', `Iron Maiden (${byCategory['Iron Maiden']||0})`);
        setPill('Metallica', `Metallica (${byCategory['Metallica']||0})`);
        setPill('Musician', `Miembros (${byCategory['Musician']||0})`);
        setPill('Tour', `Tours (${byCategory['Tour']||0})`);
        setPill('VicRattlehead', `Vic (${byCategory['VicRattlehead']||0})`);
        setPill('Personalizados', `Especiales (${byCategory['Personalizados']||0})`);
    } catch(e){ console.warn('updateCountsUI error', e); }
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

// Agregar soporte de teclado para navegación del carousel
window.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('active') || !currentProduct) return;
    const images = getImages(currentProduct);
    if (images.length <= 1) return;
    
    if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToSlide(Math.max(currentSlide - 1, 0));
    } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToSlide(Math.min(currentSlide + 1, images.length - 1));
    }
});

// Swipe handler AISLADO solo para el carrusel (sin interferir con modal scroll)
(function enableCarouselSwipe(){
    if (!carousel) return;
    
    let touchStartX = 0;
    let isSwiping = false;
    
    carousel.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        isSwiping = true;
    }, { passive: true });
    
    carousel.addEventListener('touchend', (e) => {
        if (!isSwiping) return;
        
        const touchEndX = e.changedTouches[0].clientX;
        const diff = touchStartX - touchEndX;
        const threshold = 30; // threshold más sensible para respuesta rápida
        
        if (Math.abs(diff) < threshold) return;
        
        // Swipe derecha → slide anterior
        if (diff < 0) {
            goToSlide(currentSlide - 1, false); // false = sin smooth animation
        }
        // Swipe izquierda → slide siguiente
        else if (diff > 0) {
            goToSlide(currentSlide + 1, false); // false = sin smooth animation
        }
        
        isSwiping = false;
    }, { passive: true });
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

// === FILTROS POR BANDA ===
const filterToggle = document.getElementById('filterToggle');
const filterDropdown = document.getElementById('filterDropdown');

if (filterToggle) {
    filterToggle.addEventListener('click', () => {
        filterDropdown.classList.toggle('active');
    });
}

document.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
        const filterValue = e.target.dataset.filter;
        
        // Actualizar estilos
        document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
        e.target.classList.add('active');
        
        // Actualizar filtro según qué se seleccione
        if (filterValue === 'all') {
            currentCategory = null; // Mostrar todo
        } else {
            // Simular click en el botón de categoría correspondiente
            const navBtn = document.querySelector(`[data-cat="${filterValue}"]`);
            if (navBtn) navBtn.click();
        }
        
        filterProducts();
        
        // Cerrar dropdown después de seleccionar
        filterDropdown.classList.remove('active');
    });
});

// Cerrar dropdown al hacer click fuera
document.addEventListener('click', (e) => {
    if (!e.target.closest('.band-filters')) {
        filterDropdown.classList.remove('active');
    }
});

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
