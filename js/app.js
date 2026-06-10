// === CONFIGURACIÓN DE PRECIOS ===
const PRECIOS = {
    simple: 37000,
    doble: 44000,
    simple_personalizado: 42000,
    doble_personalizado: 49000
};
const PRECIOS_OVERSIZE = {
    simple: 40000,
    doble: 47000,
    simple_personalizado: 45000,
    doble_personalizado: 52000
};
const PRECIOS_CHICOS = {
    simple: 32000,
    doble: 35000
};
const PRECIOS_HOODIES = {
    simple: 52000,
    doble: 59000
};
const PRECIOS_BUZO_REDONDO = {
    simple: 50000,
    doble: 55000,
    simple_personalizado: 55000,
    doble_personalizado: 60000
};
const PERSONALIZADO_EXTRA = 5000;
const COMBO_HOODIE_REMERA = 99000;
const FECHA_VIGENCIA = "Junio 2026";
const WHATSAPP = "541169667685";
const MAIDEN_ARCHIVE_HIGHLIGHT_IDS = [7015, 7027, 7023, 7025, 7026, 7029];
const MAIDEN_ARCHIVE_GROUPS = [
    { title: 'Iron Maiden clasico', meta: 'Archivo original FMD', productIds: [308, 6004, 7011] },
    { title: 'Iron Maiden Fear / 666', meta: 'Diseno agrupado por disco', productIds: [5038, 6005] },
    { title: 'Killers', meta: 'Versiones FMD', productIds: [7023, 6006, 7024, 6007] },
    { title: 'Live After Death', meta: 'Frente + dorso', productIds: [7025, 7012] },
    { title: 'Tour 2026', meta: 'Edicion tour FMD', productIds: [7029, 7013] },
    { title: 'Powerslave', meta: 'Archivo FMD', productIds: [7026, 7030] }
];
const SLAYER_ARCHIVE_HIGHLIGHT_IDS = [7122, 7121, 7120, 7119, 7118, 7117, 7114, 7115, 7116, 7113, 7112, 7106, 7111, 7110, 7107, 7108, 7109, 7101, 7102, 7103, 7104, 7105];
let slayerGarmentPreference = null;

let db = [];
let selectedAge = 'adulto';
let selectedSize = '';
let selectedCut = 'clasica';
let selectedColor = 'negro';
let selectedBackIndex = -1; // Índice del dorso seleccionado para doble estampa (-1 = ninguno)
let fmdSpotlightTimer = null;
let fmdSpotlightPaused = false;
let fmdSpotlightTouchResume = null;

function scrollToSection(sectionId) {
    const target = document.getElementById(sectionId);
    if (!target) return;

    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (window.location.hash !== `#${sectionId}`) {
        history.replaceState(null, '', `#${sectionId}`);
    }
}

function goToMaidenCollection() {
    scrollToSection('categoryNav');
    setTimeout(() => {
        const maidenBtn = document.querySelector('.cat-btn[data-cat="Iron Maiden"]');
        if (maidenBtn) maidenBtn.click();
    }, 180);
}

function goToSlayerCollection() {
    slayerGarmentPreference = null;
    scrollToSection('categoryNav');
    setTimeout(() => {
        const slayerBtn = document.querySelector('.cat-btn[data-cat="Slayer"]');
        if (slayerBtn) slayerBtn.click();
    }, 180);
}

function showSlayerGarment(garment) {
    slayerGarmentPreference = ['remera', 'hoodie', 'buzo'].includes(garment) ? garment : 'remera';
    filterByCategory('Slayer');
}

function getSlayerPreferredGarmentLabel() {
    if (slayerGarmentPreference === 'hoodie') return 'Hoodie';
    if (slayerGarmentPreference === 'buzo') return 'Buzo cuello redondo';
    if (slayerGarmentPreference === 'remera') return 'Remera';
    return '';
}

function getSlayerPreferredVariantIndex(product) {
    if (product?.category !== 'Slayer' || !slayerGarmentPreference) return -1;
    const garmentTerm = slayerGarmentPreference === 'buzo' ? 'buzo' : slayerGarmentPreference;
    return (product.variants || []).findIndex(variant =>
        normalizeText(variant?.name || '').includes(garmentTerm)
    );
}

window.showSlayerGarment = showSlayerGarment;

function maidenArchiveMove(button, direction) {
    const carousel = button?.closest('.maiden-design-carousel');
    const track = carousel?.querySelector('.maiden-design-track');
    if (!track) return;

    const slide = track.querySelector('.maiden-design-slide');
    const step = (slide?.getBoundingClientRect().width || track.clientWidth) + 8;
    track.scrollBy({ left: direction * step, behavior: 'smooth' });
}

function parseOpenModalArgs(onclickValue) {
    if (!onclickValue) return null;
    const match = onclickValue.match(/openModal\(([^)]*)\)/);
    if (!match) return null;

    const args = match[1].match(/^\s*(\d+)\s*(?:,\s*(\d+))?\s*(?:,\s*\[([0-9\s,]+)\])?/);
    if (!args) return null;

    const id = Number(args[1]);
    const variantIndex = args[2] !== undefined ? Number(args[2]) : undefined;
    const scopedVariantIndexes = args[3]
        ? args[3].split(',').map(v => Number(v.trim())).filter(Number.isFinite)
        : undefined;

    return { id, variantIndex, scopedVariantIndexes };
}

function openSpotlightItem(item) {
    if (!item || typeof openModal !== 'function') return;
    openModal(item.id, item.variantIndex, item.scopedVariantIndexes);
}

function initFmdSpotlight() {
    const section = document.getElementById('fmdSpotlight');
    if (!section) return;

    const mediaBtn = document.getElementById('fmdSpotlightMedia');
    const imageEl = document.getElementById('fmdSpotlightImage');
    const titleEl = document.getElementById('fmdSpotlightTitle');
    const descEl = document.getElementById('fmdSpotlightDesc');
    const typeEl = document.getElementById('fmdSpotlightType');
    const counterEl = document.getElementById('fmdSpotlightCounter');
    const ctaEl = document.getElementById('fmdSpotlightCTA');
    if (!mediaBtn || !imageEl || !titleEl || !descEl || !typeEl || !counterEl || !ctaEl) return;

    const items = [];
    const seen = new Set();

    const pushSpotlightItem = (item) => {
        if (!item || !item.img || !Number.isFinite(item.id)) return;
        const variantKey = Number.isFinite(item.variantIndex) ? item.variantIndex : 'base';
        const key = `${item.id}|${variantKey}|${item.img}`;
        if (seen.has(key)) return;
        seen.add(key);
        items.push(item);
    };

    document.querySelectorAll('#fmdEdition3dGrid .fmd3d-group').forEach(group => {
        const groupTitle = group.querySelector('.fmd3d-group-head strong')?.textContent?.trim() || 'FMD Edition';
        const groupType = group.querySelector('.fmd3d-group-head span')?.textContent?.trim() || 'Albumes FMD';

        group.querySelectorAll('.fmd3d-group-slide').forEach(slide => {
            const img = slide.querySelector('img');
            const label = slide.querySelector('span')?.textContent?.trim() || 'Edicion';
            const args = parseOpenModalArgs(slide.getAttribute('onclick'));
            if (!img || !args) return;

            pushSpotlightItem({
                section: 'Albumes FMD',
                title: groupTitle,
                type: groupType,
                label,
                img: img.getAttribute('src') || '',
                alt: img.getAttribute('alt') || groupTitle,
                ...args
            });
        });
    });

    document.querySelectorAll('#fmdOriginalsGrid .fmd-originals-group').forEach(group => {
        const groupTitle = group.querySelector('.fmd-originals-group-head strong')?.textContent?.trim() || 'Original FMD';
        const groupType = group.querySelector('.fmd-originals-group-head span')?.textContent?.trim() || 'Original FMD';
        const media = group.querySelector('.fmd-originals-media');
        const img = media?.querySelector('img');
        const args = parseOpenModalArgs(media?.getAttribute('onclick'));
        if (!img || !args) return;

        pushSpotlightItem({
            section: 'Originales FMD',
            title: groupTitle,
            type: groupType,
            label: 'Original FMD',
            img: img.getAttribute('src') || '',
            alt: img.getAttribute('alt') || groupTitle,
            ...args
        });
    });

    // Soporta auto-alta de nuevos diseños en JOYAS OCULTAS FMD
    // con solo agregarlos al JSON en images/fmd-edition-3d/vic_tour_2026/
    const vicTourPath = 'images/fmd-edition-3d/vic_tour_2026/';
    if (Array.isArray(db) && db.length) {
        db.forEach(product => {
            const productId = Number(product?.id);
            if (!Number.isFinite(productId)) return;

            if (Array.isArray(product?.variants) && product.variants.length) {
                product.variants.forEach((variant, index) => {
                    const variantImg = String(variant?.img || '');
                    if (!variantImg.includes(vicTourPath)) return;

                    const variantName = String(variant?.name || product?.name || 'Original FMD').trim();
                    const year = String(product?.year || '2026').trim();
                    pushSpotlightItem({
                        section: 'Originales FMD',
                        title: `${year} · ${variantName.replace(/\s+FMD(?:\s+Edition)?$/i, '').trim()}`,
                        type: 'Original FMD',
                        label: 'Drop 2026',
                        img: variantImg,
                        alt: `${year} ${variantName}`,
                        id: productId,
                        variantIndex: index,
                        scopedVariantIndexes: [index]
                    });
                });
                return;
            }

            const baseImg = String(product?.img || '');
            if (!baseImg.includes(vicTourPath)) return;

            const baseName = String(product?.name || 'Original FMD').trim();
            const year = String(product?.year || '2026').trim();
            pushSpotlightItem({
                section: 'Originales FMD',
                title: `${year} · ${baseName.replace(/\s+FMD(?:\s+Edition)?$/i, '').trim()}`,
                type: 'Original FMD',
                label: 'Drop 2026',
                img: baseImg,
                alt: `${year} ${baseName}`,
                id: productId,
                variantIndex: undefined,
                scopedVariantIndexes: undefined
            });
        });
    }

    if (!items.length) return;

    let order = [...Array(items.length).keys()].sort(() => Math.random() - 0.5);
    let current = 0;
    let swapTimeout = null;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const applyItem = (item) => {
        imageEl.src = item.img;
        imageEl.alt = item.alt;
        titleEl.textContent = item.title;
        descEl.textContent = `${item.type} · ${item.label}`;
        typeEl.textContent = item.section;
        counterEl.textContent = `${current + 1} / ${items.length}`;
        mediaBtn.onclick = () => openSpotlightItem(item);
        ctaEl.onclick = () => openSpotlightItem(item);
    };

    const render = (animated = false) => {
        const item = items[order[current]];
        if (!item) return;

        if (!animated || reducedMotion) {
            applyItem(item);
            return;
        }

        if (swapTimeout) {
            clearTimeout(swapTimeout);
            swapTimeout = null;
        }

        mediaBtn.classList.add('is-swapping');
        swapTimeout = setTimeout(() => {
            applyItem(item);
            mediaBtn.classList.remove('is-swapping');
            swapTimeout = null;
        }, 140);
    };

    const next = () => {
        current += 1;
        if (current >= order.length) {
            order = [...Array(items.length).keys()].sort(() => Math.random() - 0.5);
            current = 0;
        }
        render(true);
    };

    const stopTimer = () => {
        if (fmdSpotlightTimer) {
            clearInterval(fmdSpotlightTimer);
            fmdSpotlightTimer = null;
        }
    };

    const startTimer = () => {
        stopTimer();
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || items.length < 2) return;
        fmdSpotlightTimer = setInterval(() => {
            if (!fmdSpotlightPaused) next();
        }, 3800);
    };

    if (!section.dataset.spotlightBound) {
        section.dataset.spotlightBound = '1';
        section.addEventListener('mouseenter', () => { fmdSpotlightPaused = true; });
        section.addEventListener('mouseleave', () => { fmdSpotlightPaused = false; });
        section.addEventListener('focusin', () => { fmdSpotlightPaused = true; });
        section.addEventListener('focusout', () => { fmdSpotlightPaused = false; });
        section.addEventListener('touchstart', () => {
            fmdSpotlightPaused = true;
            if (fmdSpotlightTouchResume) clearTimeout(fmdSpotlightTouchResume);
            fmdSpotlightTouchResume = setTimeout(() => { fmdSpotlightPaused = false; }, 4200);
        }, { passive: true });
    }

    render();
    startTimer();
}

function fmd3dSync(group, index) {
    if (!group) return;
    const track = group.querySelector('.fmd3d-group-track');
    if (!track) return;

    const slides = track.querySelectorAll('.fmd3d-group-slide');
    if (!slides.length) return;

    const safeIndex = ((Number(index) || 0) % slides.length + slides.length) % slides.length;
    group.dataset.index = String(safeIndex);
    track.style.transform = `translateX(-${safeIndex * 100}%)`;

    const dots = group.querySelectorAll('.fmd3d-dots button');
    dots.forEach((dot, dotIndex) => dot.classList.toggle('active', dotIndex === safeIndex));
}

function fmd3dMove(button, direction) {
    const group = button.closest('.fmd3d-group');
    if (!group) return;

    const current = Number(group.dataset.index || 0);
    fmd3dSync(group, current + direction);
}

function fmd3dGo(button, targetIndex) {
    const group = button.closest('.fmd3d-group');
    if (!group) return;
    fmd3dSync(group, targetIndex);
}

function initFmd3dMobileAccordion() {
    const groups = document.querySelectorAll('.fmd3d-group');
    if (!groups.length) return;

    const isMobile = window.matchMedia('(max-width: 640px)').matches;

    groups.forEach((group, index) => {
        const head = group.querySelector('.fmd3d-group-head');
        if (!head) return;

        if (!head.dataset.accordionBound) {
            head.dataset.accordionBound = '1';
            head.addEventListener('click', () => {
                if (!window.matchMedia('(max-width: 640px)').matches) return;

                const willOpen = !group.classList.contains('is-open');
                groups.forEach(item => item.classList.remove('is-open'));
                if (willOpen) {
                    group.classList.add('is-open');
                    fmd3dSync(group, Number(group.dataset.index || 0));
                }
            });
        }

        if (isMobile) {
            group.classList.toggle('is-open', index === 0);
        } else {
            group.classList.add('is-open');
        }
    });
}

function initFmdEditionTags() {
    const groups = document.querySelectorAll('.fmd3d-group');
    const forbiddenLabels = new Set(['3D Pop-Out', 'Album Editions']);
    const normalizeTag = (tag) => {
        const clean = (tag || '').trim();
        if (!clean || forbiddenLabels.has(clean)) return '';
        if (clean.toLowerCase() === 'v1 / v2') return '2 versiones';
        if (clean.toLowerCase() === '3d') return 'Edición 3D';
        return clean;
    };

    groups.forEach(group => {
        const head = group.querySelector('.fmd3d-group-head');
        if (!head) return;

        const legacyInfo = head.querySelector('span');
        const legacyTag = legacyInfo ? legacyInfo.textContent.trim() : '';
        const customTags = (group.dataset.tags || '')
            .split(',')
            .map(normalizeTag)
            .filter(Boolean);

        const fallbackTag = normalizeTag(legacyTag) || 'Edición 3D';
        const tags = customTags.length ? customTags : [fallbackTag];
        const uniqueTags = [...new Set(tags)].slice(0, 1);

        const existing = head.querySelector('.fmd3d-card-tags');
        if (existing) existing.remove();

        const tagWrap = document.createElement('div');
        tagWrap.className = 'fmd3d-card-tags';
        tagWrap.setAttribute('aria-label', 'Etiquetas de edición');

        uniqueTags.forEach(tag => {
            const badge = document.createElement('span');
            badge.className = 'fmd3d-card-tag';
            badge.textContent = tag;
            tagWrap.appendChild(badge);
        });

        if (legacyInfo) {
            legacyInfo.style.display = 'none';
        }

        head.appendChild(tagWrap);
    });
}

function initFmdOriginalsAccordion() {
    const groups = document.querySelectorAll('#fmdOriginals .fmd-originals-group');
    if (!groups.length) return;

    const isMobile = window.matchMedia('(max-width: 640px)').matches;

    groups.forEach((group, index) => {
        const head = group.querySelector('.fmd-originals-group-head');
        if (!head) return;

        if (!head.dataset.accordionBound) {
            head.dataset.accordionBound = '1';
            head.addEventListener('click', () => {
                if (!window.matchMedia('(max-width: 640px)').matches) return;

                const willOpen = !group.classList.contains('is-open');
                groups.forEach(item => item.classList.remove('is-open'));
                if (willOpen) group.classList.add('is-open');
            });
        }

        if (isMobile) {
            group.classList.toggle('is-open', index === 0);
        } else {
            group.classList.add('is-open');
        }
    });
}

function initFmd3dCarousels() {
    const groups = document.querySelectorAll('.fmd3d-group');
    groups.forEach(group => {
        const slides = group.querySelectorAll('.fmd3d-group-slide');
        if (slides.length <= 1) {
            group.classList.add('single');
        }
        fmd3dSync(group, 0);
    });

    initFmd3dMobileAccordion();
    initFmdEditionTags();
    initFmdOriginalsAccordion();
    window.addEventListener('resize', initFmd3dMobileAccordion);
    window.addEventListener('resize', initFmdOriginalsAccordion);
}

// === BUSCADOR POR CÓDIGO PARA PEDIDOS ===
// Uso: buscar("peace sells") o buscar("PS-002") o buscar(4) 
// Genera código automático: PREFIJO-ID.Vn
function buscar(query) {
    if (!db.length) {
        console.log('❌ Base de datos no cargada. Esperá a que cargue la página.');
        return;
    }
    
    const q = String(query).toLowerCase().trim();
    let results = [];
    
    // Mapeo de prefijos comunes
    const prefijos = {
        'peace sells': 'PS', 'ps': 'PS',
        'rust in peace': 'RIP', 'rip': 'RIP', 
        'killing': 'KIMB', 'kimb': 'KIMB',
        'so far': 'SFSGSW', 'sfsgsw': 'SFSGSW',
        'countdown': 'CTE', 'cte': 'CTE',
        'youthanasia': 'YT', 'yt': 'YT',
        'cryptic': 'CW', 'cw': 'CW',
        'risk': 'RISK',
        'world needs': 'TWNAH', 'twnah': 'TWNAH',
        'system': 'TSHF', 'tshf': 'TSHF',
        'united': 'UA', 'ua': 'UA',
        'endgame': 'EG', 'eg': 'EG',
        '13': '13', 'thirteen': '13',
        'super collider': 'SC', 'sc': 'SC',
        'dystopia': 'DYS', 'dys': 'DYS',
        'sick': 'TSTDATD', 'tstdatd': 'TSTDATD',
        'vic': 'VIC', 'rattlehead': 'VIC',
        'dave': 'DM', 'mustaine': 'DM',
        'marty': 'MF', 'friedman': 'MF',
        'nick': 'NM', 'menza': 'NM',
        'tour': 'TOUR',
        'pantera': 'PAN', 'pan': 'PAN',
        'iron maiden': 'IM', 'maiden': 'IM', 'im': 'IM',
        'metallica': 'MET', 'met': 'MET',
        'personali': 'CUSTOM'
    };
    
    // Generar prefijo automático basado en nombre
    function getPrefijo(name) {
        const n = name.toLowerCase();
        for (const [key, val] of Object.entries(prefijos)) {
            if (n.includes(key)) return val;
        }
        // Generar prefijo de 3 letras del nombre
        return name.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase();
    }
    
    // Buscar por ID exacto
    const idMatch = q.match(/^(\d+)$/);
    if (idMatch) {
        const id = parseInt(idMatch[1]);
        const product = db.find(p => p.id === id);
        if (product) results.push(product);
    }
    
    // Buscar por código tipo PS-002.V2
    const codeMatch = q.match(/^([a-z]+)-?(\d+)(?:\.v(\d+))?$/i);
    if (codeMatch) {
        const [, prefix, idStr, variantStr] = codeMatch;
        const id = parseInt(idStr);
        const product = db.find(p => p.id === id);
        if (product) {
            results.push(product);
        }
    }
    
    // Buscar por nombre
    if (!results.length) {
        results = db.filter(p => 
            p.name.toLowerCase().includes(q) ||
            (p.desc && p.desc.toLowerCase().includes(q)) ||
            (p.category && p.category.toLowerCase().includes(q))
        );
    }
    
    if (!results.length) {
        console.log(`❌ No encontré nada para "${query}"`);
        return;
    }
    
    // Mostrar resultados con códigos generados
    console.log(`\n🔍 RESULTADOS PARA: "${query}"\n${'='.repeat(50)}`);
    
    results.slice(0, 10).forEach(p => {
        const prefijo = getPrefijo(p.name);
        const codigo = `${prefijo}-${String(p.id).padStart(3, '0')}`;
        
        console.log(`\n📦 ${p.name} (ID: ${p.id})`);
        console.log(`   Categoría: ${p.category} | Precio: ${p.tipoPrecio}`);
        console.log(`   Código base: ${codigo}`);
        
        if (p.variants && p.variants.length) {
            console.log(`   Variantes:`);
            p.variants.forEach((v, i) => {
                const vCode = `${codigo}.V${i + 1}`;
                console.log(`      ${vCode} → ${v.name}`);
            });
        } else {
            console.log(`      ${codigo} → Diseño único`);
        }
        console.log(`   Imagen: ${p.img}`);
    });
    
    if (results.length > 10) {
        console.log(`\n... y ${results.length - 10} resultados más`);
    }
    
    return results;
}

// Alias corto
window.b = buscar;

function parseProductCode(query) {
    const normalized = String(query || '').trim().toLowerCase();
    // Soporta: PS-002, PS-002.V1, M2-017.V7, ps002, 002, 2, etc.
    // Prefijo puede tener letras Y números (ej: M2, HBST, TA)
    const match = normalized.match(/^(?:[a-z0-9]+-)?0*(\d+)(?:\.v(\d+))?$/i);
    if (!match) return null;
    const id = parseInt(match[1], 10);
    if (!id && id !== 0) return null;
    return {
        id,
        variantIndex: match[2] ? Math.max(parseInt(match[2], 10) - 1, 0) : undefined,
        raw: normalized
    };
}

function normalizeText(value) {
    return String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

function getProductPriority(product) {
    const priority = Number(product?.priority);
    return Number.isFinite(priority) ? priority : 0;
}

function getMetadataText(product) {
    const tags = Array.isArray(product?.tags) ? product.tags : [];
    const collections = Array.isArray(product?.collections)
        ? product.collections
        : (product?.collection ? [product.collection] : []);
    const band = product?.band ? [product.band] : [];
    return [...tags, ...collections, ...band].map(normalizeText).join(' ');
}

function compareProductsByPriorityThenId(a, b) {
    const priorityDiff = getProductPriority(b) - getProductPriority(a);
    if (priorityDiff !== 0) return priorityDiff;
    return (b?.id || 0) - (a?.id || 0);
}

function compareAlbumProductsByYearAscThenId(a, b) {
    const yearA = Number(a?.year) || 0;
    const yearB = Number(b?.year) || 0;
    if (yearA !== yearB) return yearA - yearB;
    return (a?.id || 0) - (b?.id || 0);
}

function isBackVariant(variant) {
    if (!variant) return false;
    if (normalizeText(variant.role) === 'back') return true;
    return normalizeText(variant.name).includes('dorso');
}

function isFrontVariant(variant) {
    if (!variant) return false;
    return normalizeText(variant.role) === 'front';
}

function matchesCategoryOrMetadata(product, categoryValue) {
    const categoryQuery = normalizeText(categoryValue);
    if (!categoryQuery) return true;

    const category = normalizeText(product?.category);
    if (category === categoryQuery) return true;

    // Las colecciones de prendas deben mostrar solo productos de su categoria real.
    if (categoryQuery === 'buzo cuello redondo') return false;

    const tags = Array.isArray(product?.tags) ? product.tags : [];
    if (tags.some(tag => normalizeText(tag) === categoryQuery)) return true;

    const collections = Array.isArray(product?.collections)
        ? product.collections
        : (product?.collection ? [product.collection] : []);
    if (collections.some(collection => normalizeText(collection).includes(categoryQuery))) return true;

    return false;
}

function matchesTextQuery(product, query) {
    const normalizedQuery = normalizeText(query);
    const name = normalizeText(product.name);
    const desc = normalizeText(product.desc);
    const category = normalizeText(product.category);
    const idText = String(product.id || '');
    const variantsText = (product.variants || []).map(v => `${normalizeText(v.name)} ${normalizeText(v.role)} ${normalizeText(v.img)}`).join(' ');
    const metadataText = getMetadataText(product);
    return name.includes(normalizedQuery)
        || desc.includes(normalizedQuery)
        || category.includes(normalizedQuery)
        || metadataText.includes(normalizedQuery)
        || idText.includes(normalizedQuery)
        || variantsText.includes(normalizedQuery);
}

function getSearchResults(query, sourceProducts = db, useGlobalCodeLookup = false) {
    const normalized = String(query || '').trim().toLowerCase();
    if (!normalized) return [];

    const codeData = parseProductCode(normalized);
    if (codeData) {
        const searchPool = useGlobalCodeLookup ? db : sourceProducts;
        const codeMatches = searchPool
            .filter(product => product.id === codeData.id)
            .map(product => ({
                ...product,
                matchedVariantIndex: typeof codeData.variantIndex === 'number'
                    ? Math.min(codeData.variantIndex, Math.max((product.variants?.length || 1) - 1, 0))
                    : undefined,
                matchedCode: normalized
            }));

        if (codeMatches.length) {
            return codeMatches;
        }
    }

    return sourceProducts.filter(product => matchesTextQuery(product, normalized));
}

function openExactCodeMatch(query, afterOpen) {
    const results = getSearchResults(query, db, true);
    if (!results.length) return false;

    const normalized = String(query || '').trim().toLowerCase();
    const codeData = parseProductCode(normalized);
    const firstMatch = results[0];

    if (!codeData || !firstMatch || firstMatch.id !== codeData.id) {
        return false;
    }

    openModal(firstMatch.id, firstMatch.matchedVariantIndex);
    if (typeof afterOpen === 'function') afterOpen(firstMatch);
    return true;
}

function clearSelectionError(groupId) {
    const group = document.getElementById(groupId);
    if (group) group.classList.remove('field-required-error');
}

function markSelectionError(groupId) {
    const group = document.getElementById(groupId);
    if (!group) return;
    group.classList.add('field-required-error');
    group.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Función para cambiar entre Adulto y Chico
function selectAge(age) {
    selectedAge = age;
    selectedSize = ''; // Reset talle al cambiar edad
    clearSelectionError('ageGroup');
    clearSelectionError('sizeGroup');
    
    // Estilos activo/inactivo
    const activeStyle = 'background:#e8432e;border:1px solid #e8432e;color:#fff;padding:6px 12px;border-radius:5px;font-size:0.8rem;font-weight:500;cursor:pointer;';
    const activeStyleGreen = 'background:#39ff14;border:1px solid #39ff14;color:#000;padding:6px 12px;border-radius:5px;font-size:0.8rem;font-weight:500;cursor:pointer;';
    const inactiveStyle = 'background:#1a1a1a;border:1px solid #333;color:#888;padding:6px 12px;border-radius:5px;font-size:0.8rem;font-weight:500;cursor:pointer;';
    
    // Actualizar botones de edad
    document.querySelectorAll('#ageSelector button').forEach(btn => {
        const isActive = btn.dataset.age === age;
        btn.classList.toggle('active', isActive);
        if (btn.dataset.age === 'chico') {
            btn.style.cssText = isActive ? activeStyleGreen : inactiveStyle;
        } else {
            btn.style.cssText = isActive ? activeStyle : inactiveStyle;
        }
    });
    
    // Mostrar/ocultar selectores de talle según edad
    const sizeAdult = document.getElementById('sizeSelector');
    const sizeKids = document.getElementById('sizeSelectorKids');
    const btnOversize = document.getElementById('btnOversize');
    
    if (sizeAdult && sizeKids) {
        if (age === 'adulto') {
            sizeAdult.style.display = 'flex';
            sizeKids.style.display = 'none';
            // Mostrar opción Oversize para adultos
            if (btnOversize) btnOversize.style.display = '';
        } else {
            sizeAdult.style.display = 'none';
            sizeKids.style.display = 'flex';
            // Ocultar opción Oversize para niños y forzar Clásica
            if (btnOversize) btnOversize.style.display = 'none';
            // Si tenía Oversize seleccionado, cambiar a Clásica
            if (selectedCut === 'oversize') {
                selectCut('clasica');
            }
        }
    }
    
    // Limpiar selección de talle
    document.querySelectorAll('#sizeSelector button, #sizeSelectorKids button').forEach(btn => {
        btn.classList.remove('active');
        if (!btn.classList.contains('size-oversize')) {
            btn.style.cssText = inactiveStyle;
        }
    });
    
    // Ocultar talles oversize (XXS, XS) si estaba en oversize
    document.querySelectorAll('#sizeSelector .size-oversize').forEach(btn => {
        btn.style.display = 'none';
    });
    if (age === 'adulto' && selectedCut === 'oversize') {
        document.querySelectorAll('#sizeSelector .size-oversize').forEach(btn => {
            btn.style.display = '';
            btn.style.cssText = inactiveStyle;
        });
    }
    
    updateModalPrices();
    updateModalSizeRange();
}

// Función para seleccionar talle
function selectSize(size) {
    if (!selectedAge) {
        showNotification('Primero elegí edad.', 1800);
        markSelectionError('ageGroup');
        return;
    }

    selectedSize = size;
    clearSelectionError('sizeGroup');
    const activeStyle = 'background:#e8432e;border:1px solid #e8432e;color:#fff;padding:6px 12px;border-radius:5px;font-size:0.8rem;font-weight:500;cursor:pointer;';
    const inactiveStyle = 'background:#1a1a1a;border:1px solid #333;color:#888;padding:6px 12px;border-radius:5px;font-size:0.8rem;font-weight:500;cursor:pointer;';
    
    const activeSelector = selectedAge === 'adulto' ? '#sizeSelector' : '#sizeSelectorKids';
    document.querySelectorAll(`${activeSelector} button`).forEach(btn => {
        const isActive = btn.dataset.size === size;
        btn.classList.toggle('active', isActive);
        // Solo aplicar estilo si el botón es visible
        if (btn.style.display !== 'none') {
            btn.style.cssText = isActive ? activeStyle : inactiveStyle;
        }
    });
}

// Función para seleccionar corte
function selectCut(cut) {
    selectedCut = cut;
    selectedSize = ''; // Reset talle al cambiar corte
    clearSelectionError('cutGroup');
    clearSelectionError('sizeGroup');
    
    const activeStyle = 'background:#e8432e;border:1px solid #e8432e;color:#fff;padding:6px 12px;border-radius:5px;font-size:0.8rem;font-weight:500;cursor:pointer;';
    const inactiveStyle = 'background:#1a1a1a;border:1px solid #333;color:#888;padding:6px 12px;border-radius:5px;font-size:0.8rem;font-weight:500;cursor:pointer;';
    
    document.querySelectorAll('#cutSelector button').forEach(btn => {
        const isActive = btn.dataset.cut === cut;
        btn.classList.toggle('active', isActive);
        if (btn.style.display !== 'none') {
            btn.style.cssText = isActive ? activeStyle : inactiveStyle;
        }
    });
    
    // Mostrar/ocultar talles XXS y XS según el corte (solo para adultos)
    if (selectedAge !== 'chico') {
        document.querySelectorAll('#sizeSelector .size-oversize').forEach(btn => {
            if (cut === 'oversize') {
                btn.style.display = '';
                btn.style.cssText = inactiveStyle;
            } else {
                btn.style.display = 'none';
            }
        });
    }
    
    // Limpiar selección de talle
    document.querySelectorAll('#sizeSelector button').forEach(btn => {
        btn.classList.remove('active');
        if (btn.style.display !== 'none') {
            btn.style.cssText = inactiveStyle;
        }
    });
    
    // Actualizar precios al cambiar corte
    updateModalPrices();
    updateModalSizeRange();
}

// Función para seleccionar color
function updateModalSizeRange() {
    const sizeRangeEl = document.getElementById('modalSizeRange');
    if (!sizeRangeEl) return;

    const garmentCategory = getActiveGarmentCategory(currentProduct);
    if (garmentCategory === 'Hoodies FMD' || garmentCategory === 'Hoodies Otras Bandas') {
        sizeRangeEl.textContent = '📏 XS a XXL';
        return;
    }

    if (garmentCategory === 'Buzo Cuello Redondo') {
        sizeRangeEl.textContent = '📏 S a XXL';
        return;
    }

    if (selectedAge === 'chico') {
        sizeRangeEl.textContent = '📏 4 a 16';
        return;
    }

    sizeRangeEl.textContent = selectedCut === 'oversize' ? '📏 XS a 3XL' : '📏 S a XXL';
}

function selectColor(color) {
    selectedColor = color;
    clearSelectionError('colorGroup');
    const activeStyle = 'background:#e8432e;border:1px solid #e8432e;color:#fff;padding:6px 12px;border-radius:5px;font-size:0.8rem;font-weight:500;cursor:pointer;display:flex;align-items:center;gap:6px;';
    const inactiveStyle = 'background:#1a1a1a;border:1px solid #333;color:#888;padding:6px 12px;border-radius:5px;font-size:0.8rem;font-weight:500;cursor:pointer;display:flex;align-items:center;gap:6px;';
    
    document.querySelectorAll('#colorSelector button').forEach(btn => {
        const isActive = btn.dataset.color === color;
        btn.classList.toggle('active', isActive);
        btn.style.cssText = isActive ? activeStyle : inactiveStyle;
    });
}

// Actualizar precios según selección adulto/chico, oversize y tipo de producto
function isPersonalizedSelection(product = currentProduct) {
    if (!product) return false;

    const personalizedByCategory = normalizeText(product.category) === 'personalizados';
    const personalizedByInput = Boolean((document.getElementById('dorsoCustomInput')?.value || '').trim());
    return personalizedByCategory || personalizedByInput;
}

function resolveModalPriceConfig(product = currentProduct) {
    if (!product) {
        return {
            simple: PRECIOS.simple,
            doble: PRECIOS.doble,
            isHoodie: false,
            isCustom: false
        };
    }

    const garmentCategory = getActiveGarmentCategory(product);
    const isHoodie = garmentCategory === 'Hoodies FMD' || garmentCategory === 'Hoodies Otras Bandas';
    const isBuzoRedondo = garmentCategory === 'Buzo Cuello Redondo';
    const isOversize = selectedCut === 'oversize';
    const isKids = selectedAge === 'chico';
    const isCustom = isPersonalizedSelection(product) && !isHoodie && !isBuzoRedondo && !isKids;

    let basePrices;
    if (isHoodie) {
        basePrices = PRECIOS_HOODIES;
    } else if (isBuzoRedondo) {
        basePrices = PRECIOS_BUZO_REDONDO;
    } else if (isKids) {
        basePrices = PRECIOS_CHICOS;
    } else if (isOversize) {
        basePrices = PRECIOS_OVERSIZE;
    } else {
        basePrices = PRECIOS;
    }

    const simple = isCustom
        ? (basePrices.simple_personalizado ?? (basePrices.simple + PERSONALIZADO_EXTRA))
        : basePrices.simple;
    const doble = isCustom
        ? (basePrices.doble_personalizado ?? (basePrices.doble + PERSONALIZADO_EXTRA))
        : basePrices.doble;

    return { simple, doble, isHoodie, isBuzoRedondo, isCustom };
}

function getVariantGarmentCategory(product, variantIndex = getActiveVariantIndex()) {
    const variant = product?.variants?.[variantIndex];
    return variant?.garmentCategory || product?.category || '';
}

function getActiveGarmentCategory(product = currentProduct) {
    if (!product) return '';
    if (product.category === 'Slayer') {
        if (slayerGarmentPreference === 'hoodie') return 'Hoodies Otras Bandas';
        if (slayerGarmentPreference === 'buzo') return 'Buzo Cuello Redondo';
        if (slayerGarmentPreference === 'remera') return 'Slayer';
    }
    return getVariantGarmentCategory(product);
}

function hasDorsoSelection() {
    const dorsoInputValue = (document.getElementById('dorsoCustomInput')?.value || '').trim();
    const hasBackExamples = typeof selectedBacks !== 'undefined' && selectedBacks && selectedBacks.size > 0;
    const hasChips = typeof selectedDorsoChips !== 'undefined' && selectedDorsoChips && selectedDorsoChips.size > 0;
    return selectedBackIndex >= 0 || hasBackExamples || hasChips || dorsoInputValue.length > 0;
}

function isDoubleByDefault(product) {
    return product?.tipoPrecio === 'doble' || product?.category === 'Buzo Cuello Redondo';
}

function updateDoubleSelectionStatus(isDoubleActive) {
    const statusEl = document.getElementById('doubleSelectionStatus');
    if (!statusEl || !currentProduct) return;

    if (!isDoubleActive) {
        statusEl.style.display = 'none';
        statusEl.textContent = '';
        return;
    }

    const precios = resolveModalPriceConfig(currentProduct);
    const diff = Math.max(0, precios.doble - precios.simple);
    const diffText = diff > 0 ? ` +$${diff.toLocaleString('es-AR')}` : '';

    let detail = '';
    if (selectedBackIndex >= 0 && currentProduct.variants?.[selectedBackIndex]) {
        detail = currentProduct.variants[selectedBackIndex].name;
    } else if (typeof selectedDorsoChips !== 'undefined' && selectedDorsoChips?.size) {
        detail = Array.from(selectedDorsoChips).join(' + ');
    } else if (typeof selectedBacks !== 'undefined' && selectedBacks?.size) {
        detail = Array.from(selectedBacks).slice(0, 2).join(' | ');
    } else {
        const customInput = (document.getElementById('dorsoCustomInput')?.value || '').trim();
        if (customInput) {
            detail = customInput.length > 80 ? `${customInput.slice(0, 80)}...` : customInput;
        }
    }

    const prefix = isDoubleByDefault(currentProduct)
        ? 'Doble estampa incluida'
        : 'Doble estampa activa';

    statusEl.textContent = detail
        ? `🔥 ${prefix}: ${detail}${diffText}`
        : `🔥 ${prefix}${diffText}`;
    statusEl.style.display = 'block';
}

function updateModalPrices() {
    if (!currentProduct) return;
    const precios = resolveModalPriceConfig(currentProduct);

    // Precio depende de si el producto ya es doble o si el usuario sumó dorso
    const tieneDoble = isDoubleByDefault(currentProduct) || hasDorsoSelection();
    const precio = tieneDoble ? precios.doble : precios.simple;
    document.getElementById('modalPrice').textContent = '$' + precio.toLocaleString('es-AR');

    const pSimple = '$' + precios.simple.toLocaleString('es-AR');
    const pDoble = '$' + precios.doble.toLocaleString('es-AR');
    const elSimple = document.getElementById('modalPrecioSimple');
    const elDoble = document.getElementById('modalPrecioDoble');
    if(elSimple) elSimple.textContent = pSimple;
    if(elDoble) elDoble.textContent = pDoble;

    // Actualizar nota de precio para hoodies
    const priceNote = document.querySelector('.modal-price-note');
    if (priceNote) {
        if (precios.isHoodie) {
            priceNote.innerHTML = 'Combo hoodie doble + remera doble: <strong style="color:var(--price);">$99.000</strong> · envío según cantidad';
        } else {
            const customTag = precios.isCustom ? ' · personalizado' : '';
            priceNote.textContent = `$${precio.toLocaleString('es-AR')}${customTag} · envío según zona · consultá por WhatsApp`;
        }
    }

    updateDoubleSelectionStatus(tieneDoble);
}

// === SISTEMA DE CARRITO ===
class CartSystem {
    constructor() {
        this.cart = this.loadCart();
    }

    // Generar abreviatura del nombre del producto
    generateProductAbbreviation(productName) {
        if (!productName) return 'PROD';
        
        // Limpiar el nombre
        const cleaned = productName
            .replace(/[^\w\s]/g, '') // Remover caracteres especiales
            .toUpperCase()
            .trim();
        
        const words = cleaned.split(/\s+/);
        
        // Si es una palabra, usar primeras 6 letras
        if (words.length === 1) {
            return cleaned.substring(0, 6);
        }
        
        // Si son dos palabras cortas, usar todo
        if (words.length === 2 && words.join('').length <= 8) {
            return words.join('');
        }
        
        // Si son varias palabras, tomar iniciales
        const abbreviation = words.map(w => w[0]).join('');
        return abbreviation.substring(0, 6);
    }

    // Generar código único para un producto (sin .DBL, solo base + variante)
    generateCode(productId, variantIndex = 0) {
        const product = db.find(p => p.id === productId);
        if (!product) return null;
        
        const abbrev = this.generateProductAbbreviation(product.name);
        const baseCode = `${abbrev}-${String(productId).padStart(3, '0')}`;
        const variantPart = product.variants && product.variants.length > 1 ? `.V${variantIndex + 1}` : '';
        return `${baseCode}${variantPart}`;
    }

    // Agregar al carrito con soporte para dorso específico
    addToCart(productId, variantIndex = 0, isDouble = false, options = {}) {
        const product = db.find(p => p.id === productId);
        if (!product) return false;

        let forceDouble = isDouble;
        const garmentCategory = options.category || getVariantGarmentCategory(product, variantIndex);

        // Código del frente
        const frontCode = this.generateCode(productId, variantIndex);
        let frontName = product.variants && product.variants[variantIndex]
            ? product.variants[variantIndex].name
            : product.name;
        const slayerGarmentLabel = product.category === 'Slayer' ? getSlayerPreferredGarmentLabel() : '';
        if (slayerGarmentLabel) frontName = `${product.name} - ${slayerGarmentLabel}`;

        // Información del dorso (si es doble estampa)
        let backCode = null;
        let backName = null;
        let backIndex = options.backIndex !== undefined ? options.backIndex : -1;
        
        if (forceDouble && backIndex >= 0 && product.variants && product.variants[backIndex]) {
            backCode = this.generateCode(productId, backIndex);
            backName = product.variants[backIndex].name;
        }

        const item = {
            id: productId,
            code: frontCode, // Código principal (frente)
            productName: product.name,
            category: garmentCategory,
            variantIndex: variantIndex,
            variantName: frontName,
            isDouble: forceDouble,
            // Nuevos campos para doble estampa
            frontCode: frontCode,
            frontName: frontName,
            backIndex: backIndex,
            backCode: backCode,
            backName: backName,
            // Opciones de prenda
            age: options.age || 'adulto',
            size: options.size || '',
            cut: options.cut || 'clasica',
            color: options.color || 'negro',
            isCustom: Boolean(options.isCustom),
            timestamp: Date.now()
        };

        this.cart.push(item);
        this.saveCart();
        this.updateCartUI();
        return true;
    }

    // Remover del carrito
    removeFromCart(index) {
        if (index >= 0 && index < this.cart.length) {
            this.cart.splice(index, 1);
            this.saveCart();
            this.updateCartUI();
            return true;
        }
        return false;
    }

    // Obtener carrito
    getCart() {
        return this.cart;
    }

    // Limpiar carrito
    clearCart() {
        this.cart = [];
        this.saveCart();
        this.updateCartUI();
    }

    // Guardar en localStorage
    saveCart() {
        localStorage.setItem('fmd_cart', JSON.stringify(this.cart));
    }

    // Cargar desde localStorage
    loadCart() {
        const stored = localStorage.getItem('fmd_cart');
        return stored ? JSON.parse(stored) : [];
    }

    // Generar resumen para copiar
    generateSummary() {
        if (this.cart.length === 0) return 'Carrito vacío';

        // Ordenar productos: adulto primero, luego niño; dentro de adulto, hoodie/remera
        const sortOrder = item => {
            // 0: adulto hoodie, 1: adulto remera, 2: niño
            if (item.age === 'chico') return 2;
            if (item.category === 'Hoodies FMD') return 0;
            return 1;
        };
        const sortedCart = [...this.cart].sort((a, b) => sortOrder(a) - sortOrder(b));

        const codes = sortedCart.map((item, idx) => {
            if (item.isDouble && item.backCode) {
                return `${idx + 1}. Frente [${item.frontCode}] + dorso [${item.backCode}]`;
            }
            if (item.isDouble) {
                return `${idx + 1}. [${item.frontCode}] (dorso a definir)`;
            }
            return `${idx + 1}. [${item.code}]`;
        }).join('\n');

        // Detalles de cada producto (ajustes de lenguaje y talle)
        const details = sortedCart.map((item, idx) => {
            const isHoodie = item.category === 'Hoodies FMD' || item.category === 'Hoodies Otras Bandas';
            const isBuzoRedondo = item.category === 'Buzo Cuello Redondo';
            const edad = item.age === 'chico' ? 'Niño' : 'Adulto';
            const talle = item.size ? item.size : 'A confirmar';
            const color = item.color === 'blanco' ? 'Blanca' : 'Negra';
            let tipoPrenda;
            if (isBuzoRedondo) {
                tipoPrenda = 'Buzo cuello redondo unisex';
            } else if (isHoodie) {
                tipoPrenda = 'Hoodie oversize unisex';
            } else if (item.cut === 'oversize') {
                tipoPrenda = 'Remera oversize unisex';
            } else {
                tipoPrenda = 'Remera clásica';
            }

            let estampado;
            if (item.isDouble && item.backCode) {
                estampado = `Doble estampa (frente ${item.frontCode} + dorso ${item.backCode})`;
            } else if (item.isDouble) {
                estampado = `Doble estampa (dorso a definir)`;
            } else {
                estampado = 'Estampa simple';
            }

            return [
                `${idx + 1}) ${item.productName}`,
                `• Código: ${item.code}`,
                `• Prenda: ${tipoPrenda}`,
                `• Edad: ${edad}`,
                `• Talle: ${talle}`,
                `• Color: ${color}`,
                `• Estampa: ${estampado}`
            ].join('\n');
        }).join('\n\n');

        const total = this.cart.length;
        const tipoConteo = total === 1 ? 'prenda' : 'prendas';

        // Detectar combos hoodie+remera (promo)
        const tieneHoodie = sortedCart.some(i => isHoodieItem(i) && i.isDouble);
        const tieneRemera = sortedCart.some(i => isAdultRemeraItem(i) && i.isDouble);
        let promoMsg = '';
        if (tieneHoodie && tieneRemera) {
            promoMsg = '\n\n> Combo hoodie doble + remera doble: $99.000. El envío no está incluido; se bonifica únicamente desde 3 prendas.';
        }

        return `CÓDIGOS DEL PEDIDO:\n${codes}\n\nDETALLE DEL PEDIDO:\n\n${details}\n\nTOTAL: ${total} ${tipoConteo}${promoMsg}`;
    }

    generateConsultationSummary() {
        if (this.cart.length === 0) return 'Carrito vacio';

        return this.cart.map((item, idx) => {
            const isHoodie = isHoodieItem(item);
            const isBuzoRedondo = isBuzoRedondoItem(item);
            const garment = isBuzoRedondo
                ? 'Buzo cuello redondo unisex'
                : isHoodie
                    ? 'Hoodie oversize unisex'
                    : item.cut === 'oversize'
                        ? 'Remera oversize unisex'
                        : 'Remera clasica';
            const color = item.color === 'blanco' ? 'Blanca' : 'Negra';
            const product = db.find(p => Number(p?.id) === Number(item.id));
            const frontVariant = product?.variants?.[item.variantIndex];
            const backVariant = product?.variants?.[item.backIndex];
            const bothAreBacks = item.isDouble && item.backCode && isBackVariant(frontVariant) && isBackVariant(backVariant);
            const warning = bothAreBacks
                ? '\n* Importante: los dos diseños elegidos están identificados como dorso. Necesito confirmar cuál usar al frente.'
                : '';
            const designLines = item.isDouble && item.backCode
                ? `* Diseño 1: ${item.frontName || item.frontCode} (${item.frontCode})\n* Diseño 2: ${item.backName || item.backCode} (${item.backCode})`
                : item.isDouble
                    ? `* Diseño: ${item.frontName || item.frontCode}\n* Dorso: a definir`
                    : `* Diseño: ${item.frontName || item.code}`;
            const price = calculateItemPrice(item).toLocaleString('es-AR');

            return `${idx + 1}) ${item.productName}
* Prenda: ${garment}
* Talle: ${item.size || 'A confirmar'}
* Color: ${color}
* Estampa: ${item.isDouble ? 'Doble estampa' : 'Estampa simple'}
${designLines}
* Precio estimado: $${price}${warning}`;
        }).join('\n\n');
    }

    // Actualizar UI del carrito
    updateCartUI() {
        const cartBtn = document.getElementById('cartBtn');
        const cartPanel = document.getElementById('cartPanel');
        const modalCartCount = document.getElementById('modalCartCount');
        const cartCount = this.cart.length;

        // Actualizar botón flotante
        if (cartBtn) {
            if (cartCount > 0) {
                cartBtn.style.display = 'flex';
                cartBtn.querySelector('.cart-count').textContent = cartCount;
            } else {
                cartBtn.style.display = 'none';
            }
        }

        // Actualizar contador en el modal del producto
        if (modalCartCount) {
            modalCartCount.textContent = cartCount;
        }

        if (cartPanel && cartPanel.classList.contains('active')) {
            this.renderCartPanel();
        }
    }

    // Renderizar panel del carrito
    renderCartPanel() {
        const cartList = document.getElementById('cartList');
        const cartSummary = document.getElementById('cartSummary');

        if (!cartList) return;

        if (this.cart.length === 0) {
            cartList.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:20px;">Carrito vacío</p>';
            if (cartSummary) cartSummary.style.display = 'none';
            return;
        }

        cartList.innerHTML = this.cart.map((item, idx) => {
            const edad = item.age === 'chico' ? 'Niño' : 'Adulto';
            const talle = item.size || '—';
            // Niños siempre es Unisex
            const corte = item.age === 'chico' ? 'Unisex' : (item.cut === 'oversize' ? 'Oversize' : 'Clásica');
            const color = item.color === 'blanco' ? 'Blanca' : 'Negra';
            return `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-code">${item.code}</div>
                    <div class="cart-item-name">${item.productName}</div>
                    ${item.variantName && item.variantName !== item.productName ? `<div class="cart-item-variant">${item.variantName}</div>` : ''}
                    ${item.isDouble ? '<div class="cart-item-double">Doble estampa</div>' : ''}
                    <div class="cart-item-options">${edad} · T${talle} · ${corte} · ${color}</div>
                </div>
                <button class="cart-item-remove" onclick="cart.removeFromCart(${idx})">✕</button>
            </div>
        `}).join('');

        if (cartSummary) {
            cartSummary.style.display = 'block';
            cartSummary.innerHTML = `
                <div class="cart-summary-content">
                    <button onclick="openCartPreview()" class="btn-send-whatsapp" style="background: var(--magic-green); color: #000;">
                        👁️ Ver pedido completo
                    </button>
                    <button onclick="openCartPreview()" class="btn-send-whatsapp">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                        Revisar y enviar pedido
                    </button>
                    <button onclick="cart.clearCart()" class="btn-clear-cart">
                        🗑️ Vaciar carrito
                    </button>
                </div>
            `;
        }
    }

    // Mostrar/ocultar panel
    togglePanel() {
        const cartPanel = document.getElementById('cartPanel');
        if (cartPanel) {
            cartPanel.classList.toggle('active');
            if (cartPanel.classList.contains('active')) {
                this.renderCartPanel();
            }
        }
    }
}

// Instancia global
let cart = new CartSystem();

function renderLatestReleases(limit = 5) {
    try {
        const latestGrid = document.getElementById('latestGrid');
        if (!latestGrid || !Array.isArray(db) || !db.length) return;
        
        let displayCards = [];

        // 1. Primero agregar productos con isNew: true a nivel de producto
        db.forEach(product => {
            if (product.isNew) {
                displayCards.push({
                    isNewVariant: false,
                    productId: product.id,
                    variantIndex: 0,
                    title: product.name,
                    img: product.img,
                    category: product.category,
                    year: product.year,
                    tipoPrecio: product.tipoPrecio,
                    variants: product.variants
                });
            }
        });

        // 2. Luego extraer TODAS las variantes marcadas como nuevas (aunque sean del mismo producto)
        db.forEach(product => {
            if (product.variants && product.variants.length > 0) {
                product.variants.forEach((variant, index) => {
                    if (variant.isNew) {
                        displayCards.push({
                            isNewVariant: true,
                            productId: product.id,
                            variantIndex: index,
                            title: `${product.name} - ${variant.name}`,
                            img: variant.img,
                            category: product.category,
                            year: product.year,
                            tipoPrecio: product.tipoPrecio
                        });
                    }
                });
            }
        });

        // Priorizar variantes nuevas recién cargadas y luego ordenar por id
        displayCards.sort((a, b) => {
            const tourBoostA = (a.isNewVariant && a.category === 'Tour') ? 2000000 : 0;
            const tourBoostB = (b.isNewVariant && b.category === 'Tour') ? 2000000 : 0;
            const priorityBoostA = Number.isFinite(Number(a.priority)) ? Number(a.priority) * 1000 : 0;
            const priorityBoostB = Number.isFinite(Number(b.priority)) ? Number(b.priority) * 1000 : 0;
            const scoreA = tourBoostA + (a.isNewVariant ? 1000000 : 0) + (typeof a.variantIndex === 'number' ? a.variantIndex : 0);
            const scoreB = tourBoostB + (b.isNewVariant ? 1000000 : 0) + (typeof b.variantIndex === 'number' ? b.variantIndex : 0);
            if ((scoreB + priorityBoostB) !== (scoreA + priorityBoostA)) return (scoreB + priorityBoostB) - (scoreA + priorityBoostA);
            if (scoreB !== scoreA) return scoreB - scoreA;
            return (b.productId || 0) - (a.productId || 0);
        });

        // 3. Rellenar el resto de espacios hasta el límite con productos recientes
        if (displayCards.length < limit) {
            const sortedProducts = [...db].sort(compareProductsByPriorityThenId);

            for (const product of sortedProducts) {
                const alreadyHasNewVariant = displayCards.some(card => card.productId === product.id);

                if (!alreadyHasNewVariant) {
                    displayCards.push({
                        isNewVariant: false,
                        productId: product.id,
                        variantIndex: 0,
                        title: product.name,
                        img: product.img,
                        category: product.category,
                        year: product.year,
                        priority: product.priority,
                        tipoPrecio: product.tipoPrecio,
                        variants: product.variants
                    });
                }

                if (displayCards.length >= limit) break;
            }
        }

        // Mostrar todos los diseños nuevos sin límite
        // Si limit es 0 o negativo, mostrar todos
        if (limit > 0) {
            displayCards = displayCards.slice(0, limit);
        }

        // 3. Renderizar las tarjetas en el DOM
        latestGrid.innerHTML = displayCards.map(card => {
            const hasVariants = card.variants && card.variants.length > 1;
            const isDoble = card.tipoPrecio === 'doble';
            const isDorsoIdea = card.category === 'Dorsales';
            const badgeText = (hasVariants && !card.isNewVariant) ? `${card.variants.length} diseños <span style='font-size:1.2em;margin-left:6px;'>➔</span>` : (isDoble ? '🔥 Doble estampa' : '');
            // NUEVO badge
            const isNew = card.isNewVariant || card.isNew;
            const newBadge = isNew ? `<span class="pack-badge" style="background:var(--magic-green);color:#000;">🆕 NUEVO</span>` : '';
            // COMBO badge
            const comboBadge = card.isComboEligible ? `<span class="pack-badge" style="background:var(--magic-orange);color:#000;">COMBO</span>` : '';
            // Código
            const code = card.code ? card.code : '';
            // Badges arriba de la imagen
            let badges = '';
            if (badgeText) badges += `<span class="variants-badge">${badgeText}</span>`;
            if (newBadge) badges += newBadge;
            if (comboBadge) badges += comboBadge;

            return `<div class="product-card" onclick="openModal(${card.productId}${card.isNewVariant ? ', ' + card.variantIndex : ''})">
                <div class="product-badges">${badges}</div>
                <img src="${card.img}" class="product-img" loading="lazy">
                <div class="product-info">
                    <div class="product-name">${card.title}</div>
                    ${code ? `<div class="product-code" style="font-size:0.85em;color:var(--magic-orange);font-weight:600;letter-spacing:1px;">${code}</div>` : ''}
                    <div class="product-meta">${formatCategoryMeta(card.year, getCategoryLabel(card.category))}</div>
                    <div class="product-price-row">
                        ${
                            isDorsoIdea
                            ? `<span class="product-envio" style="color:var(--magic-green);border:1px solid rgba(57,255,20,.25);">Solo doble estampa</span>`
                            : `${formatPreciosDual(card)}<div style="font-size:0.62rem;color:var(--text-muted);margin-top:4px;">3 prendas o más: envío gratis · 4 prendas o más: 15% OFF + envío gratis</div>`
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
        const response = await fetch('data/products.json?v=' + Date.now());
        if (!response.ok) throw new Error('Error cargando productos');
        db = await response.json();
        buildDorsoAutocompletePool();
        updateCountsUI();
        renderMaidenArchiveGrid(); // Capsula editorial Iron Maiden
        renderSlayerArchiveGrid(); // Selector de prendas Slayer
        renderHoodiesGrid(); // Hoodies destacados
        renderBuzosRedondoGrid(); // Buzos cuello redondo destacados
        renderHeroOrbit(6); // Poblar órbita del hero con 6 cards 3D
        loadMegadethDestacados(); // Destacados para el show
        loadMegadethCollections(); // Colecciones Megadeth con preview
        filterProducts(); // Renderizar después de cargar
        loadProductFromHash(); // Abrir producto desde URL hash si existe
        loadCategoryFromURL();  // Ir a categoría desde ?cat= si existe
    } catch (error) {
        console.error('Error:', error);
        // Fallback para desarrollo local
        db = [];
        dorsoAutocompletePool = [];
    }
}

function renderSlayerArchiveGrid() {
    try {
        const grid = document.getElementById('slayerArchiveGrid');
        const section = document.getElementById('slayerArchive');
        if (!grid || !section || !Array.isArray(db) || !db.length) return;

        const products = SLAYER_ARCHIVE_HIGHLIGHT_IDS
            .map(id => db.find(product => Number(product?.id) === id))
            .filter(Boolean)
            .sort(compareProductsByPriorityThenId);

        if (!products.length) {
            section.style.display = 'none';
            return;
        }

        const findGarmentImage = garment => {
            for (const product of products) {
                const variant = (product.variants || []).find(item => normalizeText(item?.name || '').includes(garment));
                if (variant?.img) return variant.img;
            }
            return products[0].img;
        };

        const garmentCards = [
            {
                id: 'remera',
                label: 'Remeras Slayer',
                meta: 'Clásicas y oversize',
                price: 'Desde $37.000',
                image: findGarmentImage('remera')
            },
            {
                id: 'hoodie',
                label: 'Hoodies Slayer',
                meta: 'Canguro oversize unisex',
                price: 'Desde $52.000',
                image: findGarmentImage('hoodie')
            },
            {
                id: 'buzo',
                label: 'Buzos Slayer',
                meta: 'Cuello redondo unisex',
                price: 'Desde $50.000',
                image: findGarmentImage('buzo')
            }
        ];

        grid.innerHTML = garmentCards.map(card => `
            <article class="slayer-garment-card" onclick="showSlayerGarment('${card.id}')">
                <div class="slayer-garment-card-image">
                    <img src="${card.image}" alt="${card.label}" loading="lazy" decoding="async">
                    <span>${products.length} diseños</span>
                </div>
                <div class="slayer-garment-card-info">
                    <strong>${card.label}</strong>
                    <p>${card.meta}</p>
                    <span>${card.price}</span>
                    <button onclick="event.stopPropagation(); showSlayerGarment('${card.id}')">ELEGIR Y VER DISEÑOS →</button>
                </div>
            </article>
        `).join('');
    } catch (error) {
        console.warn('renderSlayerArchiveGrid error', error);
    }
}

function scoreMaidenArchiveProduct(product) {
    const text = normalizeText(`${product?.name || ''} ${product?.desc || ''} ${(product?.tags || []).join(' ')}`);
    let score = getProductPriority(product) * 100;

    if (text.includes('tour')) score += 420;
    if (text.includes('2026')) score += 220;
    if (text.includes('argentina')) score += 260;
    if (text.includes('eddie')) score += 230;
    if (text.includes('powerslave')) score += 200;
    if (text.includes('killers')) score += 210;
    if (text.includes('fear')) score += 190;
    if (text.includes('fmd') || text.includes('original')) score += 120;
    if (product?.tipoPrecio === 'doble') score += 130;

    return score;
}

function getMaidenArchiveMeta(product) {
    const text = normalizeText(`${product?.name || ''} ${product?.desc || ''}`);
    if (text.includes('tour')) return 'Tour 2026';
    if (text.includes('argentina')) return 'Eddie Argentina';
    if (text.includes('somewhere in time') || text.includes('killers')) return 'Iron Maiden';
    if (text.includes('eddie')) return 'Eddie Iconico';
    if (text.includes('powerslave')) return 'Powerslave FMD';
    if (text.includes('fear')) return 'Fear Of The Dark';
    if (product?.tipoPrecio === 'doble') return 'Doble estampa';
    return 'Clasico remasterizado';
}

function getMaidenArchivePrice(product) {
    const isHoodie = product?.category === 'Hoodies FMD' || product?.category === 'Hoodies Otras Bandas';
    const isBuzo = product?.category === 'Buzo Cuello Redondo';

    if (isHoodie) return PRECIOS_HOODIES.doble;
    if (isBuzo) return PRECIOS_BUZO_REDONDO.doble;
    return product?.tipoPrecio === 'doble' ? PRECIOS.doble : PRECIOS.simple;
}

function renderMaidenArchiveGridLegacy() {
    try {
        const grid = document.getElementById('maidenArchiveGrid');
        const section = document.getElementById('maidenArchive');
        if (!grid || !section || !Array.isArray(db) || !db.length) return;

        const maidenPool = db.filter(product => {
            const category = normalizeText(product?.category || '');
            const band = normalizeText(product?.band || '');
            const text = normalizeText(`${product?.name || ''} ${product?.desc || ''} ${(product?.tags || []).join(' ')}`);
            return category === 'iron maiden' || band === 'iron maiden' || text.includes('iron maiden');
        });

        if (!maidenPool.length) {
            section.style.display = 'none';
            return;
        }

        const fixedHighlights = MAIDEN_ARCHIVE_HIGHLIGHT_IDS
            .map(id => maidenPool.find(product => Number(product?.id) === id))
            .filter(Boolean);

        const fallbackHighlights = [...maidenPool]
            .filter(product => !MAIDEN_ARCHIVE_HIGHLIGHT_IDS.includes(Number(product?.id)))
            .sort((a, b) => {
                const scoreDiff = scoreMaidenArchiveProduct(b) - scoreMaidenArchiveProduct(a);
                if (scoreDiff !== 0) return scoreDiff;
                return compareProductsByPriorityThenId(a, b);
            });

        const highlights = [...fixedHighlights, ...fallbackHighlights].slice(0, 6);

        grid.innerHTML = highlights.map((product, index) => {
            const meta = getMaidenArchiveMeta(product);
            const isDualOptionCard = [7027, 7023].includes(Number(product?.id));
            const priceMarkup = isDualOptionCard
                ? `<div>$${PRECIOS.simple.toLocaleString('es-AR')}</div><div>$${PRECIOS.doble.toLocaleString('es-AR')}</div>`
                : `<div>$${getMaidenArchivePrice(product).toLocaleString('es-AR')}</div>`;
            const priceMode = isDualOptionCard
                ? 'Estampa frontal<br>Doble estampa'
                : (product?.tipoPrecio === 'doble' ? 'Doble estampa' : 'Simple frente');
            const isLastCard = index === highlights.length - 1;
            const cardAction = isLastCard ? 'goToMaidenCollection()' : `openModal(${product.id})`;
            const ctaMarkup = isLastCard
                ? `<button class="maiden-archive-card-cta" onclick="event.stopPropagation(); goToMaidenCollection();">VER MÁS →</button>`
                : '';

            return `<div class="product-card hoodie-card" onclick="${cardAction}">
                <img src="${product.img}" class="product-img" loading="lazy" decoding="async">
                <div class="product-info">
                    <div class="product-name">${product.name}</div>
                    <div class="product-meta">${product.year || 'FMD'} · ${meta}</div>
                    <div class="product-price-row">
                        <span class="product-price hoodie-price">${priceMarkup}</span>
                    </div>
                    <div class="maiden-archive-price-mode">${priceMode}</div>
                    ${ctaMarkup}
                </div>
            </div>`;
        }).join('');
    } catch (e) {
        console.warn('renderMaidenArchiveGrid error', e);
    }
}

// Renderizar sección destacada de Hoodies FMD
function getMaidenGarmentLabel(product) {
    if (product?.category === 'Hoodies FMD' || product?.category === 'Hoodies Otras Bandas') return 'Hoodie';
    if (product?.category === 'Buzo Cuello Redondo') return 'Buzo cuello redondo';
    return 'Remera';
}

function renderMaidenArchiveGrid() {
    try {
        const grid = document.getElementById('maidenArchiveGrid');
        const section = document.getElementById('maidenArchive');
        if (!grid || !section || !Array.isArray(db) || !db.length) return;

        const groups = MAIDEN_ARCHIVE_GROUPS.map(group => ({
            ...group,
            products: group.productIds
                .map(id => db.find(product => Number(product?.id) === id))
                .filter(Boolean)
        })).filter(group => group.products.length);

        if (!groups.length) {
            section.style.display = 'none';
            return;
        }

        grid.innerHTML = groups.map(group => {
            const garmentLabels = [...new Set(group.products.map(getMaidenGarmentLabel))];
            const garmentPills = garmentLabels.map(label => `<span>${label}</span>`).join('');
            const availabilityNote = `Prendas disponibles: ${garmentLabels.join(' / ')}`;
            const controls = group.products.length > 1
                ? `<button type="button" class="maiden-design-nav maiden-design-prev" aria-label="Prenda anterior" onclick="event.stopPropagation(); maidenArchiveMove(this, -1)">&#8249;</button>
                   <button type="button" class="maiden-design-nav maiden-design-next" aria-label="Prenda siguiente" onclick="event.stopPropagation(); maidenArchiveMove(this, 1)">&#8250;</button>`
                : '';

            const slides = group.products.map(product => {
                const garmentLabel = getMaidenGarmentLabel(product);
                const price = getMaidenArchivePrice(product).toLocaleString('es-AR');
                return `<button type="button" class="maiden-design-slide" onclick="openModal(${product.id})">
                    <span class="maiden-design-garment">${garmentLabel}</span>
                    <img src="${product.img}" alt="${group.title} - ${garmentLabel}" loading="lazy" decoding="async">
                    <span class="maiden-design-slide-footer">
                        <strong>$${price}</strong>
                        <small>${product.tipoPrecio === 'doble' ? 'Doble estampa' : 'Estampa simple'}</small>
                    </span>
                </button>`;
            }).join('');

            return `<article class="product-card maiden-design-card">
                <div class="maiden-design-head">
                    <div>
                        <div class="product-name">${group.title}</div>
                        <div class="product-meta">${group.meta} · ${group.products.length} ${group.products.length === 1 ? 'prenda' : 'prendas'}</div>
                    </div>
                    <span class="maiden-design-count">${group.products.length}</span>
                </div>
                <div class="maiden-design-carousel">
                    <div class="maiden-design-track">${slides}</div>
                    ${controls}
                </div>
                <div class="maiden-design-pills">${garmentPills}</div>
                <p class="maiden-design-note">${availabilityNote}</p>
            </article>`;
        }).join('');
    } catch (error) {
        console.warn('renderMaidenArchiveGrid grouped error', error);
    }
}

function renderHoodiesGrid() {
    try {
        const hoodiesGrid = document.getElementById('hoodiesGrid');
        if (!hoodiesGrid || !Array.isArray(db) || !db.length) return;
        
        // Filtrar solo productos de la categoría "Hoodies FMD"
        const hoodies = db.filter(p => p.category === 'Hoodies FMD');
        
        if (hoodies.length === 0) {
            document.getElementById('hoodiesFeatured').style.display = 'none';
            return;
        }
        
        // Mostrar solo los primeros 5 hoodies y el resto oculto
        const maxVisible = 5;
        let html = '';
        hoodies.forEach((product, idx) => {
            // Hoodies: siempre doble estampa por defecto
            const precio = PRECIOS_HOODIES.doble;
            // Si es la 5ta card y hay más de 5, poner el botón y el blur
            if (idx === maxVisible - 1 && hoodies.length > maxVisible) {
                html += `<div class="product-card hoodie-card ver-mas-card" id="verMasHoodiesCard" onclick="filterByCategory('Hoodies FMD')">
                    <span class="variants-badge hoodie-badge">🧥 HOODIE</span>
                    <img src="${product.img}" class="product-img" loading="lazy">
                    <div class="product-info">
                        <div class="product-name">${product.name}</div>
                        <div class="product-meta">${product.year} · Doble estampa</div>
                        <div class="product-price-row">
                            <span class="product-price hoodie-price">$${precio.toLocaleString('es-AR')}</span>
                        </div>
                        <div class="maiden-archive-price-mode">Colección completa</div>
                        <button class="maiden-archive-card-cta" onclick="event.stopPropagation(); filterByCategory('Hoodies FMD')">VER COLECCIÓN →</button>
                    </div>
                </div>`;
            } else if (idx < maxVisible - 1) {
                html += `<div class="product-card hoodie-card" onclick="openModal(${product.id})">
                    <span class="variants-badge hoodie-badge">🧥 HOODIE</span>
                    <img src="${product.img}" class="product-img" loading="lazy">
                    <div class="product-info">
                        <div class="product-name">${product.name}</div>
                        <div class="product-meta">${product.year} · Doble estampa</div>
                        <div class="product-price-row">
                            <span class="product-price hoodie-price">$${precio.toLocaleString('es-AR')}</span>
                        </div>
                    </div>
                </div>`;
            }
        });
        hoodiesGrid.innerHTML = html;
    } catch(e) { console.warn('renderHoodiesGrid error', e); }
}

// Renderizar sección destacada de Buzos Cuello Redondo
function renderBuzosRedondoGrid() {
    try {
        const grid = document.getElementById('buzosRedondoGrid');
        if (!grid || !Array.isArray(db) || !db.length) return;

        const buzos = db
            .filter(p => p.category === 'Buzo Cuello Redondo')
            .sort(compareProductsByPriorityThenId);

        if (buzos.length === 0) {
            const section = document.getElementById('buzosRedondoFeatured');
            if (section) section.style.display = 'none';
            return;
        }

        const maxVisible = 5;
        let html = '';
        buzos.forEach((product, idx) => {
            const precio = PRECIOS_BUZO_REDONDO.doble;
            const launchBadge = product.id === 7014
                ? `<span class="pack-badge pack-badge-launch">LANZAMIENTO</span>`
                : '';
            if (idx === maxVisible - 1 && buzos.length > maxVisible) {
                html += `<div class="product-card hoodie-card ver-mas-card" id="verMasBuzosCard" onclick="filterByCategory('Buzo Cuello Redondo')">
                    <div class="product-badges">
                        ${launchBadge}
                    </div>
                    <img src="${product.img}" class="product-img" loading="lazy">
                    <div class="product-info">
                        <div class="product-name">${product.name}</div>
                        <div class="product-meta">${product.year || ''} · Doble estampa</div>
                        <div class="product-price-row">
                            <span class="product-price hoodie-price">$${precio.toLocaleString('es-AR')}</span>
                        </div>
                        <div class="maiden-archive-price-mode">Colección completa</div>
                        <button class="maiden-archive-card-cta" onclick="event.stopPropagation(); filterByCategory('Buzo Cuello Redondo')">VER COLECCIÓN →</button>
                    </div>
                </div>`;
            } else if (idx < maxVisible - 1) {
                html += `<div class="product-card hoodie-card" onclick="openModal(${product.id})">
                    <div class="product-badges">
                        ${launchBadge}
                    </div>
                    <img src="${product.img}" class="product-img" loading="lazy">
                    <div class="product-info">
                        <div class="product-name">${product.name}</div>
                        <div class="product-meta">${product.year || ''} · Doble estampa</div>
                        <div class="product-price-row">
                            <span class="product-price hoodie-price">$${precio.toLocaleString('es-AR')}</span>
                        </div>
                    </div>
                </div>`;
            }
        });
        grid.innerHTML = html;
    } catch(e) { console.warn('renderBuzosRedondoGrid error', e); }
}

function isMegadethUniverseProduct(product) {
    const category = normalizeText(product?.category);
    const haystack = normalizeText(`${product?.name || ''} ${product?.desc || ''}`);
    const metadata = getMetadataText(product);
    const megadethCategories = [
        'album',
        'dave mustaine',
        'musician',
        'vicrattlehead',
        'singles',
        'tour',
        'dorsales',
        'hoodies fmd',
        'orígenes'
    ].map(normalizeText);

    return megadethCategories.includes(category)
        || /megadeth|mustaine|vic rattlehead|rust in peace|peace sells|youthanasia|countdown/.test(haystack)
        || /megadeth|mustaine|vic rattlehead|tour argentina|edicion argentina|post show/.test(metadata);
}

// Renderizar órbita del hero solo con el universo Megadeth
function renderHeroOrbit(limit = 8) {
    try {
        const orbitRing = document.getElementById('orbitRing');
        if (!orbitRing || !Array.isArray(db) || !db.length) return;

        const heroPool = db.filter(isMegadethUniverseProduct);
        const sourcePool = heroPool.length ? heroPool : db;
        let orbitItems = [];

        // 1. Productos nuevos del universo Megadeth
        sourcePool.forEach(product => {
            if (product.isNew && orbitItems.length < limit) {
                orbitItems.push({
                    productId: product.id,
                    img: product.img,
                    title: product.name
                });
            }
        });

        // 2. Variantes nuevas del universo Megadeth
        sourcePool.forEach(product => {
            if (product.variants && product.variants.length > 0) {
                product.variants.forEach((variant, index) => {
                    if (variant.isNew && orbitItems.length < limit) {
                        const alreadyAdded = orbitItems.some(item => item.productId === product.id);
                        if (!alreadyAdded) {
                            orbitItems.push({
                                productId: product.id,
                                variantIndex: index,
                                img: variant.img,
                                title: `${product.name} - ${variant.name}`
                            });
                        }
                    }
                });
            }
        });

        // 3. Rellenar con productos relevantes si hace falta
        if (orbitItems.length < limit) {
            const sortedProducts = [...sourcePool].sort(compareProductsByPriorityThenId);
            for (const product of sortedProducts) {
                const alreadyAdded = orbitItems.some(item => item.productId === product.id);
                if (!alreadyAdded) {
                    orbitItems.push({
                        productId: product.id,
                        img: product.img,
                        title: product.name
                    });
                }
                if (orbitItems.length >= limit) break;
            }
        }

        orbitItems = orbitItems.slice(0, limit);

        // Renderizar items en la órbita
        orbitRing.innerHTML = orbitItems.map((item, index) => 
            `<div class="orbit-item" onclick="openModal(${item.productId}${item.variantIndex !== undefined ? ', ' + item.variantIndex : ''})" title="${item.title}">
                <img src="${item.img}" alt="${item.title}" loading="lazy">
            </div>`
        ).join('');

        // Intersection Observer para pausar animación cuando no es visible
        setupOrbitObserver();

    } catch (e) {
        console.warn('renderHeroOrbit error', e);
    }
}

// Pausar órbita cuando no está visible (optimización de rendimiento)
function setupOrbitObserver() {
    const heroSection = document.getElementById('heroSection');
    const orbitRing = document.getElementById('orbitRing');
    
    if (!heroSection || !orbitRing || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                orbitRing.classList.remove('paused');
            } else {
                orbitRing.classList.add('paused');
            }
        });
    }, { threshold: 0.1 });

    observer.observe(heroSection);
}

function formatPrecio(tipo) {
    return '$' + PRECIOS[tipo].toLocaleString('es-AR');
}

function formatPreciosDual(product = null) {
    if (product?.category === 'Slayer') {
        if (slayerGarmentPreference === 'hoodie') {
            return `<div class="dual-prices">
        <div class="price-line"><span class="price-amount">$52.000</span><span class="price-label">Hoodie estampa frontal</span></div>
        <div class="price-line"><span class="price-amount">$59.000</span><span class="price-label">Hoodie doble estampa</span></div>
    </div>`;
        }
        if (slayerGarmentPreference === 'buzo') {
            return `<div class="dual-prices">
        <div class="price-line"><span class="price-amount">$50.000</span><span class="price-label">Buzo estampa frontal</span></div>
        <div class="price-line"><span class="price-amount">$55.000</span><span class="price-label">Buzo doble estampa</span></div>
    </div>`;
        }
        if (slayerGarmentPreference === 'remera') {
            return `<div class="dual-prices">
        <div class="price-line"><span class="price-amount">$37.000</span><span class="price-label">Remera estampa frontal</span></div>
        <div class="price-line"><span class="price-amount">$44.000</span><span class="price-label">Remera doble estampa</span></div>
    </div>`;
        }
        return `<div class="dual-prices">
        <div class="price-line"><span class="price-amount">$44.000</span><span class="price-label">Remera doble estampa</span></div>
        <div class="price-line"><span class="price-amount">$59.000</span><span class="price-label">Hoodie doble estampa</span></div>
        <div class="price-line"><span class="price-amount">$55.000</span><span class="price-label">Buzo doble estampa</span></div>
    </div>`;
    }
    const isHoodie = product && (product.category === 'Hoodies FMD' || product.category === 'Hoodies Otras Bandas');
    const isBuzoRedondo = product && product.category === 'Buzo Cuello Redondo';
    const tabla = isHoodie ? PRECIOS_HOODIES : isBuzoRedondo ? PRECIOS_BUZO_REDONDO : PRECIOS;
    const pSimple = '$' + tabla.simple.toLocaleString('es-AR');
    const pDoble = '$' + tabla.doble.toLocaleString('es-AR');
    if (isBuzoRedondo) {
        return `<div class="dual-prices dual-prices-buzo">
        <div class="price-line price-line-primary"><span class="price-amount">${pDoble}</span><span class="price-label">Doble estampa mostrada</span></div>
        <div class="price-line"><span class="price-amount">${pSimple}</span><span class="price-label">Solo frente opcional</span></div>
    </div>`;
    }
    return `<div class="dual-prices">
        <div class="price-line"><span class="price-amount">${pSimple}</span><span class="price-label">Estampa frontal</span></div>
        <div class="price-line"><span class="price-amount">${pDoble}</span><span class="price-label">Doble estampa</span></div>
    </div>`;
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
    
    openWhatsapp(msg);
}

// === FUNCIONES UTILITARIAS REUTILIZABLES ===

// Mostrar notificación flotante
function showNotification(text, duration = 2000) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: var(--magic-green);
        color: #000;
        padding: 12px 20px;
        border-radius: 6px;
        font-weight: 600;
        z-index: 10001;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = text;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, duration);
}

// Copiar al portapapeles con feedback visual
function copyToClipboard(text, feedbackElement = null) {
    navigator.clipboard.writeText(text).then(() => {
        if (feedbackElement) {
            const originalText = feedbackElement.textContent;
            const originalBg = feedbackElement.style.background;
            
            feedbackElement.textContent = '✓';
            feedbackElement.style.background = 'rgba(0, 0, 0, 0.5)';
            
            setTimeout(() => {
                feedbackElement.textContent = originalText;
                feedbackElement.style.background = originalBg;
            }, 1500);
        }
        
        showNotification('✓ Copiado al portapapeles');
    }).catch(err => {
        console.error('Error al copiar:', err);
        showNotification('❌ Error al copiar', 1500);
    });
}

function buildWhatsappFallbackMessage() {
    if (currentProduct) {
        const images = getModalImages();
        const variantName = images?.[currentSlide]?.name ? `\nVariante: ${images[currentSlide].name}` : '';
        return `Hola FMD! Quiero encargar esta prenda 🤘\n\nDiseño: ${currentProduct.name}${variantName}\nTalle: ___\nColor: ___\n\nPor favor confirmame precio, disponibilidad y opciones de envío.`;
    }

    return `Hola FMD! Quiero encargar una prenda de la colección Megadeth 🤘\n\nDiseño: ___\nTalle: ___\nColor: ___\nCP o ciudad: ___\n\n¿Me confirmás precio final y tiempo de envío?`;
}

// Abrir WhatsApp con mensaje
function openWhatsapp(message, source = 'general') {
    const finalMessage = (message && String(message).trim()) ? message : buildWhatsappFallbackMessage();

    if (typeof gtag !== 'undefined') {
        gtag('event', 'whatsapp_click', {
            'event_category': 'engagement',
            'event_label': source,
            'page_path': window.location.pathname,
            'product_name': currentProduct?.name || 'general'
        });
    }
    
    const encodedMessage = encodeURIComponent(finalMessage);
    window.open(`https://wa.me/${WHATSAPP}?text=${encodedMessage}`, '_blank', 'noopener');
}

const BASE_URL = window.location.origin + window.location.pathname;
const DORSO_CATEGORIES = new Set(['Album','Tour','Musician','Dave Mustaine','Metallica','Pantera','Iron Maiden','Avenged Sevenfold']);

let selectedDorsoChips = new Set();
let selectedBacks = new Set();
let dorsoAutocompletePool = [];

const MGX_SHOWCASE_TABS = [
    { key: 'todo', label: 'Todo Megadeth' },
    { key: 'nuevos', label: 'Nuevos' },
    { key: 'tour', label: 'Tour 2026' },
    { key: 'albumes', label: 'Albumes' },
    { key: 'musicos', label: 'Musicos' },
    { key: 'dorsos', label: 'Dorsos' }
];

const mgxState = {
    tab: 'todo',
    prenda: 'all',
    estampa: 'all'
};

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

    const images = currentProduct ? getModalImages() : [];
    const variant = images?.[currentSlide]?.name ? `\nVariante: ${images[currentSlide].name}` : '';
    const selectedBackVariant = (selectedBackIndex >= 0 && currentProduct?.variants?.[selectedBackIndex])
        ? `\nDorso elegido: ${currentProduct.variants[selectedBackIndex].name}`
        : '';

    const chips = selectedDorsoChips.size
        ? `\nDorso (ideas): ${Array.from(selectedDorsoChips).join(' + ')}`
        : '';

    const backs = selectedBacks.size
        ? `\nEjemplos elegidos: ${Array.from(selectedBacks).join(' | ')}`
        : '';

    const input = (document.getElementById('dorsoCustomInput')?.value || '').trim();
    const custom = input ? `\nDetalle personalizado: ${input}` : '';

    return `${base}${variant}${selectedBackVariant}${chips}${backs}${custom}\n\nTalle: ___  Color: ___  Ciudad: ___`;
}

function updateDobleWaLink(){
    const btn = document.getElementById('btnDobleAction');
    if(!btn) return;
    const text = buildDobleMessage();
    
    // Reemplazar el href con un onclick que use la función centralizada
    btn.onclick = (e) => {
        e.preventDefault();
        openWhatsapp(text);
    };
    
    btn.href = '#'; // Placeholder para accesibilidad
    
    // Actualizar precio según si hay dorso seleccionado
    updateModalPrices();
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

// === SELECTOR DE DORSO PARA DOBLE ESTAMPA ===

// Detectar variantes de dorso en el producto actual
function getDorsoVariants(product) {
    if (!product || !product.variants) return [];
    return product.variants
        .map((v, index) => ({ ...v, index }))
    .filter(v => isBackVariant(v));
}

// Renderizar selector de dorso con variantes disponibles
function renderDorsoSelector() {
    const variantsSection = document.getElementById('dorsoVariantsSection');
    const variantsGrid = document.getElementById('dorsoVariantsGrid');
    const customSection = document.getElementById('dorsoCustomSection');
    const summarySection = document.getElementById('dorsoSelectionSummary');
    
    if (!variantsSection || !variantsGrid || !currentProduct) return;
    
    const dorsoVariants = getDorsoVariants(currentProduct);
    
    if (dorsoVariants.length > 0) {
        // Hay variantes de dorso disponibles
        variantsSection.style.display = 'block';
        customSection.style.display = 'none'; // Ocultar opciones de personalización
        hideDorsoAutocomplete();
        
        variantsGrid.innerHTML = dorsoVariants.map(v => `
            <div class="dorso-variant-item" data-index="${v.index}" onclick="selectDorsoVariant(${v.index})" 
                 style="cursor:pointer;border:2px solid #333;border-radius:8px;overflow:hidden;transition:all 0.2s;">
                <img src="${v.img}" alt="${v.name}" style="width:100%;height:60px;object-fit:cover;">
                <div style="font-size:0.7rem;color:#888;text-align:center;padding:4px;background:#111;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                    ${v.name.replace('Dorso ', '').replace(' Dorso', '')}
                </div>
            </div>
        `).join('');
    } else {
        // No hay variantes de dorso, mostrar opciones de personalización
        variantsSection.style.display = 'none';
        customSection.style.display = 'block';
    }
    
    // Resetear resumen
    if (summarySection) summarySection.style.display = 'none';
}

// Seleccionar una variante de dorso
function selectDorsoVariant(index) {
    const variantsGrid = document.getElementById('dorsoVariantsGrid');
    const summarySection = document.getElementById('dorsoSelectionSummary');
    const summaryText = document.getElementById('dorsoSelectionText');
    
    if (!variantsGrid || !currentProduct || !currentProduct.variants) return;
    
    // Actualizar variable global
    if (selectedBackIndex === index) {
        // Si ya estaba seleccionado, deseleccionar
        selectedBackIndex = -1;
    } else {
        selectedBackIndex = index;
    }
    
    // Actualizar UI - marcar el seleccionado
    variantsGrid.querySelectorAll('.dorso-variant-item').forEach(item => {
        const itemIndex = parseInt(item.dataset.index);
        if (itemIndex === selectedBackIndex) {
            item.style.borderColor = '#39ff14';
            item.style.boxShadow = '0 0 10px rgba(57,255,20,0.3)';
        } else {
            item.style.borderColor = '#333';
            item.style.boxShadow = 'none';
        }
    });
    
    // Actualizar resumen
    if (summarySection && summaryText) {
        if (selectedBackIndex >= 0 && currentProduct.variants[selectedBackIndex]) {
            const variant = currentProduct.variants[selectedBackIndex];
            summaryText.textContent = variant.name;
            summarySection.style.display = 'block';
        } else {
            summarySection.style.display = 'none';
        }
    }
    
    // Actualizar precio (simple si no hay dorso, doble si hay)
    updateModalPrices();
    updateDobleWaLink();
}

function hideDorsoAutocomplete() {
    const box = document.getElementById('dorsoAutocomplete');
    const list = document.getElementById('dorsoAutocompleteList');
    if (list) list.innerHTML = '';
    if (box) box.style.display = 'none';
}

function buildDorsoAutocompletePool() {
    if (!Array.isArray(db) || !db.length) {
        dorsoAutocompletePool = [];
        return;
    }

    const unique = new Map();
    const pushSuggestion = (rawValue) => {
        const value = String(rawValue || '').trim();
        if (!value || value.length < 3) return;
        const key = normalizeText(value);
        if (!key || unique.has(key)) return;
        unique.set(key, value);
    };

    db.forEach(product => {
        if (!product) return;

        if (DORSO_CATEGORIES.has(product.category) || normalizeText(product.category) === 'dorsales') {
            pushSuggestion(product.name);
        }

        if (Array.isArray(product.variants)) {
            product.variants.forEach(variant => {
                const variantName = String(variant?.name || '').trim();
                const looksLikeBack = isBackVariant(variant) || /dorso|espalda|back|tour|tracklist|logo/i.test(variantName);
                if (looksLikeBack) pushSuggestion(variantName);
            });
        }

        if (Array.isArray(product.backs)) {
            product.backs.forEach(back => {
                if (typeof back === 'string') return;
                pushSuggestion(back?.name);
            });
        }
    });

    dorsoAutocompletePool = Array.from(unique.values()).slice(0, 220);
}

function getDorsoAutocompleteSuggestions(query, limit = 7) {
    if (!Array.isArray(dorsoAutocompletePool) || !dorsoAutocompletePool.length) return [];
    const normalizedQuery = normalizeText(query);

    if (!normalizedQuery) {
        return dorsoAutocompletePool.slice(0, limit);
    }

    const startsWith = [];
    const includes = [];
    dorsoAutocompletePool.forEach(item => {
        const normalizedItem = normalizeText(item);
        if (normalizedItem.startsWith(normalizedQuery)) {
            startsWith.push(item);
        } else if (normalizedItem.includes(normalizedQuery)) {
            includes.push(item);
        }
    });

    return [...startsWith, ...includes].slice(0, limit);
}

function applyDorsoSuggestion(value) {
    const input = document.getElementById('dorsoCustomInput');
    if (!input) return;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    hideDorsoAutocomplete();
}

function renderDorsoAutocomplete(query = '') {
    const customSection = document.getElementById('dorsoCustomSection');
    const box = document.getElementById('dorsoAutocomplete');
    const list = document.getElementById('dorsoAutocompleteList');
    if (!customSection || !box || !list) return;

    const customHidden = window.getComputedStyle(customSection).display === 'none';
    if (customHidden) {
        hideDorsoAutocomplete();
        return;
    }

    const suggestions = getDorsoAutocompleteSuggestions(query, 7);
    if (!suggestions.length) {
        hideDorsoAutocomplete();
        return;
    }

    list.innerHTML = suggestions.map(item =>
        `<button type="button" class="chip" data-suggestion="${item.replace(/"/g, '&quot;')}" style="border:1px solid #333;background:#111;color:#d7d7d7;">${item}</button>`
    ).join('');

    list.querySelectorAll('[data-suggestion]').forEach(btn => {
        btn.addEventListener('pointerdown', (event) => {
            event.preventDefault();
            applyDorsoSuggestion(btn.dataset.suggestion || '');
        });
    });

    box.style.display = 'block';
}

// === ELEMENTOS DOM ===
const productsGrid = document.getElementById('productsGrid');
const categoryNav = document.getElementById('categoryNav');
const modal = document.getElementById('modal');
const carousel = document.getElementById('carousel');
const carouselDots = document.getElementById('carouselDots');
const modalZoomInBtn = document.getElementById('modalZoomIn');
const modalZoomOutBtn = document.getElementById('modalZoomOut');
const modalZoomResetBtn = document.getElementById('carouselReset');
const fullZoomInBtn = document.getElementById('zoomIn');
const fullZoomOutBtn = document.getElementById('zoomOut');
const fullZoomResetBtn = document.getElementById('zoomReset');
const searchInput = document.getElementById('searchInput');
const searchClear = document.getElementById('searchClear');
const zoomOverlay = document.getElementById('zoomOverlay');
const zoomImg = document.getElementById('zoomImg');
const viewGridBtn = document.getElementById('viewGrid');
const viewGalleryBtn = document.getElementById('viewGallery');

let currentProduct = null;
let currentSlide = 0;
let currentModalImages = [];
let currentModalSourceIndexes = [];
let scrollPosition = 0;
let isScrolling = false;
let scrollTimeout;
let currentView = 'grid';
let currentCategory = 'Album';
let currentSearch = '';
const MODAL_ZOOM_MIN = 1;
const MODAL_ZOOM_MAX = 3;
const MODAL_ZOOM_STEP = 0.25;
const FULL_ZOOM_MIN = 1;
const FULL_ZOOM_MAX = 4;
const FULL_ZOOM_STEP = 0.25;
let modalImageZoom = {
    scale: 1,
    x: 0,
    y: 0,
    isDragging: false,
    isPinching: false,
    lastX: 0,
    lastY: 0,
    dragMoved: false,
    pointerId: null,
    pinchStartDistance: 0,
    pinchStartScale: 1,
    pinchLastCenterX: 0,
    pinchLastCenterY: 0
};
let fullImageZoom = {
    scale: 1,
    x: 0,
    y: 0,
    isDragging: false,
    isPinching: false,
    lastX: 0,
    lastY: 0,
    pointerId: null,
    pinchStartDistance: 0,
    pinchStartScale: 1
};

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
    if (!p?.variants || !p.variants.length) {
        return [{ img: p?.img, name: '', role: 'front' }];
    }

    const variants = p.variants.map(v => ({ ...v }));
    const hasFront = variants.some(isFrontVariant) || variants.some(v => !isBackVariant(v));
    const hasBack = variants.some(isBackVariant);

    if (!hasFront && hasBack) {
        const fallbackFront = { img: p.img, name: p.name || 'Frente', role: 'front' };
        variants.unshift(fallbackFront);
    }

    return variants;
}

function getModalImages() {
    if (Array.isArray(currentModalImages) && currentModalImages.length) {
        return currentModalImages;
    }
    return currentProduct ? getImages(currentProduct) : [];
}

function getActiveVariantIndex() {
    if (!Array.isArray(currentModalSourceIndexes) || !currentModalSourceIndexes.length) {
        return currentSlide;
    }

    const safeSlide = Math.max(0, Math.min(currentSlide, currentModalSourceIndexes.length - 1));
    const sourceIndex = currentModalSourceIndexes[safeSlide];
    return Number.isFinite(sourceIndex) ? sourceIndex : currentSlide;
}

function getAutoHighlightSlideIndex(product, images) {
    if (!product || !Array.isArray(images) || !images.length) return -1;

    return -1;
}

function openModal(id, variantIndex = undefined, scopedVariantIndexes = undefined) {
    currentProduct = db.find(p => p.id === id);
    if (!currentProduct) return;

    scrollPosition = window.pageYOffset;
    document.body.classList.add('modal-open');
    document.body.style.top = `-${scrollPosition}px`;

    history.pushState({ modal: true, id }, '', `#producto-${id}`);
    const images = getImages(currentProduct);
    const hasSpecificVariant = variantIndex !== undefined && variantIndex !== null;
    const hasScopedVariants = Array.isArray(scopedVariantIndexes) && scopedVariantIndexes.length > 0;
    const autoHighlightSlide = hasSpecificVariant ? -1 : getAutoHighlightSlideIndex(currentProduct, images);

    if (hasScopedVariants) {
        const safeScopedIndexes = Array.from(new Set(
            scopedVariantIndexes
                .map(index => Number(index))
                .filter(index => Number.isFinite(index) && index >= 0 && index < images.length)
        ));

        if (!safeScopedIndexes.length) {
            currentModalImages = images;
            currentModalSourceIndexes = images.map((_, index) => index);
            currentSlide = autoHighlightSlide >= 0 ? autoHighlightSlide : 0;
        } else {
            currentModalSourceIndexes = safeScopedIndexes;
            currentModalImages = safeScopedIndexes.map(index => images[index]);

            const safeVariantIndex = Math.max(0, Math.min(Number(variantIndex) || 0, images.length - 1));
            const scopedStartIndex = currentModalSourceIndexes.indexOf(safeVariantIndex);
            currentSlide = scopedStartIndex >= 0 ? scopedStartIndex : 0;
        }
    } else if (hasSpecificVariant) {
        const safeVariantIndex = Math.max(0, Math.min(Number(variantIndex) || 0, images.length - 1));
        currentModalImages = [images[safeVariantIndex]];
        currentModalSourceIndexes = [safeVariantIndex];
        currentSlide = 0;
    } else {
        currentModalImages = images;
        currentModalSourceIndexes = images.map((_, index) => index);
        currentSlide = autoHighlightSlide >= 0 ? autoHighlightSlide : 0;
    }

    const modalImages = getModalImages();

    carousel.innerHTML = modalImages.map(v => `
        <div class="carousel-slide"><img src="${v.img}" alt="${currentProduct.name}"></div>
    `).join('');
    resetModalImageZoom();

    carouselDots.innerHTML = modalImages.length > 1 ? modalImages.map((_, i) => `<div class="carousel-dot${i === currentSlide ? ' active' : ''}" data-index="${i}"></div>`).join('') : '';
    
    // Añadir click listeners a los dots para que sean navegables
    if (modalImages.length > 1) {
        document.querySelectorAll('.carousel-dot').forEach(dot => {
            dot.addEventListener('click', function() {
                const index = parseInt(this.dataset.index);
                goToSlide(index, true); // smooth = true para clicks en dots
            });
        });
    }

    // Ir al slide correcto (sin animación al abrir)
    if (currentSlide > 0) {
        // Usar setTimeout para que el DOM esté listo
        setTimeout(() => goToSlide(currentSlide, false), 0);
    } else {
        carousel.scrollLeft = 0;
    }
    selectedDorsoChips.clear();
    selectedBacks.clear();
    document.querySelectorAll('#chipsRow .chip').forEach(c => c.classList.remove('active'));
    const dorsoInput = document.getElementById('dorsoCustomInput');
    if(dorsoInput) dorsoInput.value = '';
    hideDorsoAutocomplete();
    
    // Estilos para reset
    const activeStyle = 'background:#e8432e;border:1px solid #e8432e;color:#fff;padding:6px 12px;border-radius:5px;font-size:0.8rem;font-weight:500;cursor:pointer;';
    const inactiveStyle = 'background:#1a1a1a;border:1px solid #333;color:#888;padding:6px 12px;border-radius:5px;font-size:0.8rem;font-weight:500;cursor:pointer;';
    const activeColorStyle = 'background:#e8432e;border:1px solid #e8432e;color:#fff;padding:6px 12px;border-radius:5px;font-size:0.8rem;font-weight:500;cursor:pointer;display:flex;align-items:center;gap:6px;';
    const inactiveColorStyle = 'background:#1a1a1a;border:1px solid #333;color:#888;padding:6px 12px;border-radius:5px;font-size:0.8rem;font-weight:500;cursor:pointer;display:flex;align-items:center;gap:6px;';
    
    // Reset todas las opciones del modal
    selectedAge = '';
    selectedSize = '';
    selectedCut = '';
    selectedColor = '';
    selectedBackIndex = -1; // Reset dorso seleccionado
    
    // Reset botones de edad (sin preselección)
    document.querySelectorAll('#ageSelector button').forEach(btn => {
        btn.classList.remove('active');
        btn.style.cssText = inactiveStyle;
    });
    
    // Reset botones de talle (ninguno seleccionado)
    document.querySelectorAll('#sizeSelector button, #sizeSelectorKids button').forEach(btn => {
        btn.classList.remove('active');
        if (!btn.classList.contains('size-oversize')) {
            btn.style.cssText = inactiveStyle;
        }
    });
    
    // Ocultar talles oversize (XXS, XS)
    document.querySelectorAll('#sizeSelector .size-oversize').forEach(btn => {
        btn.style.display = 'none';
    });
    
    // Mostrar talles adulto, ocultar niños
    const sizeAdult = document.getElementById('sizeSelector');
    const sizeKids = document.getElementById('sizeSelectorKids');
    if (sizeAdult) sizeAdult.style.display = 'flex';
    if (sizeKids) sizeKids.style.display = 'none';
    
    // Mostrar botón Oversize (porque es adulto por defecto)
    const btnOversize = document.getElementById('btnOversize');
    if (btnOversize) btnOversize.style.display = '';
    
    // Reset botones de corte (sin preselección)
    document.querySelectorAll('#cutSelector button').forEach(btn => {
        btn.classList.remove('active');
        btn.style.cssText = inactiveStyle;
    });
    
    // Reset botones de color (sin preselección)
    document.querySelectorAll('#colorSelector button').forEach(btn => {
        btn.classList.remove('active');
        btn.style.cssText = inactiveColorStyle;
    });
    
    // === LÓGICA ESPECIAL PARA HOODIES Y BUZOS CUELLO REDONDO ===
    const garmentCategory = getActiveGarmentCategory(currentProduct);
    const isHoodie = garmentCategory === 'Hoodies FMD' || garmentCategory === 'Hoodies Otras Bandas';
    const isBuzoRedondo = garmentCategory === 'Buzo Cuello Redondo';
    const hoodieInfoBanner = document.getElementById('hoodieInfoBanner');
    const buzoRedondoInfoBanner = document.getElementById('buzoRedondoInfoBanner');
    const ageGroup = document.getElementById('ageGroup');
    const cutGroup = document.getElementById('cutGroup');
    
    if (isHoodie) {
        // Mostrar banner de hoodie
        if (hoodieInfoBanner) hoodieInfoBanner.style.display = 'block';
        if (buzoRedondoInfoBanner) buzoRedondoInfoBanner.style.display = 'none';
        
        // Ocultar selector de edad (solo adultos para hoodies)
        if (ageGroup) ageGroup.style.display = 'none';
        
        // Ocultar selector de corte (solo oversize para hoodies)
        if (cutGroup) cutGroup.style.display = 'none';
        
        // Forzar oversize como corte seleccionado
        selectedCut = 'oversize';
        selectedAge = 'adulto';
        
        // Mostrar solo talle XS para hoodies (XS a XXL)
        document.querySelectorAll('#sizeSelector .size-oversize').forEach(btn => {
            if (btn.dataset.size === 'XS') {
                btn.style.display = '';
                btn.style.cssText = inactiveStyle;
            } else {
                btn.style.display = 'none'; // Ocultar XXS
            }
        });
    } else if (isBuzoRedondo) {
        // Mostrar banner de buzo cuello redondo
        if (hoodieInfoBanner) hoodieInfoBanner.style.display = 'none';
        if (buzoRedondoInfoBanner) buzoRedondoInfoBanner.style.display = 'block';
        
        // Ocultar selector de edad (unisex)
        if (ageGroup) ageGroup.style.display = 'none';
        
        // Ocultar selector de corte (corte amplio fijo)
        if (cutGroup) cutGroup.style.display = 'none';
        
        // Forzar corte amplio y adulto
        selectedCut = 'oversize';
        selectedAge = 'adulto';
        
        // Mostrar tallaje oversize para buzo cuello redondo (S a XXL)
        document.querySelectorAll('#sizeSelector .size-oversize').forEach(btn => {
            if (btn.dataset.size === 'XS') {
                btn.style.display = '';
                btn.style.cssText = inactiveStyle;
            } else {
                btn.style.display = 'none';
            }
        });
    } else {
        // Restaurar comportamiento normal para remeras
        if (hoodieInfoBanner) hoodieInfoBanner.style.display = 'none';
        if (buzoRedondoInfoBanner) buzoRedondoInfoBanner.style.display = 'none';
        if (ageGroup) ageGroup.style.display = 'flex';
        if (cutGroup) cutGroup.style.display = 'flex';
    }
    
    updateModalInfo();
    
    // Mostrar/ocultar flechas según cantidad de imágenes
    try {
        const prevBtn = document.getElementById('carouselPrev');
        const nextBtn = document.getElementById('carouselNext');
        const dotsContainer = document.getElementById('carouselDots');
        
        const lockToSingle = hasSpecificVariant && !hasScopedVariants;
        if (lockToSingle) {
            // Ocultar navegación si es variante específica
            if(prevBtn) prevBtn.style.display = 'none';
            if(nextBtn) nextBtn.style.display = 'none';
            if(dotsContainer) dotsContainer.style.display = 'none';
        } else {
            // Mostrar/ocultar según cantidad de imágenes
            if (modalImages.length > 1) {
                if(prevBtn) prevBtn.style.display = '';
                if(nextBtn) nextBtn.style.display = '';
                if(dotsContainer) dotsContainer.style.display = '';
            } else {
                if(prevBtn) prevBtn.style.display = 'none';
                if(nextBtn) nextBtn.style.display = 'none';
                if(dotsContainer) dotsContainer.style.display = 'none';
            }
        }
    } catch (e) { /* no bloquear si falla */ }

    // Actualizar contador del carrito en el modal
    const modalCartCount = document.getElementById('modalCartCount');
    if (modalCartCount) {
        modalCartCount.textContent = cart.getCart().length;
    }

    const modalAdvancedPanel = document.getElementById('modalAdvancedPanel');
    if (modalAdvancedPanel) {
        modalAdvancedPanel.open = isDoubleByDefault(currentProduct);
    }

    modal.classList.add('active');
    // Adjuntar listeners del carrusel una vez el modal está listo
    attachCarouselListeners();
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
// Exponer openModal globalmente para onclick
window.openModal = openModal;

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
    currentModalImages = [];
    currentModalSourceIndexes = [];
    resetModalImageZoom();
    closeZoom();
}

function openZoom(src) {
    zoomImg.src = src;
    resetFullImageZoom();
    zoomOverlay.style.display = 'flex';
    setTimeout(() => zoomOverlay.classList.add('active'), 10);
}

function closeZoom() {
    zoomOverlay.classList.remove('active');
    setTimeout(() => {
        zoomOverlay.style.display = 'none';
        resetFullImageZoom();
    }, 300);
}

function clampFullImageZoomPan() {
    if (!zoomImg || fullImageZoom.scale <= FULL_ZOOM_MIN) {
        fullImageZoom.x = 0;
        fullImageZoom.y = 0;
        return;
    }

    const overflowX = Math.max(0, (zoomImg.clientWidth * (fullImageZoom.scale - 1)) / 2);
    const overflowY = Math.max(0, (zoomImg.clientHeight * (fullImageZoom.scale - 1)) / 2);
    fullImageZoom.x = Math.max(-overflowX, Math.min(overflowX, fullImageZoom.x));
    fullImageZoom.y = Math.max(-overflowY, Math.min(overflowY, fullImageZoom.y));
}

function applyFullImageZoom() {
    clampFullImageZoomPan();
    const isZoomed = fullImageZoom.scale > FULL_ZOOM_MIN;
    zoomImg.style.transform = isZoomed
        ? `translate(${fullImageZoom.x}px, ${fullImageZoom.y}px) scale(${fullImageZoom.scale})`
        : '';
    zoomImg.classList.toggle('zoomed', isZoomed);
    if (fullZoomOutBtn) fullZoomOutBtn.disabled = fullImageZoom.scale <= FULL_ZOOM_MIN;
    if (fullZoomResetBtn) fullZoomResetBtn.disabled = fullImageZoom.scale <= FULL_ZOOM_MIN;
    if (fullZoomInBtn) fullZoomInBtn.disabled = fullImageZoom.scale >= FULL_ZOOM_MAX;
}

function setFullImageZoom(scale) {
    fullImageZoom.scale = Math.max(FULL_ZOOM_MIN, Math.min(FULL_ZOOM_MAX, scale));
    if (fullImageZoom.scale <= FULL_ZOOM_MIN) {
        fullImageZoom.scale = FULL_ZOOM_MIN;
        fullImageZoom.x = 0;
        fullImageZoom.y = 0;
    }
    applyFullImageZoom();
}

function resetFullImageZoom() {
    fullImageZoom = {
        scale: 1,
        x: 0,
        y: 0,
        isDragging: false,
        isPinching: false,
        lastX: 0,
        lastY: 0,
        pointerId: null,
        pinchStartDistance: 0,
        pinchStartScale: 1
    };
    if (zoomImg) {
        zoomImg.style.transform = '';
        zoomImg.classList.remove('zoomed');
    }
}

function onFullZoomWheel(e) {
    if (!zoomOverlay.classList.contains('active')) return;
    e.preventDefault();
    const direction = e.deltaY > 0 ? -1 : 1;
    setFullImageZoom(fullImageZoom.scale + direction * FULL_ZOOM_STEP);
}

function onFullZoomTouchStart(e) {
    if (!zoomOverlay.classList.contains('active')) return;
    if (e.touches.length === 1 && fullImageZoom.scale > FULL_ZOOM_MIN) {
        e.preventDefault();
        fullImageZoom.isDragging = true;
        fullImageZoom.isPinching = false;
        fullImageZoom.lastX = e.touches[0].clientX;
        fullImageZoom.lastY = e.touches[0].clientY;
        return;
    }

    if (e.touches.length < 2) return;
    e.preventDefault();
    fullImageZoom.isPinching = true;
    fullImageZoom.isDragging = false;
    fullImageZoom.pinchStartDistance = getTouchDistance(e.touches);
    fullImageZoom.pinchStartScale = fullImageZoom.scale;
}

function onFullZoomTouchMove(e) {
    if (fullImageZoom.isPinching && e.touches.length >= 2) {
        e.preventDefault();
        const currentDistance = getTouchDistance(e.touches);
        if (!fullImageZoom.pinchStartDistance) return;
        setFullImageZoom(fullImageZoom.pinchStartScale * (currentDistance / fullImageZoom.pinchStartDistance));
        return;
    }

    if (!fullImageZoom.isDragging || fullImageZoom.scale <= FULL_ZOOM_MIN || e.touches.length !== 1) return;
    e.preventDefault();
    const touch = e.touches[0];
    fullImageZoom.x += touch.clientX - fullImageZoom.lastX;
    fullImageZoom.y += touch.clientY - fullImageZoom.lastY;
    fullImageZoom.lastX = touch.clientX;
    fullImageZoom.lastY = touch.clientY;
    applyFullImageZoom();
}

function endFullZoomTouch(e) {
    if (e.touches && e.touches.length >= 2) return;
    fullImageZoom.isDragging = false;
    fullImageZoom.isPinching = false;
    fullImageZoom.pinchStartDistance = 0;
    fullImageZoom.pinchStartScale = fullImageZoom.scale;
    applyFullImageZoom();
}

function onFullZoomPointerDown(e) {
    if (e.pointerType === 'touch' || fullImageZoom.scale <= FULL_ZOOM_MIN) return;
    e.preventDefault();
    fullImageZoom.isDragging = true;
    fullImageZoom.lastX = e.clientX;
    fullImageZoom.lastY = e.clientY;
    fullImageZoom.pointerId = e.pointerId;
    zoomImg.setPointerCapture?.(e.pointerId);
}

function onFullZoomPointerMove(e) {
    if (e.pointerType === 'touch' || !fullImageZoom.isDragging || fullImageZoom.pointerId !== e.pointerId) return;
    e.preventDefault();
    fullImageZoom.x += e.clientX - fullImageZoom.lastX;
    fullImageZoom.y += e.clientY - fullImageZoom.lastY;
    fullImageZoom.lastX = e.clientX;
    fullImageZoom.lastY = e.clientY;
    applyFullImageZoom();
}

function endFullZoomPointerDrag(e) {
    if (e.pointerType === 'touch' || fullImageZoom.pointerId !== e.pointerId) return;
    fullImageZoom.isDragging = false;
    fullImageZoom.pointerId = null;
    applyFullImageZoom();
}

function getActiveCarouselImage() {
    if (!carousel) return null;
    const slides = carousel.querySelectorAll('.carousel-slide img');
    return slides[currentSlide] || slides[0] || null;
}

function clampModalZoomPan() {
    const img = getActiveCarouselImage();
    if (!img || modalImageZoom.scale <= MODAL_ZOOM_MIN) {
        modalImageZoom.x = 0;
        modalImageZoom.y = 0;
        return;
    }

    const slide = img.closest('.carousel-slide');
    const viewportWidth = slide?.clientWidth || carousel?.clientWidth || img.clientWidth;
    const viewportHeight = slide?.clientHeight || img.clientHeight;
    const scaleOverflowX = Math.max(0, ((img.clientWidth * modalImageZoom.scale) - viewportWidth) / 2);
    const scaleOverflowY = Math.max(0, ((img.clientHeight * modalImageZoom.scale) - viewportHeight) / 2);
    modalImageZoom.x = Math.max(-scaleOverflowX, Math.min(scaleOverflowX, modalImageZoom.x));
    modalImageZoom.y = Math.max(-scaleOverflowY, Math.min(scaleOverflowY, modalImageZoom.y));
}

function updateModalZoomControls() {
    if (modalZoomOutBtn) modalZoomOutBtn.disabled = modalImageZoom.scale <= MODAL_ZOOM_MIN;
    if (modalZoomResetBtn) modalZoomResetBtn.disabled = modalImageZoom.scale <= MODAL_ZOOM_MIN;
    if (modalZoomInBtn) modalZoomInBtn.disabled = modalImageZoom.scale >= MODAL_ZOOM_MAX;
}

function applyModalImageZoom() {
    if (!carousel) return;
    const activeImg = getActiveCarouselImage();

    carousel.querySelectorAll('.carousel-slide img').forEach(img => {
        if (img !== activeImg) {
            img.style.transform = '';
            img.classList.remove('is-inline-zoomed', 'is-inline-dragging');
        }
    });

    clampModalZoomPan();
    const isZoomed = modalImageZoom.scale > MODAL_ZOOM_MIN;
    carousel.classList.toggle('is-zoomed', isZoomed);

    if (activeImg) {
        activeImg.style.transform = isZoomed
            ? `translate(${modalImageZoom.x}px, ${modalImageZoom.y}px) scale(${modalImageZoom.scale})`
            : '';
        activeImg.classList.toggle('is-inline-zoomed', isZoomed);
        activeImg.classList.toggle('is-inline-dragging', modalImageZoom.isDragging || modalImageZoom.isPinching);
    }

    updateModalZoomControls();
}

function setModalImageZoom(scale) {
    modalImageZoom.scale = Math.max(MODAL_ZOOM_MIN, Math.min(MODAL_ZOOM_MAX, scale));
    if (modalImageZoom.scale <= MODAL_ZOOM_MIN) {
        modalImageZoom.scale = MODAL_ZOOM_MIN;
        modalImageZoom.x = 0;
        modalImageZoom.y = 0;
    }
    applyModalImageZoom();
}

function resetModalImageZoom() {
    modalImageZoom = {
        scale: 1,
        x: 0,
        y: 0,
        isDragging: false,
        isPinching: false,
        lastX: 0,
        lastY: 0,
        dragMoved: false,
        pointerId: null,
        pinchStartDistance: 0,
        pinchStartScale: 1,
        pinchLastCenterX: 0,
        pinchLastCenterY: 0
    };
    applyModalImageZoom();
}

function isModalImageZoomed() {
    return modalImageZoom.scale > MODAL_ZOOM_MIN;
}

function onModalZoomWheel(e) {
    if (!modal.classList.contains('active')) return;
    const targetImg = e.target.closest?.('.carousel-slide img');
    if (!targetImg) return;

    e.preventDefault();
    const direction = e.deltaY > 0 ? -1 : 1;
    setModalImageZoom(modalImageZoom.scale + direction * MODAL_ZOOM_STEP);
}

function getTouchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
}

function getTouchCenter(touches) {
    return {
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2
    };
}

function getModalZoomCenterOffset(clientX, clientY) {
    const img = getActiveCarouselImage();
    const slide = img?.closest('.carousel-slide');
    const rect = (slide || carousel || img)?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };

    return {
        x: clientX - (rect.left + rect.width / 2),
        y: clientY - (rect.top + rect.height / 2)
    };
}

function onModalZoomTouchStart(e) {
    if (!modal.classList.contains('active')) return;
    const targetImg = e.target.closest?.('.carousel-slide img');
    if (!targetImg) return;

    if (e.touches.length === 1 && isModalImageZoomed()) {
        e.preventDefault();
        modalImageZoom.isDragging = true;
        modalImageZoom.isPinching = false;
        modalImageZoom.lastX = e.touches[0].clientX;
        modalImageZoom.lastY = e.touches[0].clientY;
        modalImageZoom.dragMoved = false;
        applyModalImageZoom();
        return;
    }

    if (e.touches.length < 2) return;

    e.preventDefault();
    modalImageZoom.isPinching = true;
    modalImageZoom.isDragging = false;
    modalImageZoom.pinchStartDistance = getTouchDistance(e.touches);
    modalImageZoom.pinchStartScale = modalImageZoom.scale;
    const center = getTouchCenter(e.touches);
    modalImageZoom.pinchLastCenterX = center.x;
    modalImageZoom.pinchLastCenterY = center.y;
}

function onModalZoomTouchMove(e) {
    if (modalImageZoom.isPinching && e.touches.length >= 2) {
        e.preventDefault();
        const currentDistance = getTouchDistance(e.touches);
        if (!modalImageZoom.pinchStartDistance) return;

        const previousScale = modalImageZoom.scale;
        const center = getTouchCenter(e.touches);
        const centerOffset = getModalZoomCenterOffset(center.x, center.y);
        const nextScale = modalImageZoom.pinchStartScale * (currentDistance / modalImageZoom.pinchStartDistance);
        const clampedScale = Math.max(MODAL_ZOOM_MIN, Math.min(MODAL_ZOOM_MAX, nextScale));
        const ratio = previousScale > 0 ? clampedScale / previousScale : 1;
        const centerMoveX = center.x - modalImageZoom.pinchLastCenterX;
        const centerMoveY = center.y - modalImageZoom.pinchLastCenterY;

        modalImageZoom.x = centerOffset.x - (centerOffset.x - modalImageZoom.x) * ratio + centerMoveX;
        modalImageZoom.y = centerOffset.y - (centerOffset.y - modalImageZoom.y) * ratio + centerMoveY;
        modalImageZoom.pinchLastCenterX = center.x;
        modalImageZoom.pinchLastCenterY = center.y;
        setModalImageZoom(clampedScale);
        return;
    }

    if (!modalImageZoom.isDragging || !isModalImageZoomed() || e.touches.length !== 1) return;

    e.preventDefault();
    const touch = e.touches[0];
    const dx = touch.clientX - modalImageZoom.lastX;
    const dy = touch.clientY - modalImageZoom.lastY;
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) modalImageZoom.dragMoved = true;
    modalImageZoom.x += dx;
    modalImageZoom.y += dy;
    modalImageZoom.lastX = touch.clientX;
    modalImageZoom.lastY = touch.clientY;
    applyModalImageZoom();
}

function endModalZoomTouch(e) {
    if (e.touches && e.touches.length >= 2) return;

    modalImageZoom.isPinching = false;
    modalImageZoom.isDragging = false;
    modalImageZoom.pinchStartDistance = 0;
    modalImageZoom.pinchStartScale = modalImageZoom.scale;
    applyModalImageZoom();
}

function onModalZoomPointerDown(e) {
    if (e.pointerType === 'touch') return;
    if (modalImageZoom.isPinching) return;
    if (!isModalImageZoomed()) return;
    const targetImg = e.target.closest?.('.carousel-slide img');
    if (!targetImg) return;

    e.preventDefault();
    modalImageZoom.isDragging = true;
    modalImageZoom.lastX = e.clientX;
    modalImageZoom.lastY = e.clientY;
    modalImageZoom.dragMoved = false;
    modalImageZoom.pointerId = e.pointerId;
    targetImg.setPointerCapture?.(e.pointerId);
    applyModalImageZoom();
}

function onModalZoomPointerMove(e) {
    if (e.pointerType === 'touch') return;
    if (modalImageZoom.isPinching) return;
    if (!modalImageZoom.isDragging || modalImageZoom.pointerId !== e.pointerId) return;

    e.preventDefault();
    const dx = e.clientX - modalImageZoom.lastX;
    const dy = e.clientY - modalImageZoom.lastY;
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) modalImageZoom.dragMoved = true;
    modalImageZoom.x += dx;
    modalImageZoom.y += dy;
    modalImageZoom.lastX = e.clientX;
    modalImageZoom.lastY = e.clientY;
    applyModalImageZoom();
}

function endModalZoomPointerDrag(e) {
    if (e.pointerType === 'touch') return;
    if (modalImageZoom.pointerId !== null && e.pointerId !== modalImageZoom.pointerId) return;
    modalImageZoom.isDragging = false;
    modalImageZoom.pointerId = null;
    applyModalImageZoom();
}

// Event listeners para carousel - se agregan en openModal() después de cargar imágenes
function attachCarouselListeners() {
    // Remover listeners previos si existen
    carousel.removeEventListener('scroll', onCarouselScroll);
    carousel.removeEventListener('click', onCarouselClick);
    carousel.removeEventListener('wheel', onModalZoomWheel);
    carousel.removeEventListener('touchstart', onModalZoomTouchStart);
    carousel.removeEventListener('touchmove', onModalZoomTouchMove);
    carousel.removeEventListener('touchend', endModalZoomTouch);
    carousel.removeEventListener('touchcancel', endModalZoomTouch);
    carousel.removeEventListener('pointerdown', onModalZoomPointerDown);
    carousel.removeEventListener('pointermove', onModalZoomPointerMove);
    carousel.removeEventListener('pointerup', endModalZoomPointerDrag);
    carousel.removeEventListener('pointercancel', endModalZoomPointerDrag);
    
    // Agregar listeners frescos
    carousel.addEventListener('scroll', onCarouselScroll, { passive: true });
    carousel.addEventListener('click', onCarouselClick);
    carousel.addEventListener('wheel', onModalZoomWheel, { passive: false });
    carousel.addEventListener('touchstart', onModalZoomTouchStart, { passive: false });
    carousel.addEventListener('touchmove', onModalZoomTouchMove, { passive: false });
    carousel.addEventListener('touchend', endModalZoomTouch);
    carousel.addEventListener('touchcancel', endModalZoomTouch);
    carousel.addEventListener('pointerdown', onModalZoomPointerDown);
    carousel.addEventListener('pointermove', onModalZoomPointerMove);
    carousel.addEventListener('pointerup', endModalZoomPointerDrag);
    carousel.addEventListener('pointercancel', endModalZoomPointerDrag);
    
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
    const images = getModalImages();
    const maxSlide = Math.max(0, images.length - 1);
    
    if (newSlide !== currentSlide && newSlide >= 0 && newSlide <= maxSlide) {
        currentSlide = newSlide;
        resetModalImageZoom();
        updateModalInfo();
    }
}

function onCarouselClick(e) {
    if (isScrolling) return;
    if (modalImageZoom.dragMoved) {
        modalImageZoom.dragMoved = false;
        return;
    }
    if (isModalImageZoomed()) return;
    const img = e.target.closest('img');
    if (img) openZoom(img.src);
}

function goToSlide(index, smooth = true) {
    const images = getModalImages();
    if (!images.length) return;
    
    // Asegurar que el índice está dentro del rango válido
    const validIndex = Math.max(0, Math.min(index, images.length - 1));
    currentSlide = validIndex;
    resetModalImageZoom();
    
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

if (modalZoomInBtn) {
    modalZoomInBtn.addEventListener('click', (e) => {
        e.preventDefault();
        setModalImageZoom(modalImageZoom.scale + MODAL_ZOOM_STEP);
    });
}

if (modalZoomOutBtn) {
    modalZoomOutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        setModalImageZoom(modalImageZoom.scale - MODAL_ZOOM_STEP);
    });
}

if (modalZoomResetBtn) {
    modalZoomResetBtn.addEventListener('click', (e) => {
        e.preventDefault();
        resetModalImageZoom();
    });
}

if (fullZoomInBtn) {
    fullZoomInBtn.addEventListener('click', (e) => {
        e.preventDefault();
        setFullImageZoom(fullImageZoom.scale + FULL_ZOOM_STEP);
    });
}

if (fullZoomOutBtn) {
    fullZoomOutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        setFullImageZoom(fullImageZoom.scale - FULL_ZOOM_STEP);
    });
}

if (fullZoomResetBtn) {
    fullZoomResetBtn.addEventListener('click', (e) => {
        e.preventDefault();
        resetFullImageZoom();
    });
}

function updateModalInfo() {
    if (!currentProduct) return;
    const images = getModalImages();
    const activeVariantIndex = getActiveVariantIndex();
    const activeVariantName = images?.[currentSlide]?.name?.trim() || '';
    let displayName = activeVariantName || currentProduct.name;
    const slayerGarmentLabel = currentProduct.category === 'Slayer' ? getSlayerPreferredGarmentLabel() : '';
    if (slayerGarmentLabel) displayName = `${currentProduct.name} - ${slayerGarmentLabel}`;
    document.getElementById('modalName').textContent = displayName;
    
    // Actualizar código del producto
    const code = cart.generateCode(currentProduct.id, activeVariantIndex, selectedBacks.size > 0 || selectedDorsoChips.size > 0);
    const displayCodeEl = document.getElementById('displayCode');
    if (displayCodeEl) {
        displayCodeEl.textContent = code;
    }
    
    // Actualizar breadcrumb
    const breadcrumbCategory = document.getElementById('breadcrumbCategory');
    const breadcrumbProduct = document.getElementById('breadcrumbProduct');
    if (breadcrumbCategory) breadcrumbCategory.textContent = getCategoryLabel(currentProduct.category);
    if (breadcrumbProduct) breadcrumbProduct.textContent = displayName;
    
    // Actualizar contador de productos
    updateProductCounter();
    
    document.getElementById('modalMeta').textContent = formatCategoryMeta(currentProduct.year, getCategoryLabel(currentProduct.category));
    document.getElementById('modalDesc').textContent = currentProduct.desc || '';
    updateModalSizeRange();
    
    // Actualizar precios según selector adulto/chico
    updateModalPrices();
    
    document.getElementById('modalCounter').textContent = `${currentSlide + 1}/${images.length}`;
    const shouldShowBadge = isDoubleByDefault(currentProduct) || DORSO_CATEGORIES.has(currentProduct.category);
    document.getElementById('badgeDoble').style.display = shouldShowBadge ? 'block' : 'none';
    const vName = activeVariantName;
    document.getElementById('variantName').textContent = vName;
    document.getElementById('variantName').style.display = vName ? 'block' : 'none';
    const msg = `Hola FMD! Quiero encargar ${displayName} 🤘\n\nNecesito confirmar talle, color y opciones de envío.`;
    const modalWaBtn = document.getElementById('modalWaBtn');
    if (modalWaBtn) {
        modalWaBtn.onclick = (e) => {
            e.preventDefault();
            openWhatsapp(msg, 'modal_help');
        };
        modalWaBtn.href = '#';
    }
    renderBackExamples();
    renderDorsoSelector(); // Renderizar selector de dorso
    updateDobleWaLink();
    document.querySelectorAll('.carousel-dot').forEach((dot, i) => { dot.classList.toggle('active', i === currentSlide); });
    updateShareLinks();
    renderRelatedProducts(currentProduct.category);
}

function filterProducts() {
    let filtered = currentCategory ? db.filter(p => matchesCategoryOrMetadata(p, currentCategory)) : db.slice();
    if (currentSearch) {
        filtered = getSearchResults(currentSearch, filtered, true);
    }
    const normalizedCategory = normalizeText(currentCategory);
    if (normalizedCategory === 'album') {
        filtered = filtered.filter(p => !HIDDEN_FROM_ALBUM_CATEGORY.has(Number(p?.id)));
    }
    if (normalizedCategory === 'slayer' && slayerGarmentPreference) {
        filtered = filtered
            .map(product => {
                const matchedVariantIndex = getSlayerPreferredVariantIndex(product);
                if (matchedVariantIndex < 0) return null;
                const matchedVariant = product.variants[matchedVariantIndex];
                return {
                    ...product,
                    matchedVariantIndex,
                    matchedVariantName: matchedVariant.name,
                    matchedVariantImage: matchedVariant.img
                };
            })
            .filter(Boolean);
    }
    const shouldSortAlbumsByYear = normalizedCategory === 'album' && filtered.every(p => normalizeText(p?.category) === 'album');
    filtered.sort(shouldSortAlbumsByYear ? compareAlbumProductsByYearAscThenId : compareProductsByPriorityThenId);
    renderFilteredProducts(filtered);
}

function renderFilteredProducts(filtered) {
    const slayerGarmentLabel = normalizeText(currentCategory) === 'slayer' ? getSlayerPreferredGarmentLabel() : '';
    document.getElementById('productsCount').textContent = slayerGarmentLabel
        ? `${filtered.length} diseños · ${slayerGarmentLabel}`
        : `${filtered.length} diseños`;
    productsGrid.innerHTML = filtered.map(p => {
        const isSlayerGarmentResult = p.category === 'Slayer' && typeof p.matchedVariantIndex === 'number';
        const hasVariants = !isSlayerGarmentResult && p.variants && p.variants.length > 1;
        const isDoble = p.tipoPrecio === 'doble';
        const isDorsoIdea = p.category === 'Dorsales';
        const variantUnit = p.category === 'Slayer' ? 'prendas' : 'diseños';
        const badgeText = isSlayerGarmentResult
            ? getSlayerPreferredGarmentLabel()
            : hasVariants
                ? `${p.variants.length} ${variantUnit} <span style='font-size:1.2em;margin-left:6px;'>➔</span>`
                : (isDoble ? '🔥 Doble estampa' : '');
        // NUEVO badge
        const isNew = p.isNew;
        const newBadge = isNew ? `<span class="pack-badge" style="background:var(--magic-green);color:#000;">🆕 NUEVO</span>` : '';
        // COMBO badge
        const comboBadge = p.isComboEligible ? `<span class="pack-badge" style="background:var(--magic-orange);color:#000;">COMBO</span>` : '';
        // Código
        const code = p.code ? p.code : '';
        // Badges arriba de la imagen
        let badges = '';
        if (badgeText) badges += `<span class="variants-badge">${badgeText}</span>`;
        if (newBadge) badges += newBadge;
        if (comboBadge) badges += comboBadge;

        return `<div class="product-card" onclick="openModal(${p.id}${typeof p.matchedVariantIndex === 'number' ? ', ' + p.matchedVariantIndex : ''})">
            <div class="product-badges">${badges}</div>
            <img src="${p.matchedVariantImage || p.img}" class="product-img" loading="lazy" decoding="async" fetchpriority="low">
            <div class="product-info">
                <div class="product-name">${p.matchedVariantName || p.name}</div>
                ${code ? `<div class="product-code" style="font-size:0.85em;color:var(--magic-orange);font-weight:600;letter-spacing:1px;">${code}</div>` : ''}
                <div class="product-meta">${formatCategoryMeta(p.year, getCategoryLabel(p.category))}</div>
                <div class="product-price-row">
                    ${
                        isDorsoIdea
                        ? `<span class="product-envio" style="color:var(--magic-green);border:1px solid rgba(57,255,20,.25);">Solo doble estampa</span>`
                        : `${formatPreciosDual(p)}<div style="font-size:0.62rem;color:var(--text-muted);margin-top:4px;">3 prendas o más: envío gratis · 4 prendas o más: 15% OFF + envío gratis</div>`
                    }
                </div>
            </div>
        </div>`;
    }).join('');
    setView(currentView);
}

searchInput.addEventListener('input', (e) => {
    currentSearch = e.target.value.toLowerCase().trim();
    searchClear.classList.toggle('visible', currentSearch.length > 0);
    filterProducts();
});

searchInput.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    // Enter con código exacto (ej: PS-002.V1) abre el modal directo
    const opened = openExactCodeMatch(e.target.value);
    if (opened) {
        e.preventDefault();
        searchInput.blur();
    }
});

searchClear.onclick = () => { searchInput.value = ''; currentSearch = ''; searchClear.classList.remove('visible'); filterProducts(); };

categoryNav.addEventListener('click', (e) => {
    const btn = e.target.closest('.cat-btn');
    if (btn) {
        document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const scrollTarget = btn.dataset.scrollTarget;
        if (scrollTarget) {
            scrollToSection(scrollTarget);
            return;
        }

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
    copyToClipboard(url);
}

function updateShareLinks() {
    if (!currentProduct) return;
    const images = getModalImages();
    const activeVariantName = images?.[currentSlide]?.name?.trim() || '';
    const displayName = activeVariantName || currentProduct.name;
    const msg = `Mirá este diseño:\n${displayName}\n${getProductUrl()}`;
    
    // Usar onclick centralizado en lugar de href
    const btnShareWa = document.getElementById('btnShareWa');
    if (btnShareWa) {
        btnShareWa.onclick = (e) => {
            e.preventDefault();
            openWhatsapp(msg);
        };
        btnShareWa.href = '#';
    }
    
    // Actualizar meta tags dinámicamente para compartir el producto
    const productUrl = `https://catalogo.fivemagicsdesigns.com/#producto-${currentProduct.id}`;
    const productImage = images[currentSlide]?.img || currentProduct.img;
    const year = currentProduct.year ? ` (${currentProduct.year})` : '';
    const desc = currentProduct.desc ? currentProduct.desc.substring(0, 100) : 'Diseño exclusivo premium';
    
    document.querySelector('meta[property="og:title"]').setAttribute('content', `${displayName} - Five Magics Designs`);
    document.querySelector('meta[property="og:description"]').setAttribute('content', `${displayName}${year} • ${getCategoryLabel(currentProduct.category)}\n${desc}...`);
    document.querySelector('meta[property="og:image"]').setAttribute('content', productImage);
    document.querySelector('meta[property="og:url"]').setAttribute('content', productUrl);
    
    document.querySelector('meta[name="twitter:title"]').setAttribute('content', displayName);
    document.querySelector('meta[name="twitter:description"]').setAttribute('content', `${getCategoryLabel(currentProduct.category)}${year}`);
    document.querySelector('meta[name="twitter:image"]').setAttribute('content', productImage);
}

// Cálculo de contadores dinámicos
const CATEGORY_LABELS = {
    'Orígenes': 'Orígenes Megadeth',
    'Album': 'Álbumes Megadeth',
    'Hoodies FMD': 'Hoodies Megadeth',
    'Hoodies Otras Bandas': 'Hoodies de otras bandas',
    'Buzo Cuello Redondo': 'Buzos cuello redondo',
    'Bandas Sugeridas': 'Bandas Sugeridas',
    'Dave Mustaine': 'Dave Mustaine',
    'Dorsales': 'Dorsos para combinar',
    'Musician': 'Miembros Megadeth',
    'Personalizados': 'Pedidos Especiales',
    'Singles': 'Singles Especiales',
    'Tour': 'Tours',
    'VicRattlehead': 'Vic Rattlehead',
    'AC/DC': 'AC/DC',
    'Pantera': 'Pantera',
    'Iron Maiden': 'Iron Maiden',
    'Slayer': 'Slayer',
    'Metallica': 'Metallica',
    'Avenged Sevenfold': 'Avenged Sevenfold'
};

const MEGADETH_CATS = new Set(['Orígenes','Album','Musician','Tour','VicRattlehead','Singles','Dorsales']);
const HIDDEN_FROM_ALBUM_CATEGORY = new Set([6025, 6026, 6027]);

function getCategoryLabel(category) {
    return CATEGORY_LABELS[category] || category || 'Otros';
}

function formatCategoryMeta(year, categoryLabel) {
    return year ? `${year} · ${categoryLabel}` : categoryLabel;
}

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
        const origenesCount = byCategory['Orígenes'] || 0;
        const albumVisibleCount = Math.max(0, (byCategory['Album'] || 0) - Array.from(HIDDEN_FROM_ALBUM_CATEGORY).filter(id => db.some(p => Number(p?.id) === id)).length);

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
        const toggleNavCategory = (cat, isVisible) => {
            const btn = document.querySelector(`.cat-btn[data-cat="${cat}"]`);
            if(btn) btn.style.display = isVisible ? '' : 'none';
        };
        setNavBadge('Album', albumVisibleCount);
        setNavBadge('Orígenes', byCategory['Orígenes']||0);
        setNavBadge('Avenged Sevenfold', byCategory['Avenged Sevenfold']||0);
        setNavBadge('AC/DC', byCategory['AC/DC']||0);
        setNavBadge('Pantera', byCategory['Pantera']||0);
        setNavBadge('Iron Maiden', byCategory['Iron Maiden']||0);
        setNavBadge('Slayer', byCategory['Slayer']||0);
        setNavBadge('Metallica', byCategory['Metallica']||0);
        setNavBadge('Hoodies FMD', byCategory['Hoodies FMD']||0);
        setNavBadge('Hoodies Otras Bandas', byCategory['Hoodies Otras Bandas']||0);
        setNavBadge('Buzo Cuello Redondo', byCategory['Buzo Cuello Redondo']||0);
        setNavBadge('Bandas Sugeridas', byCategory['Bandas Sugeridas']||0);
        setNavBadge('Dave Mustaine', byCategory['Dave Mustaine']||0);
        setNavBadge('Dorsales', byCategory['Dorsales']||0);
        setNavBadge('Musician', byCategory['Musician']||0);
        setNavBadge('Personalizados', byCategory['Personalizados']||0);
        setNavBadge('Singles', byCategory['Singles']||0);
        setNavBadge('Tour', byCategory['Tour']||0);
        setNavBadge('VicRattlehead', byCategory['VicRattlehead']||0);
        toggleNavCategory('Orígenes', origenesCount > 0);

        // Filtros: textos con cantidad (y corrección de etiqueta de Megadeth)
        const setPill = (filter, label) => {
            const el = document.querySelector(`.filter-pill[data-filter="${filter}"]`);
            if(el) el.textContent = label;
        };
        const togglePill = (filter, isVisible) => {
            const el = document.querySelector(`.filter-pill[data-filter="${filter}"]`);
            if(el) el.style.display = isVisible ? '' : 'none';
        };
        setPill('all', `Todo (${totalAll})`);
        setPill('Album', `${getCategoryLabel('Album')} (${albumVisibleCount})`);
        setPill('Orígenes', `${getCategoryLabel('Orígenes')} (${byCategory['Orígenes']||0})`);
        setPill('Hoodies FMD', `${getCategoryLabel('Hoodies FMD')} (${byCategory['Hoodies FMD']||0})`);
        setPill('Hoodies Otras Bandas', `${getCategoryLabel('Hoodies Otras Bandas')} (${byCategory['Hoodies Otras Bandas']||0})`);
        setPill('Buzo Cuello Redondo', `${getCategoryLabel('Buzo Cuello Redondo')} (${byCategory['Buzo Cuello Redondo']||0})`);
        setPill('Dave Mustaine', `${getCategoryLabel('Dave Mustaine')} (${byCategory['Dave Mustaine']||0})`);
        setPill('Pantera', `${getCategoryLabel('Pantera')} (${byCategory['Pantera']||0})`);
        setPill('Iron Maiden', `${getCategoryLabel('Iron Maiden')} (${byCategory['Iron Maiden']||0})`);
        setPill('Slayer', `${getCategoryLabel('Slayer')} (${byCategory['Slayer']||0})`);
        setPill('Metallica', `${getCategoryLabel('Metallica')} (${byCategory['Metallica']||0})`);
        setPill('Avenged Sevenfold', `${getCategoryLabel('Avenged Sevenfold')} (${byCategory['Avenged Sevenfold']||0})`);
        setPill('AC/DC', `${getCategoryLabel('AC/DC')} (${byCategory['AC/DC']||0})`);
        setPill('Bandas Sugeridas', `${getCategoryLabel('Bandas Sugeridas')} (${byCategory['Bandas Sugeridas']||0})`);
        setPill('Musician', `${getCategoryLabel('Musician')} (${byCategory['Musician']||0})`);
        setPill('Singles', `${getCategoryLabel('Singles')} (${byCategory['Singles']||0})`);
        setPill('Tour', `${getCategoryLabel('Tour')} (${byCategory['Tour']||0})`);
        setPill('Dorsales', `${getCategoryLabel('Dorsales')} (${byCategory['Dorsales']||0})`);
        setPill('VicRattlehead', `${getCategoryLabel('VicRattlehead')} (${byCategory['VicRattlehead']||0})`);
        setPill('Personalizados', `${getCategoryLabel('Personalizados')} (${byCategory['Personalizados']||0})`);
        togglePill('Orígenes', origenesCount > 0);

        if (origenesCount === 0 && currentCategory === 'Orígenes') {
            currentCategory = 'Album';
            document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
            const albumBtn = document.querySelector('.cat-btn[data-cat="Album"]');
            if (albumBtn) albumBtn.classList.add('active');
            filterProducts();
            return;
        }
    } catch(e){ console.warn('updateCountsUI error', e); }
}

function openImageModal(src, alt) {
    const normalizedSrc = normalizeAssetPath(src);
    if (normalizedSrc.includes('images/fmd-edition-3d/') && openFmd3dPurchaseModal(src)) {
        return;
    }

    const imgModal = document.getElementById('imageModal');
    document.getElementById('imageModalImg').src = src;
    imgModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function normalizeAssetPath(pathValue) {
    return decodeURIComponent(String(pathValue || ''))
        .toLowerCase()
        .replace(/\\/g, '/')
        .replace(/^https?:\/\/[^/]+\//, '')
        .replace(/^\.\//, '')
        .replace(/^\//, '');
}

function isSameAssetPath(targetPath, candidatePath) {
    const target = normalizeAssetPath(targetPath);
    const candidate = normalizeAssetPath(candidatePath);
    if (!target || !candidate) return false;
    return target === candidate || target.endsWith(candidate) || candidate.endsWith(target);
}

function getFmd3dGroupContextFromEvent() {
    const evt = window.event;
    const baseTarget = evt?.currentTarget || evt?.target;
    const slideBtn = baseTarget?.closest ? baseTarget.closest('.fmd3d-group-slide') : null;
    if (!slideBtn) return null;

    const group = slideBtn.closest('.fmd3d-group');
    if (!group) return null;

    const images = Array.from(group.querySelectorAll('.fmd3d-group-slide img'))
        .map(img => img.getAttribute('src') || '')
        .filter(Boolean);

    return { images };
}

function findMatchesBySrc(src) {
    if (!Array.isArray(db) || !db.length) return [];

    const matches = [];
    for (const product of db) {
        if (!product) continue;

        const variants = Array.isArray(product.variants) ? product.variants : [];
        const variantIndex = variants.findIndex(variant => isSameAssetPath(src, variant?.img));
        if (variantIndex >= 0) {
            matches.push({ productId: product.id, variantIndex });
            continue;
        }

        if (isSameAssetPath(src, product.img)) {
            matches.push({ productId: product.id, variantIndex: variants.length ? 0 : 0 });
        }
    }

    return matches;
}

function getScopedVariantIndexes(productId, groupImages) {
    const product = db.find(p => p.id === productId);
    if (!product) return [];

    const variants = Array.isArray(product.variants) ? product.variants : [];
    const indexes = groupImages
        .map(imageSrc => {
            const idx = variants.findIndex(variant => isSameAssetPath(imageSrc, variant?.img));
            if (idx >= 0) return idx;
            if (isSameAssetPath(imageSrc, product.img)) return variants.length ? 0 : 0;
            return -1;
        })
        .filter(idx => idx >= 0);

    return Array.from(new Set(indexes));
}

function resolveProductVariantBySrc(src, groupImages = []) {
    const matches = findMatchesBySrc(src);
    if (!matches.length) return null;
    if (matches.length === 1 || !groupImages.length) return matches[0];

    let best = null;
    let bestScore = -1;

    for (const match of matches) {
        const scoped = getScopedVariantIndexes(match.productId, groupImages);
        const score = scoped.length;
        if (score > bestScore) {
            best = match;
            bestScore = score;
        }
    }

    return best || matches[0];
}

function openFmd3dPurchaseModal(src) {
    const context = getFmd3dGroupContextFromEvent();
    const groupImages = context?.images || [];
    const selected = resolveProductVariantBySrc(src, groupImages);
    if (!selected) return false;

    if (groupImages.length > 1) {
        const scopedVariantIndexes = getScopedVariantIndexes(selected.productId, groupImages);
        if (scopedVariantIndexes.length > 1) {
            openModal(selected.productId, selected.variantIndex, scopedVariantIndexes);
            return true;
        }
    }

    openModal(selected.productId, selected.variantIndex);
    return true;
}

function closeImageModal() {
    document.getElementById('imageModal').classList.remove('active');
    if (!modal.classList.contains('active')) document.body.style.overflow = '';
}

document.getElementById('modalClose').onclick = closeModal;
document.getElementById('zoomClose').onclick = closeZoom;
zoomOverlay.onclick = (e) => { if(e.target.id === 'zoomContainer' || e.target === zoomOverlay) closeZoom(); };
zoomOverlay.addEventListener('wheel', onFullZoomWheel, { passive: false });
zoomOverlay.addEventListener('touchstart', onFullZoomTouchStart, { passive: false });
zoomOverlay.addEventListener('touchmove', onFullZoomTouchMove, { passive: false });
zoomOverlay.addEventListener('touchend', endFullZoomTouch);
zoomOverlay.addEventListener('touchcancel', endFullZoomTouch);
zoomImg.addEventListener('pointerdown', onFullZoomPointerDown);
zoomImg.addEventListener('pointermove', onFullZoomPointerMove);
zoomImg.addEventListener('pointerup', endFullZoomPointerDrag);
zoomImg.addEventListener('pointercancel', endFullZoomPointerDrag);
window.addEventListener('popstate', () => { if(modal.classList.contains('active')) closeModal(); });

// Agregar soporte de teclado para navegación del carousel
window.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('active') || !currentProduct) return;
    const images = getModalImages();
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
    let isMultiTouch = false;
    
    carousel.addEventListener('touchstart', (e) => {
        isMultiTouch = e.touches.length > 1;
        if (isMultiTouch || isModalImageZoomed()) {
            isSwiping = false;
            return;
        }
        touchStartX = e.touches[0].clientX;
        isSwiping = true;
    }, { passive: true });
    
    carousel.addEventListener('touchend', (e) => {
        if (isMultiTouch || isModalImageZoomed()) {
            isSwiping = false;
            if (!e.touches || e.touches.length === 0) isMultiTouch = false;
            return;
        }
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
if(dorsoInputLive) {
    dorsoInputLive.addEventListener('input', () => {
        updateDobleWaLink();
        updateModalPrices();
        renderDorsoAutocomplete(dorsoInputLive.value);
    });
    dorsoInputLive.addEventListener('focus', () => {
        renderDorsoAutocomplete(dorsoInputLive.value);
    });
    dorsoInputLive.addEventListener('blur', () => {
        setTimeout(() => hideDorsoAutocomplete(), 120);
    });
}

// === FUNCIONES PARA CARRITO ===
function copyProductCode() {
    const codeEl = document.getElementById('displayCode');
    if (!codeEl) return;
    const code = codeEl.textContent;
    copyToClipboard(code, event.target);
}

function copySummary() {
    const summaryText = document.getElementById('summaryText');
    if (summaryText) {
        const text = summaryText.value;
        copyToClipboard(text, event.target);
    }
}

function normalizePostalCode(value = '') {
    return String(value).replace(/\D/g, '').slice(0, 8);
}

function isValidPostalCode(value = '') {
    return /^\d{4,8}$/.test(value);
}

function normalizePhone(value = '') {
    return String(value).replace(/[^\d+\s()-]/g, '').trim();
}

const SHIPPING_FORM_STORAGE_KEY = 'fmd_shipping_form_v1';
const SHIPPING_FORM_FIELD_MAP = {
    nombre: 'inputNombre',
    apellido: 'inputApellido',
    telefono: 'inputTelefono',
    direccion: 'inputDireccion',
    cp: 'inputCP',
    localidad: 'inputLocalidad',
    provincia: 'inputProvincia'
};

function loadShippingCustomerDataFromStorage() {
    try {
        const raw = localStorage.getItem(SHIPPING_FORM_STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
        return {};
    }
}

function saveShippingCustomerDataToStorage(data) {
    try {
        localStorage.setItem(SHIPPING_FORM_STORAGE_KEY, JSON.stringify(data || {}));
    } catch (error) {
        // Ignorar errores de storage para no romper el checkout
    }
}

function clearShippingCustomerData() {
    try {
        localStorage.removeItem(SHIPPING_FORM_STORAGE_KEY);
    } catch (error) {
        // Ignorar errores de storage
    }

    Object.values(SHIPPING_FORM_FIELD_MAP).forEach((inputId) => {
        const input = document.getElementById(inputId);
        if (input) input.value = '';
    });

    showNotification('Datos de envío limpiados', 1800);
}

function hydrateAndBindShippingForm() {
    const saved = loadShippingCustomerDataFromStorage();

    Object.entries(SHIPPING_FORM_FIELD_MAP).forEach(([key, inputId]) => {
        const input = document.getElementById(inputId);
        if (!input) return;

        if (saved[key]) {
            input.value = String(saved[key]);
        }

        input.addEventListener('input', () => {
            if (inputId === 'inputCP') {
                input.value = normalizePostalCode(input.value);
            }
            if (inputId === 'inputTelefono') {
                input.value = normalizePhone(input.value);
            }
            saveShippingCustomerDataToStorage(getShippingCustomerData());
        });
    });
}

function getShippingCustomerData() {
    const nombre = (document.getElementById('inputNombre')?.value || '').trim();
    const apellido = (document.getElementById('inputApellido')?.value || '').trim();
    const telefono = normalizePhone(document.getElementById('inputTelefono')?.value || '');
    const direccion = (document.getElementById('inputDireccion')?.value || '').trim();
    const cp = normalizePostalCode(document.getElementById('inputCP')?.value || '');
    const localidad = (document.getElementById('inputLocalidad')?.value || '').trim();
    const provincia = (document.getElementById('inputProvincia')?.value || '').trim();

    return { nombre, apellido, telefono, direccion, cp, localidad, provincia };
}

function getMissingShippingFields(data) {
    const missing = [];
    if (!data.nombre) missing.push('nombre');
    if (!data.apellido) missing.push('apellido');
    if (!data.direccion) missing.push('direccion');
    if (!isValidPostalCode(data.cp)) missing.push('cp');
    if (!data.localidad) missing.push('localidad');
    if (!data.provincia) missing.push('provincia');
    if (!data.telefono) missing.push('telefono');
    return missing;
}

function focusFirstMissingShippingField(fieldKey) {
    const inputId = SHIPPING_FORM_FIELD_MAP[fieldKey];
    if (!inputId) return;
    const input = document.getElementById(inputId);
    if (!input) return;
    input.focus();
}

function getShippingFieldLabel(fieldKey) {
    const labels = {
        nombre: 'Nombre',
        apellido: 'Apellido',
        direccion: 'Direccion',
        cp: 'Codigo postal',
        localidad: 'Localidad',
        provincia: 'Provincia',
        telefono: 'Telefono'
    };
    return labels[fieldKey] || fieldKey;
}

function buildCustomerDataForWhatsapp(data) {
    const lines = [];
    if (data.nombre) lines.push(`• Nombre: ${data.nombre}`);
    if (data.apellido) lines.push(`• Apellido: ${data.apellido}`);
    if (data.telefono) lines.push(`• Teléfono: ${data.telefono}`);
    if (data.direccion) lines.push(`• Dirección: ${data.direccion}`);
    if (data.cp) lines.push(`• Código postal: ${data.cp}`);
    if (data.localidad) lines.push(`• Localidad: ${data.localidad}`);
    if (data.provincia) lines.push(`• Provincia: ${data.provincia}`);

    if (!lines.length) {
        return '\n\n📦 DATOS DE ENVÍO:\n• A confirmar por WhatsApp';
    }

    return `\n\n📦 DATOS DE ENVÍO:\n${lines.join('\n')}`;
}

function buildShippingContextForWhatsapp(postalCode = '', customerData = null) {
    if (customerData) {
        return buildCustomerDataForWhatsapp(customerData);
    }

    const quantity = cart.getCart().length;

    if (quantity >= 4) {
        return '\n\n📦 DATOS DE ENVÍO:\n• 4 prendas o más: 15% OFF + envío gratis.';
    }

    if (quantity >= 3) {
        return '\n\n📦 DATOS DE ENVÍO:\n• 3 prendas o más: envío gratis.';
    }

    if (postalCode) {
        return `\n\n📦 DATOS DE ENVÍO (1 o 2 prendas):\n• Código postal: ${postalCode}`;
    }

    return '\n\n📦 DATOS DE ENVÍO (1 o 2 prendas):\n• Código postal: no informado';
}

function sendViaWhatsapp(postalCode = '', customerData = null) {
    const summary = cart.generateSummary();
    const shippingContext = buildShippingContextForWhatsapp(postalCode, customerData);
    const message = `Hola FMD!\n\nQuiero encargar este pedido:\n\n${summary}${shippingContext}\n\nTe paso mis datos completos de envio para cotizar Andreani y cerrar el pedido.`;
    openWhatsapp(message);
}

// === MODAL VISTA PREVIA DEL CARRITO ===
function openCartPreview() {
    const modal = document.getElementById('cartPreviewModal');
    if (!modal) {
        toggleCartPanel();
        return;
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    try {
        renderCartPreview();
    } catch (error) {
        console.error('Error renderizando vista previa del carrito:', error);
        // Fallback seguro para no perder funcionalidad
        modal.classList.remove('active');
        document.body.style.overflow = '';
        toggleCartPanel();
    }
}

function closeCartPreview() {
    const modal = document.getElementById('cartPreviewModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

window.openCartPreview = openCartPreview;
window.closeCartPreview = closeCartPreview;

function getProductImage(productId, variantIndex = 0) {
    const product = db.find(p => p.id === productId);
    if (!product) return 'images/logo/MARCA DE AGUA.png';
    
    if (product.variants && product.variants[variantIndex]) {
        return product.variants[variantIndex].img;
    }
    return product.img || 'images/logo/MARCA DE AGUA.png';
}

function calculateItemPrice(item) {
    const isHoodie = item.category === 'Hoodies FMD' || item.category === 'Hoodies Otras Bandas';
    const isBuzoRedondo = item.category === 'Buzo Cuello Redondo';
    const isKids = item.age === 'chico';
    const isOversize = item.cut === 'oversize';
    const isCustom = Boolean(item.isCustom) && !isHoodie && !isBuzoRedondo && !isKids;

    let basePrices;
    if (isHoodie) {
        basePrices = PRECIOS_HOODIES;
    } else if (isBuzoRedondo) {
        basePrices = PRECIOS_BUZO_REDONDO;
    } else if (isKids) {
        basePrices = PRECIOS_CHICOS;
    } else if (isOversize) {
        basePrices = PRECIOS_OVERSIZE;
    } else {
        basePrices = PRECIOS;
    }

    const precios = {
        simple: isCustom
            ? (basePrices.simple_personalizado ?? (basePrices.simple + PERSONALIZADO_EXTRA))
            : basePrices.simple,
        doble: isCustom
            ? (basePrices.doble_personalizado ?? (basePrices.doble + PERSONALIZADO_EXTRA))
            : basePrices.doble
    };

    return item.isDouble ? precios.doble : precios.simple;
}

function isHoodieItem(item) {
    return item.category === 'Hoodies FMD' || item.category === 'Hoodies Otras Bandas';
}

function isBuzoRedondoItem(item) {
    return item.category === 'Buzo Cuello Redondo';
}

function isAdultRemeraItem(item) {
    return !isHoodieItem(item) && !isBuzoRedondoItem(item) && item.age !== 'chico';
}

function calculateCartSubtotal(items) {
    const hoodiesDobles = [];
    const remerasDobles = [];
    let subtotal = 0;

    items.forEach(item => {
        if (isHoodieItem(item) && item.isDouble) {
            hoodiesDobles.push(item);
            return;
        }

        if (isAdultRemeraItem(item) && item.isDouble) {
            remerasDobles.push(item);
            return;
        }

        subtotal += calculateItemPrice(item);
    });

    const comboCount = Math.min(hoodiesDobles.length, remerasDobles.length);
    subtotal += comboCount * COMBO_HOODIE_REMERA;

    hoodiesDobles.slice(comboCount).forEach(item => {
        subtotal += calculateItemPrice(item);
    });

    remerasDobles.slice(comboCount).forEach(item => {
        subtotal += calculateItemPrice(item);
    });

    return subtotal;
}

function calculateCartTotal() {
    const items = cart.getCart();
    const subtotal = calculateCartSubtotal(items);
    
    // Calcular descuento según cantidad (15% para 4 prendas o más)
    let descuento = 0;
    const cantidad = items.length;
    
    if (cantidad >= 4) {
        descuento = subtotal * 0.15; // 15% descuento
    }
    
    // Envío: gratis para 3 prendas o más, a calcular para 1 o 2
    const envioGratis = cantidad >= 3;
    
    return {
        subtotal,
        envio: 0, // No sumamos envío fijo, es dinámico
        envioGratis,
        descuento,
        total: subtotal - descuento, // Total SIN envío
        cantidad
    };
}

function renderCartPreview() {
    const body = document.getElementById('cartPreviewBody');
    const footer = document.getElementById('cartPreviewFooter');
    const items = cart.getCart();
    
    if (!body || !footer) return;
    
    if (items.length === 0) {
        body.innerHTML = `
            <div class="cart-preview-empty">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17 18c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2zM7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm0-3l1.1-2h7.45c.75 0 1.41-.41 1.75-1.03L21.7 4H5.21l-.94-2H1v2h2l3.6 7.59L3.62 17H19v-2H7z"/>
                </svg>
                <h3>Tu carrito está vacío</h3>
                <p>Agregá diseños para continuar</p>
            </div>
        `;
        footer.innerHTML = `
            <div class="cart-preview-actions">
                <button class="btn-preview-continue" onclick="closeCartPreview()">
                    ← Volver al catálogo
                </button>
            </div>
        `;
        return;
    }
    
    // Renderizar items
    body.innerHTML = items.map((item, idx) => {
        const img = getProductImage(item.id, item.variantIndex);
        const precio = calculateItemPrice(item);
        const edad = item.age === 'chico' ? 'Niño' : 'Adulto';
        const talle = item.size || 'Por confirmar';
        const corte = item.age === 'chico' ? 'Unisex' : (item.cut === 'oversize' ? 'Oversize' : 'Clásica');
        const color = item.color === 'blanco' ? 'Blanca' : 'Negra';
        
        return `
            <div class="cart-preview-item">
                <img src="${img}" alt="${item.productName}" class="cart-preview-item-img" 
                     onerror="this.src='images/logo/MARCA DE AGUA.png'">
                <div class="cart-preview-item-info">
                    <div class="cart-preview-item-code">${item.code}</div>
                    <div class="cart-preview-item-name">${item.productName}</div>
                    ${item.variantName && item.variantName !== item.productName ? 
                        `<div class="cart-preview-item-variant">${item.variantName}</div>` : ''}
                    ${item.isDouble ? '<span class="cart-preview-item-double">🔥 Doble estampa</span>' : ''}
                    <div class="cart-preview-item-options">
                        <span class="cart-preview-option-tag">👤 ${edad}</span>
                        <span class="cart-preview-option-tag">📐 ${talle}</span>
                        <span class="cart-preview-option-tag">✂️ ${corte}</span>
                        <span class="cart-preview-option-tag">${color === 'Blanca' ? '⚪' : '⚫'} ${color}</span>
                    </div>
                    <div class="cart-preview-item-price">$${precio.toLocaleString('es-AR')}</div>
                </div>
                <button class="cart-preview-item-remove" onclick="removeAndRefreshPreview(${idx})" title="Eliminar">
                    ✕
                </button>
            </div>
        `;
    }).join('');
    
    // Calcular totales
    const totals = calculateCartTotal();
    
    // Renderizar footer con resumen
    let shippingNote = '';
    if (totals.cantidad === 1) {
        shippingNote = `<div class="cart-preview-shipping-note">¡Agregá 2 prendas más para envío gratis!</div>`;
    } else if (totals.cantidad === 2) {
        shippingNote = `<div class="cart-preview-shipping-note">¡Agregá 1 prenda más para envío gratis!</div>`;
    } else if (totals.cantidad === 3) {
        shippingNote = `<div class="cart-preview-shipping-note">🚚 ¡ENVÍO GRATIS! Sumá 1 más y activás 15% OFF 🎉</div>`;
    } else if (totals.cantidad >= 4) {
        shippingNote = `<div class="cart-preview-shipping-note">🚚 ¡ENVÍO GRATIS + 15% OFF aplicado! 🎉</div>`;
    }

    const shippingForm = `
        <div class="cart-customer-fields ${totals.cantidad >= 2 ? 'compact' : ''}">
            <p class="cart-customer-title">Datos para el envio (para finalizar tu pedido)</p>
            <div class="cart-customer-grid">
                <div class="cart-cp-field">
                    <label for="inputNombre">Nombre</label>
                    <input type="text" id="inputNombre" placeholder="Ej: Juan">
                </div>
                <div class="cart-cp-field">
                    <label for="inputApellido">Apellido</label>
                    <input type="text" id="inputApellido" placeholder="Ej: Pérez">
                </div>
            </div>
            <div class="cart-customer-grid single">
                <div class="cart-cp-field">
                    <label for="inputTelefono">Teléfono</label>
                    <input type="text" id="inputTelefono" placeholder="Ej: 11 1234 5678" inputmode="tel">
                </div>
            </div>
            <div class="cart-customer-grid single">
                <div class="cart-cp-field">
                    <label for="inputDireccion">Dirección</label>
                    <input type="text" id="inputDireccion" placeholder="Ej: Av. Corrientes 1234">
                </div>
            </div>
            <div class="cart-customer-grid">
                <div class="cart-cp-field">
                    <label for="inputCP">Código postal</label>
                    <input type="text" id="inputCP" placeholder="Ej: 1425" maxlength="8" inputmode="numeric" pattern="[0-9]{4,8}" oninput="this.value=this.value.replace(/[^0-9]/g,'').slice(0,8)">
                </div>
                <div class="cart-cp-field">
                    <label for="inputLocalidad">Localidad</label>
                    <input type="text" id="inputLocalidad" placeholder="Ej: CABA">
                </div>
            </div>
            <div class="cart-customer-grid single">
                <div class="cart-cp-field">
                    <label for="inputProvincia">Provincia</label>
                    <input type="text" id="inputProvincia" placeholder="Ej: Buenos Aires">
                </div>
            </div>
            <div class="cart-customer-actions">
                <button type="button" class="btn-clear-shipping" onclick="clearShippingCustomerData()">Limpiar datos de envío</button>
            </div>
            <p class="cart-customer-hint">Si queres cerrar rapido, completá todos los datos. Si tenes dudas, podés consultar primero por WhatsApp.</p>
        </div>`;
    
    footer.innerHTML = `
        <div class="cart-preview-summary">
            <div class="cart-preview-summary-row">
                <span>Subtotal (${totals.cantidad} ${totals.cantidad === 1 ? 'prenda' : 'prendas'})</span>
                <span class="value">$${totals.subtotal.toLocaleString('es-AR')}</span>
            </div>
            ${totals.descuento > 0 ? `
                <div class="cart-preview-summary-row">
                    <span>Descuento 15% (4 prendas o más)</span>
                    <span class="value" style="color: var(--magic-green);">-$${totals.descuento.toLocaleString('es-AR')}</span>
                </div>
            ` : ''}
            <div class="cart-preview-summary-row">
                <span>Envío</span>
                <span class="value">${totals.envioGratis ? '<span style="color:var(--magic-green);">GRATIS ✓</span>' : 'Según zona (se confirma por WhatsApp)'}</span>
            </div>
            <div class="cart-preview-summary-row total">
                <span>Total${totals.envioGratis ? '' : ' (sin envío)'}</span>
                <span class="value">$${totals.total.toLocaleString('es-AR')}</span>
            </div>
        </div>
        ${shippingNote}
        ${shippingForm}
        <div class="cart-preview-info" style="margin-top:12px;padding:12px;background:#0a0a0a;border:1px solid #222;border-radius:8px;font-size:0.8rem;color:#888;">
            <div style="margin-bottom:8px;">
                <span style="color:#39ff14;">📦 ENVÍO ANDREANI:</span> A domicilio o punto de retiro Andreani · 3-7 días hábiles a todo el país. 1 o 2 prendas: envío según zona. 3 prendas o más: envío gratis. 4 prendas o más: 15% OFF + envío gratis.
            </div>
            <div>
                <span style="color:#39ff14;">💳 PAGO:</span> Transferencia o MercadoPago. Tarjeta de crédito con recargo $8.000.
            </div>
        </div>
        <div class="cart-preview-actions">
            <button class="btn-preview-continue" onclick="closeCartPreview()">
                ← Seguir eligiendo
            </button>
            <button class="btn-preview-continue" onclick="consultFirstViaWhatsapp()">
                Consultar primero
            </button>
            <button class="btn-preview-whatsapp" onclick="confirmAndSendWhatsapp()">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Confirmar y enviar por WhatsApp
            </button>
        </div>
    `;

    hydrateAndBindShippingForm();
}

function removeAndRefreshPreview(index) {
    cart.removeFromCart(index);
    renderCartPreview();
    
    // Si queda vacío, cerrar después de un momento
    if (cart.getCart().length === 0) {
        setTimeout(() => closeCartPreview(), 1500);
    }
}

function confirmAndSendWhatsapp() {
    const customerData = getShippingCustomerData();
    const missing = getMissingShippingFields(customerData);

    if (missing.length) {
        const labels = missing.map(getShippingFieldLabel).join(', ');
        showNotification(`Completá los datos de envio: ${labels}.`, 3500);
        focusFirstMissingShippingField(missing[0]);
        return;
    }

    saveShippingCustomerDataToStorage(customerData);
    closeCartPreview();
    sendViaWhatsapp(customerData.cp, customerData);
}

function consultFirstViaWhatsapp() {
    const summary = cart.generateConsultationSummary();
    const customerData = getShippingCustomerData();
    const hasCustomerData = Object.values(customerData).some(Boolean);
    const partialShippingContext = hasCustomerData ? buildCustomerDataForWhatsapp(customerData) : '';
    const message = `Hola FMD! Quiero consultar antes de confirmar este pedido:\n\n${summary}${partialShippingContext}\n\n¿Se puede retirar personalmente cuando esté listo o trabajan solo con envío?\n¿Me confirman la combinación elegida y el tiempo de producción?`;
    saveShippingCustomerDataToStorage(customerData);
    closeCartPreview();
    openWhatsapp(message, 'cart_consulta');
}

function toggleCartPanel() {
    cart.togglePanel();
}

function addToCartFromModal() {
    if (!currentProduct) return false;

    const garmentCategory = getActiveGarmentCategory(currentProduct);
    const isHoodie = garmentCategory === 'Hoodies FMD' || garmentCategory === 'Hoodies Otras Bandas';
    const isBuzoRedondo = garmentCategory === 'Buzo Cuello Redondo';
    const isHoodieOrBuzo = isHoodie || isBuzoRedondo;

    clearSelectionError('ageGroup');
    clearSelectionError('sizeGroup');
    clearSelectionError('cutGroup');
    clearSelectionError('colorGroup');

    if (!isHoodieOrBuzo && !selectedAge) {
        showNotification('Elegí edad antes de continuar.', 2200);
        markSelectionError('ageGroup');
        return false;
    }

    if (!selectedSize) {
        showNotification('Elegí talle antes de continuar.', 2200);
        markSelectionError('sizeGroup');
        return false;
    }

    if (!isHoodieOrBuzo && !selectedCut) {
        showNotification('Elegí corte antes de continuar.', 2200);
        markSelectionError('cutGroup');
        return false;
    }

    if (!selectedColor) {
        showNotification('Elegí color antes de continuar.', 2200);
        markSelectionError('colorGroup');
        return false;
    }
    
    // Determinar si es doble estampa basándose en el dorso seleccionado
    const isDouble = isDoubleByDefault(currentProduct) || hasDorsoSelection();
    const isCustom = isPersonalizedSelection(currentProduct);
    const variantIndex = getActiveVariantIndex();
    
    const options = {
        age: selectedAge,
        size: selectedSize,
        cut: selectedCut,
        color: selectedColor,
        category: garmentCategory,
        backIndex: selectedBackIndex, // Índice del dorso seleccionado
        isCustom: isCustom
    };
    
    const success = cart.addToCart(currentProduct.id, variantIndex, isDouble, options);
    
    if (success) {
        const msg = isDouble && selectedBackIndex >= 0 
            ? '✓ Agregado con frente + dorso' 
            : (isDouble ? '✓ Agregado (dorso a definir)' : '✓ Agregado al carrito');
        showNotification(msg, 2000);
    }
    
    return success;
}

// Agregar al carrito y abrir WhatsApp directamente
function addToCartAndOpenWhatsapp() {
    if (!currentProduct) return;

    const added = addToCartFromModal();
    if (!added) return;
    
    // Redirigir al checkout del carrito para completar datos de envio antes de WhatsApp
    setTimeout(() => {
        openCartPreview();
        showNotification('Podés cerrar rapido con datos completos o consultar primero.', 2800);
    }, 300);
}

// Función para actualizar el contador de productos
function updateProductCounter() {
    if (!currentProduct) return;
    
    // Obtener productos de la misma categoría
    const relatedProducts = db.filter(p => p.category === currentProduct.category);
    const currentIndex = relatedProducts.findIndex(p => p.id === currentProduct.id);
    
    const counterEl = document.getElementById('productCounter');
    if (counterEl) {
        counterEl.textContent = `${currentIndex + 1}/${relatedProducts.length}`;
    }
    
    // Habilitar/deshabilitar botones de navegación
    const btnPrev = document.getElementById('btnNavPrev');
    const btnNext = document.getElementById('btnNavNext');
    if (btnPrev) btnPrev.disabled = currentIndex === 0;
    if (btnNext) btnNext.disabled = currentIndex === relatedProducts.length - 1;
}

// Navegar al siguiente producto
function navigateToNextProduct() {
    if (!currentProduct) return;
    
    const relatedProducts = db.filter(p => p.category === currentProduct.category);
    const currentIndex = relatedProducts.findIndex(p => p.id === currentProduct.id);
    
    if (currentIndex < relatedProducts.length - 1) {
        const nextProduct = relatedProducts[currentIndex + 1];
        openModal(nextProduct.id);
    }
}

// Navegar al producto anterior
function navigateToPrevProduct() {
    if (!currentProduct) return;
    
    const relatedProducts = db.filter(p => p.category === currentProduct.category);
    const currentIndex = relatedProducts.findIndex(p => p.id === currentProduct.id);
    
    if (currentIndex > 0) {
        const prevProduct = relatedProducts[currentIndex - 1];
        openModal(prevProduct.id);
    }
}

// Mostrar productos relacionados
function renderRelatedProducts(category) {
    if (!category) return;
    
    const relatedContainer = document.getElementById('relatedProducts');
    const relatedGrid = document.getElementById('relatedGrid');
    
    if (!relatedContainer || !relatedGrid) return;
    
    // Obtener productos de la misma categoría, excluyendo el actual
    const related = db
        .filter(p => matchesCategoryOrMetadata(p, category) && p.id !== currentProduct.id)
        .sort(compareProductsByPriorityThenId)
        .slice(0, 3);
    
    if (related.length === 0) {
        relatedContainer.style.display = 'none';
        return;
    }
    
    relatedContainer.style.display = 'block';
    
    relatedGrid.innerHTML = related.map(p => {
        const thumb = p.img || '';
        return `
            <div class="related-item" onclick="openModal(${p.id})">
                <img src="${thumb}" alt="${p.name}">
                <div class="related-item-name">${p.name}</div>
            </div>
        `;
    }).join('');
}

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

// Cargar categoría desde URL query param (?cat=HoodiesFMD)
function loadCategoryFromURL() {
    const params = new URLSearchParams(window.location.search);
    const cat = params.get('cat');
    if (!cat) return;
    // Buscar coincidencia flexible (case-insensitive, ignorando espacios/guiones)
    const normalize = s => s.toLowerCase().replace(/[\s_-]/g, '');
    const catBtns = document.querySelectorAll('.cat-btn');
    let matched = null;
    catBtns.forEach(btn => {
        if (normalize(btn.dataset.cat) === normalize(cat)) matched = btn.dataset.cat;
    });
    if (matched) {
        filterByCategory(matched);
    }
}

// Funcionalidad del buscador en header
function initSearchModal() {
    const headerSearchBtn = document.getElementById('headerSearchBtn');
    const searchModal = document.getElementById('searchModal');
    const searchModalClose = document.getElementById('searchModalClose');
    const searchModalInput = document.getElementById('searchModalInput');
    const searchModalResults = document.getElementById('searchModalResults');
    
    if (!headerSearchBtn || !searchModal || !searchModalInput) return;
    
    // Abrir modal
    headerSearchBtn.onclick = () => {
        searchModal.classList.add('active');
        searchModalInput.focus();
        searchModalInput.value = '';
        searchModalResults.innerHTML = '';
    };
    
    // Cerrar modal
    searchModalClose.onclick = () => searchModal.classList.remove('active');
    
    // Cerrar al hacer click fuera
    searchModal.onclick = (e) => {
        if (e.target === searchModal) searchModal.classList.remove('active');
    };
    
    // Búsqueda en tiempo real
    searchModalInput.oninput = (e) => {
        const query = e.target.value.toLowerCase().trim();
        
        if (!query) {
            searchModalResults.innerHTML = '';
            return;
        }

        // Si es código exacto, abrir modal directo (solo si la búsqueda es SOLO el código, sin espacios)
        if (!query.includes(' ') && query.length >= 2 && parseProductCode(query)) {
            const opened = openExactCodeMatch(query, () => searchModal.classList.remove('active'));
            if (opened) return;
        }

        const results = getSearchResults(query, db, true).slice(0, 8);
        
        if (results.length === 0) {
            searchModalResults.innerHTML = '<div class="search-empty">Sin resultados para "' + e.target.value + '"</div>';
            return;
        }
        
        searchModalResults.innerHTML = results.map(p => `
            <div class="search-result-item" onclick="openModal(${p.id}${typeof p.matchedVariantIndex === 'number' ? ', ' + p.matchedVariantIndex : ''}); document.getElementById('searchModal').classList.remove('active');">
                <div class="search-result-name">${p.name}</div>
                <div class="search-result-meta">${formatCategoryMeta(p.year, getCategoryLabel(p.category))}${typeof p.matchedVariantIndex === 'number' && p.variants?.[p.matchedVariantIndex] ? ' · ' + p.variants[p.matchedVariantIndex].name : ''}</div>
            </div>
        `).join('');
    };

    searchModalInput.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        if (!openExactCodeMatch(e.target.value, () => searchModal.classList.remove('active'))) return;
        e.preventDefault();
    });
    
    // Cerrar modal con tecla Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && searchModal.classList.contains('active')) {
            searchModal.classList.remove('active');
        }
    });
}

// === COUNTDOWN MEGADETH - ÚLTIMA GIRA ===
function initCountdown() {
    const showDate = new Date('2026-04-30T20:00:00-03:00'); // 30 abril 2026, 20:00 Argentina
    const banner = document.getElementById('countdownBanner');
    if (!banner) return;

    if (new Date() >= showDate) {
        banner.style.display = 'none';
        return;
    }
    
    function updateCountdown() {
        const now = new Date();
        const diff = showDate - now;
        
        if (diff <= 0) {
            banner.style.display = 'none';
            return;
        }
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);
        
        document.getElementById('countDays').textContent = String(days).padStart(2, '0');
        document.getElementById('countHours').textContent = String(hours).padStart(2, '0');
        document.getElementById('countMins').textContent = String(mins).padStart(2, '0');
        document.getElementById('countSecs').textContent = String(secs).padStart(2, '0');
    }
    
    updateCountdown();
    setInterval(updateCountdown, 1000);
}

// === CARGAR PRODUCTOS DESTACADOS MEGADETH ===
function loadMegadethDestacados() {
    const grid = document.getElementById('megadethDestacadosGrid');
    if (!grid) return;
    
    // IDs de los productos MÁS VENDIDOS según ventas reales (análisis abril 2026)
    const destacadosIds = [
        6022,  // 💀 HISTÓRICO — Fast Loud and Rude 1984 Origins
        6014,  // 🇦🇷 Dave Mustaine Argentina V1 - destacado principal para el show
        6020,  // 🔥 Aguante Megadeth - frente y dorso
        6025,  // Megadeth 2026 - VIC LLAMAS FMD EDITION
        6026,  // KIMB FMD Edition
        4,     // Rust in Peace
        39,    // Vic Gaucho Argentino
        6,     // Youthanasia
        5062,  // Hoodie Rust in Peace
        40     // Tour Argentina
    ];
    
    // Filtrar productos por IDs destacados
    const destacados = destacadosIds
        .map(id => db.find(p => p.id === id))
        .filter(p => p);
    
    grid.innerHTML = destacados.map(p => {
        const isHoodie = p.category === 'Hoodies FMD' || p.category === 'Hoodies Otras Bandas';
        const isBuzoRedondo = p.category === 'Buzo Cuello Redondo';
        // Hoodies / buzos: precio doble por defecto, remeras: respetar simple o doble
        const precioBase = isHoodie ? PRECIOS_HOODIES.doble : isBuzoRedondo ? PRECIOS_BUZO_REDONDO.doble : (p.tipoPrecio === 'doble' ? PRECIOS.doble : PRECIOS.simple);
        
        return `
            <div class="megadeth-product-card" onclick="openModal(${p.id})">
                <div class="megadeth-product-badge">TOP VENTAS</div>
                <div class="megadeth-product-img">
                    <img src="${p.img}" alt="${p.name}" loading="lazy">
                </div>
                <div class="megadeth-product-info">
                    <h3>${p.name}</h3>
                    <p class="megadeth-product-year">${p.year || ''}</p>
                    <p class="megadeth-product-price">$${precioBase.toLocaleString('es-AR')}</p>
                </div>
            </div>
        `;
    }).join('');
}

// === COLECCIONES MEGADETH CON PREVIEW ===
// IDs prioritarios por categoría para mostrar en preview
const PREVIEW_PRIORITY_IDS = {
    'Album': [6025, 6026, 1],
    'Orígenes': [6022],
    'Dave Mustaine': [6014, 6020, 6013, 2814, 2815] // Argentina V1 + Aguante Megadeth primero para el show
};

function renderCollectionPreview(gridId, category, maxItems = 5, buttonText = 'VER MÁS') {
    const grid = document.getElementById(gridId);
    if (!grid || !db.length) return;
    
    // Filtrar productos por categoría
    let products = db.filter(p => p.category === category);
    
    // Si hay IDs prioritarios para esta categoría, reordenar
    if (PREVIEW_PRIORITY_IDS[category]) {
        const priorityIds = PREVIEW_PRIORITY_IDS[category];
        const priorityProducts = priorityIds.map(id => db.find(p => p.id === id)).filter(Boolean);
        const otherProducts = products.filter(p => !priorityIds.includes(p.id));
        products = [...priorityProducts, ...otherProducts];
    }
    if (products.length === 0) return;
    
    let html = '';
    // Siempre mostrar 4 cards normales + 1 card VER MÁS
    const normalCards = Math.min(4, products.length - 1);
    
    // Renderizar las primeras 4 cards normales
    for (let i = 0; i < normalCards; i++) {
        const product = products[i];
        const isHoodie = category === 'Hoodies FMD';
        const isBuzoRedondo = category === 'Buzo Cuello Redondo';
        // Hoodies / buzos: precio doble por defecto; remeras: respetar tipoPrecio del producto
        const precio = isHoodie 
            ? PRECIOS_HOODIES.doble
            : isBuzoRedondo ? PRECIOS_BUZO_REDONDO.doble
            : (product.tipoPrecio === 'doble' ? PRECIOS.doble : PRECIOS.simple);
        
        html += `
            <div class="collection-card" onclick="openModal(${product.id})">
                <div class="collection-card-img">
                    <img src="${product.img}" alt="${product.name}" loading="lazy">
                </div>
                <div class="collection-card-info">
                    <h4>${product.name}</h4>
                    <span class="price">$${precio.toLocaleString('es-AR')}</span>
                </div>
            </div>
        `;
    }
    
    // El 5to card (o último) siempre es VER MÁS
    const verMasProduct = products[normalCards] || products[products.length - 1];
    const isHoodieVerMas = category === 'Hoodies FMD';
    const isBuzoRedondoVerMas = category === 'Buzo Cuello Redondo';
    // Hoodies / buzos: precio doble por defecto; remeras: respetar tipoPrecio del producto
    const precioVerMas = isHoodieVerMas 
        ? PRECIOS_HOODIES.doble
        : isBuzoRedondoVerMas ? PRECIOS_BUZO_REDONDO.doble
        : (verMasProduct.tipoPrecio === 'doble' ? PRECIOS.doble : PRECIOS.simple);
    
    html += `
        <div class="collection-card collection-card-vermas" onclick="filterByCategory('${category}')">
            <div class="collection-blur"></div>
            <div class="collection-card-img">
                <img src="${verMasProduct.img}" alt="${verMasProduct.name}" loading="lazy">
            </div>
            <div class="collection-card-info">
                <h4>${verMasProduct.name}</h4>
                <span class="price">$${precioVerMas.toLocaleString('es-AR')}</span>
            </div>
            <button class="collection-vermas-btn" onclick="event.stopPropagation(); filterByCategory('${category}')">${buttonText} (${products.length})</button>
        </div>
    `;
    
    grid.innerHTML = html;
}

// Función para filtrar por categoría y hacer scroll al catálogo
function filterByCategory(category) {
    // Activar el botón de categoría correspondiente
    const catBtns = document.querySelectorAll('.cat-btn');
    catBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.cat === category) {
            btn.classList.add('active');
        }
    });
    
    // Actualizar categoría actual y filtrar
    currentCategory = category;
    filterProducts();
    
    // Scroll al catálogo
    const catalogToolbar = document.querySelector('.catalog-toolbar');
    if (catalogToolbar) {
        catalogToolbar.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}
// Exponer globalmente para onclick
window.filterByCategory = filterByCategory;

// Cargar todas las colecciones Megadeth
function loadMegadethCollections() {
    renderCollectionPreview('gridAlbum', 'Album', 5, 'VER TODO');
    renderCollectionPreview('gridDave', 'Dave Mustaine', 5, 'VER TODO');
    renderCollectionPreview('gridVic', 'VicRattlehead', 5, 'VER TODO');
    renderCollectionPreview('gridSingles', 'Singles', 5, 'VER TODO');
    renderCollectionPreview('gridTour', 'Tour', 5, 'VER TODO');
    renderCollectionPreview('gridHoodies', 'Hoodies FMD', 5, 'VER TODO');
}

function resolveMegadethSegment(product) {
    const category = String(product?.category || '').toLowerCase();

    if (category === 'tour') return 'tour';
    if (category === 'album' || category === 'origenes' || category === 'orígenes') return 'albumes';
    if (category === 'musician' || category === 'dave mustaine' || category === 'vicrattlehead') return 'musicos';
    if (category === 'dorsales') return 'dorsos';
    return 'todo';
}

function isMegadethNewDrop(product) {
    if (!product) return false;
    const year = Number.parseInt(product.year, 10);
    return Boolean(product.isNew) || (!Number.isNaN(year) && year >= 2025) || (product.id >= 6000);
}

function getMegadethShowcaseProducts() {
    if (!Array.isArray(db) || !db.length) return [];

    return db
        .filter(isMegadethUniverseProduct)
        .filter(p => String(p.category || '').toLowerCase() !== 'personalizados')
        .map((p) => {
            const variants = Array.isArray(p.variants) ? p.variants : [];
            const dorsoIndex = variants.findIndex(v => /dorso|back/i.test(String(v?.name || '')));
            const fallbackBack = dorsoIndex >= 0 ? dorsoIndex : (variants.length > 1 ? 1 : -1);

            return {
                ...p,
                mgxSegment: resolveMegadethSegment(p),
                mgxNew: isMegadethNewDrop(p),
                mgxFrontImg: p.img,
                mgxBackImg: fallbackBack >= 0 ? variants[fallbackBack].img : null,
                mgxHasBack: fallbackBack >= 0
            };
        })
        .sort((a, b) => (b.id || 0) - (a.id || 0));
}

function applyMegadethShowcaseFilters(items) {
    return items.filter((p) => {
        if (mgxState.tab === 'nuevos' && !p.mgxNew) return false;
        if (mgxState.tab !== 'todo' && mgxState.tab !== 'nuevos' && p.mgxSegment !== mgxState.tab) return false;

        if (mgxState.prenda === 'hoodie' && String(p.category || '').toLowerCase() !== 'hoodies fmd') return false;
        if (mgxState.prenda === 'remera' && String(p.category || '').toLowerCase() === 'hoodies fmd') return false;

        if (mgxState.estampa === 'simple' && p.tipoPrecio !== 'simple') return false;
        if (mgxState.estampa === 'doble' && p.tipoPrecio !== 'doble') return false;

        return true;
    });
}

function renderMegadethShowcaseTabs(items) {
    const tabsHost = document.getElementById('mgxTabs');
    if (!tabsHost) return;

    const counts = {
        todo: items.length,
        nuevos: items.filter(p => p.mgxNew).length,
        tour: items.filter(p => p.mgxSegment === 'tour').length,
        albumes: items.filter(p => p.mgxSegment === 'albumes').length,
        musicos: items.filter(p => p.mgxSegment === 'musicos').length,
        dorsos: items.filter(p => p.mgxSegment === 'dorsos').length
    };

    tabsHost.innerHTML = MGX_SHOWCASE_TABS.map(tab => {
        const activeClass = mgxState.tab === tab.key ? 'active' : '';
        const label = `${tab.label} (${counts[tab.key] || 0})`;
        return `<button class="mgx-tab ${activeClass}" data-mgx-tab="${tab.key}">${label}</button>`;
    }).join('');
}

function renderMegadethShowcaseCards(filtered) {
    const grid = document.getElementById('mgxGrid');
    if (!grid) return;

    if (!filtered.length) {
        grid.innerHTML = '<div class="mgx-empty">No hay resultados con esos filtros. Proba otra combinacion.</div>';
        return;
    }

    const preview = filtered.slice(0, 10);

    grid.innerHTML = preview.map((p) => {
        const categoryLabel = getCategoryLabel(p.category);
        const faceBadge = p.mgxHasBack ? 'Frente' : 'Diseno unico';
        const codeLabel = p.code || `ID-${String(p.id).padStart(4, '0')}`;
        const toggleLabel = p.mgxHasBack ? 'Ver dorso' : 'Sin dorso';

        return `
            <article class="mgx-card" data-mgx-id="${p.id}">
                <div class="mgx-media">
                    <span class="mgx-face-badge">${faceBadge}</span>
                    <img src="${p.mgxFrontImg}" alt="${p.name}" data-front="${p.mgxFrontImg}" data-back="${p.mgxBackImg || ''}" data-face="front" loading="lazy">
                </div>
                <div class="mgx-card-info">
                    <h3 class="mgx-card-title">${p.name}</h3>
                    <p class="mgx-card-meta">${categoryLabel} · ${codeLabel}</p>
                    <div class="mgx-actions">
                        <button class="mgx-btn mgx-btn-toggle" data-mgx-toggle="${p.id}" ${p.mgxHasBack ? '' : 'disabled'}>${toggleLabel}</button>
                        <button class="mgx-btn mgx-btn-open" data-mgx-open="${p.id}">Abrir ficha</button>
                    </div>
                </div>
            </article>
        `;
    }).join('');
}

function renderMegadethShowcase() {
    const section = document.getElementById('mgxShowcase');
    if (!section) return;

    const items = getMegadethShowcaseProducts();
    renderMegadethShowcaseTabs(items);
    const filtered = applyMegadethShowcaseFilters(items);
    renderMegadethShowcaseCards(filtered);
}

function initMegadethShowcase() {
    const section = document.getElementById('mgxShowcase');
    if (!section) return;

    renderMegadethShowcase();

    section.addEventListener('click', (event) => {
        const tabBtn = event.target.closest('[data-mgx-tab]');
        if (tabBtn) {
            mgxState.tab = tabBtn.dataset.mgxTab;
            renderMegadethShowcase();
            return;
        }

        const prendaBtn = event.target.closest('[data-prenda]');
        if (prendaBtn) {
            mgxState.prenda = prendaBtn.dataset.prenda;
            section.querySelectorAll('[data-prenda]').forEach(btn => btn.classList.remove('active'));
            prendaBtn.classList.add('active');
            renderMegadethShowcase();
            return;
        }

        const estampaBtn = event.target.closest('[data-estampa]');
        if (estampaBtn) {
            mgxState.estampa = estampaBtn.dataset.estampa;
            section.querySelectorAll('[data-estampa]').forEach(btn => btn.classList.remove('active'));
            estampaBtn.classList.add('active');
            renderMegadethShowcase();
            return;
        }

        const openBtn = event.target.closest('[data-mgx-open]');
        if (openBtn) {
            const id = Number(openBtn.dataset.mgxOpen);
            if (!Number.isNaN(id)) openModal(id);
            return;
        }

        const toggleBtn = event.target.closest('[data-mgx-toggle]');
        if (toggleBtn) {
            const card = toggleBtn.closest('.mgx-card');
            if (!card) return;

            const image = card.querySelector('img[data-front]');
            const badge = card.querySelector('.mgx-face-badge');
            if (!image || !badge || !image.dataset.back) return;

            const showingFront = image.dataset.face !== 'back';
            if (showingFront) {
                image.src = image.dataset.back;
                image.dataset.face = 'back';
                badge.textContent = 'Dorso';
                toggleBtn.textContent = 'Ver frente';
            } else {
                image.src = image.dataset.front;
                image.dataset.face = 'front';
                badge.textContent = 'Frente';
                toggleBtn.textContent = 'Ver dorso';
            }
        }
    });
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    const heroCtaBuzos = document.getElementById('heroCtaBuzos');
    if (heroCtaBuzos) {
        heroCtaBuzos.addEventListener('click', (e) => {
            e.preventDefault();
            scrollToSection('megadethCollections');
        });
    }

    const heroCtaWhatsapp = document.getElementById('heroCtaWhatsapp');
    if (heroCtaWhatsapp) {
        heroCtaWhatsapp.addEventListener('click', (e) => {
            e.preventDefault();
            openWhatsapp('Hola FMD! Quiero hacer un pedido de sus diseños 🤘\n\nFormato: Buzo / Hoodie / Remera\nDiseño: ___\nBanda: ___\nTalle: ___\nColor: ___\nCP o ciudad: ___\n\n¿Me confirmás precio final y envío?', 'hero_general');
        });
    }

    const maidenCtaCollection = document.getElementById('maidenCtaCollection');
    if (maidenCtaCollection) {
        maidenCtaCollection.addEventListener('click', (e) => {
            e.preventDefault();
            goToMaidenCollection();
        });
    }

    const maidenCtaWhatsapp = document.getElementById('maidenCtaWhatsapp');
    if (maidenCtaWhatsapp) {
        maidenCtaWhatsapp.addEventListener('click', (e) => {
            e.preventDefault();
            openWhatsapp('Hola FMD! Quiero encargar un diseño de Iron Maiden.\n\nFormato: Remera / Hoodie / Buzo\nDiseño: ___\nTalle: ___\nColor: ___\nCP o ciudad: ___\n\n¿Me confirmás precio final y envío?', 'maiden_archive');
        });
    }

    const slayerCtaCollection = document.getElementById('slayerCtaCollection');
    if (slayerCtaCollection) {
        slayerCtaCollection.addEventListener('click', (e) => {
            e.preventDefault();
            goToSlayerCollection();
        });
    }

    const slayerCtaWhatsapp = document.getElementById('slayerCtaWhatsapp');
    if (slayerCtaWhatsapp) {
        slayerCtaWhatsapp.addEventListener('click', (e) => {
            e.preventDefault();
            openWhatsapp('Hola FMD! Quiero encargar un diseño de Slayer.\n\nFormato: Remera / Hoodie / Buzo cuello redondo\nDiseño: ___\nTalle: ___\nColor: ___\nCP o ciudad: ___\n\n¿Me confirmás precio final y envío?', 'slayer_archive');
        });
    }

    const cartBtnEl = document.getElementById('cartBtn');
    if (cartBtnEl) {
        cartBtnEl.addEventListener('click', (e) => {
            e.preventDefault();
            openCartPreview();
        });
    }

    const cartPanelCloseEl = document.getElementById('cartPanelClose');
    if (cartPanelCloseEl) {
        cartPanelCloseEl.addEventListener('click', (e) => {
            e.preventDefault();
            toggleCartPanel();
        });
    }

    const btnViewCartEl = document.getElementById('btnViewCart');
    if (btnViewCartEl) {
        btnViewCartEl.addEventListener('click', (e) => {
            e.preventDefault();
            openCartPreview();
        });
    }

    loadProducts().finally(() => {
        initFmdSpotlight();
    });
    setView('grid');
    initSearchModal();
    initCountdown();
    initFmd3dCarousels();
});

// Escuchar cambios en hash (si usuario navega directamente a #producto-123)
window.addEventListener('hashchange', loadProductFromHash);
