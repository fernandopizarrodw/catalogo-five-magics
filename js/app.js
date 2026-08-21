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
const FECHA_VIGENCIA = "Agosto 2026";
const WHATSAPP = "541169667685";
const BAND_ARCHIVE_CONFIGS = Array.isArray(window.FMD_BAND_ARCHIVES)
    ? window.FMD_BAND_ARCHIVES
    : [];
const RETIRED_CATALOG_DESIGN_IDS = new Set(
    BAND_ARCHIVE_CONFIGS.flatMap(config => Array.isArray(config?.retiredDesignIds) ? config.retiredDesignIds : [])
);
const BAND_LANDING_CONFIG = window.FMD_BAND_LANDING && typeof window.FMD_BAND_LANDING === 'object'
    ? window.FMD_BAND_LANDING
    : null;
const BAND_LANDING_BAND = String(BAND_LANDING_CONFIG?.band || '').trim();
const BAND_LANDING_COLLECTIONS = Array.isArray(BAND_LANDING_CONFIG?.collections)
    ? BAND_LANDING_CONFIG.collections
    : [];
const BAND_LANDING_SHOWN_COMPOSITION_GARMENTS = new Set(
    Array.isArray(BAND_LANDING_CONFIG?.usesShownCompositionGarments)
        ? BAND_LANDING_CONFIG.usesShownCompositionGarments
        : []
);
const BAND_LANDING_DESIGN_ORDER = Array.isArray(BAND_LANDING_CONFIG?.designOrder)
    ? BAND_LANDING_CONFIG.designOrder
    : [];
const BAND_LANDING_DESIGN_ORDER_INDEX = new Map(
    BAND_LANDING_DESIGN_ORDER.map((designId, index) => [designId, index])
);
const BAND_LANDING_CURATED_DESIGN_CATEGORIES = BAND_LANDING_CONFIG?.curatedDesignCategories
    && typeof BAND_LANDING_CONFIG.curatedDesignCategories === 'object'
    ? BAND_LANDING_CONFIG.curatedDesignCategories
    : {};
const BAND_LANDING_SHARED_DESIGN_IDS = new Set(
    Array.isArray(BAND_LANDING_CONFIG?.sharedDesignIds)
        ? BAND_LANDING_CONFIG.sharedDesignIds
        : []
);
const BAND_LANDING_SHARED_BANDS = new Set(
    Array.isArray(BAND_LANDING_CONFIG?.sharedBands)
        ? BAND_LANDING_CONFIG.sharedBands.map(normalizeText)
        : []
);
const BAND_LANDING_ALBUM_ORDER = Array.isArray(BAND_LANDING_CONFIG?.albumOrder)
    ? BAND_LANDING_CONFIG.albumOrder
    : [];
const BAND_LANDING_ALBUM_ORDER_INDEX = new Map(
    BAND_LANDING_ALBUM_ORDER.map((album, index) => [normalizeText(album), index])
);
const BAND_LANDING_GARMENTS = new Set(['remera', 'hoodie', 'buzo_cuello_redondo']);
const configuredBandLandingGarment = String(BAND_LANDING_CONFIG?.defaultGarment || '').trim();
const requestedBandLandingGarment = typeof window !== 'undefined'
    ? String(new URLSearchParams(window.location.search).get('prenda') || '').trim()
    : '';
let bandLandingGarment = BAND_LANDING_GARMENTS.has(requestedBandLandingGarment)
    ? requestedBandLandingGarment
    : BAND_LANDING_GARMENTS.has(configuredBandLandingGarment)
        ? configuredBandLandingGarment
    : (BAND_LANDING_BAND ? 'remera' : '');
let bandLandingCollection = String(BAND_LANDING_CONFIG?.defaultCollection || '');
const BAND_LANDING_URLS = Object.fromEntries(BAND_ARCHIVE_CONFIGS.map(config => [
    normalizeText(config.band),
    `/${String(config.slug || '').replace(/^\/+|\/+$/g, '')}/`
]));

function trackCatalogEvent(eventName, params = {}) {
    if (typeof gtag === 'undefined' || !eventName) return;

    const query = new URLSearchParams(window.location.search);
    const context = {
        page_path: window.location.pathname,
        archive: BAND_LANDING_BAND || 'catalogo_general',
        debug_mode: query.get('ga_debug') === '1' ? true : undefined,
        utm_source: query.get('utm_source') || undefined,
        utm_medium: query.get('utm_medium') || undefined,
        utm_campaign: query.get('utm_campaign') || undefined
    };
    const payload = Object.fromEntries(
        Object.entries({ ...context, ...params })
            .filter(([, value]) => value !== undefined && value !== null && value !== '')
    );

    gtag('event', eventName, payload);
}

function isBandLandingMode() {
    return Boolean(BAND_LANDING_BAND);
}

function usesBandLandingShownComposition() {
    if (currentCatalogDesign?.usesShownComposition === true || currentProduct?.usesShownComposition === true) return true;
    if (!isBandLandingMode()) return false;
    if (BAND_LANDING_CONFIG?.usesShownComposition === true) return true;
    const garment = selectedModalGarment === 'buzo'
        ? 'buzo_cuello_redondo'
        : selectedModalGarment === 'hoodie'
            ? 'hoodie'
            : 'remera';
    return BAND_LANDING_SHOWN_COMPOSITION_GARMENTS.has(garment);
}

function isCatalogDesignInScope(design) {
    return !isBandLandingMode()
        || normalizeText(design?.band) === normalizeText(BAND_LANDING_BAND)
        || BAND_LANDING_SHARED_BANDS.has(normalizeText(design?.band))
        || BAND_LANDING_SHARED_DESIGN_IDS.has(design?.designId);
}

function isProductInCatalogScope(product) {
    return !isBandLandingMode()
        || normalizeText(getCatalogBandLabel(product)) === normalizeText(BAND_LANDING_BAND)
        || BAND_LANDING_SHARED_BANDS.has(normalizeText(getCatalogBandLabel(product)))
        || BAND_LANDING_SHARED_DESIGN_IDS.has(product?.designId);
}

function normalizeBandLandingAssetPath(value) {
    if (!isBandLandingMode() || typeof value !== 'string' || !value) return value;
    if (/^(?:[a-z]+:|\/|#)/i.test(value)) return value;
    return `/${value.replace(/^\.\//, '')}`;
}

function normalizeBandLandingProductAssets(products) {
    if (!isBandLandingMode() || !Array.isArray(products)) return products;
    return products.map(product => ({
        ...product,
        img: normalizeBandLandingAssetPath(product.img),
        variants: Array.isArray(product.variants)
            ? product.variants.map(variant => ({
                ...variant,
                img: normalizeBandLandingAssetPath(variant.img)
            }))
            : product.variants
    }));
}

function getBandLandingUrl(band) {
    return BAND_LANDING_URLS[normalizeText(band)] || '';
}

function getBandLandingModalGarment(garment = bandLandingGarment) {
    if (garment === 'hoodie') return 'hoodie';
    if (garment === 'buzo_cuello_redondo') return 'buzo';
    return 'remera_clasica';
}

function getBandLandingGarmentLabel(garment = bandLandingGarment) {
    if (garment === 'hoodie') return 'HOODIES';
    if (garment === 'buzo_cuello_redondo') return 'BUZOS';
    return 'REMERAS';
}

function getBandLandingDesignAlbums(design) {
    return (design?.sourceProductIds || [])
        .map(id => db.find(product => Number(product.id) === Number(id)))
        .map(product => normalizeText(product?.album || ''))
        .filter(Boolean);
}

function matchesBandLandingCollection(design, collection) {
    if (!collection) return true;
    const designIds = (collection.match?.designIds || []).map(normalizeText);
    if (designIds.length) return designIds.includes(normalizeText(design?.designId));
    const collectionId = normalizeText(collection.id);

    const curatedCategory = normalizeText(BAND_LANDING_CURATED_DESIGN_CATEGORIES[design?.designId]);
    const collectionCategory = normalizeText(collection.curatedCategory || collection.label);
    // La categoría curada es la ubicación editorial definitiva del diseño.
    // Evita que las reglas automáticas vuelvan a mostrarlo en otra colección.
    if (curatedCategory) return curatedCategory === collectionCategory;

    const sourceAlbums = getBandLandingDesignAlbums(design);
    const albumMatches = (collection.match?.albums || []).map(normalizeText);
    if (albumMatches.length) return sourceAlbums.some(album => albumMatches.includes(album));

    // Un diseño asociado a un disco vive en ese álbum, aunque también tenga badge FMD.
    if (sourceAlbums.length) return false;

    if ((design?.collectionIds || []).some(id => normalizeText(id) === collectionId)) return true;

    const normalizedBadges = (design?.badges || []).map(normalizeText);
    const isOriginalFmd = normalizedBadges.includes('original fmd');
    if (isOriginalFmd && collectionId !== 'originals') return false;

    const bandMatches = (collection.match?.bands || []).map(normalizeText);
    if (bandMatches.includes(normalizeText(design?.band))) return true;

    const categoryMatches = (collection.match?.categories || []).map(normalizeText);
    if (categoryMatches.length && (design?.categories || [design?.category]).some(category => categoryMatches.includes(normalizeText(category)))) {
        return true;
    }

    const badgeMatches = (collection.match?.badges || []).map(normalizeText);
    if (badgeMatches.length > 0 && normalizedBadges.some(badge => badgeMatches.includes(badge))) return true;

    const tierMatches = (collection.match?.visibilityTiers || []).map(normalizeText);
    return tierMatches.includes(normalizeText(design?.visibilityTier));
}

function updateBandLandingCollectionCounts(designs) {
    if (!isBandLandingMode() || !BAND_LANDING_COLLECTIONS.length) return;
    const allDesigns = Array.isArray(designs) ? designs : [];
    document.querySelectorAll('[data-collection-count]').forEach(counter => {
        const collectionId = counter.dataset.collectionCount || '';
        const collection = BAND_LANDING_COLLECTIONS.find(item => item.id === collectionId);
        const count = collection ? allDesigns.filter(design => matchesBandLandingCollection(design, collection)).length : allDesigns.length;
        counter.textContent = `(${count})`;
    });
}

function selectBandLandingCollection(collectionId = '') {
    if (!isBandLandingMode()) return;
    const nextId = String(collectionId || '');
    if (nextId && !BAND_LANDING_COLLECTIONS.some(collection => collection.id === nextId)) return;
    bandLandingCollection = nextId;
    trackCatalogEvent('archive_filter_collection', {
        band: BAND_LANDING_BAND,
        collection: nextId || 'all'
    });
    document.querySelectorAll('[data-band-landing-collection]').forEach(button => {
        const isActive = button.dataset.bandLandingCollection === nextId;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-pressed', String(isActive));
    });
    resetCatalogPagination();
    filterProducts();
}

window.selectBandLandingCollection = selectBandLandingCollection;

function selectBandLandingGarment(garment) {
    if (!isBandLandingMode() || !BAND_LANDING_GARMENTS.has(garment)) return;
    bandLandingGarment = garment;
    document.querySelectorAll('[data-band-landing-garment]').forEach(button => {
        const isActive = button.dataset.bandLandingGarment === garment;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-selected', String(isActive));
    });
    resetCatalogPagination();
    filterProducts();
    scrollToSection('bandCatalogTitle');
}

window.selectBandLandingGarment = selectBandLandingGarment;
const MAIDEN_ARCHIVE_HIGHLIGHT_IDS = [7015, 7027, 7023, 7025, 7026, 7029];
const MAIDEN_ARCHIVE_GROUPS = [
    { title: 'Iron Maiden clásico', meta: 'Diseños FMD', productIds: [308, 6004, 7011] },
    { title: 'The Number of the Beast / 666', meta: 'Dos clásicos de Iron Maiden', productIds: [5038, 6005] },
    { title: 'Killers', meta: 'Versiones FMD', productIds: [7023, 6006, 7024, 6007] },
    { title: 'Live After Death', meta: 'Frente y dorso', productIds: [7025, 7012] },
    { title: 'Tour 2026', meta: 'Edicion tour FMD', productIds: [7029, 7013] },
    { title: 'Powerslave', meta: 'Archivo FMD', productIds: [7026, 7030] }
];
const SLAYER_ARCHIVE_HIGHLIGHT_IDS = [7123, 7122, 7121, 7119, 7118, 7117, 7114, 7115, 7116, 7113, 7112, 7106, 7111, 7110, 7107, 7108, 7109, 7101, 7102, 7103, 7104, 7105];
let slayerGarmentPreference = null;
let maidenGarmentPreference = null;
let epicaGarmentPreference = null;
const MEGADETH_ARCHIVE_CATEGORIES = new Set(['Orígenes', 'Album', 'Musician', 'Tour', 'VicRattlehead', 'Singles', 'Dorsales', 'Dave Mustaine', 'Hoodies FMD', 'Buzo Cuello Redondo']);
let megadethGarmentPreference = null;
let megadethSegmentPreference = 'all';
const MEGADETH_PAGE_SIZE = 24;
let megadethVisibleLimit = MEGADETH_PAGE_SIZE;
const CATALOG_PAGE_SIZE = 24;
let catalogVisibleLimit = CATALOG_PAGE_SIZE;
const PUBLIC_VISIBILITY_TIERS = new Set(['hero', 'featured', 'catalog', 'archive']);
const SHOWCASE_VISIBILITY_TIERS = new Set(['hero', 'featured', 'catalog']);
const VISIBILITY_TIER_ORDER = { hero: 0, featured: 1, catalog: 2, archive: 3, hidden: 4 };
const ENABLE_UNIVERSE_SHOWCASES = false;
const ENABLE_CATALOG_DESIGN_RENDER = true;
const UNIVERSE_SHOWCASE_DEFINITIONS = [
    { universe: 'Megadeth Vault', limit: 8, primary: true },
    { universe: 'FMD Editions', limit: 6, primary: true },
    { universe: 'Thrash Metal', limit: 4 },
    { universe: 'Heavy Metal Classics', limit: 4 },
    { universe: 'Groove Metal', limit: 4 },
    { universe: 'Rock Legends', limit: 4 },
    { universe: 'Modern Metal', limit: 4 }
];

const PRIMARY_HERO_ACCESS = [
    { label: 'MEGADETH', filter: 'Megadeth', primary: true },
    { label: 'SLAYER', filter: 'Slayer' },
    { label: 'IRON MAIDEN', filter: 'Iron Maiden' },
    { label: 'METALLICA', filter: 'Metallica' }
];

const ACTIVE_HOME_CAMPAIGN = {
    active: true,
    kicker: 'DESTACADO FMD',
    title: 'ÉPICO · POWER · SINFÓNICO',
    subtitle: 'Nuevos diseños de EPICA, Rhapsody, Helloween, Nightwish y Blind Guardian.',
    featuredFilters: ['Epica', 'Rhapsody', 'Helloween'],
    bands: [
        { label: 'EPICA', filter: 'Epica', badge: 'SHOW ARGENTINA 2027' },
        { label: 'RHAPSODY', filter: 'Rhapsody', badge: 'SHOW ARGENTINA 2027' },
        { label: 'HELLOWEEN', filter: 'Helloween', badge: 'SHOW ARGENTINA 2026' },
        { label: 'NIGHTWISH', filter: 'Nightwish', href: '/nightwish/' },
        { label: 'BLIND GUARDIAN', filter: 'Blind Guardian' }
    ]
};

const FEATURED_OUTERWEAR_PRODUCT_IDS = [5062, 7123, 7040, 1061, 6008, 6021];

const SECONDARY_HOME_ACCESS = [
    { label: 'PANTERA', filter: 'Pantera' },
    { label: 'AC/DC', filter: 'AC/DC' },
    { label: 'SEPULTURA', filter: 'Sepultura' },
    { label: 'AVENGED SEVENFOLD', filter: 'Avenged Sevenfold' },
    { label: 'DIO', filter: 'Dio' },
    { label: 'NIGHTWISH', filter: 'Nightwish', href: '/nightwish/' }
];

let db = [];
let catalogDesigns = [];
let catalogDesignById = new Map();
let catalogHistoricalBacks = [];
let currentCatalogDesign = null;
let selectedCatalogBackRef = null;
let selectedAge = 'adulto';
let selectedSize = '';
let selectedCut = 'clasica';
let selectedColor = 'negro';
let selectedBackIndex = -1; // índice del dorso seleccionado para doble estampa (-1 = ninguno)
let selectedPrintMode = 'simple';
let selectedModalGarment = 'remera_clasica';
let selectedDeliveryMethod = '';
let fmdSpotlightTimer = null;
let fmdSpotlightPaused = false;
let fmdSpotlightTouchResume = null;

function scrollToSection(sectionId) {
    const target = document.getElementById(sectionId);
    if (!target) return;

    const header = document.querySelector('header');
    const headerHeight = header ? header.offsetHeight : 0;
    const offset = headerHeight + 18;
    const targetTop = target.getBoundingClientRect().top + window.pageYOffset - offset;
    window.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
    if (window.location.hash !== `#${sectionId}`) {
        history.replaceState(null, '', `#${sectionId}`);
    }
}

function updateFloatingWhatsappVisibility() {
    if (!document.body) return;
    const shouldShow = window.innerWidth > 768 || window.scrollY > 360;
    document.body.classList.toggle('fab-wa-visible', shouldShow);
}

window.addEventListener('scroll', updateFloatingWhatsappVisibility, { passive: true });
window.addEventListener('resize', updateFloatingWhatsappVisibility);
updateFloatingWhatsappVisibility();

function goToMaidenCollection() {
    maidenGarmentPreference = null;
    scrollToSection('categoryNav');
    setTimeout(() => {
        const maidenBtn = document.querySelector('.cat-btn[data-cat="Iron Maiden"]');
        if (maidenBtn) maidenBtn.click();
    }, 180);
}

function isMaidenArchiveProduct(product) {
    const category = normalizeText(product?.category || '');
    const band = normalizeText(product?.band || '');
    const text = normalizeText(`${product?.name || ''} ${product?.img || ''}`);
    return category === 'iron maiden' || band === 'iron maiden' || text.includes('iron maiden');
}

function getMaidenProductGarment(product) {
    const category = normalizeText(product?.category || '');
    if (category.includes('hoodie')) return 'hoodie';
    if (category === 'buzo cuello redondo') return 'buzo';
    return 'remera';
}

function getMaidenArchiveProducts(garment = maidenGarmentPreference) {
    return db
        .filter(isMaidenArchiveProduct)
        .filter(isPublicProduct)
        .filter(product => !garment || getMaidenProductGarment(product) === garment)
        .sort(compareProductsByVisibilityThenPriority);
}

function showMaidenGarment(garment) {
    maidenGarmentPreference = ['remera', 'hoodie', 'buzo'].includes(garment) ? garment : 'remera';
    resetCatalogPagination();
    currentUniverse = null;
    currentGarmentFilter = null;
    currentCategory = 'Iron Maiden';
    document.querySelectorAll('.cat-btn').forEach(button => button.classList.toggle('active', button.dataset.cat === 'Iron Maiden'));
    filterProducts();
    scrollToSection('catalogoPrincipal');
}

window.showMaidenGarment = showMaidenGarment;

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
    return getSlayerPreferredVariantIndexes(product)[0] ?? -1;
}

function getSlayerPreferredVariantIndexes(product) {
    if (product?.category !== 'Slayer' || !slayerGarmentPreference) return [];
    const garmentTerm = slayerGarmentPreference === 'buzo' ? 'buzo' : slayerGarmentPreference;
    return (product.variants || []).reduce((indexes, variant, index) => {
        if (normalizeText(variant?.name || '').includes(garmentTerm)) indexes.push(index);
        return indexes;
    }, []);
}

window.showSlayerGarment = showSlayerGarment;

function getEpicaProduct() {
    return db.find(product => Number(product?.id) === 5016 || normalizeText(product?.band) === 'epica');
}

function getEpicaPreferredGarmentLabel() {
    if (epicaGarmentPreference === 'hoodie') return 'Hoodie';
    if (epicaGarmentPreference === 'buzo') return 'Buzo cuello redondo';
    if (epicaGarmentPreference === 'remera') return 'Remera';
    return '';
}

function getEpicaPreferredGarmentPluralLabel() {
    if (epicaGarmentPreference === 'hoodie') return 'Hoodies EPICA';
    if (epicaGarmentPreference === 'buzo') return 'Buzos EPICA';
    if (epicaGarmentPreference === 'remera') return 'Remeras EPICA';
    return 'EPICA';
}

function getEpicaVariantGarment(variant) {
    const category = normalizeText(variant?.garmentCategory || '');
    const text = normalizeText(`${variant?.name || ''} ${variant?.img || ''} ${category}`);
    if (category.includes('hoodie') || text.includes('hoodie')) return 'hoodie';
    if (category.includes('buzo cuello redondo') || text.includes('buzo cuello redondo') || text.includes('buzo_')) return 'buzo';
    return 'remera';
}

function getEpicaPreferredVariantIndexes(product) {
    if (normalizeText(product?.band) !== 'epica' || !epicaGarmentPreference) return [];
    return (product.variants || []).reduce((indexes, variant, index) => {
        if (getEpicaVariantGarment(variant) === epicaGarmentPreference) indexes.push(index);
        return indexes;
    }, []);
}

function expandEpicaVariants(product, garment = epicaGarmentPreference) {
    if (normalizeText(product?.band) !== 'epica') return [product];
    const variants = product.variants || [];
    return variants
        .map((variant, index) => {
            const matchedGarment = getEpicaVariantGarment(variant);
            if (garment && matchedGarment !== garment) return null;
            return {
                ...product,
                variants: [variant],
                matchedVariantIndex: index,
                matchedVariantIndexes: [index],
                matchedVariantName: variant.name,
                matchedVariantImage: variant.img,
                matchedGarment,
                epicaExpandedVariant: true
            };
        })
        .filter(Boolean);
}

function showEpicaGarment(garment) {
    epicaGarmentPreference = ['remera', 'hoodie', 'buzo'].includes(garment) ? garment : 'remera';
    resetCatalogPagination();
    currentUniverse = null;
    currentGarmentFilter = null;
    currentCategory = 'Epica';
    document.querySelectorAll('.cat-btn').forEach(button => button.classList.toggle('active', button.dataset.cat === 'Epica'));
    filterProducts();
    scrollToSection('catalogoPrincipal');
}

function showAllEpica() {
    epicaGarmentPreference = null;
    resetCatalogPagination();
    currentUniverse = null;
    currentGarmentFilter = null;
    currentCategory = 'Epica';
    document.querySelectorAll('.cat-btn').forEach(button => button.classList.toggle('active', button.dataset.cat === 'Epica'));
    filterProducts();
    scrollToSection('catalogoPrincipal');
}

window.showEpicaGarment = showEpicaGarment;
window.showAllEpica = showAllEpica;

function isMegadethArchiveProduct(product) {
    if (!product) return false;
    if (normalizeText(product.band) === 'megadeth') return true;
    if (!MEGADETH_ARCHIVE_CATEGORIES.has(product.category)) return false;

    const text = normalizeText(`${product.name || ''} ${product.img || ''} ${(product.variants || []).map(variant => `${variant?.name || ''} ${variant?.img || ''}`).join(' ')}`);
    return !text.includes('iron maiden');
}

function getMegadethVariantGarment(product, variant) {
    const category = normalizeText(variant?.garmentCategory || product?.category || '');
    const text = normalizeText(`${variant?.name || ''} ${variant?.img || ''} ${category}`);
    if (category.includes('hoodie') || text.includes('hoodie')) return 'hoodie';
    if (category.includes('buzo cuello redondo') || text.includes('buzo cuello redondo') || text.includes('buzo_')) return 'buzo';
    return 'remera';
}

function getMegadethProductSegment(product, variant = null) {
    const curatedSectionMap = {
        albums: 'albums',
        vic_rattlehead: 'vic',
        dave_mustaine: 'dave',
        tours: 'tours',
        members: 'members',
        logos: 'albums',
        other: 'albums'
    };
    if (curatedSectionMap[product?.megadethSection]) {
        return curatedSectionMap[product.megadethSection];
    }
    if (product?.megadethSection === 'original_fmd' || product?.megadethSection === 'reimagined_fmd') {
        if (product?.megadethDesignType === 'dave') return 'dave';
        if (product?.megadethDesignType === 'vic') return 'vic';
        if (product?.megadethDesignType === 'tour' || product?.megadethDesignType === 'front_back_set') return 'tours';
        if (product?.megadethAlbum) return 'albums';
        return 'albums';
    }

    const category = normalizeText(product?.category || '');
    const name = normalizeText(product?.name || '');
    const searchableText = normalizeText([product?.name, product?.img, variant?.name, variant?.img].filter(Boolean).join(' '));
    const collectionText = normalizeText((product?.collections || []).join(' '));
    const isVicDesign = category === 'vicrattlehead'
        || searchableText.includes('vic rattlehead')
        || searchableText.includes('vicrattlehead')
        || /\bvic\b/.test(searchableText);
    const isFmdOriginal = collectionText.includes('original fmd')
        || searchableText.includes('original fmd')
        || searchableText.includes('fmd edition');

    if (category === 'vicrattlehead') return 'vic';
    if (category === 'dave mustaine') return 'dave';
    if (category === 'tour' || category === 'dorsales') return 'tours';
    if (category === 'musician') return 'members';
    if (isVicDesign) return 'vic';
    if (category === 'album') return 'albums';
    if (isFmdOriginal) return 'albums';
    return 'albums';
}

const MEGADETH_SEGMENT_ORDER = {
    albums: 1,
    vic: 2,
    dave: 3,
    tours: 4,
    members: 5
};
const MEGADETH_SEGMENT_LABELS = {
    albums: '1. ÁLBUMES',
    vic: '2. VIC RATTLEHEAD',
    dave: '3. DAVE MUSTAINE',
    tours: '4. TOURS',
    members: '5. MIEMBROS'
};

function getMegadethYearValue(product) {
    const year = Number.parseInt(String(product?.year || ''), 10);
    return Number.isFinite(year) ? year : 9999;
}

function compareMegadethArchiveEntries(a, b) {
    const segmentDiff = (MEGADETH_SEGMENT_ORDER[a.matchedSegment] || 99) - (MEGADETH_SEGMENT_ORDER[b.matchedSegment] || 99);
    if (segmentDiff) return segmentDiff;

    if (a.matchedSegment === 'albums') {
        const yearDiff = getMegadethYearValue(a) - getMegadethYearValue(b);
        if (yearDiff) return yearDiff;
    }

    return String(a.name || '').localeCompare(String(b.name || ''), 'es', { sensitivity: 'base' });
}

function getMegadethArchiveEntries(garment = megadethGarmentPreference, segment = megadethSegmentPreference) {
    const seenImages = new Set();
    const entries = [];

    db.filter(isMegadethArchiveProduct).filter(isPublicProduct).forEach(product => {
        const variants = product.variants?.length
            ? product.variants
            : [{ img: product.img, name: product.name, garmentCategory: product.category }];

        const matchedVariantIndexes = [];
        variants.forEach((variant, variantIndex) => {
            if (!variant?.img || seenImages.has(variant.img)) return;
            const variantGarment = getMegadethVariantGarment(product, variant);
            const variantSegment = getMegadethProductSegment(product);
            if (garment && variantGarment !== garment) return;
            if (segment && segment !== 'all' && variantSegment !== segment) return;

            seenImages.add(variant.img);
            matchedVariantIndexes.push(variantIndex);
        });

        if (!matchedVariantIndexes.length) return;
        const firstVariantIndex = matchedVariantIndexes[0];
        const firstVariant = variants[firstVariantIndex];
        entries.push({
            ...product,
            matchedVariantIndex: firstVariantIndex,
            matchedVariantIndexes,
            matchedVariantName: product.name,
            matchedVariantImage: firstVariant.img,
            matchedGarment: getMegadethVariantGarment(product, firstVariant),
            matchedSegment: getMegadethProductSegment(product)
        });
    });

    return entries.sort(compareMegadethArchiveEntries);
}

function renderMegadethArchiveGrid() {
    const grid = document.getElementById('megadethGarmentGrid');
    if (!grid || !Array.isArray(db) || !db.length) return;

    const definitions = [
        { id: 'remera', label: 'Remeras Megadeth', price: 'Desde $37.000' },
        { id: 'hoodie', label: 'Hoodies Megadeth', price: 'Desde $52.000' },
        { id: 'buzo', label: 'Buzos Megadeth', price: 'Frontal $50.000 · Doble $55.000' }
    ];

    grid.innerHTML = definitions.map(definition => {
        const entries = getMegadethArchiveEntries(definition.id, megadethSegmentPreference);
        const image = entries[0]?.matchedVariantImage || 'images/logo/MARCA DE AGUA.png';
        return `<article class="megadeth-garment-card" onclick="showMegadethGarment('${definition.id}')">
            <img src="${image}" alt="${definition.label}" loading="lazy" decoding="async">
            <div class="megadeth-garment-card-copy">
                <strong>${definition.label}</strong>
                <span>${entries.length} diseños visibles · ${definition.price}</span>
                <button type="button" onclick="event.stopPropagation(); showMegadethGarment('${definition.id}')">ELEGIR Y VER DISEÑOS →</button>
            </div>
        </article>`;
    }).join('');

    document.querySelectorAll('[data-megadeth-segment]').forEach(button => {
        button.classList.toggle('active', button.dataset.megadethSegment === megadethSegmentPreference);
    });
}

function showMegadethGarment(garment) {
    megadethGarmentPreference = ['remera', 'hoodie', 'buzo'].includes(garment) ? garment : 'remera';
    resetCatalogPagination();
    currentUniverse = null;
    currentGarmentFilter = null;
    currentCategory = 'Megadeth';
    document.querySelectorAll('.cat-btn').forEach(button => button.classList.toggle('active', button.dataset.cat === 'Megadeth'));
    filterProducts();
    scrollToSection('catalogoPrincipal');
}

function showMegadethSegment(segment) {
    megadethSegmentPreference = ['all', 'albums', 'vic', 'dave', 'tours', 'members'].includes(segment) ? segment : 'all';
    resetCatalogPagination();
    renderMegadethArchiveGrid();
    if (normalizeText(currentCategory) === 'megadeth') filterProducts();
}

function getActiveMegadethGarmentPreference() {
    if (['remera', 'hoodie', 'buzo'].includes(megadethGarmentPreference)) return megadethGarmentPreference;
    if (['remera', 'hoodie', 'buzo'].includes(mgxState?.prenda)) return mgxState.prenda;
    return null;
}

function showAllMegadeth() {
    megadethGarmentPreference = getActiveMegadethGarmentPreference();
    megadethSegmentPreference = 'all';
    resetCatalogPagination();
    currentUniverse = null;
    currentGarmentFilter = null;
    currentCategory = 'Megadeth';
    document.querySelectorAll('.cat-btn').forEach(button => button.classList.toggle('active', button.dataset.cat === 'Megadeth'));
    renderMegadethArchiveGrid();
    filterProducts();
    scrollToSection('catalogoPrincipal');
}

function openMegadethSizeGuide() {
    const tab = megadethGarmentPreference === 'hoodie'
        ? 'hoodies'
        : megadethGarmentPreference === 'buzo'
            ? 'buzo-redondo'
            : 'oversize';
    document.querySelector(`.tab-btn[data-tab="${tab}"]`)?.click();
    scrollToSection('talles');
}

window.showMegadethGarment = showMegadethGarment;
window.showMegadethSegment = showMegadethSegment;
window.showAllMegadeth = showAllMegadeth;
window.openMegadethSizeGuide = openMegadethSizeGuide;

function loadMoreCatalogDesigns() {
    if (productsGrid?.classList.contains('catalog-design-grid')) {
        catalogVisibleLimit += CATALOG_PAGE_SIZE;
    } else if (normalizeText(currentCategory) === 'megadeth') {
        megadethVisibleLimit += MEGADETH_PAGE_SIZE;
    } else {
        catalogVisibleLimit += CATALOG_PAGE_SIZE;
    }
    filterProducts();
}

window.loadMoreCatalogDesigns = loadMoreCatalogDesigns;
window.loadMoreMegadethDesigns = loadMoreCatalogDesigns;

function backToMegadethUniverse() {
    scrollToSection('megadethArchive');
}

window.backToMegadethUniverse = backToMegadethUniverse;

function backToSlayerArchive() {
    scrollToSection('slayerArchive');
}

window.backToSlayerArchive = backToSlayerArchive;

function backToMaidenArchive() {
    scrollToSection('maidenArchive');
}

window.backToMaidenArchive = backToMaidenArchive;

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
        const groupTitle = group.querySelector('.fmd3d-group-head strong')?.textContent?.trim() || 'Edición FMD';
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
        const groupTitle = group.querySelector('.fmd-originals-group-head strong')?.textContent?.trim() || 'Arte original FMD';
        const groupType = group.querySelector('.fmd-originals-group-head span')?.textContent?.trim() || 'Arte original FMD';
        const media = group.querySelector('.fmd-originals-media');
        const img = media?.querySelector('img');
        const args = parseOpenModalArgs(media?.getAttribute('onclick'));
        if (!img || !args) return;

        pushSpotlightItem({
            section: 'Originales FMD',
            title: groupTitle,
            type: groupType,
            label: 'Arte original FMD',
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

                    const variantName = String(variant?.name || product?.name || 'Arte original FMD').trim();
                    const year = String(product?.year || '2026').trim();
                    pushSpotlightItem({
                        section: 'Originales FMD',
                        title: `${year} · ${variantName.replace(/\s+FMD(?:\s+Edition)?$/i, '').trim()}`,
                        type: 'Arte original FMD',
                        label: 'Lanzamientos 2026',
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

            const baseName = String(product?.name || 'Arte original FMD').trim();
            const year = String(product?.year || '2026').trim();
            pushSpotlightItem({
                section: 'Originales FMD',
                title: `${year} · ${baseName.replace(/\s+FMD(?:\s+Edition)?$/i, '').trim()}`,
                type: 'Arte original FMD',
                label: 'Lanzamientos 2026',
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
        if (product && isPublicProduct(product)) {
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

function getBandDesignCount(filter) {
    if (!Array.isArray(db) || !db.length) return 0;
    return db
        .filter(product => isPublicProduct(product) && matchesCategoryOrMetadata(product, filter))
        .reduce((total, product) => total + Math.max(1, Array.isArray(product.variants) ? product.variants.length : 0), 0);
}

function syncCatalogQuickFilters(filter = null) {
    const normalizedFilter = normalizeText(filter || 'all');
    document.querySelectorAll('.catalog-quick-filter').forEach(button => {
        const buttonFilter = button.dataset.filter || 'all';
        button.classList.toggle('active', normalizeText(buttonFilter) === normalizedFilter);
    });
}

function clearCatalogState() {
    currentUniverse = null;
    currentGarmentFilter = null;
    currentSearch = '';
    epicaGarmentPreference = null;
    slayerGarmentPreference = null;
    maidenGarmentPreference = null;
    megadethGarmentPreference = null;
    megadethSegmentPreference = 'all';
    if (searchInput) searchInput.value = '';
    if (searchClear) searchClear.classList.remove('visible');
}

function openBandAccess(filter) {
    clearCatalogState();
    currentCategory = isBandLandingMode() ? BAND_LANDING_BAND : filter;
    resetCatalogPagination();
    document.querySelectorAll('.cat-btn, .filter-pill, .hero-band-access-btn, .hero-symphonic-btn').forEach(button => {
        const buttonFilter = button.dataset.cat || button.dataset.filter || button.dataset.bandFilter;
        button.classList.toggle('active', normalizeText(buttonFilter) === normalizeText(filter));
    });
    syncCatalogQuickFilters(filter);
    filterProducts();
    scrollToSection('catalogoPrincipal');
}

function showFullCatalog() {
    clearCatalogState();
    currentCategory = isBandLandingMode() ? BAND_LANDING_BAND : null;
    resetCatalogPagination();
    document.querySelectorAll('.cat-btn, .filter-pill, .hero-band-access-btn, .hero-symphonic-btn').forEach(button => {
        const buttonFilter = button.dataset.cat || button.dataset.filter || button.dataset.bandFilter;
        button.classList.toggle('active', normalizeText(buttonFilter) === 'all');
    });
    const allPill = document.querySelector('.filter-pill[data-filter="all"]');
    if (allPill) allPill.classList.add('active');
    syncCatalogQuickFilters('all');
    filterProducts();
    scrollToSection('catalogoPrincipal');
}

function showMoreBandsDirectory() {
    showFullCatalog();
    syncCatalogQuickFilters('more');
    requestAnimationFrame(() => requestAnimationFrame(() => {
        setMoreBandsDirectoryExpanded(true);
        document.querySelector('[data-directory-section="more"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));
}

let moreBandsDirectoryExpanded = (() => {
    try {
        return sessionStorage.getItem('fmd-more-bands-expanded') === 'true';
    } catch (error) {
        return false;
    }
})();

function setMoreBandsDirectoryExpanded(expanded) {
    const grid = document.getElementById('catalogMoreBandsGrid');
    const toggle = document.getElementById('catalogMoreBandsToggle');
    if (!grid || !toggle) return;
    moreBandsDirectoryExpanded = Boolean(expanded);
    grid.classList.toggle('is-preview', !moreBandsDirectoryExpanded);
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.textContent = expanded ? 'OCULTAR BANDAS' : 'VER TODAS LAS BANDAS';
    try {
        sessionStorage.setItem('fmd-more-bands-expanded', String(moreBandsDirectoryExpanded));
    } catch (error) {
        // La vista sigue funcionando aunque el navegador bloquee el almacenamiento.
    }
}

function renderHomeBandButton(item, className, extra = '') {
    if (item.href) {
        return `
            <a class="${className}${extra}" href="${item.href}" aria-label="Ver diseños de ${item.label}">
                <strong>${item.label}</strong>
                <span>VER DISEÑOS</span>
            </a>
        `;
    }
    return `
        <button type="button" class="${className}${extra}" data-band-filter="${item.filter}" onclick="openBandAccess('${item.filter}')">
            <strong>${item.label}</strong>
            <span>VER DISEÑOS</span>
        </button>
    `;
}

function getHomeOuterwearPreview(product) {
    const variants = Array.isArray(product?.variants) ? product.variants : [];
    const preferredVariantIndex = variants.findIndex(variant => getVariantGarmentType(variant) === 'hoodie');
    const fallbackVariantIndex = variants.findIndex(variant => getVariantGarmentType(variant) === 'buzo');
    const variantIndex = preferredVariantIndex >= 0 ? preferredVariantIndex : fallbackVariantIndex;
    const variant = variantIndex >= 0 ? variants[variantIndex] : null;
    const img = variant?.img || variant?.image || product?.img || variants[0]?.img || variants[0]?.image || 'images/logo/MARCA DE AGUA.png';
    const garmentType = variant ? getVariantGarmentType(variant) : '';
    return { img, variantIndex, garmentType };
}

function formatHomeOuterwearPrices(garmentType) {
    const isBuzo = garmentType === 'buzo';
    const tabla = isBuzo ? PRECIOS_BUZO_REDONDO : PRECIOS_HOODIES;
    const label = isBuzo ? 'Buzo' : 'Hoodie';
    return `<div class="dual-prices">
        <div class="price-line"><span class="price-amount">$${tabla.simple.toLocaleString('es-AR')}</span><span class="price-label">${label} estampa frontal</span></div>
        <div class="price-line"><span class="price-amount">$${tabla.doble.toLocaleString('es-AR')}</span><span class="price-label">${label} con frente y dorso</span></div>
    </div>`;
}

function renderHomeOuterwearCard(product) {
    const preview = getHomeOuterwearPreview(product);
    const band = product.band || getCategoryLabel(product.category);
    const encodedBand = encodeURIComponent(band);
    const garment = preview.garmentType === 'buzo' ? 'buzo_cuello_redondo' : 'hoodie';
    return `
        <article class="home-outerwear-card" role="button" tabindex="0" onclick="openHomeOuterwearBand('${encodedBand}', '${garment}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openHomeOuterwearBand('${encodedBand}', '${garment}');}">
            <div class="home-outerwear-media">
                <img src="${preview.img}" alt="${band}: hoodies y buzos" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='images/logo/MARCA DE AGUA.png';">
            </div>
            <div class="home-outerwear-info">
                <h3>${band}</h3>
                <span class="home-outerwear-cta">VER HOODIES Y BUZOS</span>
            </div>
        </article>
    `;
}

function openHomeOuterwearBand(encodedBand, garment = 'hoodie') {
    const band = decodeURIComponent(encodedBand || '');
    const landingUrl = getBandLandingUrl(band);
    if (landingUrl) {
        window.location.href = `${landingUrl}?prenda=${encodeURIComponent(garment)}#catalogoPrincipal`;
        return;
    }
    filterOuterwearByBand(band);
}

window.openHomeOuterwearBand = openHomeOuterwearBand;

function renderHomeArchitecture() {
    const mainContainer = document.getElementById('homeMainBandAccess');
    if (mainContainer) {
        mainContainer.innerHTML = PRIMARY_HERO_ACCESS.slice(0, 4)
            .map(item => renderHomeBandButton(item, 'home-main-band-btn', item.primary ? ' is-primary' : ''))
            .join('');
    }

    const campaignSection = document.getElementById('homeActiveCampaign');
    if (campaignSection) {
        campaignSection.hidden = !ACTIVE_HOME_CAMPAIGN.active;
        if (ACTIVE_HOME_CAMPAIGN.active) {
            const title = document.getElementById('homeCampaignTitle');
            const subtitle = document.getElementById('homeCampaignSubtitle');
            const kicker = document.getElementById('homeCampaignKicker');
            const rail = document.getElementById('homeCampaignBandAccess');
            if (title) title.textContent = ACTIVE_HOME_CAMPAIGN.title || 'DESTACADO FMD';
            if (subtitle) subtitle.textContent = ACTIVE_HOME_CAMPAIGN.subtitle || '';
            if (kicker) kicker.textContent = ACTIVE_HOME_CAMPAIGN.kicker || 'DESTACADO FMD';
            if (rail) {
                const featured = new Set((ACTIVE_HOME_CAMPAIGN.featuredFilters || []).map(normalizeText));
                rail.innerHTML = (ACTIVE_HOME_CAMPAIGN.bands || []).slice(0, 5).map(item => {
                    const isFeatured = featured.has(normalizeText(item.filter));
                    const label = isFeatured && item.badge
                        ? `<em>${item.badge}</em>`
                        : '';
                    if (item.href) {
                        return `
                        <a class="home-campaign-card${isFeatured ? ' is-featured' : ''}" href="${item.href}" aria-label="Ver diseños de ${item.label}">
                            ${label}
                            <strong>${item.label}</strong>
                            <span>VER DISEÑOS</span>
                        </a>
                    `;
                    }
                    return `
                        <button type="button" class="home-campaign-card${isFeatured ? ' is-featured' : ''}" data-band-filter="${item.filter}" onclick="openBandAccess('${item.filter}')">
                            ${label}
                            <strong>${item.label}</strong>
                            <span>VER DISEÑOS</span>
                        </button>
                    `;
                }).join('');
            }
        }
    }

    const outerwearGrid = document.getElementById('homeOuterwearGrid');
    if (outerwearGrid) {
        outerwearGrid.innerHTML = FEATURED_OUTERWEAR_PRODUCT_IDS.slice(0, 6)
            .map(id => db.find(product => Number(product?.id) === Number(id)))
            .filter(Boolean)
            .map(renderHomeOuterwearCard)
            .join('');
    }

    const secondaryContainer = document.getElementById('homeSecondaryBandAccess');
    if (secondaryContainer) {
        secondaryContainer.innerHTML = SECONDARY_HOME_ACCESS.slice(0, 6)
            .map(item => renderHomeBandButton(item, 'home-secondary-band-btn'))
            .join('');
    }

}

function renderHomeNews() {
    const host = document.getElementById('homeNewsGrid');
    if (!host || !Array.isArray(catalogDesigns) || !catalogDesigns.length) return;

    const getSourceProducts = design => (design.sourceProductIds || [])
        .map(id => db.find(product => Number(product?.id) === Number(id)))
        .filter(Boolean);
    const isNewDesign = design => {
        const products = getSourceProducts(design);
        const frontProduct = db.find(product => Number(product?.id) === Number(design.front?.productId));
        const frontVariant = Number.isInteger(design.front?.variantIndex)
            ? frontProduct?.variants?.[design.front.variantIndex]
            : null;
        return Boolean(frontVariant?.isNew || products.some(product => (
            product?.isNew || (product?.variants || []).some(variant => variant?.isNew)
        )));
    };
    const getRecentMetalUniverse = design => {
        const searchable = [
            design.band,
            design.publicName,
            ...getSourceProducts(design).flatMap(product => [
                product.band,
                product.name,
                ...(Array.isArray(product.collections) ? product.collections : []),
                ...(Array.isArray(product.tags) ? product.tags : [])
            ])
        ].map(normalizeText).join(' ');
        const publicName = normalizeText(design.publicName);
        const band = normalizeText(design.band);
        if (band === 'hermetica' || publicName.startsWith('hermetica')) return 'Hermética';
        if (publicName.startsWith('almafuerte')) return 'Almafuerte';
        if (searchable.includes('ricardo iorio')) return 'Ricardo Iorio';
        if (searchable.includes('almafuerte')) return 'Almafuerte';
        if (searchable.includes('hermetica')) return 'Hermética';
        return '';
    };
    const recency = design => Math.max(-1, ...getSourceProducts(design).map(product => db.indexOf(product)));
    const relevantDesigns = catalogDesigns
        .filter(design => design?.front?.image && getRecentMetalUniverse(design))
        .sort((a, b) => recency(b) - recency(a));
    const candidates = relevantDesigns.filter(isNewDesign);
    const representatives = ['Ricardo Iorio', 'Almafuerte', 'Hermética']
        .map(universe => candidates.find(design => getRecentMetalUniverse(design) === universe)
            || relevantDesigns.find(design => getRecentMetalUniverse(design) === universe))
        .filter(Boolean);
    const selected = [
        ...representatives,
        ...candidates,
        ...relevantDesigns
    ]
        .filter((design, index, all) => all.findIndex(item => item.designId === design.designId) === index)
        .slice(0, 4);

    host.innerHTML = selected.map(design => {
        const price = getCatalogDesignStartingPrice(design).toLocaleString('es-AR');
        return `
            <article class="home-news-card">
                <button type="button" onclick="openCatalogDesign('${design.designId}')" aria-label="Ver diseño ${design.publicName}">
                    <img src="${design.front.image}" alt="${design.front.alt || `${design.publicName} - ${design.band}`}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='images/logo/MARCA DE AGUA.png';">
                    <span>
                        <small>${getRecentMetalUniverse(design)}</small>
                        <strong>${design.publicName}</strong>
                        <b>Desde $${price}</b>
                        <em>VER DISEÑO</em>
                    </span>
                </button>
            </article>`;
    }).join('');
}

window.openBandAccess = openBandAccess;
window.showFullCatalog = showFullCatalog;
window.showMoreBandsDirectory = showMoreBandsDirectory;

function getProductPriority(product) {
    const commercialPriority = Number(product?.commercialPriority);
    if (Number.isFinite(commercialPriority)) return commercialPriority;
    const priority = Number(product?.priority);
    return Number.isFinite(priority) ? priority : 0;
}

function getPublicBadgeLabel(label = '') {
    const value = String(label || '').trim();
    const normalized = normalizeText(value);
    if (normalized === 'doble estampa') return 'FRENTE Y DORSO';
    if (normalized === 'original fmd') return 'ARTE ORIGINAL FMD';
    if (normalized === 'fmd edition' || normalized === 'fmd editions') return 'VERSIÓN FMD';
    if (normalized === 're-edicion fmd' || normalized === 'reedicion fmd') return 'REEDICIÓN FMD';
    if (normalized === 'reimagined') return 'VERSIÓN FMD';
    if (normalized === 'reimagined retro') return 'VERSIÓN RETRO FMD';
    if (normalized === 'drop 2026') return 'LANZAMIENTOS 2026';
    if (normalized === 'key art hd') return 'ARTE PRINCIPAL';
    return value;
}

function getPublicCommerceText(text = '') {
    return String(text || '')
        .replace(/Reimagined\s+Retro/gi, 'Versión retro FMD')
        .replace(/Reimagined/gi, 'Versión FMD')
        .replace(/Re-edición\s+FMD/gi, 'Reedición FMD')
        .replace(/FMD\s+Editions?/gi, 'Versión FMD')
        .replace(/Diseño\s+Original\s+FMD/gi, 'Arte original FMD')
        .replace(/Original\s+FMD/gi, 'Arte original FMD')
        .replace(/Simple\s*\+\s*Doble/gi, 'Solo frente o frente y dorso')
        .replace(/Estampa\s+simple/gi, 'Solo frente')
        .replace(/Doble\s+estampa/gi, 'Frente y dorso')
        .replace(/Frente\s*\/\s*Dorso/gi, 'Frente y dorso');
}

function getFmdBadgeData(product, variantIndex = undefined) {
    const numericVariantIndex = Number(variantIndex);
    const variant = Number.isFinite(numericVariantIndex) ? product?.variants?.[numericVariantIndex] : null;
    const badge = variant?.fmdBadge || product?.fmdBadge;
    if (!badge) return null;
    return {
        label: getPublicBadgeLabel(badge),
        description: 'Diseño creado por FMD.'
    };
}

function renderFmdBadge(product, variantIndex = undefined, extraClass = '') {
    const badge = getFmdBadgeData(product, variantIndex);
    return badge ? `<span class="fmd-original-badge ${extraClass}" title="${badge.description}">${badge.label}</span>` : '';
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

function compareProductsByVisibilityThenPriority(a, b) {
    const tierDiff = (VISIBILITY_TIER_ORDER[a?.visibilityTier] ?? 99) - (VISIBILITY_TIER_ORDER[b?.visibilityTier] ?? 99);
    if (tierDiff !== 0) return tierDiff;
    return compareProductsByPriorityThenId(a, b);
}

function getCatalogBandLabel(product) {
    const tags = Array.isArray(product?.tags) ? product.tags.map(normalizeText) : [];
    if (normalizeText(product?.band) === 'andre matos' && tags.includes('angra')) return 'Angra';
    const rawLabel = String(product?.band || product?.category || 'Otros diseños').trim();
    const publicLabels = {
        epica: 'EPICA',
        acdc: 'AC/DC',
        hermetica: 'Hermética',
        personalizados: 'Personalizados'
    };
    return publicLabels[normalizeText(rawLabel).replace(/[^a-z0-9]/g, '')] || rawLabel;
}

function productBelongsToUniverse(product, universe) {
    return Array.isArray(product?.universe) && product.universe.includes(universe);
}

function isPublicProduct(product) {
    return PUBLIC_VISIBILITY_TIERS.has(product?.visibilityTier);
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
    const searchable = normalizeText(`${variant.name || ''} ${variant.img || ''}`);
    return searchable.includes('dorso') || /(^|[\s_.-])back([\s_.-]|$)/.test(searchable);
}

function isFrontVariant(variant) {
    if (!variant) return false;
    return normalizeText(variant.role) === 'front';
}

function getExpandedBandVariantName(product, variant) {
    const productName = cleanCatalogCardText(product?.name || 'Diseño');
    let variantName = cleanCatalogCardText(variant?.name || '')
        .replace(/\s+frente(?=\s*-|$)/i, '')
        .trim();
    if (!variantName || ['frente', 'front'].includes(normalizeText(variantName))) return productName;
    if (normalizeText(variantName) === normalizeText(productName)) return productName;
    if (normalizeText(variantName).includes(normalizeText(productName))) return variantName;
    return `${productName} - ${variantName}`;
}

function expandBandProductDesigns(product) {
    const variants = Array.isArray(product?.variants) ? product.variants : [];
    if (variants.length <= 1) return [product];

    const designGroups = [];
    const orphanBackIndexes = [];
    variants.forEach((variant, index) => {
        if (isBackVariant(variant)) {
            const previousDesign = designGroups[designGroups.length - 1];
            if (previousDesign) previousDesign.indexes.push(index);
            else orphanBackIndexes.push(index);
            return;
        }
        designGroups.push({ frontIndex: index, indexes: [index] });
    });

    if (!designGroups.length) {
        return variants.map((variant, index) => ({
            ...product,
            matchedVariantIndex: index,
            matchedVariantIndexes: [index],
            matchedVariantName: getExpandedBandVariantName(product, variant),
            matchedVariantImage: variant.img || variant.image || product.img,
            matchedGarment: getVariantGarmentType(variant),
            bandExpandedVariant: true
        }));
    }

    if (orphanBackIndexes.length) designGroups[0].indexes.push(...orphanBackIndexes);
    return designGroups.map(group => {
        const variant = variants[group.frontIndex];
        return {
            ...product,
            matchedVariantIndex: group.frontIndex,
            matchedVariantIndexes: group.indexes,
            matchedVariantName: getExpandedBandVariantName(product, variant),
            matchedVariantImage: variant.img || variant.image || product.img,
            matchedGarment: getVariantGarmentType(variant),
            bandExpandedVariant: true
        };
    });
}

function shouldExpandBandDesigns(filtered, normalizedCategory) {
    if (!normalizedCategory || ['megadeth', 'slayer', 'epica'].includes(normalizedCategory)) return false;
    if (normalizedCategory === 'iron maiden' && maidenGarmentPreference) return false;
    return filtered.some(product => {
        if (normalizeText(product?.band) === normalizedCategory) return true;
        return Array.isArray(product?.tags) && product.tags.some(tag => normalizeText(tag) === normalizedCategory);
    });
}

function getExplicitProductGarmentType(product) {
    const probe = {
        name: product?.name || '',
        img: product?.img || '',
        garmentCategory: product?.category || ''
    };
    return getVariantGarmentType(probe);
}

function expandOuterwearProductDesigns(product) {
    const variants = Array.isArray(product?.variants) ? product.variants : [];
    const entries = variants.length > 1 ? expandBandProductDesigns(product) : [product];
    return entries.map(entry => {
        const variantIndex = typeof entry.matchedVariantIndex === 'number' ? entry.matchedVariantIndex : (variants.length ? 0 : undefined);
        const variant = typeof variantIndex === 'number' ? variants[variantIndex] : null;
        const garment = variant ? getVariantGarmentType(variant) : getExplicitProductGarmentType(product);
        if (!['hoodie', 'buzo'].includes(garment)) return null;
        return {
            ...entry,
            matchedVariantIndex: variant ? variantIndex : entry.matchedVariantIndex,
            matchedVariantIndexes: variant ? (entry.matchedVariantIndexes || [variantIndex]) : entry.matchedVariantIndexes,
            matchedVariantName: variant ? getExpandedBandVariantName(product, variant) : entry.matchedVariantName,
            matchedVariantImage: variant ? (variant.img || variant.image || product.img) : entry.matchedVariantImage,
            matchedGarment: garment,
            outerwearExpandedVariant: true
        };
    }).filter(Boolean);
}

function compareOuterwearProducts(a, b) {
    const garmentOrder = { hoodie: 0, buzo: 1 };
    const garmentDiff = (garmentOrder[a?.matchedGarment] ?? 9) - (garmentOrder[b?.matchedGarment] ?? 9);
    if (garmentDiff !== 0) return garmentDiff;
    return compareProductsByVisibilityThenPriority(a, b);
}

function matchesCategoryOrMetadata(product, categoryValue) {
    const categoryQuery = normalizeText(categoryValue);
    if (!categoryQuery) return true;

    const category = normalizeText(product?.category);
    if (category === categoryQuery) return true;

    const band = normalizeText(product?.band);
    if (band === categoryQuery) return true;

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
    const publicSourceProducts = sourceProducts.filter(isPublicProduct);

    const codeData = parseProductCode(normalized);
    if (codeData) {
        const searchPool = (useGlobalCodeLookup ? db : publicSourceProducts).filter(isPublicProduct);
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

    return publicSourceProducts.filter(product => matchesTextQuery(product, normalized));
}

function openExactCodeMatch(query, afterOpen) {
    if (ENABLE_CATALOG_DESIGN_RENDER && catalogDesigns.length) {
        const normalizedCode = normalizeText(query).replace(/\s+/g, '');
        const design = catalogDesigns.find(item => (
            isCatalogDesignInScope(item)
            && normalizeText(item.orderCodeBase).replace(/\s+/g, '') === normalizedCode
        ));
        if (design) {
            openCatalogDesign(design.designId);
            if (typeof afterOpen === 'function') afterOpen(design);
            return true;
        }
    }
    const results = getSearchResults(query, db.filter(isProductInCatalogScope), false);
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
            // Si tenía Oversize o Mujer seleccionado, cambiar a Clásica
            if (selectedCut === 'oversize' || selectedCut === 'mujer') {
                selectedModalGarment = 'remera_clasica';
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
    
    // Ocultar talles exclusivos de oversize (2XS, XS y 3XL).
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
    trackCatalogEvent('size_select', { ...getModalAnalyticsContext(), size });
    updateModalOrderSummary();
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
    
    // Mostrar/ocultar talles exclusivos de oversize según el corte.
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
    let sizeRange = '';
    if (garmentCategory === 'Hoodies FMD' || garmentCategory === 'Hoodies Otras Bandas') {
        sizeRange = 'XS a 2XL';
    } else if (garmentCategory === 'Buzo Cuello Redondo') {
        sizeRange = 'XS a 2XL';
    } else if (selectedAge === 'chico') {
        sizeRange = '4 a 16';
    } else {
        sizeRange = selectedCut === 'oversize' ? '2XS a 3XL' : 'S a 2XL';
    }

    sizeRangeEl.textContent = `📏 ${sizeRange}`;
    updateBandLandingModalSpecs();
}

function updateBandLandingModalSpecs() {
    if (!usesBandLandingShownComposition()) return;
    const print = document.getElementById('modalSpecPrint');
    const fabric = document.getElementById('modalSpecFabric');
    const garment = document.getElementById('modalSpecGarment');
    if (print) print.textContent = '☢️ DTG premium';

    if (selectedModalGarment === 'hoodie') {
        if (fabric) fabric.textContent = '🖤 Algodón frizado';
        if (garment) garment.textContent = '⚡ Canguro oversize con capucha';
        return;
    }

    if (selectedModalGarment === 'buzo') {
        if (fabric) fabric.textContent = '🖤 Sin tacto plástico';
        if (garment) garment.textContent = '⚡ Cuello redondo oversize';
        return;
    }

    if (fabric) fabric.textContent = '🖤 Algodón peinado';
    if (garment) {
        garment.textContent = selectedAge === 'chico'
            ? '⚡ Remera para chicos'
            : selectedModalGarment === 'mujer'
                ? '⚡ Corte mujer'
                : selectedModalGarment === 'oversize'
                    ? '⚡ Oversize unisex'
                    : '⚡ Clásica hombre';
    }
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
    if (currentCatalogDesign) selectCatalogDesignPreviewForGarment(selectedModalGarment);
    updateModalOrderSummary();
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
    const isCustom = isPersonalizedSelection(product);

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
    if (selectedModalGarment === 'hoodie') return 'Hoodies Otras Bandas';
    if (selectedModalGarment === 'buzo') return 'Buzo Cuello Redondo';
    if (currentCatalogDesign && ['remera_clasica', 'mujer', 'oversize'].includes(selectedModalGarment)) {
        return normalizeText(product.category) === 'personalizados' ? 'Personalizados' : 'Bandas Sugeridas';
    }
    if (product.category === 'Slayer') {
        if (slayerGarmentPreference === 'hoodie') return 'Hoodies Otras Bandas';
        if (slayerGarmentPreference === 'buzo') return 'Buzo Cuello Redondo';
        if (slayerGarmentPreference === 'remera') return 'Slayer';
    }
    return getVariantGarmentCategory(product);
}

function getAvailableModalGarments(product = currentProduct) {
    const available = new Set();
    if (!product) return ['remera_clasica'];

    if (currentCatalogDesign) {
        const garments = currentCatalogDesign.availableGarments || [];
        if (garments.includes('remera')) {
            available.add('remera_clasica');
            available.add('mujer');
            available.add('oversize');
        }
        if (garments.includes('hoodie')) available.add('hoodie');
        if (garments.includes('buzo_cuello_redondo')) available.add('buzo');
        return ['remera_clasica', 'mujer', 'oversize', 'hoodie', 'buzo'].filter(key => available.has(key));
    }

    const activeVariant = getModalImages()[currentSlide];
    const activeVariantGarment = getVariantGarmentType(activeVariant);
    if (activeVariantGarment === 'hoodie') return ['hoodie'];
    if (activeVariantGarment === 'buzo') return ['buzo'];
    if (activeVariantGarment === 'remera') return ['remera_clasica', 'mujer', 'oversize'];

    const garmentList = Array.isArray(product.garments) ? product.garments.map(normalizeText) : [];
    if (garmentList.includes('remera')) {
        available.add('remera_clasica');
        available.add('mujer');
        available.add('oversize');
    }
    if (garmentList.includes('hoodie')) available.add('hoodie');
    if (garmentList.includes('buzo_cuello_redondo') || garmentList.includes('buzo')) available.add('buzo');

    const category = normalizeText(product.category || '');
    if (category.includes('hoodies')) available.add('hoodie');
    if (category.includes('buzo cuello redondo')) available.add('buzo');
    if (!category.includes('hoodies') && !category.includes('buzo cuello redondo')) {
        available.add('remera_clasica');
        available.add('mujer');
        available.add('oversize');
    }

    (product.variants || []).forEach(variant => {
        const garment = getVariantGarmentType(variant);
        if (garment === 'hoodie') available.add('hoodie');
        if (garment === 'buzo') available.add('buzo');
        if (garment === 'remera') {
            available.add('remera_clasica');
            available.add('mujer');
            available.add('oversize');
        }
    });

    return ['remera_clasica', 'mujer', 'oversize', 'hoodie', 'buzo'].filter(key => available.has(key));
}

const MODAL_GARMENT_LABELS = {
    remera_clasica: 'Clásica hombre',
    mujer: 'Clásica mujer',
    oversize: 'Oversize unisex',
    hoodie: 'Hoodie',
    buzo: 'Buzo'
};

const MODAL_GARMENT_TYPE_LABELS = {
    remera: 'Remera',
    hoodie: 'Hoodie',
    buzo: 'Buzo'
};

const MODAL_REMERA_VARIANTS = [
    { id: 'hombre_clasica', label: 'Clásica hombre', garment: 'remera_clasica', age: 'adulto', cut: 'clasica' },
    { id: 'mujer_clasica', label: 'Clásica mujer', garment: 'mujer', age: 'adulto', cut: 'mujer' },
    { id: 'oversize_unisex', label: 'Oversize unisex', garment: 'oversize', age: 'adulto', cut: 'oversize' },
    { id: 'nino', label: 'Niños', garment: 'remera_clasica', age: 'chico', cut: 'clasica' }
];

function getAvailableModalGarmentTypes(available = getAvailableModalGarments(currentProduct)) {
    const types = [];
    if (available.some(garment => ['remera_clasica', 'mujer', 'oversize'].includes(garment))) types.push('remera');
    if (available.includes('hoodie')) types.push('hoodie');
    if (available.includes('buzo')) types.push('buzo');
    return types;
}

function getSelectedModalGarmentType() {
    if (selectedModalGarment === 'hoodie') return 'hoodie';
    if (selectedModalGarment === 'buzo') return 'buzo';
    return 'remera';
}

function getSelectedRemeraVariantId() {
    if (selectedAge === 'chico') return 'nino';
    if (selectedModalGarment === 'mujer' || selectedCut === 'mujer') return 'mujer_clasica';
    if (selectedModalGarment === 'oversize' || selectedCut === 'oversize') return 'oversize_unisex';
    return 'hombre_clasica';
}

function selectModalGarmentType(type) {
    const availableTypes = getAvailableModalGarmentTypes();
    if (!availableTypes.includes(type)) return;
    if (type === 'remera') {
        selectRemeraVariant('hombre_clasica');
        return;
    }
    selectModalGarment(type);
}

function selectRemeraVariant(variantId, shouldTrack = true) {
    const variant = MODAL_REMERA_VARIANTS.find(item => item.id === variantId);
    const available = getAvailableModalGarments(currentProduct);
    if (!variant || !available.includes(variant.garment)) return;

    const previousSelection = `${getSelectedModalGarmentType()}:${getSelectedRemeraVariantId()}`;

    selectedModalGarment = variant.garment;
    selectedAge = variant.age;
    selectedCut = variant.cut;
    selectedSize = '';
    clearSelectionError('ageGroup');
    clearSelectionError('cutGroup');
    clearSelectionError('sizeGroup');
    clearSelectionError('modalGarmentGroup');
    clearSelectionError('modalRemeraVariantGroup');
    if (currentCatalogDesign) selectCatalogDesignPreviewForGarment(selectedModalGarment);
    updateModalGarmentUI();
    updateModalPrices();
    updateModalSizeRange();
    updateModalOrderSummary();

    const currentSelection = `${getSelectedModalGarmentType()}:${getSelectedRemeraVariantId()}`;
    if (shouldTrack && previousSelection !== currentSelection) {
        trackCatalogEvent('garment_select', {
            band: currentCatalogDesign?.band || getCatalogBandLabel(currentProduct),
            design_id: currentCatalogDesign?.designId,
            design_name: currentCatalogDesign?.publicName || currentProduct?.name,
            garment: getSelectedModalGarmentType(),
            garment_variant: getSelectedRemeraVariantId()
        });
    }
}

function selectModalGarment(garment, shouldTrack = true) {
    const available = getAvailableModalGarments(currentProduct);
    const previousGarment = getSelectedModalGarmentType();
    selectedModalGarment = available.includes(garment) ? garment : (available[0] || 'remera_clasica');

    if (selectedModalGarment === 'hoodie' || selectedModalGarment === 'buzo') {
        selectedAge = 'adulto';
        selectedCut = 'oversize';
    } else if (selectedModalGarment === 'oversize') {
        selectedAge = 'adulto';
        selectedCut = 'oversize';
    } else if (selectedModalGarment === 'mujer') {
        selectedAge = 'adulto';
        selectedCut = 'mujer';
    } else {
        selectedAge = 'adulto';
        selectedCut = 'clasica';
    }

    selectedSize = '';
    clearSelectionError('modalGarmentGroup');
    if (currentCatalogDesign) selectCatalogDesignPreviewForGarment(selectedModalGarment);
    updateModalGarmentUI();
    updateModalPrices();
    updateModalSizeRange();
    updateModalOrderSummary();

    const currentGarment = getSelectedModalGarmentType();
    if (shouldTrack && previousGarment !== currentGarment) {
        trackCatalogEvent('garment_select', {
            band: currentCatalogDesign?.band || getCatalogBandLabel(currentProduct),
            design_id: currentCatalogDesign?.designId,
            design_name: currentCatalogDesign?.publicName || currentProduct?.name,
            garment: currentGarment,
            garment_variant: currentGarment === 'remera' ? getSelectedRemeraVariantId() : undefined
        });
    }
}

function syncSelectedModalGarmentWithActiveVariant() {
    if (currentCatalogDesign) return;
    const available = getAvailableModalGarments(currentProduct);
    if (!available.length) return;
    if (available.includes(selectedModalGarment)) return;
    selectedModalGarment = available[0];
    if (selectedModalGarment === 'hoodie' || selectedModalGarment === 'buzo' || selectedModalGarment === 'oversize') {
        selectedAge = 'adulto';
        selectedCut = 'oversize';
    } else if (selectedModalGarment === 'mujer') {
        selectedAge = 'adulto';
        selectedCut = 'mujer';
    } else {
        selectedAge = selectedAge || 'adulto';
        selectedCut = 'clasica';
    }
    selectedSize = '';
}

function getCatalogDesignGarmentKey(modalGarment = selectedModalGarment) {
    if (modalGarment === 'hoodie') return 'hoodie';
    if (modalGarment === 'buzo') return 'buzo_cuello_redondo';
    return 'remera';
}

function updateCatalogDesignReferenceNote() {
    const note = document.getElementById('modalPreviewReferenceNote');
    if (!note || !currentCatalogDesign) return;
    document.querySelector('.modal-adaptable-note')?.classList.add('is-hidden');
    const garment = getCatalogDesignGarmentKey();
    const hasPreview = Boolean(currentCatalogDesign.previewsByGarment?.[garment]?.length);
    const garmentLabel = garment === 'hoodie'
        ? 'hoodie'
        : garment === 'buzo_cuello_redondo'
            ? 'buzo cuello redondo'
            : 'remera';
    note.classList.toggle('is-hidden', hasPreview);
    if (hasPreview) {
        note.replaceChildren();
        return;
    }
    const title = document.createElement('strong');
    title.textContent = `DISPONIBLE EN ${garmentLabel.toUpperCase()}`;
    const description = document.createElement('span');
    description.textContent = 'Podés personalizar la ubicación y combinación de estampas.';
    const consultation = document.createElement('button');
    consultation.type = 'button';
    consultation.className = 'modal-preview-reference-consult';
    consultation.textContent = '¿Querés confirmar cómo quedaría? Consultanos por WhatsApp';
    consultation.addEventListener('click', consultCurrentDesign);
    note.replaceChildren(title, description, consultation);
}

function selectCatalogDesignPreviewForGarment(modalGarment) {
    if (!currentCatalogDesign || !currentModalSourceRefs.length) return;
    const garment = getCatalogDesignGarmentKey(modalGarment);
    const previews = currentCatalogDesign.previewsByGarment?.[garment] || [];
    const selectedColorKey = normalizeText(selectedColor);
    let preview = previews.find(item => selectedColorKey && normalizeText(item.color) === selectedColorKey)
        || previews.find(item => item.preferredPreview)
        || previews[0];
    if (!preview) {
        const fallbackGarments = ['remera', 'hoodie', 'buzo_cuello_redondo'];
        const fallbackPreviews = fallbackGarments
            .flatMap(key => currentCatalogDesign.previewsByGarment?.[key] || []);
        preview = fallbackPreviews.find(item => selectedColorKey && normalizeText(item.color) === selectedColorKey)
            || fallbackPreviews.find(item => item.preferredPreview)
            || fallbackPreviews[0]
            || currentCatalogDesign.front;
    }
    if (preview) {
        const slideIndex = currentModalSourceRefs.findIndex(ref => (
            ref.productId === preview.productId && ref.variantIndex === preview.variantIndex
        ));
        if (slideIndex >= 0) goToSlide(slideIndex, false);
    }
    updateCatalogDesignReferenceNote();
}

function updateModalGarmentUI() {
    const selector = document.getElementById('modalGarmentSelector');
    const garmentGroup = document.getElementById('modalGarmentGroup');
    const available = getAvailableModalGarments(currentProduct);
    const availableTypes = getAvailableModalGarmentTypes(available);
    const selectedType = getSelectedModalGarmentType();
    const shouldShowGarmentChoice = availableTypes.length > 1;
    if (selector) {
        selector.innerHTML = availableTypes.map(type => `
            <button type="button" class="option-btn modal-garment-btn${selectedType === type ? ' active' : ''}" data-modal-garment-type="${type}" ${availableTypes.length === 1 ? 'disabled' : `onclick="selectModalGarmentType('${type}')"`}>${MODAL_GARMENT_TYPE_LABELS[type]}</button>
        `).join('');
    }
    if (garmentGroup) {
        const label = garmentGroup.querySelector('.option-label');
        if (label) label.textContent = 'Prenda:';
        garmentGroup.classList.toggle('modal-garment-group-locked', availableTypes.length === 1);
        garmentGroup.style.display = shouldShowGarmentChoice ? '' : 'none';
    }

    const remeraVariantGroup = document.getElementById('modalRemeraVariantGroup');
    const remeraVariantSelector = document.getElementById('modalRemeraVariantSelector');
    const availableRemeraVariants = MODAL_REMERA_VARIANTS.filter(variant => available.includes(variant.garment));
    if (remeraVariantSelector) {
        const activeRemeraVariant = getSelectedRemeraVariantId();
        remeraVariantSelector.innerHTML = availableRemeraVariants.map(variant => `
            <button type="button" class="option-btn${activeRemeraVariant === variant.id ? ' active' : ''}" data-remera-variant="${variant.id}" onclick="selectRemeraVariant('${variant.id}')">${variant.label}</button>
        `).join('');
    }
    if (remeraVariantGroup) {
        remeraVariantGroup.style.display = selectedType === 'remera' && availableRemeraVariants.length ? '' : 'none';
    }

    const isHoodie = selectedModalGarment === 'hoodie';
    const isBuzo = selectedModalGarment === 'buzo';
    const isOversize = selectedModalGarment === 'oversize';
    const ageGroup = document.getElementById('ageGroup');
    const cutGroup = document.getElementById('cutGroup');
    const hoodieInfoBanner = document.getElementById('hoodieInfoBanner');
    const buzoRedondoInfoBanner = document.getElementById('buzoRedondoInfoBanner');

    if (ageGroup) ageGroup.style.display = 'none';
    if (cutGroup) cutGroup.style.display = 'none';
    if (hoodieInfoBanner) hoodieInfoBanner.style.display = isHoodie ? 'block' : 'none';
    if (buzoRedondoInfoBanner) buzoRedondoInfoBanner.style.display = isBuzo ? 'block' : 'none';

    const sizeAdult = document.getElementById('sizeSelector');
    const sizeKids = document.getElementById('sizeSelectorKids');
    if (sizeAdult) sizeAdult.style.display = selectedAge === 'chico' && !isHoodie && !isBuzo ? 'none' : 'flex';
    if (sizeKids) sizeKids.style.display = selectedAge === 'chico' && !isHoodie && !isBuzo ? 'flex' : 'none';

    document.querySelectorAll('#ageSelector button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.age === selectedAge);
    });
    document.querySelectorAll('#cutSelector button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.cut === selectedCut);
    });
    document.querySelectorAll('#sizeSelector .size-oversize').forEach(btn => {
        const size = btn.dataset.size;
        const show = isHoodie || isBuzo
            ? size === 'XS'
            : isOversize;
        btn.style.display = show ? '' : 'none';
    });
    document.querySelectorAll('#sizeSelector button, #sizeSelectorKids button').forEach(btn => {
        btn.classList.toggle('active', Boolean(selectedSize) && btn.dataset.size === selectedSize);
    });
}

window.selectModalGarment = selectModalGarment;
window.selectModalGarmentType = selectModalGarmentType;
window.selectRemeraVariant = selectRemeraVariant;

const DELIVERY_LABELS = {
    domicilio: 'Andreani a domicilio',
    retiro_andreani: 'Andreani a punto de retiro',
    taller: 'Retiro sin cargo en Villa Martelli'
};

const ORDER_CHECKOUT_STORAGE_KEY = 'fmd_order_checkout_v1';

function loadOrderCheckoutState() {
    try {
        const parsed = JSON.parse(localStorage.getItem(ORDER_CHECKOUT_STORAGE_KEY) || '{}');
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
        return {};
    }
}

function saveOrderCheckoutState() {
    try {
        localStorage.setItem(ORDER_CHECKOUT_STORAGE_KEY, JSON.stringify({
            deliveryMethod: selectedDeliveryMethod || ''
        }));
    } catch (error) {
        // El checkout sigue funcionando aunque el navegador bloquee storage.
    }
}

selectedDeliveryMethod = DELIVERY_LABELS[loadOrderCheckoutState().deliveryMethod]
    ? loadOrderCheckoutState().deliveryMethod
    : '';

function getModalAnalyticsContext() {
    if (!currentProduct) return {};
    return {
        band: currentCatalogDesign?.band || getCatalogBandLabel(currentProduct),
        design_id: currentCatalogDesign?.designId || currentProduct.id,
        design_name: currentCatalogDesign?.publicName || currentProduct.name,
        garment: getSelectedModalGarmentType(),
        print_mode: selectedPrintMode
    };
}

function selectDeliveryMethod(method) {
    const previousMethod = selectedDeliveryMethod;
    selectedDeliveryMethod = DELIVERY_LABELS[method] ? method : '';
    saveOrderCheckoutState();
    updateDeliveryUI();
    const cartPreview = document.getElementById('cartPreviewModal');
    if (cartPreview?.classList.contains('active')) renderCartPreview();
    if (selectedDeliveryMethod && selectedDeliveryMethod !== previousMethod) {
        trackCatalogEvent('delivery_select', {
            delivery_method: selectedDeliveryMethod,
            cart_items: cart?.getCart?.().length || 0
        });
    }
}

function updateDeliveryUI() {
    document.querySelectorAll('[data-order-delivery]').forEach(button => {
        button.classList.toggle('active', button.dataset.delivery === selectedDeliveryMethod);
    });
    updateCheckoutWhatsappAvailability();
}

function getModalOrderSummaryParts() {
    if (!currentProduct) return [];
    const garmentType = getSelectedModalGarmentType();
    const garment = garmentType === 'remera'
        ? (MODAL_REMERA_VARIANTS.find(item => item.id === getSelectedRemeraVariantId())?.label || 'Remera')
        : garmentType === 'hoodie' ? 'Hoodie' : 'Buzo cuello redondo';
    const print = selectedPrintMode === 'double' ? 'frente y dorso' : 'solo frente';
    const color = selectedColor === 'blanco' ? 'blanca' : selectedColor === 'negro' ? 'negra' : 'color pendiente';
    const prices = resolveModalPriceConfig(currentProduct);
    const price = selectedPrintMode === 'double' ? prices.doble : prices.simple;
    return [garment, print, selectedSize ? `talle ${selectedSize}` : 'talle pendiente', color, `$${price.toLocaleString('es-AR')}`];
}

function updateModalOrderSummary() {
    const summary = document.getElementById('modalOrderSummaryText');
    if (summary) summary.textContent = getModalOrderSummaryParts().join(' · ');
}

function validateModalSelectionsBeforeWhatsapp() {
    const availableTypes = getAvailableModalGarmentTypes();
    const garmentType = getSelectedModalGarmentType();
    const checks = [
        {
            valid: availableTypes.includes(garmentType),
            group: 'modalGarmentGroup',
            message: 'Elegí la prenda para continuar.'
        },
        {
            valid: garmentType !== 'remera' || Boolean(getSelectedRemeraVariantId()),
            group: 'modalRemeraVariantGroup',
            message: 'Elegí el tipo de remera para continuar.'
        },
        {
            valid: selectedPrintMode === 'simple' || selectedPrintMode === 'double',
            group: 'printModeSelector',
            message: 'Elegí solo frente o frente y dorso.'
        },
        {
            valid: Boolean(selectedSize),
            group: 'sizeGroup',
            message: 'Elegí el talle para continuar.'
        },
        {
            valid: Boolean(selectedColor),
            group: 'colorGroup',
            message: 'Elegí el color para continuar.'
        }
    ];
    const missing = checks.find(check => !check.valid);
    if (!missing) return true;
    trackCatalogEvent('modal_validation_error', {
        ...getModalAnalyticsContext(),
        validation_error: `missing_${missing.group}`
    });
    showNotification(missing.message, 2600);
    markSelectionError(missing.group);
    const focusSelectors = {
        sizeGroup: '[data-size]:not([disabled])',
        colorGroup: '[data-color]:not([disabled])',
        modalGarmentGroup: '[data-garment-type]:not([disabled])',
        modalRemeraVariantGroup: '[data-remera-variant]:not([disabled])',
        printModeSelector: '[data-print-mode]:not([disabled])'
    };
    const group = document.getElementById(missing.group);
    const focusTarget = [...(group?.querySelectorAll(focusSelectors[missing.group] || 'input, button:not([disabled])') || [])]
        .find(element => element.offsetParent !== null);
    focusTarget?.focus({ preventScroll: true });
    return false;
}

window.selectDeliveryMethod = selectDeliveryMethod;

function hasDorsoSelection() {
    const dorsoInputValue = (document.getElementById('dorsoCustomInput')?.value || '').trim();
    const hasBackExamples = typeof selectedBacks !== 'undefined' && selectedBacks && selectedBacks.size > 0;
    const hasChips = typeof selectedDorsoChips !== 'undefined' && selectedDorsoChips && selectedDorsoChips.size > 0;
    return Boolean(selectedCatalogBackRef) || selectedBackIndex >= 0 || hasBackExamples || hasChips || dorsoInputValue.length > 0;
}

function isDoubleSelectionActive(product = currentProduct) {
    if (selectedPrintMode === 'double') return true;
    if (selectedPrintMode === 'simple') return false;
    return isDoubleByDefault(product) || hasDorsoSelection();
}

function updatePrintModeUI() {
    if (!currentProduct) return;
    const prices = resolveModalPriceConfig(currentProduct);
    const simplePrice = document.getElementById('printModeSimplePrice');
    const doublePrice = document.getElementById('printModeDoublePrice');
    const help = document.getElementById('printModeHelp');
    const doubleNote = document.getElementById('modalDoubleNote');
    const dorsoPanel = document.getElementById('upsellDorso');
    const isDouble = selectedPrintMode === 'double';
    const usesShownComposition = usesBandLandingShownComposition();

    if (simplePrice) simplePrice.textContent = `$${prices.simple.toLocaleString('es-AR')}`;
    if (doublePrice) doublePrice.textContent = `$${prices.doble.toLocaleString('es-AR')}`;
    document.querySelectorAll('[data-print-mode]').forEach(button => {
        button.classList.toggle('active', button.dataset.printMode === selectedPrintMode);
    });
    if (help) help.textContent = '';
    if (doubleNote) {
        doubleNote.textContent = 'Todos los diseños son personalizables. Si querés cambiar, agregar o quitar estampas, lo coordinamos por WhatsApp antes de producir tu pedido.';
        doubleNote.classList.toggle('is-hidden', !isDouble);
    }
    if (dorsoPanel) dorsoPanel.style.display = isDouble && !usesShownComposition ? 'block' : 'none';
}

function selectPrintMode(mode) {
    selectedPrintMode = mode === 'double' ? 'double' : 'simple';
    clearSelectionError('printModeSelector');

    if (selectedPrintMode === 'simple') {
        selectedBackIndex = -1;
        selectedCatalogBackRef = null;
        selectedDorsoChips.clear();
        selectedBacks.clear();
        document.querySelectorAll('#chipsRow .chip, .thumb-dorso').forEach(item => item.classList.remove('active', 'selected'));
        const dorsoInput = document.getElementById('dorsoCustomInput');
        if (dorsoInput) dorsoInput.value = '';
        const summary = document.getElementById('dorsoSelectionSummary');
        if (summary) summary.style.display = 'none';
    }

    updatePrintModeUI();
    updateDobleWaLink();
    trackCatalogEvent('print_mode_select', {
        ...getModalAnalyticsContext(),
        print_mode: selectedPrintMode
    });
    updateModalOrderSummary();
}

window.selectPrintMode = selectPrintMode;

function isDoubleByDefault(product) {
    if (currentCatalogDesign) return false;
    const activeVariantGarment = getVariantGarmentType(getModalImages()[currentSlide]);
    return activeVariantGarment === 'hoodie' || activeVariantGarment === 'buzo' || product?.category === 'Buzo Cuello Redondo';
}

function updateDoubleSelectionStatus(isDoubleActive) {
    const statusEl = document.getElementById('doubleSelectionStatus');
    if (!statusEl || !currentProduct) return;

    statusEl.style.display = 'none';
    statusEl.textContent = '';
}

function updateModalPrices() {
    if (!currentProduct) return;
    const precios = resolveModalPriceConfig(currentProduct);

    // Precio depende de si el producto ya es doble o si el usuario sumó dorso
    const tieneDoble = isDoubleSelectionActive(currentProduct);
    const precio = tieneDoble ? precios.doble : precios.simple;
    document.getElementById('modalPrice').textContent = 'Precio del producto: $' + precio.toLocaleString('es-AR');

    const pSimple = '$' + precios.simple.toLocaleString('es-AR');
    const pDoble = '$' + precios.doble.toLocaleString('es-AR');
    const elSimple = document.getElementById('modalPrecioSimple');
    const elDoble = document.getElementById('modalPrecioDoble');
    if(elSimple) elSimple.textContent = pSimple;
    if(elDoble) elDoble.textContent = pDoble;
    updatePrintModeUI();

    // Actualizar nota de precio para hoodies
    const priceNote = document.querySelector('.modal-price-note');
    if (priceNote) priceNote.textContent = '';

    updateDoubleSelectionStatus(tieneDoble);
    updateModalOrderSummary();
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

    // Agregár al carrito con soporte para dorso específico
    addToCart(productId, variantIndex = 0, isDouble = false, options = {}) {
        const product = db.find(p => p.id === productId);
        if (!product) return false;

        let forceDouble = isDouble;
        const garmentCategory = options.category || getVariantGarmentCategory(product, variantIndex);

        // Código del frente
        const frontCode = options.orderCodeBase || this.generateCode(productId, variantIndex);
        let frontName = options.designName || (product.variants && product.variants[variantIndex]
            ? product.variants[variantIndex].name
            : product.name);
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
        if (forceDouble && options.backName) {
            backCode = options.backCode || null;
            backName = options.backName;
        }

        const item = {
            id: productId,
            code: frontCode, // Código principal (frente)
            productName: options.designName || product.name,
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
            usesShownComposition: Boolean(options.usesShownComposition),
            // Opciones de prenda
            age: options.age || 'adulto',
            size: options.size || '',
            cut: options.cut || 'clasica',
            color: options.color || 'negro',
            isCustom: Boolean(options.isCustom),
            designId: options.designId || '',
            customizationText: options.customizationText || '',
            publicGarmentLabel: options.publicGarmentLabel || '',
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
        try {
            const stored = localStorage.getItem('fmd_cart');
            const parsed = stored ? JSON.parse(stored) : [];
            if (!Array.isArray(parsed)) return [];

            let migrated = false;
            const cartItems = parsed.map(rawItem => {
                const item = rawItem && typeof rawItem === 'object' ? { ...rawItem } : {};
                ['delivery', 'deliveryMethod', 'shippingMethod', 'postalCode', 'codigoPostal', 'cp'].forEach(key => {
                    if (Object.prototype.hasOwnProperty.call(item, key)) {
                        delete item[key];
                        migrated = true;
                    }
                });
                if (item.options && typeof item.options === 'object') {
                    const options = { ...item.options };
                    ['delivery', 'deliveryMethod', 'shippingMethod', 'postalCode', 'codigoPostal', 'cp'].forEach(key => {
                        if (Object.prototype.hasOwnProperty.call(options, key)) {
                            delete options[key];
                            migrated = true;
                        }
                    });
                    item.options = options;
                }
                return item;
            });

            if (migrated) localStorage.setItem('fmd_cart', JSON.stringify(cartItems));
            return cartItems;
        } catch (error) {
            return [];
        }
    }

    // Generar resumen para copiar
    generateSummary() {
        if (this.cart.length === 0) return 'Pedido vacío';

        // Ordenar productos: adulto primero, luego niño; dentro de adulto, hoodie/remera
        const sortOrder = item => {
            // 0: adulto hoodie, 1: adulto remera, 2: niño
            if (item.age === 'chico') return 2;
            if (item.category === 'Hoodies FMD') return 0;
            return 1;
        };
        const sortedCart = [...this.cart].sort((a, b) => sortOrder(a) - sortOrder(b));
        const itemPrices = calculateCartItemPrices(sortedCart);

        // Detalles compactos de cada producto.
        const details = sortedCart.map((item, idx) => {
            const isHoodie = item.category === 'Hoodies FMD' || item.category === 'Hoodies Otras Bandas';
            const isBuzoRedondo = item.category === 'Buzo Cuello Redondo';
            const talle = item.size;
            const color = item.color === 'blanco' ? 'Blanca' : 'Negra';
            let tipoPrenda;
            if (item.publicGarmentLabel) {
                tipoPrenda = item.publicGarmentLabel;
            } else if (isBuzoRedondo) {
                tipoPrenda = 'Buzo cuello redondo oversize unisex';
            } else if (isHoodie) {
                tipoPrenda = 'Hoodie canguro oversize unisex';
            } else if (item.cut === 'oversize') {
                tipoPrenda = 'Remera oversize unisex';
            } else if (item.cut === 'mujer') {
                tipoPrenda = 'Remera con corte clásico mujer';
            } else {
                tipoPrenda = 'Remera con corte clásico hombre';
            }
            if (tipoPrenda === 'Remera clásica hombre') tipoPrenda = 'Remera con corte clásico hombre';
            if (tipoPrenda === 'Remera clásica mujer') tipoPrenda = 'Remera con corte clásico mujer';

            const estampado = item.isDouble ? 'Frente y dorso' : 'Solo frente';
            const additionalDetails = [];
            if (item.isDouble && !item.usesShownComposition && !item.backCode) {
                additionalDetails.push('Dorso a definir');
            } else if (item.isDouble && !item.usesShownComposition && item.backName) {
                additionalDetails.push(`Dorso: ${item.backName}`);
            }
            if (item.customizationText) {
                additionalDetails.push(`Personalización: ${item.customizationText}`);
            }

            const options = [tipoPrenda, color, `Talle ${talle}`, estampado, ...additionalDetails]
                .filter(Boolean)
                .join(' · ');
            return `${idx + 1}. ${item.frontCode || item.code} — ${item.productName} · ${options} · $${Math.round(itemPrices[idx]).toLocaleString('es-AR')}`;
        }).join('\n');

        const total = this.cart.length;
        const totals = calculateCartTotal();
        const discountLine = totals.descuento > 0
            ? `\n10% OFF: -$${Math.round(totals.descuento).toLocaleString('es-AR')}`
            : '';

        return `${details}\n\nRESUMEN\n${total} ${total === 1 ? 'prenda' : 'prendas'} · Subtotal: $${Math.round(totals.subtotal).toLocaleString('es-AR')}${discountLine}\nTotal: $${Math.round(totals.total).toLocaleString('es-AR')}`;
    }

    generateConsultationSummary() {
        if (this.cart.length === 0) return 'Pedido vacío';

        const itemPrices = calculateCartItemPrices(this.cart);
        return this.cart.map((item, idx) => {
            const isHoodie = isHoodieItem(item);
            const isBuzoRedondo = isBuzoRedondoItem(item);
            const garment = item.publicGarmentLabel || (isBuzoRedondo
                ? 'Buzo cuello redondo oversize unisex'
                : isHoodie
                    ? 'Hoodie oversize unisex'
                    : item.cut === 'oversize'
                        ? 'Remera oversize unisex'
                        : item.cut === 'mujer'
                            ? 'Remera corte mujer'
                            : 'Remera clásica hombre');
            const color = item.color === 'blanco' ? 'Blanca' : 'Negra';
            const product = db.find(p => Number(p?.id) === Number(item.id));
            const frontVariant = product?.variants?.[item.variantIndex];
            const backVariant = product?.variants?.[item.backIndex];
            const bothAreBacks = item.isDouble && item.backCode && isBackVariant(frontVariant) && isBackVariant(backVariant);
            const warning = bothAreBacks
                ? '\n* Importante: los dos diseños elegidos están identificados como dorso. Necesito confirmar cuál usar al frente.'
                : '';
            const designLines = item.isDouble && item.usesShownComposition
                ? `* Diseño: ${item.frontName || item.frontCode}\n* Composición: propuesta mostrada`
                : item.isDouble && item.backCode
                ? `* Diseño 1: ${item.frontName || item.frontCode} (${item.frontCode})\n* Diseño 2: ${item.backName || item.backCode} (${item.backCode})`
                : item.isDouble
                    ? `* Diseño: ${item.frontName || item.frontCode}\n* Dorso: a definir`
                    : `* Diseño: ${item.frontName || item.code}`;
            const price = itemPrices[idx].toLocaleString('es-AR');

            return `${idx + 1}) ${item.productName}
* Prenda: ${garment}
* Talle: ${item.size || 'A confirmar'}
* Color: ${color}
* Estampa: ${item.isDouble ? 'Frente y dorso' : 'Solo frente'}
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
            cartList.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:20px;">Tu pedido está vacío</p>';
            if (cartSummary) cartSummary.style.display = 'none';
            return;
        }

        cartList.innerHTML = this.cart.map((item, idx) => {
            const edad = item.age === 'chico' ? 'Niño' : 'Adulto';
            const talle = item.size || '—';
            const corte = item.publicGarmentLabel || (item.age === 'chico'
                ? 'Chicos'
                : item.cut === 'oversize'
                    ? 'Remera oversize'
                    : item.cut === 'mujer'
                        ? 'Remera corte mujer'
                        : 'Remera clásica hombre');
            const color = item.color === 'blanco' ? 'Blanca' : 'Negra';
            return `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-code">${item.code}</div>
                    <div class="cart-item-name">${item.productName}</div>
                    ${item.variantName && item.variantName !== item.productName ? `<div class="cart-item-variant">${item.variantName}</div>` : ''}
                    ${item.isDouble ? '<div class="cart-item-double">Frente y dorso</div>' : ''}
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
                        Ver pedido completo
                    </button>
                    <button onclick="openCartPreview()" class="btn-send-whatsapp">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                        Revisar y enviar pedido
                    </button>
                    <button onclick="cart.clearCart()" class="btn-clear-cart">
                        Vaciar pedido
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
            const sourceProduct = db.find(product => Number(product?.id) === Number(card.productId)) || card;
            const isDorsoIdea = card.category === 'Dorsales';
            // NUEVO badge
            const isNew = card.isNewVariant || card.isNew;
            const newBadge = isNew ? `<span class="pack-badge" style="background:var(--magic-green);color:#000;">🆕 NUEVO</span>` : '';
            // COMBO badge
            const comboBadge = card.isComboEligible ? `<span class="pack-badge" style="background:var(--magic-orange);color:#000;">COMBO</span>` : '';
            // Código
            const code = card.code ? card.code : '';
            // Badges arriba de la imagen
            let badges = '';
            if (newBadge) badges += newBadge;
            if (comboBadge) badges += comboBadge;

            return `<div class="product-card" onclick="openModal(${card.productId}${card.isNewVariant ? ', ' + card.variantIndex : ''})">
                <div class="product-badges">${badges}</div>
                <img src="${card.img}" class="product-img" loading="lazy">
                <div class="product-info">
                    <div class="product-name">${cleanCatalogCardText(card.title)}</div>
                    ${code ? `<div class="product-code" style="font-size:0.85em;color:var(--magic-orange);font-weight:600;letter-spacing:1px;">${code}</div>` : ''}
                    <div class="product-meta">${formatCategoryMeta(getPublicProductYear(sourceProduct), getPublicProductCategoryLabel(sourceProduct))}</div>
                    <div class="product-price-row">
                        ${
                            isDorsoIdea
                            ? `<span class="product-envio" style="color:var(--magic-green);border:1px solid rgba(57,255,20,.25);">Frente y dorso</span>`
                            : formatPreciosDual(card)
                        }
                    </div>
                </div>
            </div>`;
        }).join('');
    } catch(e) { console.warn('renderLatestReleases error', e); }
}

function repairCatalogEncoding(value) {
    if (typeof value === 'string') {
        const c = (...codes) => String.fromCodePoint(...codes);
        const replacements = [
            [c(0xc3,0xa1), 'á'], [c(0xc3,0xa9), 'é'], [c(0xc3,0xad), 'í'], [c(0xc3,0xb3), 'ó'], [c(0xc3,0xba), 'ú'], [c(0xc3,0xb1), 'ñ'], [c(0xc3,0xbc), 'ü'],
            [c(0xc3,0x81), 'Á'], [c(0xc3,0x89), 'É'], [c(0xc3,0x8d), 'Í'], [c(0xc3,0x93), 'Ó'], [c(0xc3,0x9a), 'Ú'], [c(0xc3,0x91), 'Ñ'], [c(0xc3,0x9c), 'Ü'],
            [c(0xc2,0xa1), '¡'], [c(0xc2,0xbf), '¿'], [c(0xc2,0xb7), '·'], [c(0xc2,0xb1), '±'],
            [c(0xe2,0x80,0x94), '—'], [c(0xe2,0x80,0x93), '-'], [c(0xe2,0x80,0xa2), '•'], [c(0xe2,0x86,0x92), '→'], [c(0xe2,0x86,0x90), '←'],
            [c(0xe2,0x20ac,0x201d), '—'], [c(0xe2,0x20ac,0x201c), '-'], [c(0xe2,0x20ac,0xa2), '•'], [c(0xe2,0x2020,0x2019), '→'], [c(0xe2,0x2020,0x90), '←'],
            [c(0xe2,0x9a,0xa1), '⚡'], [c(0xe2,0x9c,0xa8), '✨'], [c(0xe2,0x9c,0x8d,0xef,0xb8,0x8f), '✍️'],
            [c(0xe2,0x161,0xa1), '⚡'], [c(0xe2,0x153,0xa8), '✨'], [c(0xe2,0x153,0x8d,0xef,0xb8,0x8f), '✍️'],
            [c(0xf0,0x9f,0x8e,0xb8), '🎸'], [c(0xf0,0x9f,0x92,0x80), '💀'], [c(0xf0,0x9f,0x93,0xa6), '📦'], [c(0xf0,0x9f,0xa4,0xaf), '🤯'],
            [c(0xf0,0x178,0x17d,0xb8), '🎸'], [c(0xf0,0x178,0x2019,0x20ac), '💀'], [c(0xf0,0x178,0x201c,0xa6), '📦'], [c(0xf0,0x178,0xa4,0xaf), '🤯'],
            [c(0xf0,0x9f,0x87,0xa6,0xf0,0x9f,0x87,0xb7), '🇦🇷'], [c(0xf0,0x9f,0x94,0xa5), '🔥']
        ];
        return replacements
            .reduce((text, [bad, good]) => text.split(bad).join(good), value)
            .replace(/\s\?\s/g, ' · ');
    }
    if (Array.isArray(value)) return value.map(repairCatalogEncoding);
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, repairCatalogEncoding(item)]));
    }
    return value;
}

function isHistoricalBackProduct(product) {
    const category = normalizeText(product?.category || '');
    const name = normalizeText(product?.name || '');
    return category === 'dorsales'
        || name.startsWith('dorso ')
        || name.includes(' dorsos')
        || name.endsWith(' dorso');
}

function getCatalogDesignResolverId({ product, conceptName, transitionId, slugify }) {
    const familyId = String(product?.designFamilyId || '').trim();
    const isGenericCardFamily = /^megadeth-card-\d+$/i.test(familyId);
    if (familyId && !isGenericCardFamily) {
        return `cd-${slugify(familyId)}--${slugify(conceptName)}`;
    }
    return `cd-${transitionId}--p${product.id}`;
}

function collectCatalogHistoricalBacks() {
    if (!window.FMDCatalogDesign) return [];
    const refs = [];
    db.forEach(product => {
        const variants = Array.isArray(product?.variants) && product.variants.length
            ? product.variants
            : [{ img: product?.img, name: product?.name, role: isHistoricalBackProduct(product) ? 'back' : 'front' }];
        variants.forEach((variant, variantIndex) => {
            if (!isHistoricalBackProduct(product) && !window.FMDCatalogDesign.isBackVariant(variant)) return;
            const productLabel = cleanPublicText(product?.name || getCatalogBandLabel(product) || 'Diseño');
            const variantLabel = cleanPublicText(variant?.name || 'Dorso');
            const publicLabel = normalizeText(variantLabel).includes(normalizeText(productLabel))
                ? variantLabel
                : `${productLabel} - ${variantLabel}`;
            refs.push({
                productId: Number(product.id),
                variantIndex,
                image: variant?.img || product?.img || '',
                label: publicLabel,
                band: getCatalogBandLabel(product),
                role: 'back'
            });
        });
    });
    const seen = new Set();
    return refs.filter(ref => {
        if (!ref.image || seen.has(ref.image)) return false;
        seen.add(ref.image);
        return true;
    });
}

function buildConservativeCatalogDesignIds(products) {
    if (!window.FMDCatalogDesign) return {};
    const explicitIds = {};
    products.forEach(product => {
        const variants = Array.isArray(product?.variants) && product.variants.length
            ? product.variants
            : [{ img: product?.img, name: product?.name, role: 'front', garmentCategory: product?.category }];
        const groups = new Map();
        variants.forEach((variant, variantIndex) => {
            if (window.FMDCatalogDesign.isBackVariant(variant)) return;
            const conceptName = window.FMDCatalogDesign.getConceptName(product, variant);
            const garment = window.FMDCatalogDesign.getGarment(variant, product);
            const key = `${normalizeText(conceptName)}|${garment}`;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push({ variant, variantIndex, conceptName });
        });
        groups.forEach(entries => {
            if (entries.length <= 1) return;
            const nonTechnicalPresentations = entries.filter(entry => !/(frente\s+y\s+dorso|combo|full\s+art|hoodies?\s+models?)/i.test(entry.variant?.name || ''));
            if (nonTechnicalPresentations.length <= 1) return;
            entries.forEach(entry => {
                explicitIds[`${product.id}:${entry.variantIndex}`] = `cd-${window.FMDCatalogDesign.slugify(getCatalogBandLabel(product))}-${window.FMDCatalogDesign.slugify(entry.conceptName)}--p${product.id}-v${entry.variantIndex + 1}`;
            });
        });
    });
    return explicitIds;
}

function initializeCatalogDesigns() {
    catalogDesigns = [];
    catalogDesignById = new Map();
    catalogHistoricalBacks = [];
    if (!ENABLE_CATALOG_DESIGN_RENDER || !window.FMDCatalogDesign || !Array.isArray(db) || !db.length) return;

    const sourceProducts = db.filter(product => isPublicProduct(product) && !isHistoricalBackProduct(product));
    const explicitDesignIds = buildConservativeCatalogDesignIds(sourceProducts);
    catalogDesigns = window.FMDCatalogDesign
        .buildCatalogDesigns(sourceProducts, {
            explicitDesignIds,
            resolveDesignId: getCatalogDesignResolverId
        })
        .filter(design => design?.front?.image && !RETIRED_CATALOG_DESIGN_IDS.has(design.designId))
        .map(design => {
            const cleanPreview = preview => preview ? {
                ...preview,
                name: getPublicCommerceText(preview.name || ''),
                alt: getPublicCommerceText(preview.alt || '')
            } : preview;
            const previewsByGarment = Object.fromEntries(
                Object.entries(design.previewsByGarment || {}).map(([garment, previews]) => [
                    garment,
                    (previews || []).map(cleanPreview)
                ])
            );
            return {
                ...design,
                publicName: getPublicCommerceText(design.publicName),
                publicSubtitle: getPublicCommerceText(design.publicSubtitle || ''),
                front: cleanPreview(design.front),
                otherFronts: (design.otherFronts || []).map(cleanPreview),
                backOptions: (design.backOptions || []).map(cleanPreview),
                previewsByGarment
            };
        });
    catalogDesignById = new Map(catalogDesigns.map(design => [design.designId, design]));
    catalogHistoricalBacks = collectCatalogHistoricalBacks();

    const validationErrors = window.FMDCatalogDesign.validateCatalogDesigns(catalogDesigns);
    if (validationErrors.length) {
        console.warn('CatalogDesign validation:', validationErrors);
    }
}

// Cargar productos desde JSON
async function loadProducts() {
    try {
        const productsUrl = `${isBandLandingMode() ? '/data/products.json' : 'data/products.json'}?v=${Date.now()}`;
        const response = await fetch(productsUrl);
        if (!response.ok) throw new Error('Error cargando productos');
        db = normalizeBandLandingProductAssets(repairCatalogEncoding(await response.json()));
        initializeCatalogDesigns();
        buildDorsoAutocompletePool();
        updateCountsUI();
        if (ENABLE_UNIVERSE_SHOWCASES) renderUniverseShowcases();
        filterProducts(); // Renderizar después de cargar
        renderHomeNews();
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
                price: 'Frontal $50.000 · Doble $55.000',
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

function renderEpicaArchiveGrid() {
    try {
        const grid = document.getElementById('epicaArchiveGrid');
        const section = document.getElementById('epicaArchive');
        const product = getEpicaProduct();
        if (!grid || !section || !product) {
            if (section) section.style.display = 'none';
            return;
        }

        const variants = product.variants || [];
        const getVariantsByGarment = garment => variants.filter(variant => getEpicaVariantGarment(variant) === garment);
        const findGarmentImage = garment => getVariantsByGarment(garment)[0]?.img || product.img;

        const garmentCards = [
            {
                id: 'remera',
                label: 'Remeras EPICA',
                meta: 'Estampa frontal',
                price: 'Desde $37.000',
                image: findGarmentImage('remera'),
                count: getVariantsByGarment('remera').length
            },
            {
                id: 'hoodie',
                label: 'Hoodies EPICA',
                meta: 'Canguro oversize unisex',
                price: 'Desde $52.000',
                image: findGarmentImage('hoodie'),
                count: getVariantsByGarment('hoodie').length
            },
            {
                id: 'buzo',
                label: 'Buzos EPICA',
                meta: 'Cuello redondo unisex',
                price: 'Frontal $50.000 · Doble $55.000',
                image: findGarmentImage('buzo'),
                count: getVariantsByGarment('buzo').length
            }
        ];

        grid.innerHTML = garmentCards.map(card => `
            <article class="epica-garment-card" onclick="showEpicaGarment('${card.id}')">
                <div class="epica-garment-card-image">
                    <img src="${card.image}" alt="${card.label}" loading="lazy" decoding="async">
                    <span>${card.count} diseños</span>
                </div>
                <div class="epica-garment-card-info">
                    <strong>${card.label}</strong>
                    <p>${card.meta}</p>
                    <span>${card.price}</span>
                    <button onclick="event.stopPropagation(); showEpicaGarment('${card.id}')">ELEGIR Y VER DISEÑOS →</button>
                </div>
            </article>
        `).join('');
    } catch (error) {
        console.warn('renderEpicaArchiveGrid error', error);
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
    if (product?.tipoPrecio === 'doble') return 'Frente y dorso';
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
                ? 'Solo frente<br>Frente y dorso'
                : (product?.tipoPrecio === 'doble' ? 'Frente y dorso' : 'Solo frente');
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

function renderMaidenArchiveGridGroupedLegacy() {
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
                        <small>${product.tipoPrecio === 'doble' ? 'Frente y dorso' : 'Solo frente'}</small>
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

function renderMaidenArchiveGrid() {
    const grid = document.getElementById('maidenArchiveGrid');
    const section = document.getElementById('maidenArchive');
    if (!grid || !section || !Array.isArray(db) || !db.length) return;

    const cards = [
        { id: 'remera', title: 'Remeras Iron Maiden', price: 'Desde $37.000' },
        { id: 'hoodie', title: 'Hoodies Iron Maiden', price: 'Desde $52.000' },
        { id: 'buzo', title: 'Buzos Iron Maiden', price: 'Frontal $50.000 · Doble $55.000' }
    ].map(card => ({ ...card, products: getMaidenArchiveProducts(card.id) }));

    if (!cards.some(card => card.products.length)) {
        section.style.display = 'none';
        return;
    }

    grid.innerHTML = cards.map(card => {
        const image = card.products[0]?.img || 'images/logos/iron-maiden-logo.png';
        return `<article class="product-card maiden-garment-card" onclick="showMaidenGarment('${card.id}')">
            <img src="${image}" class="product-img" alt="${card.title}" loading="lazy" decoding="async">
            <div class="product-info">
                <div class="product-name">${card.title}</div>
                <div class="product-meta">${card.products.length} diseños disponibles</div>
                <div class="maiden-garment-price">${card.price}</div>
                <button type="button" class="maiden-archive-card-cta" onclick="event.stopPropagation(); showMaidenGarment('${card.id}')">ELEGIR Y VER DISEÑOS →</button>
            </div>
        </article>`;
    }).join('');
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
                        <div class="product-meta">${product.year} · Frente y dorso</div>
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
                        <div class="product-meta">${product.year} · Frente y dorso</div>
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
                        <div class="product-meta">${product.year || ''} · Frente y dorso</div>
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
                        <div class="product-meta">${product.year || ''} · Frente y dorso</div>
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

function formatPrecio(tipo) {
    return '$' + PRECIOS[tipo].toLocaleString('es-AR');
}

function formatPreciosDual(product = null) {
    if (product?.category === 'Slayer') {
        const slayerGarment = product?.matchedGarment || slayerGarmentPreference;
        if (slayerGarment === 'hoodie') {
            return `<div class="dual-prices">
        <div class="price-line"><span class="price-amount">$52.000</span><span class="price-label">Hoodie estampa frontal</span></div>
        <div class="price-line"><span class="price-amount">$59.000</span><span class="price-label">Hoodie con frente y dorso</span></div>
    </div>`;
        }
        if (slayerGarment === 'buzo') {
            return `<div class="dual-prices">
        <div class="price-line"><span class="price-amount">$50.000</span><span class="price-label">Buzo estampa frontal</span></div>
        <div class="price-line"><span class="price-amount">$55.000</span><span class="price-label">Buzo con frente y dorso</span></div>
    </div>`;
        }
        if (slayerGarment === 'remera') {
            return `<div class="dual-prices">
        <div class="price-line"><span class="price-amount">$37.000</span><span class="price-label">Remera estampa frontal</span></div>
        <div class="price-line"><span class="price-amount">$44.000</span><span class="price-label">Remera con frente y dorso</span></div>
    </div>`;
        }
        return `<div class="dual-prices">
        <div class="price-line"><span class="price-amount">$44.000</span><span class="price-label">Remera con frente y dorso</span></div>
        <div class="price-line"><span class="price-amount">$59.000</span><span class="price-label">Hoodie con frente y dorso</span></div>
        <div class="price-line"><span class="price-amount">$55.000</span><span class="price-label">Buzo con frente y dorso</span></div>
    </div>`;
    }
    const isHoodie = product && (product.matchedGarment === 'hoodie' || product.category === 'Hoodies FMD' || product.category === 'Hoodies Otras Bandas');
    const isBuzoRedondo = product && (product.matchedGarment === 'buzo' || product.category === 'Buzo Cuello Redondo');
    const tabla = isHoodie ? PRECIOS_HOODIES : isBuzoRedondo ? PRECIOS_BUZO_REDONDO : PRECIOS;
    const pSimple = '$' + tabla.simple.toLocaleString('es-AR');
    const pDoble = '$' + tabla.doble.toLocaleString('es-AR');
    if (isBuzoRedondo) {
        return `<div class="dual-prices dual-prices-buzo">
        <div class="price-line price-line-primary"><span class="price-amount">${pDoble}</span><span class="price-label">Frente y dorso</span></div>
        <div class="price-line"><span class="price-amount">${pSimple}</span><span class="price-label">Solo frente opcional</span></div>
    </div>`;
    }
    return `<div class="dual-prices">
        <div class="price-line"><span class="price-amount">${pSimple}</span><span class="price-label">Estampa frontal</span></div>
        <div class="price-line"><span class="price-amount">${pDoble}</span><span class="price-label">Frente y dorso</span></div>
    </div>`;
}

function openPackWhatsapp(packName, packIncludes, packPrice) {
    // Blindaje anti-NaN: ignorar precio vacío o inválido
    let msg = `Hola FMD, quiero información sobre el pack ${packName}`;
    
    // Si hay detalles del pack, incluirlos en el mensaje
    if (packIncludes && packIncludes.trim()) {
        msg += `\n${packIncludes}`;
    }
    
    openWhatsapp(msg, `pack_${packName || 'general'}`);
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
        const variantName = images?.[currentSlide]?.name || '';
        const displayName = currentCatalogDesign?.publicName || getProductDisplayName(currentProduct, variantName);
        return `Hola FMD! Quiero pedir este diseño:\n\nDiseño: ${displayName}\nTalle: A confirmar\nColor: A confirmar\n\n¿Me indicás cómo avanzamos?`;
    }

    return `Hola FMD! Quiero hacer un pedido:\n\nDiseño: ___\nTalle: A confirmar\nColor: A confirmar\nEntrega: A confirmar\n\n¿Me indicás cómo avanzamos?`;
}

// Abrir WhatsApp con mensaje
function openWhatsapp(message, source = 'general') {
    const finalMessage = (message && String(message).trim()) ? message : buildWhatsappFallbackMessage();

    trackCatalogEvent('whatsapp_click', {
        event_category: 'engagement',
        event_label: source,
        band: currentCatalogDesign?.band || (currentProduct ? getCatalogBandLabel(currentProduct) : undefined),
        design_id: currentCatalogDesign?.designId,
        design_name: currentCatalogDesign?.publicName || currentProduct?.name || 'general',
        garment: currentProduct ? getSelectedModalGarmentType() : undefined,
        print_mode: currentProduct ? selectedPrintMode : undefined,
        cart_items: cart?.getCart?.().length || 0
    });
    
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
        selectedPrintMode = 'double';
        updateDobleWaLink();
    }catch(e){console.warn(e)}
}

function buildDobleMessage(){
    const base = currentProduct
        ? `Hola FMD, quiero consultar por frente y dorso de: ${currentCatalogDesign?.publicName || currentProduct.name}`
        : 'Hola FMD, quiero consultar por una opción con frente y dorso';

    const images = currentProduct ? getModalImages() : [];
    const variant = images?.[currentSlide]?.name ? `\nVariante: ${images[currentSlide].name}` : '';
    const selectedBackVariant = selectedCatalogBackRef
        ? `\nDorso elegido: ${selectedCatalogBackRef.label}`
        : (selectedBackIndex >= 0 && currentProduct?.variants?.[selectedBackIndex])
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

    return `${base}${variant}${selectedBackVariant}${chips}${backs}${custom}\n\nTalle: ___  Color: ___  Código postal si necesito envío: ___`;
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
            selectedPrintMode = 'double';
            updateDobleWaLink();
        };
    });
}

// === SELECTOR DE DORSO PARA DOBLE ESTAMPA ===

// Detectar variantes de dorso en el producto actual
function getDorsoVariants(product) {
    if (currentCatalogDesign) return currentCatalogDesign.backOptions || [];
    if (!product || !product.variants) return [];
    return product.variants
        .map((v, index) => ({ ...v, index }))
    .filter(v => isBackVariant(v));
}

function getCatalogDesignBackChoices() {
    if (!currentCatalogDesign) return [];
    const specific = (currentCatalogDesign.backOptions || []).map(ref => ({ ...ref, backType: 'Recomendado' }));
    const specificImages = new Set(specific.map(ref => ref.image));
    const historical = catalogHistoricalBacks
        .filter(ref => normalizeText(ref.band) === normalizeText(currentCatalogDesign.band))
        .filter(ref => !specificImages.has(ref.image))
        .map(ref => ({ ...ref, backType: 'Archivo' }));
    return [...specific, ...historical];
}

function selectCatalogDesignBack(productId, variantIndex) {
    const choice = getCatalogDesignBackChoices().find(ref => (
        Number(ref.productId) === Number(productId) && Number(ref.variantIndex) === Number(variantIndex)
    ));
    if (!choice) return;
    const isSame = selectedCatalogBackRef
        && Number(selectedCatalogBackRef.productId) === Number(choice.productId)
        && Number(selectedCatalogBackRef.variantIndex) === Number(choice.variantIndex);
    selectedCatalogBackRef = isSame ? null : choice;
    selectedBackIndex = -1;
    if (selectedCatalogBackRef) selectedPrintMode = 'double';
    renderDorsoSelector();
    updateModalPrices();
    updateDobleWaLink();
}

window.selectCatalogDesignBack = selectCatalogDesignBack;

// Renderizar selector de dorso con variantes disponibles
function renderDorsoSelector() {
    const variantsSection = document.getElementById('dorsoVariantsSection');
    const variantsGrid = document.getElementById('dorsoVariantsGrid');
    const customSection = document.getElementById('dorsoCustomSection');
    const summarySection = document.getElementById('dorsoSelectionSummary');
    
    if (!variantsSection || !variantsGrid || !currentProduct) return;
    
    if (currentCatalogDesign) {
        const choices = getCatalogDesignBackChoices();
        const recommended = choices.filter(ref => ref.backType === 'Recomendado');
        const historical = choices.filter(ref => ref.backType === 'Archivo');
        const renderChoice = ref => {
            const selected = selectedCatalogBackRef
                && Number(selectedCatalogBackRef.productId) === Number(ref.productId)
                && Number(selectedCatalogBackRef.variantIndex) === Number(ref.variantIndex);
            return `<button type="button" class="dorso-variant-item catalog-design-dorso${selected ? ' selected' : ''}"
                    onclick="selectCatalogDesignBack(${ref.productId}, ${ref.variantIndex})">
                <img src="${ref.image}" alt="${ref.label}">
                <span><strong>${ref.label}</strong><small>${ref.backType}</small></span>
            </button>`;
        };
        variantsSection.style.display = choices.length ? 'block' : 'none';
        customSection.style.display = 'block';
        variantsGrid.classList.add('catalog-design-dorso-grid');
        variantsGrid.innerHTML = `
            ${recommended.length ? `<div class="catalog-design-dorso-recommended"><p>Dorsos recomendados para este diseño</p><div>${recommended.map(renderChoice).join('')}</div></div>` : ''}
            ${historical.length ? `<details class="catalog-design-dorso-archive"><summary>VER OTROS DORSOS DE ${currentCatalogDesign.band.toUpperCase()}</summary><div>${historical.map(renderChoice).join('')}</div></details>` : ''}
        `;
        if (summarySection) {
            const summaryText = document.getElementById('dorsoSelectionText');
            summarySection.style.display = selectedCatalogBackRef ? 'block' : 'none';
            if (summaryText) summaryText.textContent = selectedCatalogBackRef?.label || '';
        }
        return;
    }

    variantsGrid.classList.remove('catalog-design-dorso-grid');
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
        selectedPrintMode = 'double';
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
let currentModalSourceRefs = [];
let currentAlbumGarmentFilter = 'all';
let scrollPosition = 0;
let modalReturnElement = null;
let modalReturnDesignId = '';
let isScrolling = false;
let scrollTimeout;
let currentView = 'grid';
let currentCategory = BAND_LANDING_BAND || null;
let currentUniverse = null;
let currentGarmentFilter = null;
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

function configureCatalogConversionModalLayout() {
    const garment = document.getElementById('modalGarmentGroup');
    const remeraVariant = document.getElementById('modalRemeraVariantGroup');
    const printMode = document.getElementById('printModeSelector');
    const doubleNote = document.getElementById('modalDoubleNote');
    const dorso = document.getElementById('upsellDorso');
    const productOptions = document.querySelector('.product-options-tight');
    const delivery = document.getElementById('modalDeliveryBox');
    const price = document.getElementById('modalPrice');
    const priceNote = document.querySelector('.modal-price-note');
    const adaptable = document.querySelector('.modal-adaptable-note');
    const actions = document.querySelector('.modal-actions');
    const orderSummary = document.getElementById('modalOrderSummary');
    const advanced = document.getElementById('modalAdvancedPanel');
    const primaryAction = document.getElementById('btnBuyNow');
    const secondaryAction = document.getElementById('btnAddCart');
    const legacyHelpAction = document.getElementById('modalWaBtn');

    if (!garment || !printMode || !dorso || !productOptions || !price || !actions) return;
    garment.after(remeraVariant);
    remeraVariant.after(printMode);
    printMode.after(doubleNote);
    doubleNote.after(dorso);
    dorso.after(productOptions);
    productOptions.after(price);
    if (delivery) delivery.remove();
    if (priceNote) price.after(priceNote);
    if (adaptable) (priceNote || price).after(adaptable);
    (adaptable || priceNote || price).after(orderSummary || actions);
    if (orderSummary) orderSummary.after(actions);
    if (advanced?.querySelector('summary')) advanced.querySelector('summary').textContent = 'Detalles del producto';
    if (primaryAction) {
        primaryAction.textContent = 'AGREGAR AL PEDIDO';
        primaryAction.onclick = addToOrderAndOpenCart;
    }
    if (secondaryAction) {
        secondaryAction.textContent = 'CONSULTAR ESTE DISEÑO';
        secondaryAction.onclick = consultCurrentDesign;
    }
    legacyHelpAction?.remove();
    dorso.style.display = 'none';
}

configureCatalogConversionModalLayout();
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
        return [{
            img: p?.img,
            name: p?.name || '',
            role: 'front',
            garmentCategory: p?.category || '',
            garments: p?.garments || []
        }];
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
    if (currentCatalogDesign?.front) return currentCatalogDesign.front.variantIndex;
    if (!Array.isArray(currentModalSourceIndexes) || !currentModalSourceIndexes.length) {
        return currentSlide;
    }

    const safeSlide = Math.max(0, Math.min(currentSlide, currentModalSourceIndexes.length - 1));
    const sourceIndex = currentModalSourceIndexes[safeSlide];
    return Number.isFinite(sourceIndex) ? sourceIndex : currentSlide;
}

function getVariantGarmentType(variant) {
    if (!variant) return '';
    const category = normalizeText(variant?.garmentCategory || '');
    const name = normalizeText(variant?.name || '');
    const img = normalizeText(variant?.img || '');
    const garments = Array.isArray(variant?.garments) ? variant.garments.map(normalizeText) : [];
    if (category.includes('hoodie') || name.includes('hoodie') || img.includes('hoodie') || img.includes('hoddies') || garments.includes('hoodie')) return 'hoodie';
    if (category.includes('buzo cuello redondo') || name.includes('buzo cuello redondo') || name.includes('buzo c/r') || img.includes('buzo') || garments.includes('buzo_cuello_redondo') || garments.includes('buzo')) return 'buzo';
    return 'remera';
}

function renderCurrentModalCarousel() {
    const modalImages = getModalImages();
    carousel.innerHTML = modalImages.map((v, index) => `
        <div class="carousel-slide">
            ${renderFmdBadge(currentProduct, currentModalSourceIndexes[index], 'carousel-fmd-original-badge')}
            <img src="${v.img}" alt="${currentProduct?.name || ''}">
        </div>
    `).join('');
    carouselDots.innerHTML = modalImages.length > 1
        ? modalImages.map((_, i) => `<div class="carousel-dot${i === 0 ? ' active' : ''}" data-index="${i}"></div>`).join('')
        : '';
    currentSlide = 0;
    carousel.scrollLeft = 0;
    resetModalImageZoom();

    document.querySelectorAll('.carousel-dot').forEach(dot => {
        dot.addEventListener('click', function() {
            goToSlide(parseInt(this.dataset.index), true);
        });
    });

    const prevBtn = document.getElementById('carouselPrev');
    const nextBtn = document.getElementById('carouselNext');
    if (prevBtn) prevBtn.style.display = modalImages.length > 1 ? '' : 'none';
    if (nextBtn) nextBtn.style.display = modalImages.length > 1 ? '' : 'none';
    if (carouselDots) carouselDots.style.display = modalImages.length > 1 ? '' : 'none';
}

function renderAlbumGarmentFilter() {
    const filter = document.getElementById('albumGarmentFilter');
    if (!filter) return;
    filter.style.display = 'none';
    filter.classList.add('is-hidden');
}

function filterCurrentAlbumByGarment(garment) {
    if (currentProduct?.category !== 'Album') return;
    const images = getImages(currentProduct);
    const validGarment = ['all', 'remera', 'hoodie', 'buzo'].includes(garment) ? garment : 'all';
    const indexes = images.reduce((result, variant, index) => {
        if (validGarment === 'all' || getVariantGarmentType(variant) === validGarment) result.push(index);
        return result;
    }, []);
    if (!indexes.length) return;

    currentAlbumGarmentFilter = validGarment;
    currentModalSourceIndexes = indexes;
    currentModalImages = indexes.map(index => images[index]);
    renderCurrentModalCarousel();
    updateModalInfo();
}

const MODAL_SIZE_GUIDES = {
    hombre: {
        title: 'Remera clásica hombre',
        copy: 'Medidas en centimetros. Pueden variar +/-5%.',
        rows: [['S', '52', '75'], ['M', '54', '77'], ['L', '56', '79'], ['XL', '58', '81'], ['2XL', '60', '83']]
    },
    mujer: {
        title: 'Remera corte mujer',
        copy: 'Medidas en centimetros. Pueden variar +/-5%.',
        rows: [['S', '47', '61'], ['M', '49', '63'], ['L', '51', '65'], ['XL', '53', '67'], ['2XL', '55', '69']]
    },
    oversize: {
        title: 'Remera oversize unisex',
        copy: 'Medidas en centimetros. En remera oversize llegamos hasta 3XL.',
        rows: [['2XS', '55', '69'], ['XS', '57', '71'], ['S', '59', '73'], ['M', '61', '75'], ['L', '63', '77'], ['XL', '66', '79'], ['2XL', '69', '81'], ['3XL', '72', '83']]
    },
    hoodies: {
        title: 'Hoodie canguro over unisex',
        copy: 'Algodon frizado. Medidas en centimetros. Pueden variar +/-5%.',
        rows: [['XS', '64', '67'], ['S', '66', '69'], ['M', '68', '71'], ['L', '70', '73'], ['XL', '72', '75'], ['2XL', '74', '77']]
    },
    'buzo-redondo': {
        title: 'Buzo cuello redondo over unisex',
        copy: 'Medidas en centimetros. Pueden variar +/-5%.',
        rows: [['XS', '65', '66'], ['S', '67', '68'], ['M', '69', '70'], ['L', '71', '72'], ['XL', '73', '74'], ['2XL', '75', '76']]
    },
    ninos: {
        title: 'Remera chicos',
        copy: 'Medidas en centimetros. Disponible en negro o blanco segun modelo.',
        rows: [['4', '38', '53'], ['6', '40', '55'], ['8', '42', '57'], ['10', '44', '59'], ['12', '46', '61'], ['14', '48', '63'], ['16', '50', '66']]
    }
};

function getSizeGuideDefinition(tabName) {
    const baseGuide = MODAL_SIZE_GUIDES[tabName] || MODAL_SIZE_GUIDES.hombre;
    return usesBandLandingShownComposition() && tabName === 'hoodies'
        ? { ...baseGuide, title: 'Hoodie canguro oversize unisex' }
        : baseGuide;
}

function renderModalSizeGuide(tabName) {
    const panel = document.getElementById('modalSizeGuidePanel');
    const title = document.getElementById('modalSizeGuideTitle');
    const copy = document.getElementById('modalSizeGuideCopy');
    const table = document.getElementById('modalSizeGuideTable');
    const guide = getSizeGuideDefinition(tabName);
    if (!panel || !title || !copy || !table) return;

    title.textContent = guide.title;
    copy.textContent = guide.copy;
    table.innerHTML = `<table class="size-table modal-size-table">
        <thead><tr><th>Talle</th><th>Ancho axila a axila</th><th>Largo</th></tr></thead>
        <tbody>${guide.rows.map(row => `<tr><td>${row[0]}</td><td>${row[1]}</td><td>${row[2]}</td></tr>`).join('')}</tbody>
    </table>`;
    panel.classList.remove('is-hidden');
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderLandingSizeGuide(tabName = 'hombre') {
    const title = document.getElementById('landingSizeGuideTitle');
    const copy = document.getElementById('landingSizeGuideCopy');
    const table = document.getElementById('landingSizeGuideTable');
    if (!title || !copy || !table) return;

    const guide = getSizeGuideDefinition(tabName);
    title.textContent = guide.title;
    copy.textContent = guide.copy;
    table.innerHTML = `<table class="size-table modal-size-table">
        <thead><tr><th>Talle</th><th>Ancho axila a axila</th><th>Largo</th></tr></thead>
        <tbody>${guide.rows.map(row => `<tr><td>${row[0]}</td><td>${row[1]}</td><td>${row[2]}</td></tr>`).join('')}</tbody>
    </table>`;

    document.querySelectorAll('[data-landing-size-guide]').forEach(button => {
        button.classList.toggle('active', button.dataset.landingSizeGuide === tabName);
    });
}

function selectLandingSizeGuide(tabName) {
    renderLandingSizeGuide(tabName);
}

function closeModalSizeGuide() {
    document.getElementById('modalSizeGuidePanel')?.classList.add('is-hidden');
}

function openSizeGuideForCurrentGarment() {
    const tabName = selectedModalGarment === 'hoodie'
        ? 'hoodies'
        : selectedModalGarment === 'buzo'
            ? 'buzo-redondo'
            : selectedAge === 'chico'
                ? 'ninos'
                : selectedCut === 'mujer'
                    ? 'mujer'
                : selectedModalGarment === 'remera_clasica'
                    ? 'hombre'
                    : 'oversize';
    renderModalSizeGuide(tabName);
}

window.filterCurrentAlbumByGarment = filterCurrentAlbumByGarment;
window.openSizeGuideForCurrentGarment = openSizeGuideForCurrentGarment;
window.closeModalSizeGuide = closeModalSizeGuide;
window.selectLandingSizeGuide = selectLandingSizeGuide;

function getAutoHighlightSlideIndex(product, images) {
    if (!product || !Array.isArray(images) || !images.length) return -1;

    return -1;
}

function getCatalogDesignFrontRefs(design) {
    if (!design) return [];
    const refs = Object.values(design.previewsByGarment || {}).flat();
    const seen = new Set();
    return refs.filter(ref => {
        const key = `${ref.productId}:${ref.variantIndex}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function catalogDesignRefToModalImage(ref) {
    return {
        img: ref.image,
        name: ref.label,
        alt: ref.alt,
        role: 'front',
        garmentCategory: ref.garment === 'hoodie'
            ? 'Hoodies Otras Bandas'
            : ref.garment === 'buzo_cuello_redondo'
                ? 'Buzo Cuello Redondo'
                : 'Bandas Sugeridas',
        catalogSourceRef: ref
    };
}

function renderModalDesignBadge(sourceIndex) {
    if (!currentCatalogDesign) return renderFmdBadge(currentProduct, sourceIndex, 'carousel-fmd-original-badge');
    const badge = getPublicBadgeLabel(currentCatalogDesign.badges?.[0]);
    return badge ? `<span class="fmd-original-badge carousel-fmd-original-badge">${badge}</span>` : '';
}

function openCatalogDesign(designId, initialGarment = '') {
    const design = catalogDesignById.get(designId);
    if (!design?.front || !isCatalogDesignInScope(design)) return;
    const requestedGarment = initialGarment || (isBandLandingMode() ? getBandLandingModalGarment() : '');
    trackCatalogEvent('design_open', {
        band: design.band,
        design_id: design.designId,
        design_name: design.publicName,
        initial_garment: requestedGarment || undefined
    });
    openModal(design.front.productId, design.front.variantIndex, undefined, 'catalog_design', designId, requestedGarment);
}

window.openCatalogDesign = openCatalogDesign;

function openOuterwearFeaturedModal(id, variantIndex = undefined) {
    openModal(id, variantIndex, undefined, 'outerwear_feature');
}

function openModal(id, variantIndex = undefined, scopedVariantIndexes = undefined, source = 'catalog', catalogDesignId = null, initialModalGarment = '') {
    currentCatalogDesign = catalogDesignId ? catalogDesignById.get(catalogDesignId) || null : null;
    modal.classList.toggle('catalog-design-modal', Boolean(currentCatalogDesign));
    selectedCatalogBackRef = null;
    const canonicalProductId = currentCatalogDesign?.front?.productId ?? id;
    const product = db.find(p => p.id === canonicalProductId);
    if (!product || !isPublicProduct(product)) return;
    currentProduct = product;
    const adaptableNote = document.querySelector('.modal-adaptable-note');
    const previewReferenceNote = document.getElementById('modalPreviewReferenceNote');
    if (adaptableNote && !currentCatalogDesign) {
        adaptableNote.textContent = '¿Querés este diseño en otra prenda o con otro dorso? Lo adaptamos por WhatsApp.';
        adaptableNote.classList.remove('is-reference-view');
        adaptableNote.classList.remove('is-hidden');
    }
    if (previewReferenceNote && !currentCatalogDesign) {
        previewReferenceNote.textContent = '';
        previewReferenceNote.classList.add('is-hidden');
    }
    currentAlbumGarmentFilter = 'all';
    const outerwearCatalogButton = document.getElementById('modalOuterwearCatalogBtn');
    if (outerwearCatalogButton) {
        const outerwearBand = getCatalogBandLabel(product);
        outerwearCatalogButton.hidden = source !== 'outerwear_feature';
        outerwearCatalogButton.dataset.bandFilter = encodeURIComponent(outerwearBand);
        outerwearCatalogButton.textContent = `VER HOODIES Y BUZOS DE ${outerwearBand.toUpperCase()}`;
    }

    scrollPosition = window.pageYOffset;
    modalReturnDesignId = catalogDesignId || '';
    modalReturnElement = catalogDesignId
        ? [...document.querySelectorAll('.catalog-design-card[data-design-id]')]
            .find(card => card.dataset.designId === catalogDesignId)?.querySelector('.catalog-design-card-main') || null
        : document.activeElement?.closest?.('.product-card, .collection-card, .catalog-design-card-main') || null;
    document.body.classList.add('modal-open');
    document.body.style.top = `-${scrollPosition}px`;

    history.pushState(
        { modal: true, id: canonicalProductId, designId: currentCatalogDesign?.designId || null },
        '',
        currentCatalogDesign ? `#diseno-${currentCatalogDesign.designId}` : `#producto-${canonicalProductId}`
    );
    const images = getImages(currentProduct);
    const hasSpecificVariant = variantIndex !== undefined && variantIndex !== null;
    const hasScopedVariants = Array.isArray(scopedVariantIndexes) && scopedVariantIndexes.length > 0;
    const autoHighlightSlide = hasSpecificVariant ? -1 : getAutoHighlightSlideIndex(currentProduct, images);

    if (currentCatalogDesign) {
        const designRefs = getCatalogDesignFrontRefs(currentCatalogDesign);
        currentModalSourceRefs = [...designRefs];
        currentModalImages = designRefs.map(catalogDesignRefToModalImage);
        currentModalSourceIndexes = designRefs.map(ref => (
            ref.productId === currentProduct.id ? ref.variantIndex : currentCatalogDesign.front.variantIndex
        ));
        const canonicalPosition = designRefs.findIndex(ref => (
            ref.productId === currentCatalogDesign.front.productId
            && ref.variantIndex === currentCatalogDesign.front.variantIndex
        ));
        currentSlide = canonicalPosition >= 0 ? canonicalPosition : 0;
    } else if (hasScopedVariants) {
        currentModalSourceRefs = [];
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
        currentModalSourceRefs = [];
        const safeVariantIndex = Math.max(0, Math.min(Number(variantIndex) || 0, images.length - 1));
        currentModalImages = [images[safeVariantIndex]];
        currentModalSourceIndexes = [safeVariantIndex];
        currentSlide = 0;
    } else {
        currentModalSourceRefs = [];
        currentModalImages = images;
        currentModalSourceIndexes = images.map((_, index) => index);
        currentSlide = autoHighlightSlide >= 0 ? autoHighlightSlide : 0;
    }

    const modalImages = getModalImages();

    carousel.innerHTML = modalImages.map((v, index) => `
        <div class="carousel-slide">
            ${renderModalDesignBadge(currentModalSourceIndexes[index])}
            <img src="${v.img}" alt="${v.alt || currentCatalogDesign?.publicName || currentProduct.name}">
        </div>
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
        // Usar setTimeout para que el DOM está listo
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
    selectedPrintMode = currentCatalogDesign
        ? (currentCatalogDesign.defaultPrintMode === 'double' ? 'double' : 'simple')
        : (isDoubleByDefault(currentProduct) ? 'double' : 'simple');
    const availableModalGarments = getAvailableModalGarments(currentProduct);
    const activeVariantGarment = getVariantGarmentType(getModalImages()[currentSlide]);
    const preferredGarment = activeVariantGarment === 'hoodie'
        ? 'hoodie'
        : activeVariantGarment === 'buzo'
            ? 'buzo'
            : 'remera_clasica';
    selectedModalGarment = currentCatalogDesign
        ? (availableModalGarments.includes(initialModalGarment)
            ? initialModalGarment
            : (availableModalGarments.includes('remera_clasica') ? 'remera_clasica' : availableModalGarments[0]))
        : availableModalGarments.includes(preferredGarment)
        ? preferredGarment
        : (availableModalGarments[0] || 'remera_clasica');
    if (selectedModalGarment === 'hoodie' || selectedModalGarment === 'buzo' || selectedModalGarment === 'oversize') {
        selectedAge = 'adulto';
        selectedCut = 'oversize';
    } else if (selectedModalGarment === 'mujer') {
        selectedAge = 'adulto';
        selectedCut = 'mujer';
    } else {
        selectedAge = 'adulto';
        selectedCut = 'clasica';
    }
    
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
    
    // Ocultar talles exclusivos de oversize.
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
        
        // Mostrar el talle XS adicional para hoodies (XS a 2XL).
        document.querySelectorAll('#sizeSelector .size-oversize').forEach(btn => {
            if (btn.dataset.size === 'XS') {
                btn.style.display = '';
                btn.style.cssText = inactiveStyle;
            } else {
                btn.style.display = 'none';
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
        
        // Mostrar el talle XS adicional para buzo cuello redondo (XS a 2XL).
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
    
    updateModalGarmentUI();
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
        modalAdvancedPanel.open = false;
    }

    if (currentCatalogDesign) selectCatalogDesignPreviewForGarment(selectedModalGarment);
    modal.classList.add('active');
    // Adjuntar listeners del carrusel una vez el modal está listo
    attachCarouselListeners();
    try { showScrollHintIfNeeded(); } catch (e) { }
}

function showScrollHintIfNeeded(){
    if (currentCatalogDesign) return;
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
window.openOuterwearFeaturedModal = openOuterwearFeaturedModal;

function showOuterwearCatalogFromModal() {
    const button = document.getElementById('modalOuterwearCatalogBtn');
    const band = button?.dataset.bandFilter ? decodeURIComponent(button.dataset.bandFilter) : '';
    const landingUrl = getBandLandingUrl(band);
    closeModal(false, false);
    if (landingUrl) {
        window.location.href = landingUrl;
        return;
    }
    filterOuterwearByBand(band);
}

window.showOuterwearCatalogFromModal = showOuterwearCatalogFromModal;

function getModalReturnElement() {
    if (modalReturnElement?.isConnected) return modalReturnElement;
    if (!modalReturnDesignId) return null;
    const card = [...document.querySelectorAll('.catalog-design-card[data-design-id]')]
        .find(item => item.dataset.designId === modalReturnDesignId);
    return card?.querySelector('.catalog-design-card-main') || null;
}

function restoreModalCatalogPosition(returnScrollPosition) {
    const target = getModalReturnElement();
    window.scrollTo(0, returnScrollPosition);
    if (!target) return;
    try {
        target.focus({ preventScroll: true });
    } catch (error) {
        target.focus();
    }
    const card = target.closest('.catalog-design-card, .product-card, .collection-card');
    if (card) {
        card.classList.remove('is-modal-return-target');
        requestAnimationFrame(() => card.classList.add('is-modal-return-target'));
        setTimeout(() => card.classList.remove('is-modal-return-target'), 1800);
    }
}

function closeModal(fromHistory = false, shouldRestorePosition = true) {
    if (!modal.classList.contains('active')) return;
    const returnScrollPosition = scrollPosition;
    const root = document.documentElement;
    const previousInlineScrollBehavior = root.style.scrollBehavior;
    root.style.setProperty('scroll-behavior', 'auto', 'important');
    modal.classList.remove('active');
    // Remover listeners del carrusel para evitar fugas de memoria
    carousel.removeEventListener('scroll', onCarouselScroll);
    carousel.removeEventListener('click', onCarouselClick);
    try { const existing = document.querySelector('.scroll-hint'); if(existing) existing.remove(); } catch(e){}
    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('top');
    currentModalImages = [];
    currentModalSourceIndexes = [];
    currentModalSourceRefs = [];
    currentCatalogDesign = null;
    modal.classList.remove('catalog-design-modal');
    selectedCatalogBackRef = null;
    if (!fromHistory && /^#(?:producto|diseno)-/i.test(window.location.hash)) {
        history.replaceState(
            { catalog: true, category: currentCategory || null },
            '',
            `${window.location.pathname}${window.location.search}`
        );
    }
    if (shouldRestorePosition) {
        window.scrollTo(0, returnScrollPosition);
        requestAnimationFrame(() => {
            restoreModalCatalogPosition(returnScrollPosition);
            requestAnimationFrame(() => {
                restoreModalCatalogPosition(returnScrollPosition);
                if (previousInlineScrollBehavior) root.style.scrollBehavior = previousInlineScrollBehavior;
                else root.style.removeProperty('scroll-behavior');
            });
        });
    } else if (previousInlineScrollBehavior) {
        root.style.scrollBehavior = previousInlineScrollBehavior;
    } else {
        root.style.removeProperty('scroll-behavior');
    }
    resetModalImageZoom();
    closeZoom();
}

function requestModalClose() {
    if (!modal.classList.contains('active')) return;
    if (history.state?.modal) {
        history.back();
        return;
    }
    closeModal();
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
    
    // Agregár listeners frescos
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

function getModalDisplayGarmentSuffix() {
    if (selectedModalGarment === 'buzo') return 'Buzo cuello redondo';
    if (selectedModalGarment === 'hoodie') return 'Hoodie';
    return '';
}

function stripGarmentPrefixFromName(name) {
    return String(name || '')
        .replace(/^\s*(buzo\s+cuello\s+redondo|buzo|hoodie|remera)\s+/i, '')
        .trim();
}

function cleanPublicText(text = '') {
    return getPublicCommerceText(String(text || ''))
        .replace(/Killing\s+Is\s+my\s+Bussines/gi, 'Killing Is My Business')
        .replace(/Killing\s+Is\s+my\s+bussines/gi, 'Killing Is My Business')
        .replace(/Killing\s+is\s+My\s+Business/gi, 'Killing Is My Business');
}

function cleanCatalogCardText(text = '') {
    return cleanPublicText(text)
        .replace(/\s*-\s*dise(?:n|ñ)os sugeridos\s*$/i, '')
        .trim();
}

function getPublicProductYear(product) {
    const id = Number(product?.id ?? product?.productId);
    const metallicaYears = {
        1060: 1984,
        1061: 1986,
        1062: 1988
    };
    return metallicaYears[id] || product?.year || '';
}

function getPublicProductCategoryLabel(product) {
    if (product?.band) return product.band;
    const category = normalizeText(product?.category);
    if (category === 'bandas sugeridas' || category === 'hoodies otras bandas') return 'FMD';
    return getCategoryLabel(product?.category);
}

function cleanVariantNameForModal(product, variantName = '') {
    let name = String(variantName || '').trim();
    if (!name) return '';

    const productName = String(product?.name || '').trim();
    if (productName && normalizeText(name).startsWith(normalizeText(productName))) {
        name = name.slice(productName.length).trim();
    }

    name = name.replace(/^\s*[-:–—]\s*/, '').trim();
    name = name.replace(/\s*-\s*(remera|hoodie|buzo\s+cuello\s+redondo|buzo)\s*$/i, '').trim();
    return name;
}

function getProductDisplayName(product, variantName = '') {
    if (!product) return '';
    const garmentSuffix = getModalDisplayGarmentSuffix();
    const baseName = cleanPublicText(garmentSuffix ? stripGarmentPrefixFromName(product.name) : product.name);
    const cleanVariantName = cleanPublicText(cleanVariantNameForModal(product, variantName));

    if (garmentSuffix) {
        const variantWithoutGarment = cleanVariantName;
        return variantWithoutGarment && normalizeText(variantWithoutGarment) !== normalizeText(baseName)
            ? `${variantWithoutGarment} - ${garmentSuffix}`
            : `${baseName} - ${garmentSuffix}`;
    }

    if (!cleanVariantName || normalizeText(cleanVariantName) === normalizeText(baseName)) return baseName;
    return `${baseName} - ${cleanVariantName}`;
}

function updateModalInfo() {
    if (!currentProduct) return;
    syncSelectedModalGarmentWithActiveVariant();
    updateModalGarmentUI();
    const images = getModalImages();
    const activeVariantIndex = getActiveVariantIndex();
    const activeVariantName = images?.[currentSlide]?.name?.trim() || '';
    let displayName = currentCatalogDesign?.publicName || getProductDisplayName(currentProduct, activeVariantName);
    const slayerGarmentLabel = currentProduct.category === 'Slayer' ? getSlayerPreferredGarmentLabel() : '';
    if (slayerGarmentLabel && !activeVariantName) displayName = `${cleanPublicText(currentProduct.name)} - ${slayerGarmentLabel}`;
    document.getElementById('modalName').textContent = displayName;
    
    // Actualizar código del producto
    const code = cart.generateCode(currentProduct.id, activeVariantIndex, selectedBacks.size > 0 || selectedDorsoChips.size > 0);
    const displayCodeEl = document.getElementById('displayCode');
    if (displayCodeEl) displayCodeEl.textContent = currentCatalogDesign?.orderCodeBase || code;
    
    // Actualizar breadcrumb
    const breadcrumbCategory = document.getElementById('breadcrumbCategory');
    const breadcrumbProduct = document.getElementById('breadcrumbProduct');
    if (breadcrumbCategory) breadcrumbCategory.textContent = getCategoryLabel(currentProduct.category);
    if (breadcrumbProduct) breadcrumbProduct.textContent = displayName;
    
    // Actualizar contador de productos
    updateProductCounter();
    
    const modalMetaLabel = currentCatalogDesign?.band || currentProduct.band || getCategoryLabel(currentProduct.category);
    document.getElementById('modalMeta').textContent = currentCatalogDesign
        ? modalMetaLabel
        : formatCategoryMeta(currentProduct.year, modalMetaLabel);
    const fmdBadge = currentCatalogDesign?.badges?.length
        ? { label: getPublicBadgeLabel(currentCatalogDesign.badges[0]), description: 'Diseño creado por FMD.' }
        : getFmdBadgeData(currentProduct, activeVariantIndex);
    const modalDesc = document.getElementById('modalDesc');
    modalDesc.innerHTML = `${fmdBadge ? `<span class="fmd-original-badge modal-fmd-original-badge">${fmdBadge.label}</span><span class="modal-fmd-original-copy">${fmdBadge.description}</span>` : ''}${getPublicCommerceText(currentProduct.desc || '')}`;
    modalDesc.classList.toggle('is-hidden', Boolean(currentCatalogDesign));
    updateModalSizeRange();
    
    // Actualizar precios según selector adulto/chico
    updateModalPrices();
    
    document.getElementById('modalCounter').textContent = `${currentSlide + 1}/${images.length}`;
    const shouldShowBadge = isDoubleByDefault(currentProduct) || DORSO_CATEGORIES.has(currentProduct.category);
    document.getElementById('badgeDoble').style.display = shouldShowBadge ? 'block' : 'none';
    const variantNameEl = document.getElementById('variantName');
    if (variantNameEl) {
        variantNameEl.textContent = '';
        variantNameEl.style.display = 'none';
    }
    const modalWaBtn = document.getElementById('modalWaBtn');
    if (modalWaBtn) {
        modalWaBtn.onclick = (e) => {
            e.preventDefault();
            consultCurrentDesign();
        };
        modalWaBtn.href = '#';
    }
    renderBackExamples();
    renderDorsoSelector(); // Renderizar selector de dorso
    updateCatalogDesignReferenceNote();
    renderAlbumGarmentFilter();
    updateDobleWaLink();
    document.querySelectorAll('.carousel-dot').forEach((dot, i) => { dot.classList.toggle('active', i === currentSlide); });
    updateShareLinks();
    renderRelatedProducts(currentProduct.category);
}

function getUniverseProducts(universe, includeArchive = true) {
    const allowedTiers = includeArchive ? PUBLIC_VISIBILITY_TIERS : SHOWCASE_VISIBILITY_TIERS;
    return db
        .filter(product => productBelongsToUniverse(product, universe))
        .filter(product => allowedTiers.has(product.visibilityTier))
        .sort(compareProductsByVisibilityThenPriority);
}

function renderUniverseShowcases() {
    const host = document.getElementById('universeShowcaseList');
    if (!host || !Array.isArray(db) || !db.length) return;

    host.innerHTML = UNIVERSE_SHOWCASE_DEFINITIONS.map(definition => {
        const previewProducts = getUniverseProducts(definition.universe, false);
        const totalProducts = getUniverseProducts(definition.universe, true).length;
        const visibleProducts = previewProducts.slice(0, definition.limit);
        const cards = visibleProducts.map(product => `
            <article class="universe-showcase-card" onclick="openModal(${product.id})">
                <img src="${product.img}" alt="${product.name}" loading="lazy" decoding="async">
                <div class="universe-showcase-card-copy">
                    <strong>${product.name}</strong>
                    <span>${product.band || 'FMD'} · ${product.visibilityTier}</span>
                </div>
            </article>
        `).join('');

        return `
            <article class="universe-showcase ${definition.primary ? 'is-primary' : ''}">
                <div class="universe-showcase-header">
                    <div>
                        <h3 class="universe-showcase-title">${definition.universe}</h3>
                        <p class="universe-showcase-meta">${totalProducts} productos disponibles</p>
                    </div>
                    <button type="button" class="universe-showcase-all" onclick="showUniverse('${definition.universe}')">VER TODO</button>
                </div>
                <div class="universe-showcase-grid ${definition.limit > 4 ? 'is-wide' : ''}">
                    ${cards}
                </div>
            </article>
        `;
    }).join('');
}

function resetCatalogPagination() {
    catalogVisibleLimit = CATALOG_PAGE_SIZE;
    megadethVisibleLimit = MEGADETH_PAGE_SIZE;
}

function showUniverse(universe) {
    currentUniverse = universe;
    currentCategory = null;
    currentSearch = '';
    if (searchInput) searchInput.value = '';
    if (searchClear) searchClear.classList.remove('visible');
    resetCatalogPagination();
    document.querySelectorAll('.cat-btn, .filter-pill').forEach(button => button.classList.remove('active'));
    syncCatalogQuickFilters(null);
    filterProducts();
    scrollToSection('catalogoPrincipal');
}

function showCompleteCatalog() {
    clearCatalogState();
    currentCategory = null;
    resetCatalogPagination();
    document.querySelectorAll('.cat-btn, .filter-pill').forEach(button => button.classList.remove('active'));
    const allPill = document.querySelector('.filter-pill[data-filter="all"]');
    if (allPill) allPill.classList.add('active');
    syncCatalogQuickFilters('all');
    filterProducts();
    scrollToSection('catalogoPrincipal');
}

window.showUniverse = showUniverse;
window.showCompleteCatalog = showCompleteCatalog;

function getCatalogDesignStartingPrice(design) {
    if (Number(design?.catalogStartingPrice) > 0) return Number(design.catalogStartingPrice);
    return design?.isPersonalized ? PRECIOS.simple_personalizado : PRECIOS.simple;
}

function getBandLandingDesignStartingPrice(design) {
    if (bandLandingGarment === 'hoodie') {
        return PRECIOS_HOODIES.simple + (design?.isPersonalized ? PERSONALIZADO_EXTRA : 0);
    }
    if (bandLandingGarment === 'buzo_cuello_redondo') {
        return PRECIOS_BUZO_REDONDO.simple + (design?.isPersonalized ? PERSONALIZADO_EXTRA : 0);
    }
    return getCatalogDesignStartingPrice(design);
}

function getCatalogDesignCardPriceText(design, preview) {
    if (!isBandLandingMode() && design?.catalogPriceText) {
        return getPublicCommerceText(design.catalogPriceText);
    }

    const printMode = normalizeText(preview?.defaultPrintMode || design?.defaultPrintMode || '');
    const isDoubleComposition = printMode === 'double' || printMode === 'doble';
    if (!isDoubleComposition) {
        const startingPrice = (isBandLandingMode()
            ? getBandLandingDesignStartingPrice(design)
            : getCatalogDesignStartingPrice(design)).toLocaleString('es-AR');
        return `Desde $${startingPrice}`;
    }

    const garment = isBandLandingMode() && bandLandingGarment
        ? bandLandingGarment
        : preview?.garment || 'remera';
    const personalizedExtra = design?.isPersonalized ? PERSONALIZADO_EXTRA : 0;
    const doublePrice = garment === 'hoodie'
        ? PRECIOS_HOODIES.doble
        : garment === 'buzo_cuello_redondo'
            ? PRECIOS_BUZO_REDONDO.doble
            : PRECIOS.doble;
    return `Frente y dorso $${(doublePrice + personalizedExtra).toLocaleString('es-AR')}`;
}

function getBandLandingDesignPreview(design) {
    if (!isBandLandingMode() || !bandLandingGarment) return design?.front || null;
    const previews = design?.previewsByGarment?.[bandLandingGarment] || [];
    return previews.find(item => item.preferredPreview) || previews[0] || null;
}

function getCatalogDesignSearchText(design) {
    const sourceProducts = (design?.sourceProductIds || [])
        .map(id => db.find(product => Number(product.id) === Number(id)))
        .filter(Boolean);
    return normalizeText([
        design?.designId,
        design?.publicName,
        design?.band,
        design?.orderCodeBase,
        ...(design?.designFamilyIds || []),
        ...sourceProducts.flatMap(product => [product.name, product.category, product.album, ...(product.tags || [])])
    ].filter(Boolean).join(' '));
}

function getBandLandingAlbumOrderIndex(design) {
    if (!BAND_LANDING_ALBUM_ORDER_INDEX.size) return Number.MAX_SAFE_INTEGER;
    const indexes = (design?.sourceProductIds || [])
        .map(id => db.find(product => Number(product.id) === Number(id)))
        .map(product => BAND_LANDING_ALBUM_ORDER_INDEX.get(normalizeText(product?.album || '')))
        .filter(index => Number.isInteger(index));
    return indexes.length ? Math.min(...indexes) : Number.MAX_SAFE_INTEGER;
}

function catalogDesignBandExists(value) {
    const band = normalizeText(value);
    return Boolean(band) && catalogDesigns.some(design => normalizeText(design.band) === band);
}

function getCatalogDesignResults() {
    if (!ENABLE_CATALOG_DESIGN_RENDER || !catalogDesigns.length || currentGarmentFilter === 'abrigo') return null;

    let scopedDesigns = isBandLandingMode()
        ? catalogDesigns.filter(isCatalogDesignInScope)
        : catalogDesigns;
    if (isBandLandingMode() && bandLandingGarment) {
        scopedDesigns = scopedDesigns.filter(design => Boolean(getBandLandingDesignPreview(design)));
    }
    updateBandLandingCollectionCounts(scopedDesigns);
    if (isBandLandingMode() && bandLandingCollection) {
        const collection = BAND_LANDING_COLLECTIONS.find(item => item.id === bandLandingCollection);
        if (collection) scopedDesigns = scopedDesigns.filter(design => matchesBandLandingCollection(design, collection));
    }
    let designs = null;
    if (currentSearch) {
        const query = normalizeText(currentSearch);
        designs = scopedDesigns.filter(design => getCatalogDesignSearchText(design).includes(query));
    } else if (normalizeText(currentCategory) === 'personalizados') {
        designs = scopedDesigns.filter(design => design.isPersonalized);
    } else if (isBandLandingMode()) {
        designs = scopedDesigns;
    } else if (catalogDesignBandExists(currentCategory)) {
        const band = normalizeText(currentCategory);
        designs = scopedDesigns.filter(design => normalizeText(design.band) === band);
    }

    if (!designs) return null;
    return designs.sort((a, b) => {
        if (isBandLandingMode() && BAND_LANDING_DESIGN_ORDER_INDEX.size) {
            const fallbackOrder = Number.MAX_SAFE_INTEGER;
            const archiveOrderDiff = (BAND_LANDING_DESIGN_ORDER_INDEX.get(a.designId) ?? fallbackOrder)
                - (BAND_LANDING_DESIGN_ORDER_INDEX.get(b.designId) ?? fallbackOrder);
            if (archiveOrderDiff) return archiveOrderDiff;
        }
        if (isBandLandingMode() && BAND_LANDING_ALBUM_ORDER_INDEX.size) {
            const albumOrderDiff = getBandLandingAlbumOrderIndex(a) - getBandLandingAlbumOrderIndex(b);
            if (albumOrderDiff) return albumOrderDiff;
        }
        const tierDiff = (VISIBILITY_TIER_ORDER[a.visibilityTier] ?? 99) - (VISIBILITY_TIER_ORDER[b.visibilityTier] ?? 99);
        if (tierDiff) return tierDiff;
        const priorityDiff = Number(b.commercialPriority || 0) - Number(a.commercialPriority || 0);
        if (priorityDiff) return priorityDiff;
        return a.publicName.localeCompare(b.publicName, 'es', { sensitivity: 'base' });
    });
}

function updateBandLandingFinalMessage() {
    if (!isBandLandingMode()) return;

    const section = document.getElementById('bandLandingFinal');
    const kicker = document.getElementById('bandLandingFinalKicker');
    const title = document.getElementById('bandCustomTitle');
    const copy = document.getElementById('bandLandingFinalCopy');
    const cta = document.getElementById('bandLandingFinalCta');
    if (!section || !kicker || !title || !copy || !cta) return;

    const archiveDesignCount = catalogDesigns.filter(isCatalogDesignInScope).length;
    if (archiveDesignCount < 1 || archiveDesignCount >= 10) return;

    section.classList.add('band-landing-custom-growing');
    kicker.textContent = 'ARCHIVO FMD';
    title.textContent = 'ESTE ARCHIVO SIGUE CRECIENDO';
    copy.textContent = `Estamos sumando nuevos diseños de ${BAND_LANDING_BAND}. Si buscás uno en particular, escribinos y lo hacemos personalizado.`;
    cta.textContent = 'PEDIR UN DISEÑO';
}

function setCatalogUniversalGarmentNoteVisible(visible) {
    document.getElementById('catalogUniversalGarmentNote')?.classList.toggle('is-hidden', !visible);
}

function renderCatalogDesignResults(designs) {
    setCatalogUniversalGarmentNoteVisible(!isBandLandingMode());
    updateBandLandingFinalMessage();
    const visibleDesigns = designs.slice(0, catalogVisibleLimit);
    productsGrid.classList.remove('catalog-band-directory', 'gallery-view');
    productsGrid.classList.add('catalog-design-grid');
    document.querySelector('.catalog-toolbar')?.classList.remove('catalog-directory-active');

    let heading = 'DISEÑOS DISPONIBLES';
    if (currentSearch) heading = `${designs.length} RESULTADOS`;
    else if (isBandLandingMode() && bandLandingGarment) heading = `${getBandLandingGarmentLabel()} ${BAND_LANDING_BAND.toUpperCase()}`;
    else if (currentCategory) heading = `DISEÑOS ${String(currentCategory).toUpperCase()}`;
    document.getElementById('productsCount').textContent = heading;

    productsGrid.innerHTML = visibleDesigns.map(design => {
        const preview = getBandLandingDesignPreview(design) || design.front;
        const availableGarments = new Set((design.availableGarments || []).map(garment => normalizeText(garment)));
        const garmentLabels = [
            [...availableGarments].some(garment => garment.includes('remera')) ? 'Remera' : '',
            [...availableGarments].some(garment => garment.includes('hoodie')) ? 'Hoodie' : '',
            [...availableGarments].some(garment => garment.includes('buzo')) ? 'Buzo' : ''
        ].filter(Boolean);
        const priceText = getCatalogDesignCardPriceText(design, preview);
        const initialGarment = isBandLandingMode() ? getBandLandingModalGarment() : '';
        const explicitBadges = (design.badges || []).map(label => ({ label: getPublicBadgeLabel(label), className: '' }));
        const activeLandingCollection = BAND_LANDING_COLLECTIONS.find(collection => collection.id === bandLandingCollection);
        const explicitFeaturedIds = new Set((activeLandingCollection?.match?.designIds || []).map(String));
        const commercialBadges = [
            isBandLandingMode() && bandLandingCollection === 'featured' && explicitFeaturedIds.has(String(design.designId))
                ? { label: 'Destacado FMD', className: 'is-featured' }
                : null,
            design.isNew ? { label: 'Nuevo', className: 'is-new' } : null
        ].filter(Boolean);
        const cardBadges = [...commercialBadges, ...explicitBadges]
            .filter((badge, index, all) => all.findIndex(item => normalizeText(item.label) === normalizeText(badge.label)) === index)
            .slice(0, 2);
        return `<article class="catalog-design-card" data-design-id="${design.designId}">
            <button type="button" class="catalog-design-card-main" onclick="openCatalogDesign('${design.designId}', '${initialGarment}')" aria-label="Ver diseño ${design.publicName}">
                <span class="catalog-design-media">
                    ${cardBadges.length ? `<span class="catalog-design-badges">${cardBadges.map(badge => `<span class="catalog-design-badge ${badge.className}">${badge.label}</span>`).join('')}</span>` : ''}
                    <img src="${preview.image}" alt="${preview.alt || `${design.publicName} - ${design.band}`}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='images/logo/MARCA DE AGUA.png';">
                </span>
                <span class="catalog-design-copy">
                    <span class="catalog-design-band">${design.band}</span>
                    <strong>${design.publicName}</strong>
                    ${design.publicSubtitle ? `<span class="catalog-design-subtitle">${getPublicCommerceText(design.publicSubtitle)}</span>` : ''}
                    ${garmentLabels.length ? `<span class="catalog-design-garments"><b>Disponible en:</b> ${garmentLabels.join(' · ')}</span>` : ''}
                    <span class="catalog-design-price">${priceText}</span>
                    <span class="catalog-design-cta">VER DISEÑO</span>
                </span>
            </button>
        </article>`;
    }).join('');

    ['megadethBackBtn', 'slayerBackBtn', 'maidenBackBtn'].forEach(id => {
        const button = document.getElementById(id);
        if (button) button.hidden = true;
    });
    const loadMore = document.getElementById('catalogLoadMore');
    const loadMoreStatus = document.getElementById('catalogLoadMoreStatus');
    const hasMore = visibleDesigns.length < designs.length;
    if (loadMore) loadMore.hidden = !hasMore;
    if (loadMoreStatus) loadMoreStatus.textContent = hasMore ? 'HAY MÁS DISEÑOS DISPONIBLES' : '';
}

function filterProducts() {
    const catalogDesignResults = getCatalogDesignResults();
    if (catalogDesignResults) {
        renderCatalogDesignResults(catalogDesignResults);
        return;
    }
    productsGrid.classList.remove('catalog-design-grid');
    const garmentMetadataValue = currentGarmentFilter === 'buzo' ? 'buzo_cuello_redondo' : currentGarmentFilter;
    let filtered = currentGarmentFilter === 'abrigo'
        ? db.filter(product => isPublicProduct(product) && (!currentCategory || matchesCategoryOrMetadata(product, currentCategory)))
        : currentGarmentFilter
        ? db.filter(product => isPublicProduct(product) && Array.isArray(product.garments) && product.garments.includes(garmentMetadataValue))
        : currentUniverse
        ? getUniverseProducts(currentUniverse, true)
        : normalizeText(currentCategory) === 'megadeth'
        ? getMegadethArchiveEntries(megadethGarmentPreference, megadethSegmentPreference)
        : normalizeText(currentCategory) === 'iron maiden'
            ? getMaidenArchiveProducts(maidenGarmentPreference)
        : currentCategory ? db.filter(p => matchesCategoryOrMetadata(p, currentCategory) && isPublicProduct(p)) : db.filter(isPublicProduct);
    if (currentSearch) {
        filtered = getSearchResults(currentSearch, db.filter(isPublicProduct), true);
    }
    const normalizedCategory = normalizeText(currentCategory);
    if (normalizedCategory === 'album') {
        filtered = filtered.filter(p => !HIDDEN_FROM_ALBUM_CATEGORY.has(Number(p?.id)));
    }
    if (normalizedCategory === 'slayer' && slayerGarmentPreference) {
        filtered = filtered
            .map(product => {
                const matchedVariantIndexes = getSlayerPreferredVariantIndexes(product);
                if (!matchedVariantIndexes.length) return null;
                const matchedVariantIndex = matchedVariantIndexes[0];
                const matchedVariant = product.variants[matchedVariantIndex];
                return {
                    ...product,
                    matchedVariantIndex,
                    matchedVariantIndexes,
                    matchedVariantName: matchedVariant.name,
                    matchedVariantImage: matchedVariant.img
                };
            })
            .filter(Boolean);
    }
    if (normalizedCategory === 'epica' && currentGarmentFilter !== 'abrigo') {
        filtered = filtered.flatMap(product => expandEpicaVariants(product, epicaGarmentPreference));
    } else if (currentGarmentFilter !== 'abrigo' && shouldExpandBandDesigns(filtered, normalizedCategory)) {
        filtered = filtered.flatMap(expandBandProductDesigns);
    }
    if (currentGarmentFilter === 'abrigo') {
        filtered = filtered.flatMap(expandOuterwearProductDesigns);
    }
    const shouldSortAlbumsByYear = normalizedCategory === 'album' && filtered.every(p => normalizeText(p?.category) === 'album');
    const isAllCatalogView = !currentSearch && !currentCategory && !currentUniverse && !currentGarmentFilter;
    if (currentGarmentFilter === 'abrigo') {
        filtered.sort(compareOuterwearProducts);
    } else if (!isAllCatalogView && normalizedCategory !== 'megadeth') {
        filtered.sort(shouldSortAlbumsByYear ? compareAlbumProductsByYearAscThenId : compareProductsByVisibilityThenPriority);
    }
    renderFilteredProducts(filtered);
}

function getCatalogDirectoryImage(product) {
    const variants = Array.isArray(product?.variants) ? product.variants : [];
    return product?.img || variants[0]?.img || variants[0]?.image || 'images/logo/MARCA DE AGUA.png';
}

const FEATURED_COLLECTION_ART = Object.freeze({
    megadeth: { image: 'images/albums/Megadeth/megadeth_2026_vic_llamas_v3.jpg', alt: 'Diseño representativo de Megadeth' },
    slayer: { image: 'images/slayer/remera_slayer_aguila.jpg', alt: 'Diseño representativo de Slayer' },
    'iron maiden': { image: 'images/iron_maiden/IRON MAIDEN BY FMD/fmd_killers.jpg', alt: 'Killers FMD de Iron Maiden' },
    'ricardo iorio': { image: 'images/banda_sugeridas/ricardo_iorio/remera_almafuerte_obras.jpg', alt: 'Almafuerte - En Obras' },
    epica: { image: 'images/banda_sugeridas/epica/hoodie_epica_the_phantom_agony.jpg', alt: 'Hoodie EPICA The Phantom Agony' },
    helloween: { image: 'images/banda_sugeridas/helloween/remera_helloween.jpg', alt: 'Remera Helloween Pumpkin Logo' },
    pantera: { image: 'images/pantera/remera_pantera_the_great_southern_trendkill.jpg', alt: 'Diseño representativo de Pantera' },
    metallica: { image: 'images/metallica/metallica_master_of_puppets_realistic.jpg', alt: 'Master Realista de Metallica' }
});

function renderCatalogBandDirectory(products) {
    setCatalogUniversalGarmentNoteVisible(false);
    const groups = new Map();
    products.forEach(product => {
        const label = getCatalogBandLabel(product);
        if (!groups.has(label)) groups.set(label, []);
        groups.get(label).push(product);
    });
    groups.forEach(group => group.sort(compareProductsByVisibilityThenPriority));

    const findLabel = label => [...groups.keys()].find(groupLabel => normalizeText(groupLabel) === normalizeText(label));
    const initialLabels = ['Megadeth', 'Slayer', 'Iron Maiden', 'Ricardo Iorio', 'Helloween', 'Metallica']
        .map(findLabel)
        .filter(Boolean);
    const initialLabelKeys = new Set(initialLabels.map(normalizeText));
    const allLabels = [...groups.keys()]
        .filter(label => !initialLabelKeys.has(normalizeText(label)))
        .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

    const renderBandCard = (label, emphasis = '') => {
        const group = groups.get(label) || [];
        const preview = group[0];
        const encodedFilter = encodeURIComponent(label);
        const landingUrl = getBandLandingUrl(label);
        if (landingUrl) {
            return `
            <a class="catalog-band-card ${emphasis}" href="${landingUrl}" aria-label="Ver diseños de ${label}">
                <img src="${getCatalogDirectoryImage(preview)}" alt="${label}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='images/logo/MARCA DE AGUA.png';">
                <span class="catalog-band-card-shade"></span>
                <span class="catalog-band-card-copy">
                    <strong>${label}</strong>
                    <em>VER DISEÑOS</em>
                </span>
            </a>`;
        }
        return `
            <button type="button" class="catalog-band-card ${emphasis}" data-band-filter="${encodedFilter}">
                <img src="${getCatalogDirectoryImage(preview)}" alt="${label}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='images/logo/MARCA DE AGUA.png';">
                <span class="catalog-band-card-shade"></span>
                <span class="catalog-band-card-copy">
                    <strong>${label}</strong>
                    <em>VER DISEÑOS</em>
                </span>
            </button>`;
    };

    const renderFeaturedCollectionCard = label => {
        const encodedFilter = encodeURIComponent(label);
        const landingUrl = getBandLandingUrl(label);
        const art = FEATURED_COLLECTION_ART[normalizeText(label)] || {};
        const artMarkup = art.image
            ? `<img src="${art.image}" alt="${art.alt || label}" loading="lazy" decoding="async">`
            : `<span class="catalog-featured-collection-monogram" aria-hidden="true">${art.monogram || label.slice(0, 2)}</span>`;
        const content = `
            <span class="catalog-featured-collection-art">${artMarkup}</span>
            <span class="catalog-featured-collection-name">${label}</span>`;

        if (landingUrl) {
            return `<a class="catalog-featured-collection-card" href="${landingUrl}" aria-label="Explorar la colección ${label}">${content}</a>`;
        }
        return `<button type="button" class="catalog-featured-collection-card" data-band-filter="${encodedFilter}" aria-label="Explorar la colección ${label}">${content}</button>`;
    };

    const renderSection = (key, title, subtitle, labels, emphasis = '') => {
        if (!labels.length) return '';
        const isCollapsible = key === 'more';
        const isExpanded = isCollapsible && moreBandsDirectoryExpanded;
        return `
        <section class="catalog-band-directory-section ${emphasis}" data-directory-section="${key}">
            <div class="catalog-band-directory-head">
                <h2>${title}</h2>
                ${subtitle ? `<p>${subtitle}</p>` : ''}
            </div>
            <div class="catalog-band-directory-grid${key === 'featured' ? ' catalog-featured-collections-grid' : ''}${isCollapsible && !isExpanded ? ' is-preview' : ''}"${isCollapsible ? ' id="catalogMoreBandsGrid"' : ''}>
                ${labels.map(label => key === 'featured' ? renderFeaturedCollectionCard(label) : renderBandCard(label, emphasis)).join('')}
            </div>
            ${key === 'featured' ? '<button type="button" class="catalog-featured-all-bands" id="catalogFeaturedAllBands">VER TODAS LAS BANDAS</button>' : ''}
            ${isCollapsible ? `<button type="button" class="catalog-more-bands-toggle" id="catalogMoreBandsToggle" aria-expanded="${isExpanded}" aria-controls="catalogMoreBandsGrid">${isExpanded ? 'OCULTAR BANDAS' : 'VER TODAS LAS BANDAS'}</button>` : ''}
        </section>`;
    };

    productsGrid.classList.remove('gallery-view');
    productsGrid.classList.add('catalog-band-directory');
    document.querySelector('.catalog-toolbar')?.classList.add('catalog-directory-active');
    document.getElementById('productsCount').textContent = 'ELEGÍ UNA BANDA PARA VER SUS DISEÑOS';
    productsGrid.innerHTML = [
        renderSection('featured', 'COLECCIONES DESTACADAS', 'Una selección de nuestras colecciones para empezar a explorar.', initialLabels, 'is-primary'),
        `<section class="home-news-section home-news-section-in-catalog" aria-labelledby="homeNewsTitle">
            <div class="home-simple-head">
                <p>NOVEDADES FMD</p>
                <h2 id="homeNewsTitle">ÚLTIMOS DISEÑOS</h2>
                <span>Ricardo Iorio · Almafuerte · Hermética</span>
            </div>
            <div class="home-news-grid" id="homeNewsGrid"></div>
            <a class="home-news-more" href="/ricardo-iorio/">VER MÁS DE RICARDO IORIO</a>
        </section>`,
        renderSection('more', 'MÁS BANDAS', 'Todo el catálogo sigue disponible.', allLabels)
    ].join('');
    productsGrid.querySelectorAll('[data-band-filter]').forEach(button => {
        button.addEventListener('click', () => openBandAccess(decodeURIComponent(button.dataset.bandFilter)));
    });
    document.getElementById('catalogMoreBandsToggle')?.addEventListener('click', event => {
        setMoreBandsDirectoryExpanded(event.currentTarget.getAttribute('aria-expanded') !== 'true');
    });
    document.getElementById('catalogFeaturedAllBands')?.addEventListener('click', () => {
        setMoreBandsDirectoryExpanded(true);
        window.requestAnimationFrame(() => {
            document.querySelector('[data-directory-section="more"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });

    ['megadethBackBtn', 'slayerBackBtn', 'maidenBackBtn'].forEach(id => {
        const button = document.getElementById(id);
        if (button) button.hidden = true;
    });
    const loadMore = document.getElementById('catalogLoadMore');
    if (loadMore) loadMore.hidden = true;
}

function renderFilteredProducts(filtered) {
    const isMegadethView = normalizeText(currentCategory) === 'megadeth';
    const isAllCatalogView = !currentSearch && !currentCategory && !currentUniverse && !currentGarmentFilter;
    const totalFiltered = filtered.length;
    if (isAllCatalogView) {
        renderCatalogBandDirectory(filtered);
        return;
    }
    setCatalogUniversalGarmentNoteVisible(true);
    productsGrid.classList.remove('catalog-band-directory');
    document.querySelector('.catalog-toolbar')?.classList.remove('catalog-directory-active');
    const visibleLimit = isMegadethView ? megadethVisibleLimit : catalogVisibleLimit;
    const visibleProducts = filtered.slice(0, visibleLimit);
    const megadethBackBtn = document.getElementById('megadethBackBtn');
    if (megadethBackBtn) megadethBackBtn.hidden = !(isMegadethView && megadethGarmentPreference);
    const slayerBackBtn = document.getElementById('slayerBackBtn');
    if (slayerBackBtn) slayerBackBtn.hidden = !(normalizeText(currentCategory) === 'slayer' && slayerGarmentPreference);
    const maidenBackBtn = document.getElementById('maidenBackBtn');
    if (maidenBackBtn) maidenBackBtn.hidden = !(normalizeText(currentCategory) === 'iron maiden' && maidenGarmentPreference);
    const slayerGarmentLabel = normalizeText(currentCategory) === 'slayer' ? getSlayerPreferredGarmentLabel() : '';
    const megadethGarmentLabel = isMegadethView && megadethGarmentPreference
        ? (megadethGarmentPreference === 'remera' ? 'Remeras Megadeth' : megadethGarmentPreference === 'hoodie' ? 'Hoodies Megadeth' : 'Buzos Megadeth')
        : '';
    const maidenGarmentLabel = normalizeText(currentCategory) === 'iron maiden' && maidenGarmentPreference
        ? (maidenGarmentPreference === 'remera' ? 'Remeras Iron Maiden' : maidenGarmentPreference === 'hoodie' ? 'Hoodies Iron Maiden' : 'Buzos Iron Maiden')
        : '';
    let catalogHeading = 'DISEÑOS DISPONIBLES';
    if (currentSearch) catalogHeading = `${filtered.length} RESULTADOS`;
    else if (currentGarmentFilter) catalogHeading = currentGarmentFilter === 'remera' ? 'REMERAS' : currentGarmentFilter === 'hoodie' ? 'HOODIES' : currentGarmentFilter === 'abrigo' ? `HOODIES Y BUZOS · ${String(currentCategory || 'FMD').toUpperCase()}` : 'BUZOS CUELLO REDONDO';
    else if (megadethGarmentLabel) catalogHeading = megadethGarmentLabel;
    else if (slayerGarmentLabel) catalogHeading = slayerGarmentLabel;
    else if (maidenGarmentLabel) catalogHeading = maidenGarmentLabel;
    else if (currentUniverse) catalogHeading = currentUniverse;
    else if (currentCategory) catalogHeading = normalizeText(currentCategory) === 'epica' ? 'DISEÑOS EPICA' : `DISEÑOS ${getCategoryLabel(currentCategory)}`;
    document.getElementById('productsCount').textContent = catalogHeading;
    productsGrid.innerHTML = visibleProducts.map((p, index) => {
        const isDorsoIdea = p.category === 'Dorsales';
        // NUEVO badge
        const isNew = p.isNew;
        const newBadge = isNew ? `<span class="pack-badge" style="background:var(--magic-green);color:#000;">🆕 NUEVO</span>` : '';
        // COMBO badge
        const comboBadge = p.isComboEligible ? `<span class="pack-badge" style="background:var(--magic-orange);color:#000;">COMBO</span>` : '';
        // Código
        const code = p.code ? p.code : '';
        // Badges arriba de la imagen
        let badges = '';
        if (newBadge) badges += newBadge;
        if (comboBadge) badges += comboBadge;
        badges += renderFmdBadge(p, typeof p.matchedVariantIndex === 'number' ? p.matchedVariantIndex : undefined);
        const isSlayerFmdOriginalsCard = Number(p.id) === 7123 || p.designFamilyId === 'slayer-fmd-originals';
        const cardClasses = ['product-card'];
        if (isSlayerFmdOriginalsCard) cardClasses.push('slayer-fmd-originals-card');

        const modalArgs = typeof p.matchedVariantIndex === 'number'
            ? `, ${p.matchedVariantIndex}${p.matchedVariantIndexes?.length ? `, [${p.matchedVariantIndexes.join(',')}]` : ''}`
            : '';

        const previousSegment = visibleProducts[index - 1]?.matchedSegment;
        const segmentHeader = isMegadethView && p.matchedSegment !== previousSegment
            ? `<div class="megadeth-catalog-group-title">${MEGADETH_SEGMENT_LABELS[p.matchedSegment] || 'MEGADETH'}</div>`
            : '';

        const previousOuterwearGarment = visibleProducts[index - 1]?.matchedGarment;
        const outerwearHeader = currentGarmentFilter === 'abrigo' && p.matchedGarment !== previousOuterwearGarment
            ? `<div class="catalog-garment-group-title">${p.matchedGarment === 'buzo' ? 'BUZOS CUELLO REDONDO' : 'HOODIES'}</div>`
            : '';

        return `${outerwearHeader}${segmentHeader}<div class="${cardClasses.join(' ')}" onclick="openModal(${p.id}${modalArgs})">
            <div class="product-badges">${badges}</div>
            <img src="${p.matchedVariantImage || p.img}" class="product-img" loading="lazy" decoding="async" fetchpriority="low" onerror="this.onerror=null;this.src='images/logo/MARCA DE AGUA.png';this.classList.add('is-fallback');">
            <div class="product-info">
                <div class="product-name">${cleanCatalogCardText(p.matchedVariantName || p.name)}</div>
                ${code ? `<div class="product-code" style="font-size:0.85em;color:var(--magic-orange);font-weight:600;letter-spacing:1px;">${code}</div>` : ''}
                <div class="product-meta">${formatCategoryMeta(getPublicProductYear(p), getPublicProductCategoryLabel(p))}</div>
                <div class="product-price-row">
                    ${
                        isDorsoIdea
                        ? `<span class="product-envio" style="color:var(--magic-green);border:1px solid rgba(57,255,20,.25);">Frente y dorso</span>`
                        : formatPreciosDual(p)
                    }
                </div>
            </div>
        </div>`;
    }).join('');
    const loadMore = document.getElementById('catalogLoadMore');
    const loadMoreStatus = document.getElementById('catalogLoadMoreStatus');
    if (loadMore && loadMoreStatus) {
        const hasMore = visibleProducts.length < totalFiltered;
        loadMore.hidden = !hasMore;
        loadMoreStatus.textContent = hasMore ? 'HAY MÁS DISEÑOS DISPONIBLES' : '';
    }
    setView(currentView);
}

let catalogSearchEventTimer = null;
let lastTrackedCatalogSearch = '';

function queueCatalogSearchEvent(searchTerm) {
    if (catalogSearchEventTimer) clearTimeout(catalogSearchEventTimer);
    const normalizedTerm = String(searchTerm || '').trim().toLowerCase();
    if (normalizedTerm.length < 2) {
        lastTrackedCatalogSearch = '';
        return;
    }
    catalogSearchEventTimer = setTimeout(() => {
        if (normalizedTerm === lastTrackedCatalogSearch) return;
        lastTrackedCatalogSearch = normalizedTerm;
        trackCatalogEvent('catalog_search', {
            band: currentCategory || BAND_LANDING_BAND || undefined,
            search_term: normalizedTerm
        });
    }, 800);
}

searchInput.addEventListener('input', (e) => {
    currentSearch = e.target.value.toLowerCase().trim();
    resetCatalogPagination();
    searchClear.classList.toggle('visible', currentSearch.length > 0);
    filterProducts();
    queueCatalogSearchEvent(currentSearch);
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

searchClear.onclick = () => { searchInput.value = ''; currentSearch = ''; resetCatalogPagination(); searchClear.classList.remove('visible'); filterProducts(); };

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

        currentUniverse = null;
        currentGarmentFilter = null;
        currentCategory = btn.dataset.cat;
        if (normalizeText(currentCategory) !== 'epica') epicaGarmentPreference = null;
        slayerGarmentPreference = null;
        if (normalizeText(currentCategory) !== 'iron maiden') maidenGarmentPreference = null;
        resetCatalogPagination();
        if (normalizeText(currentCategory) === 'megadeth') {
            megadethGarmentPreference = getActiveMegadethGarmentPreference();
            megadethSegmentPreference = 'all';
            megadethVisibleLimit = MEGADETH_PAGE_SIZE;
            renderMegadethArchiveGrid();
        }
        if (normalizeText(currentCategory) === 'iron maiden') {
            maidenGarmentPreference = null;
            renderMaidenArchiveGrid();
        }
        syncCatalogQuickFilters(currentCategory);
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
            if (navBtn) {
                navBtn.click();
            } else {
                currentUniverse = null;
                currentCategory = categoryToTrigger;
                resetCatalogPagination();
                filterProducts();
            }
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
    const desc = currentProduct.desc ? getPublicCommerceText(currentProduct.desc).substring(0, 100) : 'Diseño exclusivo premium';
    
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
    'Hoodies Otras Bandas': 'Hoodies destacados',
    'Buzo Cuello Redondo': 'Buzos cuello redondo',
    'Bandas Sugeridas': 'Más bandas',
    'Dave Mustaine': 'Dave Mustaine',
    'Dorsales': 'Dorsos para combinar',
    'Musician': 'Miembros Megadeth',
    'Personalizados': 'Personalizados',
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

function countDesignsByFilter(filter) {
    return db
        .filter(p => isPublicProduct(p) && matchesCategoryOrMetadata(p, filter))
        .reduce((total, product) => total + Math.max(1, Array.isArray(product.variants) ? product.variants.length : 0), 0);
}

function updateCountsUI(){
    try{
        if(!Array.isArray(db) || !db.length) return;
        const { byCategory, megadethTotal, totalAll } = computeCounts();
        const origenesCount = byCategory['Orígenes'] || 0;
        const albumVisibleCount = Math.max(0, (byCategory['Album'] || 0) - Array.from(HIDDEN_FROM_ALBUM_CATEGORY).filter(id => db.some(p => Number(p?.id) === id)).length);
        const epicaDesignCount = countDesignsByFilter('Epica');
        const rhapsodyDesignCount = countDesignsByFilter('Rhapsody');

        // Destacados: badges
        document.querySelectorAll('.featured-badge').forEach(badge => {
            badge.textContent = '';
        });

        const ftMegadethCard = document.querySelector('.featured-card[data-trigger="Album"]');
        if(ftMegadethCard){
            const title = ftMegadethCard.querySelector('h3');
            if(title) title.textContent = 'Megadeth';
        }

        // Navegación categorías: sin contadores engañosos en home
        const setNavBadge = (cat, val) => {
            const el = document.querySelector(`.cat-btn[data-cat="${cat}"] .badge`);
            if(el) el.textContent = '';
        };
        const toggleNavCategory = (cat, isVisible) => {
            const btn = document.querySelector(`.cat-btn[data-cat="${cat}"]`);
            if(btn) btn.style.display = isVisible ? '' : 'none';
        };
        setNavBadge('Album', albumVisibleCount);
        setNavBadge('Megadeth', db.filter(isMegadethArchiveProduct).length);
        setNavBadge('Orígenes', byCategory['Orígenes']||0);
        setNavBadge('Avenged Sevenfold', byCategory['Avenged Sevenfold']||0);
        setNavBadge('AC/DC', byCategory['AC/DC']||0);
        setNavBadge('Pantera', byCategory['Pantera']||0);
        setNavBadge('Iron Maiden', byCategory['Iron Maiden']||0);
        setNavBadge('Slayer', byCategory['Slayer']||0);
        setNavBadge('Epica', epicaDesignCount);
        setNavBadge('Rhapsody', rhapsodyDesignCount);
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

        // Filtros públicos sin conteos: la elección se centra en la banda.
        const setPill = (filter, label) => {
            const el = document.querySelector(`.filter-pill[data-filter="${filter}"]`);
            if(el) el.textContent = label;
        };
        const togglePill = (filter, isVisible) => {
            const el = document.querySelector(`.filter-pill[data-filter="${filter}"]`);
            if(el) el.style.display = isVisible ? '' : 'none';
        };
        setPill('all', 'Todas');
        setPill('Megadeth', 'Megadeth');
        setPill('Album', getCategoryLabel('Album'));
        setPill('Orígenes', getCategoryLabel('Orígenes'));
        setPill('Hoodies FMD', getCategoryLabel('Hoodies FMD'));
        setPill('Hoodies Otras Bandas', getCategoryLabel('Hoodies Otras Bandas'));
        setPill('Buzo Cuello Redondo', getCategoryLabel('Buzo Cuello Redondo'));
        setPill('Dave Mustaine', 'Dave Mustaine');
        setPill('Pantera', 'Pantera');
        setPill('Iron Maiden', 'Iron Maiden');
        setPill('Slayer', 'Slayer');
        setPill('Epica', 'EPICA');
        setPill('Rhapsody', 'RHAPSODY');
        setPill('Metallica', 'Metallica');
        setPill('Avenged Sevenfold', 'Avenged Sevenfold');
        setPill('AC/DC', 'AC/DC');
        setPill('Bandas Sugeridas', 'Más bandas');
        setPill('Musician', getCategoryLabel('Musician'));
        setPill('Singles', getCategoryLabel('Singles'));
        setPill('Tour', getCategoryLabel('Tour'));
        setPill('Dorsales', getCategoryLabel('Dorsales'));
        setPill('VicRattlehead', 'Vic Rattlehead');
        setPill('Personalizados', 'Personalizados');
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
    const modalImage = document.getElementById('imageModalImg');
    modalImage.src = src;
    modalImage.alt = alt || 'Vista ampliada del diseño';
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

document.getElementById('modalClose').onclick = requestModalClose;
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
window.addEventListener('popstate', () => { if(modal.classList.contains('active')) closeModal(true); });

// Agregár soporte de teclado para navegación del carousel
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
            showFullCatalog();
        } else if (normalizeText(filterValue) === 'epica') {
            showAllEpica();
        } else {
            // Simular click en el botón de categoría correspondiente
            const navBtn = document.querySelector(`[data-cat="${filterValue}"]`);
            if (navBtn) {
                navBtn.click();
            } else {
                openBandAccess(filterValue);
            }
        }

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
        if (dorsoInputLive.value.trim()) selectedPrintMode = 'double';
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

    updateCheckoutWhatsappAvailability();
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
            input.removeAttribute('aria-invalid');
            input.closest('.cart-cp-field')?.classList.remove('field-required-error');
            saveShippingCustomerDataToStorage(getShippingCustomerData());
            updateCheckoutWhatsappAvailability();
        });
    });

    updateCheckoutWhatsappAvailability();
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

function getRequiredShippingFields(method = selectedDeliveryMethod) {
    const common = ['nombre', 'apellido', 'telefono'];
    if (method === 'domicilio') return [...common, 'direccion', 'cp', 'localidad', 'provincia'];
    if (method === 'retiro_andreani') return ['nombre', 'cp', 'localidad'];
    if (method === 'taller') return ['nombre'];
    return [];
}

function getMissingShippingFields(data, method = selectedDeliveryMethod) {
    return getRequiredShippingFields(method).filter(field => {
        if (field === 'cp') return !isValidPostalCode(data.cp);
        return !data[field];
    });
}

function focusFirstMissingShippingField(fieldKey) {
    const inputId = SHIPPING_FORM_FIELD_MAP[fieldKey];
    if (!inputId) return;
    const input = document.getElementById(inputId);
    if (!input) return;
    input.setAttribute('aria-invalid', 'true');
    const field = input.closest('.cart-cp-field');
    field?.classList.add('field-required-error');
    field?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => input.focus({ preventScroll: true }), 250);
}

function getShippingFieldLabel(fieldKey) {
    const labels = {
        nombre: selectedDeliveryMethod === 'taller' ? 'Nombre y apellido' : 'Nombre',
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
    if (selectedDeliveryMethod === 'retiro_andreani') {
        const lines = [];
        if (data.nombre) lines.push(data.nombre);
        const location = [data.cp ? `CP ${data.cp}` : '', data.localidad]
            .filter(Boolean)
            .join(' · ');
        if (location) lines.push(location);
        return lines.length
            ? `\n\nDATOS\n${lines.join('\n')}`
            : '\n\nDATOS\nA confirmar por WhatsApp';
    }

    if (selectedDeliveryMethod === 'taller') {
        return data.nombre
            ? `\n\nDATOS\n${data.nombre}`
            : '\n\nDATOS\nA confirmar por WhatsApp';
    }

    const lines = [];
    const fullName = [data.nombre, data.apellido].filter(Boolean).join(' ');
    if (fullName) lines.push(fullName);
    if (selectedDeliveryMethod === 'domicilio') {
        const location = [data.cp ? `CP ${data.cp}` : '', data.localidad, data.provincia]
            .filter(Boolean)
            .join(' · ');
        if (location) lines.push(location);
        if (data.direccion) lines.push(`Dirección: ${data.direccion}`);
    }

    if (!lines.length) {
        return '\n\nDATOS\nA confirmar por WhatsApp';
    }

    return `\n\nDATOS\n${lines.join('\n')}`;
}

function updateCheckoutWhatsappAvailability() {
    const button = document.getElementById('btnConfirmCartWhatsapp');
    if (!button) return;
    const missingDelivery = !selectedDeliveryMethod;
    const missingFields = selectedDeliveryMethod
        ? getMissingShippingFields(getShippingCustomerData(), selectedDeliveryMethod)
        : [];
    const missingSize = cart.getCart().some(item => !String(item?.size || '').trim());
    const blocked = missingDelivery || missingFields.length > 0 || missingSize;
    button.classList.toggle('is-validation-blocked', blocked);
    button.setAttribute('aria-disabled', blocked ? 'true' : 'false');
    button.title = missingDelivery
        ? 'Elegí una forma de entrega.'
        : missingFields.includes('cp')
            ? 'Ingresá el código postal para continuar.'
            : missingSize
                ? 'Elegí el talle de todas las prendas para continuar.'
                : blocked
                    ? 'Completá los datos del pedido.'
                    : '';
}

function buildShippingContextForWhatsapp(postalCode = '', customerData = null) {
    const totals = calculateCartTotal();
    let deliveryBenefit = '';
    if (selectedDeliveryMethod === 'retiro_andreani') {
        deliveryBenefit = 'Punto Andreani · Envío gratis';
    } else if (selectedDeliveryMethod === 'domicilio') {
        deliveryBenefit = totals.cantidad >= 3
            ? 'Domicilio · Envío gratis'
            : 'Domicilio · Envío a cotizar según CP';
    } else if (selectedDeliveryMethod === 'taller') {
        deliveryBenefit = 'Retiro sin cargo en Villa Martelli · Zona Tecnópolis\nLunes a viernes de 10 a 16 h';
    }
    const deliveryContext = `\n\nENTREGA\n${deliveryBenefit}`;
    const customerContext = customerData ? buildCustomerDataForWhatsapp(customerData) : '';
    return `${deliveryContext}${customerContext}`;
}

function sendViaWhatsapp(postalCode = '', customerData = null) {
    const summary = cart.generateSummary();
    const shippingContext = buildShippingContextForWhatsapp(postalCode, customerData);
    const closing = selectedDeliveryMethod === 'taller'
        ? '¿Me confirmás cuándo estaría disponible para retirar y cómo seguimos con el pago?'
        : selectedDeliveryMethod === 'retiro_andreani'
            ? '¿Me indicás el punto Andreani más conveniente y cómo seguimos?'
            : selectedDeliveryMethod === 'domicilio'
                ? '¿Me confirmás el pedido y cómo seguimos con el pago?'
                : '¿Me confirmás cómo seguimos?';
    const message = `Hola FMD!\n\nQuiero hacer este pedido:\n\n${summary}${shippingContext}\n\n${closing}`;
    openWhatsapp(message, 'cart_confirmar_pedido');
}

// === MODAL VISTA PREVIA DEL CARRITO ===
function openCartPreview() {
    trackCatalogEvent('cart_open', {
        cart_items: cart.getCart().length,
        band: currentCatalogDesign?.band || (currentProduct ? getCatalogBandLabel(currentProduct) : undefined),
        design_id: currentCatalogDesign?.designId
    });
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

function calculateItemBasePrice(item) {
    const isHoodie = item.category === 'Hoodies FMD' || item.category === 'Hoodies Otras Bandas';
    const isBuzoRedondo = item.category === 'Buzo Cuello Redondo';
    const isKids = item.age === 'chico';
    const isOversize = item.cut === 'oversize';

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

    return item.isDouble ? basePrices.doble : basePrices.simple;
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

function isCustomCartItem(item) {
    const product = db.find(p => Number(p?.id) === Number(item?.id));
    return Boolean(item?.isCustom) || normalizeText(product?.category || '') === 'personalizados';
}

function getCustomDesignKey(item) {
    if (!isCustomCartItem(item)) return '';

    const explicitDesignId = String(item?.designId || '').trim();
    const fallbackIdentity = normalizeText(
        item?.productName || item?.frontName || item?.code || String(item?.id || '')
    );
    const customization = normalizeText(item?.customizationText || '');
    const designIdentity = explicitDesignId || fallbackIdentity || String(item?.id || 'personalizado');

    return `${designIdentity}::${customization || 'catalogo'}`;
}

function getCustomExtraAssignments(items) {
    const chargedDesigns = new Set();

    return items.map(item => {
        const designKey = getCustomDesignKey(item);
        if (!designKey || chargedDesigns.has(designKey)) return 0;

        chargedDesigns.add(designKey);
        return PERSONALIZADO_EXTRA;
    });
}

function calculateCartItemPrices(items) {
    const customExtras = getCustomExtraAssignments(items);
    return items.map((item, index) => calculateItemBasePrice(item) + customExtras[index]);
}

function calculateCartSubtotal(items) {
    return calculateCartItemPrices(items).reduce((sum, price) => sum + price, 0);
}

function calculateCustomExtraSubtotal(items) {
    return getCustomExtraAssignments(items).reduce((sum, extra) => sum + extra, 0);
}

function calculateDiscountableSubtotal(items) {
    return Math.max(0, calculateCartSubtotal(items) - calculateCustomExtraSubtotal(items));
}

function calculateWinterPromotion(items) {
    const quantity = items.length;
    const rawSubtotal = calculateCartSubtotal(items);
    const discountableSubtotal = calculateDiscountableSubtotal(items);

    if (quantity >= 3) {
        const discount = discountableSubtotal * 0.10;
        return {
            id: 'general_3_plus',
            label: '3 prendas o más: 10% OFF + envío gratis a domicilio',
            description: 'Los diseños personalizados tienen un adicional de $5.000 por diseño. Ese adicional no recibe descuentos promocionales.',
            subtotal: rawSubtotal,
            descuento: discount,
            total: rawSubtotal - discount,
            envioGratis: true,
            envioGratisPuntoAndreani: false
        };
    }

    if (quantity >= 1) {
        return {
            id: 'agosto_desde_una_prenda',
            label: 'Promo agosto: envío gratis a punto de retiro Andreani',
            description: 'Beneficio vigente desde una prenda. Elegí el punto de retiro Andreani que te quede más cómodo.',
            subtotal: rawSubtotal,
            descuento: 0,
            total: rawSubtotal,
            envioGratis: true,
            envioGratisPuntoAndreani: true
        };
    }

    return {
        id: 'sin_promo',
        label: '',
        description: '',
        subtotal: rawSubtotal,
        descuento: 0,
        total: rawSubtotal,
        envioGratis: false,
        envioGratisPuntoAndreani: false
    };
}

function calculateCartTotal() {
    const items = cart.getCart();
    const cantidad = items.length;
    const promotion = calculateWinterPromotion(items);

    return {
        subtotal: promotion.subtotal,
        envio: 0, // No sumamos envío fijo, es dinámico
        envioGratis: promotion.envioGratis,
        envioGratisPuntoAndreani: promotion.envioGratisPuntoAndreani,
        descuento: promotion.descuento,
        total: promotion.total, // Total SIN envío a domicilio
        cantidad,
        promotion
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
                <h3>Tu pedido está vacío</h3>
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
    const itemPrices = calculateCartItemPrices(items);
    body.innerHTML = items.map((item, idx) => {
        const img = getProductImage(item.id, item.variantIndex);
        const precio = itemPrices[idx];
        const edad = item.age === 'chico' ? 'Niño' : 'Adulto';
        const talle = item.size || 'Por confirmar';
        const corte = item.publicGarmentLabel || (isBuzoRedondoItem(item)
            ? 'Buzo cuello redondo oversize unisex'
            : isHoodieItem(item)
                ? 'Hoodie oversize unisex'
                : item.age === 'chico'
                    ? 'Remera niños'
                    : item.cut === 'oversize'
                        ? 'Remera oversize unisex'
                        : item.cut === 'mujer'
                            ? 'Remera clásica mujer'
                            : 'Remera clásica hombre');
        const color = item.color === 'blanco' ? 'Blanca' : 'Negra';
        
        return `
            <div class="cart-preview-item" data-cart-item-index="${idx}" tabindex="-1">
                <img src="${img}" alt="${item.productName}" class="cart-preview-item-img" 
                     onerror="this.src='images/logo/MARCA DE AGUA.png'">
                <div class="cart-preview-item-info">
                    <div class="cart-preview-item-code">${item.code}</div>
                    <div class="cart-preview-item-name">${item.productName}</div>
                    ${item.variantName && item.variantName !== item.productName ? 
                        `<div class="cart-preview-item-variant">${item.variantName}</div>` : ''}
                    ${item.isDouble ? '<span class="cart-preview-item-double">Frente y dorso</span>' : ''}
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
    if (totals.promotion?.id && totals.promotion.id !== 'sin_promo') {
        const extra = totals.envioGratisPuntoAndreani
            ? ' Envío gratis a punto Andreani; a domicilio se abona diferencia.'
            : ' Envío gratis a domicilio.';
        shippingNote = `<div class="cart-preview-shipping-note">🎁 ${totals.promotion.label}.${extra}</div>`;
    }

    const deliverySelector = `
        <div class="cart-customer-fields cart-delivery-checkout" id="cartDeliveryGroup">
            <p class="cart-customer-title">Forma de entrega</p>
            <div class="modal-delivery-options">
                <button type="button" class="option-btn modal-delivery-btn ${selectedDeliveryMethod === 'retiro_andreani' ? 'active' : ''}" data-order-delivery data-delivery="retiro_andreani" onclick="selectDeliveryMethod('retiro_andreani')">Punto de retiro Andreani · GRATIS</button>
                <button type="button" class="option-btn modal-delivery-btn ${selectedDeliveryMethod === 'domicilio' ? 'active' : ''}" data-order-delivery data-delivery="domicilio" onclick="selectDeliveryMethod('domicilio')">Envío Andreani a domicilio</button>
                <button type="button" class="option-btn modal-delivery-btn ${selectedDeliveryMethod === 'taller' ? 'active' : ''}" data-order-delivery data-delivery="taller" onclick="selectDeliveryMethod('taller')">Retiro sin cargo en Villa Martelli</button>
            </div>
            <p class="cart-customer-hint">Elegí una opción para completar los datos necesarios del pedido.</p>
        </div>`;

    const standardIdentityFields = `
        <div class="cart-customer-grid">
            <div class="cart-cp-field"><label for="inputNombre">Nombre</label><input type="text" id="inputNombre" placeholder="Ej: Juan" autocomplete="given-name"></div>
            <div class="cart-cp-field"><label for="inputApellido">Apellido</label><input type="text" id="inputApellido" placeholder="Ej: Pérez" autocomplete="family-name"></div>
        </div>
        <div class="cart-customer-grid single">
            <div class="cart-cp-field"><label for="inputTelefono">Teléfono</label><input type="text" id="inputTelefono" placeholder="Ej: 11 1234 5678" inputmode="tel" autocomplete="tel"></div>
        </div>`;
    const identityFields = selectedDeliveryMethod === 'retiro_andreani'
        ? `<div class="cart-customer-grid single">
            <div class="cart-cp-field"><label for="inputNombre">Nombre completo</label><input type="text" id="inputNombre" placeholder="Ej: Juan Pérez" autocomplete="name"></div>
        </div>`
        : selectedDeliveryMethod === 'taller'
            ? `<div class="cart-customer-grid single">
                <div class="cart-cp-field"><label for="inputNombre">Nombre y apellido</label><input type="text" id="inputNombre" placeholder="Ej: Juan Pérez" autocomplete="name"></div>
            </div>`
            : standardIdentityFields;

    let logisticsFields = '';
    let customerHint = '';
    if (selectedDeliveryMethod === 'domicilio') {
        logisticsFields = `
            <div class="cart-customer-grid single"><div class="cart-cp-field"><label for="inputDireccion">Dirección</label><input type="text" id="inputDireccion" placeholder="Ej: Av. Corrientes 1234" autocomplete="street-address"></div></div>
            <div class="cart-customer-grid">
                <div class="cart-cp-field"><label for="inputCP">Código postal</label><input type="text" id="inputCP" placeholder="Ej: 1425" maxlength="8" inputmode="numeric" autocomplete="postal-code"></div>
                <div class="cart-cp-field"><label for="inputLocalidad">Localidad</label><input type="text" id="inputLocalidad" placeholder="Ej: CABA" autocomplete="address-level2"></div>
            </div>
            <div class="cart-customer-grid single"><div class="cart-cp-field"><label for="inputProvincia">Provincia</label><input type="text" id="inputProvincia" placeholder="Ej: Buenos Aires" autocomplete="address-level1"></div></div>`;
        customerHint = totals.cantidad >= 3
            ? 'Con 3 prendas o más tenés 10% OFF y envío gratis a domicilio.'
            : 'El costo del envío a domicilio se confirma según el código postal.';
    } else if (selectedDeliveryMethod === 'retiro_andreani') {
        logisticsFields = `
            <div class="cart-customer-grid">
                <div class="cart-cp-field"><label for="inputCP">Código postal</label><input type="text" id="inputCP" placeholder="Ej: 1425" maxlength="8" inputmode="numeric" autocomplete="postal-code"><small>Lo usamos para encontrar el punto Andreani más conveniente.</small></div>
                <div class="cart-cp-field"><label for="inputLocalidad">Localidad</label><input type="text" id="inputLocalidad" placeholder="Ej: CABA" autocomplete="address-level2"></div>
            </div>`;
        customerHint = 'Envío gratis a punto de retiro Andreani desde 1 prenda.';
    } else if (selectedDeliveryMethod === 'taller') {
        customerHint = 'Villa Martelli, zona Tecnópolis · Lunes a viernes de 10 a 16 h. La dirección se coordina por WhatsApp.';
    }

    const shippingForm = selectedDeliveryMethod ? `
        <div class="cart-customer-fields ${totals.cantidad >= 2 ? 'compact' : ''}" id="cartCustomerData">
            <p class="cart-customer-title">Datos del pedido</p>
            ${identityFields}
            ${logisticsFields}
            <div class="cart-customer-actions"><button type="button" class="btn-clear-shipping" onclick="clearShippingCustomerData()">Limpiar datos</button></div>
            <p class="cart-customer-hint">${customerHint}</p>
        </div>` : `
        <div class="cart-customer-fields compact" id="cartCustomerData">
            <p class="cart-customer-hint">Elegí la forma de entrega para continuar.</p>
        </div>`;

    const shippingStatus = !selectedDeliveryMethod
        ? 'Elegí una forma de entrega'
        : selectedDeliveryMethod === 'taller'
            ? '<span style="color:var(--magic-green);">RETIRO SIN CARGO ✓</span>'
            : selectedDeliveryMethod === 'retiro_andreani'
                ? '<span style="color:var(--magic-green);">GRATIS a punto Andreani ✓</span>'
                : totals.cantidad >= 3
                    ? '<span style="color:var(--magic-green);">GRATIS a domicilio ✓</span>'
                    : 'A confirmar según código postal';
    
    footer.innerHTML = `
        <div class="cart-preview-summary">
            <div class="cart-preview-summary-row">
                <span>Subtotal (${totals.cantidad} ${totals.cantidad === 1 ? 'prenda' : 'prendas'})</span>
                <span class="value">$${totals.subtotal.toLocaleString('es-AR')}</span>
            </div>
            ${totals.descuento > 0 ? `
                <div class="cart-preview-summary-row">
                    <span>Descuento 10% (3 prendas o más)</span>
                    <span class="value" style="color: var(--magic-green);">-$${totals.descuento.toLocaleString('es-AR')}</span>
                </div>
            ` : ''}
            ${totals.promotion?.id && totals.promotion.id !== 'sin_promo' ? `
                <div class="cart-preview-summary-row">
                    <span>Promo aplicada</span>
                    <span class="value" style="color: var(--magic-green);">${totals.promotion.label}</span>
                </div>
            ` : ''}
            <div class="cart-preview-summary-row">
                <span>Envío</span>
                <span class="value">${shippingStatus}</span>
            </div>
            <div class="cart-preview-summary-row total">
                <span>Total${selectedDeliveryMethod === 'domicilio' && totals.cantidad < 3 ? ' (sin envío)' : ''}</span>
                <span class="value">$${totals.total.toLocaleString('es-AR')}</span>
            </div>
        </div>
        ${shippingNote}
        ${deliverySelector}
        ${shippingForm}
        <div class="cart-preview-info" style="margin-top:12px;padding:12px;background:#0a0a0a;border:1px solid #222;border-radius:8px;font-size:0.8rem;color:#888;">
            <div style="margin-bottom:8px;">
                <span style="color:#39ff14;">📦 PROMO AGOSTO:</span> Desde 1 prenda: envío gratis a punto de retiro Andreani. Desde 3 prendas: 10% OFF + envío gratis a domicilio.
            </div>
            <div>
                <span style="color:#39ff14;">💳 PAGO:</span> Transferencia o MercadoPago. Tarjeta de crédito disponible con recargo.
            </div>
        </div>
        <div class="cart-preview-actions">
            <button class="btn-preview-continue" onclick="closeCartPreview()">
                ← Seguir eligiendo
            </button>
            <button class="btn-preview-continue" onclick="consultFirstViaWhatsapp()">
                Consultar primero
            </button>
            <button class="btn-preview-whatsapp" id="btnConfirmCartWhatsapp" onclick="confirmAndSendWhatsapp()">
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
    const incompleteSizeIndex = cart.getCart().findIndex(item => !String(item?.size || '').trim());
    if (incompleteSizeIndex >= 0) {
        const incompleteItem = cart.getCart()[incompleteSizeIndex];
        showNotification(`Elegí el talle de ${incompleteItem.productName} para continuar.`, 3500);
        const itemElement = document.querySelector(`[data-cart-item-index="${incompleteSizeIndex}"]`);
        itemElement?.classList.add('field-required-error');
        itemElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        updateCheckoutWhatsappAvailability();
        return;
    }

    if (!selectedDeliveryMethod) {
        showNotification('Elegí una forma de entrega para continuar.', 3000);
        const group = document.getElementById('cartDeliveryGroup');
        group?.classList.add('field-required-error');
        group?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => group?.querySelector('button')?.focus({ preventScroll: true }), 250);
        return;
    }

    const customerData = getShippingCustomerData();
    const missing = getMissingShippingFields(customerData, selectedDeliveryMethod);

    if (missing.length) {
        const labels = missing.map(getShippingFieldLabel).join(', ');
        const message = missing[0] === 'cp'
            ? 'Ingresá un código postal válido para continuar.'
            : `Completá los datos del pedido: ${labels}.`;
        showNotification(message, 3500);
        focusFirstMissingShippingField(missing[0]);
        updateCheckoutWhatsappAvailability();
        return;
    }

    saveShippingCustomerDataToStorage(customerData);
    closeCartPreview();
    sendViaWhatsapp(selectedDeliveryMethod === 'taller' ? '' : customerData.cp, customerData);
}

function consultFirstViaWhatsapp() {
    const summary = cart.generateConsultationSummary();
    const customerData = getShippingCustomerData();
    const hasCustomerData = Object.values(customerData).some(Boolean);
    const partialShippingContext = hasCustomerData ? buildCustomerDataForWhatsapp(customerData) : '';
    const message = `Hola FMD! Quiero consultar antes de confirmar este pedido:\n\n${summary}${partialShippingContext}\n\n¿Me confirmás cómo avanzamos?`;
    saveShippingCustomerDataToStorage(customerData);
    closeCartPreview();
    openWhatsapp(message, 'cart_consulta');
}

function toggleCartPanel() {
    cart.togglePanel();
}

function getModalGarmentLabel(product = currentProduct) {
    if (selectedModalGarment === 'hoodie') return 'Hoodie canguro oversize unisex';
    if (selectedModalGarment === 'buzo') return 'Buzo cuello redondo oversize unisex';
    if (selectedModalGarment === 'oversize') return 'Remera oversize unisex';
    if (selectedModalGarment === 'mujer') return 'Remera clásica mujer';
    const garmentCategory = getActiveGarmentCategory(product);
    const isHoodie = garmentCategory === 'Hoodies FMD' || garmentCategory === 'Hoodies Otras Bandas';
    const isBuzoRedondo = garmentCategory === 'Buzo Cuello Redondo';

    if (isBuzoRedondo) return 'Buzo cuello redondo oversize unisex';
    if (isHoodie) return 'Hoodie canguro oversize unisex';
    if (selectedCut === 'oversize') return 'Remera oversize unisex';
    if (selectedCut === 'mujer') return 'Remera clásica mujer';
    if (selectedAge === 'chico') return 'Remera chicos';
    return 'Remera clásica hombre';
}

function getSelectedBackLabelForWhatsapp() {
    if (selectedCatalogBackRef) return selectedCatalogBackRef.label;
    if (selectedBackIndex >= 0 && currentProduct?.variants?.[selectedBackIndex]) {
        return currentProduct.variants[selectedBackIndex].name;
    }

    const customInput = (document.getElementById('dorsoCustomInput')?.value || '').trim();
    const parts = [];
    if (selectedDorsoChips?.size) parts.push(Array.from(selectedDorsoChips).join(' + '));
    if (selectedBacks?.size) parts.push(Array.from(selectedBacks).join(' | '));
    if (customInput) parts.push(customInput);

    return parts.length ? parts.join(' / ') : 'A definir por WhatsApp';
}

function buildModalConsultationWhatsappMessage() {
    if (!currentProduct) return buildWhatsappFallbackMessage();

    const images = getModalImages();
    const activeVariantIndex = getActiveVariantIndex();
    const activeVariant = images?.[currentSlide];
    const variantName = activeVariant?.name?.trim() || '';
    const displayName = currentCatalogDesign?.publicName || getProductDisplayName(currentProduct, variantName);
    const code = currentCatalogDesign?.orderCodeBase
        || cart.generateCode(currentProduct.id, activeVariantIndex, isDoubleSelectionActive(currentProduct));
    const designHash = currentCatalogDesign?.designId
        ? `#diseno-${encodeURIComponent(currentCatalogDesign.designId)}`
        : `#producto-${encodeURIComponent(currentProduct.id)}`;
    const designLink = `${BASE_URL}${designHash}`;

    return [
        'Hola FMD! Quiero consultar por este diseño:',
        '',
        `Diseño: ${displayName}`,
        `Código: ${code}`,
        `Link del diseño: ${designLink}`,
        '',
        '¿Me cuentan qué opciones tengo?'
    ].filter(Boolean).join('\n');
}

function consultCurrentDesign() {
    if (!currentProduct) return;
    openWhatsapp(buildModalConsultationWhatsappMessage(), 'modal_consultar_diseno');
}

function addToCartFromModal() {
    if (!currentProduct) return false;

    if (!validateModalSelectionsBeforeWhatsapp()) return false;

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
    const isDouble = isDoubleSelectionActive(currentProduct);
    const isCustom = isPersonalizedSelection(currentProduct);
    const variantIndex = getActiveVariantIndex();
    
    const options = {
        age: selectedAge,
        size: selectedSize,
        cut: selectedCut,
        color: selectedColor,
        category: garmentCategory,
        backIndex: selectedBackIndex, // índice del dorso seleccionado
        isCustom: isCustom,
        designId: currentCatalogDesign?.designId || '',
        customizationText: (document.getElementById('dorsoCustomInput')?.value || '').trim(),
        publicGarmentLabel: usesBandLandingShownComposition() ? getModalGarmentLabel(currentProduct) : '',
        designName: currentCatalogDesign?.publicName || '',
        orderCodeBase: currentCatalogDesign?.orderCodeBase || '',
        usesShownComposition: isDouble && usesBandLandingShownComposition(),
        backName: selectedCatalogBackRef?.label || '',
        backCode: selectedCatalogBackRef
            ? cart.generateCode(selectedCatalogBackRef.productId, selectedCatalogBackRef.variantIndex)
            : ''
    };
    
    const success = cart.addToCart(currentProduct.id, variantIndex, isDouble, options);
    
    if (success) {
        const prices = resolveModalPriceConfig(currentProduct);
        trackCatalogEvent('add_to_cart', {
            band: currentCatalogDesign?.band || getCatalogBandLabel(currentProduct),
            design_id: currentCatalogDesign?.designId,
            design_name: currentCatalogDesign?.publicName || currentProduct.name,
            garment: getSelectedModalGarmentType(),
            garment_variant: getSelectedModalGarmentType() === 'remera' ? getSelectedRemeraVariantId() : undefined,
            print_mode: isDouble ? 'double' : 'simple',
            value: isDouble ? prices.doble : prices.simple,
            currency: 'ARS',
            cart_items: cart.getCart().length
        });
        const msg = options.usesShownComposition
            ? '✓ Agregado con la composición mostrada'
            : isDouble && (selectedBackIndex >= 0 || selectedCatalogBackRef)
            ? '✓ Agregado con frente y dorso'
            : (isDouble ? '✓ Agregado (dorso a definir)' : '✓ Agregado al pedido');
        showNotification(msg, 2000);
    }
    
    return success;
}

function addToOrderAndOpenCart() {
    if (!addToCartFromModal()) return;
    closeModal(false, false);
    openCartPreview();
}

// Compatibilidad con botones guardados en HTML anterior.
function addToCartAndOpenWhatsapp() {
    addToOrderAndOpenCart();
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
        .filter(p => isProductInCatalogScope(p) && matchesCategoryOrMetadata(p, category) && p.id !== currentProduct.id)
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
    if (hash.startsWith('diseno-')) {
        const designId = hash.slice('diseno-'.length);
        const design = catalogDesignById.get(designId);
        if (design && isCatalogDesignInScope(design)) openCatalogDesign(designId);
    } else if (hash.startsWith('producto-')) {
        const productId = parseInt(hash.split('-')[1]);
        const product = db.find(p => p.id === productId);
        if (product && isProductInCatalogScope(product)) {
            currentProduct = product;
            currentSlide = 0;
            updateShareLinks();
            openModal(productId);
        }
    }
}

// Cargar categoría desde URL query param (?cat=HoodiesFMD)
function loadCategoryFromURL() {
    if (isBandLandingMode()) return;
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

        const results = ENABLE_CATALOG_DESIGN_RENDER
            ? catalogDesigns.filter(design => getCatalogDesignSearchText(design).includes(normalizeText(query))).slice(0, 8)
            : getSearchResults(query, db, true).slice(0, 8);
        
        if (results.length === 0) {
            searchModalResults.innerHTML = '<div class="search-empty">Sin resultados para "' + e.target.value + '"</div>';
            return;
        }
        
        searchModalResults.innerHTML = ENABLE_CATALOG_DESIGN_RENDER
            ? results.map(design => `
                <div class="search-result-item" onclick="openCatalogDesign('${design.designId}'); document.getElementById('searchModal').classList.remove('active');">
                    <div class="search-result-name">${design.publicName}</div>
                    <div class="search-result-meta">${design.band} · Desde $${getCatalogDesignStartingPrice(design).toLocaleString('es-AR')}</div>
                </div>
            `).join('')
            : results.map(p => `
                <div class="search-result-item" onclick="openModal(${p.id}${typeof p.matchedVariantIndex === 'number' ? ', ' + p.matchedVariantIndex : ''}); document.getElementById('searchModal').classList.remove('active');">
                    <div class="search-result-name">${p.name}</div>
                    <div class="search-result-meta">${formatCategoryMeta(getPublicProductYear(p), getPublicProductCategoryLabel(p))}${typeof p.matchedVariantIndex === 'number' && p.variants?.[p.matchedVariantIndex] ? ' · ' + p.variants[p.matchedVariantIndex].name : ''}</div>
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
    currentUniverse = null;
    currentGarmentFilter = null;
    currentCategory = category;
    if (normalizeText(currentCategory) !== 'epica') epicaGarmentPreference = null;
    slayerGarmentPreference = null;
    if (normalizeText(currentCategory) !== 'iron maiden') maidenGarmentPreference = null;
    resetCatalogPagination();
    if (normalizeText(category) === 'megadeth') {
        megadethGarmentPreference = getActiveMegadethGarmentPreference();
        megadethSegmentPreference = 'all';
        megadethVisibleLimit = MEGADETH_PAGE_SIZE;
        renderMegadethArchiveGrid();
    }
    if (normalizeText(category) === 'iron maiden') {
        maidenGarmentPreference = null;
        renderMaidenArchiveGrid();
    }
    syncCatalogQuickFilters(category);
    filterProducts();
    
    // Scroll al catálogo
    const catalogToolbar = document.querySelector('.catalog-toolbar');
    if (catalogToolbar) {
        catalogToolbar.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}
// Exponer globalmente para onclick
window.filterByCategory = filterByCategory;

function filterByGarment(garment) {
    currentGarmentFilter = ['remera', 'hoodie', 'buzo', 'abrigo'].includes(garment) ? garment : null;
    currentUniverse = null;
    currentCategory = null;
    currentSearch = '';
    if (searchInput) searchInput.value = '';
    if (searchClear) searchClear.classList.remove('visible');
    resetCatalogPagination();
    document.querySelectorAll('.cat-btn, .filter-pill').forEach(button => button.classList.remove('active'));
    syncCatalogQuickFilters(null);
    filterProducts();
    scrollToSection('catalogoPrincipal');
}

window.filterByGarment = filterByGarment;

function filterOuterwearByBand(band) {
    currentGarmentFilter = 'abrigo';
    currentUniverse = null;
    currentCategory = band || null;
    currentSearch = '';
    if (searchInput) searchInput.value = '';
    if (searchClear) searchClear.classList.remove('visible');
    resetCatalogPagination();
    document.querySelectorAll('.cat-btn, .filter-pill').forEach(button => button.classList.remove('active'));
    syncCatalogQuickFilters(band);
    filterProducts();
    scrollToSection('catalogoPrincipal');
}

window.filterOuterwearByBand = filterOuterwearByBand;

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
        const faceBadge = p.mgxHasBack ? 'Frente' : 'Diseño único';
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
    renderLandingSizeGuide('hombre');

    if (isBandLandingMode()) {
        trackCatalogEvent('archive_view', {
            band: BAND_LANDING_BAND,
            archive_slug: BAND_LANDING_CONFIG?.slug,
            default_garment: bandLandingGarment
        });
    }

    const heroCtaWhatsapp = document.getElementById('heroCtaWhatsapp');
    if (heroCtaWhatsapp) {
        heroCtaWhatsapp.addEventListener('click', (e) => {
            e.preventDefault();
            openWhatsapp('Hola FMD! Quiero pedir un diseño personalizado.\n\nFormato: Buzo / Hoodie / Remera\nDiseño o referencia: ___\nBanda: ___\nTalle: ___\nColor: ___\nCódigo postal si necesito envío: ___\n\n¿Me confirmás precio final y envío?', 'hero_general');
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
            openWhatsapp('Hola FMD! Quiero pedir un diseño de Iron Maiden.\n\nFormato: Remera / Hoodie / Buzo\nDiseño: ___\nTalle: ___\nColor: ___\nCódigo postal si necesito envío: ___\n\n¿Me confirmás precio final y envío?', 'maiden_archive');
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
            openWhatsapp('Hola FMD! Quiero pedir un diseño de Slayer.\n\nFormato: Remera / Hoodie / Buzo cuello redondo\nDiseño: ___\nTalle: ___\nColor: ___\nCódigo postal si necesito envío: ___\n\n¿Me confirmás precio final y envío?', 'slayer_archive');
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

    loadProducts();
    setView('grid');
    initSearchModal();
    initCountdown();
    initFmd3dCarousels();
});

// Escuchar cambios en hash (si usuario navega directamente a #producto-123)
window.addEventListener('hashchange', loadProductFromHash);
