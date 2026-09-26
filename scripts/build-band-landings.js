const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const INDEX_PATH = path.join(ROOT, 'index.html');
const SITEMAP_PATH = path.join(ROOT, 'sitemap.xml');
const LANDINGS = require(path.join(ROOT, 'js', 'band-archives-config.js'));

function renderSitemap() {
    const lastmod = new Date().toISOString().slice(0, 10);
    const landingEntries = LANDINGS.map(config => `  <url>
    <loc>${config.canonical}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://catalogo.fivemagicsdesigns.com/</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
${landingEntries}
</urlset>
`;
}

function extractSharedCommerceMarkup(source) {
    const startMarker = '    <div class="zoom-overlay" id="zoomOverlay">';
    const endMarker = '    <script src="js/band-archives-config.js" defer></script>';
    const start = source.indexOf(startMarker);
    const end = source.indexOf(endMarker);
    if (start < 0 || end < 0 || end <= start) {
        throw new Error('No se pudo extraer el modal compartido desde index.html.');
    }
    return source
        .slice(start, end)
        .replace(/\r\n?/g, '\n')
        .replace(/[ \t]+$/gm, '')
        .trim();
}

function serializeInlineConfig(config) {
    return JSON.stringify({
        band: config.band,
        slug: config.slug,
        defaultGarment: config.defaultGarment,
        defaultCollection: config.defaultCollection || '',
        usesShownComposition: config.usesShownComposition,
        usesShownCompositionGarments: Array.isArray(config.usesShownCompositionGarments)
            ? config.usesShownCompositionGarments
            : [],
        collections: Array.isArray(config.collections) ? config.collections : [],
        designOrder: Array.isArray(config.designOrder) ? config.designOrder : [],
        prominentAllDesigns: config.prominentAllDesigns && typeof config.prominentAllDesigns === 'object'
            ? config.prominentAllDesigns
            : null,
        retiredDesignIds: Array.isArray(config.retiredDesignIds) ? config.retiredDesignIds : [],
        curatedDesignCategories: config.curatedDesignCategories && typeof config.curatedDesignCategories === 'object'
            ? config.curatedDesignCategories
            : {},
        sharedDesignIds: Array.isArray(config.sharedDesignIds) ? config.sharedDesignIds : [],
        sharedBands: Array.isArray(config.sharedBands) ? config.sharedBands : [],
        albumOrder: Array.isArray(config.albumOrder) ? config.albumOrder : [],
        productionNotice: String(config.productionNotice || ''),
        modalBackCarouselDesignIds: Array.isArray(config.modalBackCarouselDesignIds)
            ? config.modalBackCarouselDesignIds
            : [],
        suppressNewBadges: config.suppressNewBadges === true,
        cardImageOverrides: config.cardImageOverrides && typeof config.cardImageOverrides === 'object'
            ? config.cardImageOverrides
            : {},
        editorialBadges: config.editorialBadges && typeof config.editorialBadges === 'object'
            ? config.editorialBadges
            : {},
        showcase: config.showcase && typeof config.showcase === 'object'
            ? config.showcase
            : null
    })
        .replace(/</g, '\\u003c');
}

function whatsappUrl(message) {
    return `https://wa.me/541169667685?text=${encodeURIComponent(message)}`;
}

function customizeSharedCommerceMarkup(config, markup) {
    if (!config.usesShownComposition) return markup;

    let output = markup
        .replace('🛒 Guardar en carrito', 'AGREGAR AL PEDIDO')
        .replace('<summary>Dorso y personalización</summary>', '<summary>Detalles del producto</summary>')
        .replace('<div class="spec-value">☢️ DTG Premium</div>', '<div class="spec-value" id="modalSpecPrint">☢️ DTG Premium</div>')
        .replace('<div class="spec-value">🖤 Sin tacto plástico</div>', '<div class="spec-value" id="modalSpecFabric">🖤 Algodón peinado</div>')
        .replace('<div class="spec-value">⚡ Algodón peinado</div>', '<div class="spec-value" id="modalSpecGarment">⚡ Remera clásica hombre</div>')
        .replace(/\s*<a href="#" class="btn-wa btn-wa-secondary" id="modalWaBtn">[\s\S]*?<\/a>/, '');

    return output;
}

function renderGarmentSelector(config) {
    if (config.showGarmentSelector === false) return '';

    return `        <section class="band-landing-garment-selector" id="catalogoPrincipal" aria-label="Elegir prenda ${config.band}">
            <div class="band-landing-garment-grid" role="tablist" aria-label="Prendas disponibles">
${config.garments.map((garment, index) => `
                <button type="button" class="band-landing-garment-card${garment.key === config.defaultGarment ? ' active' : ''}" data-band-landing-garment="${garment.key}" role="tab" aria-selected="${garment.key === config.defaultGarment ? 'true' : 'false'}" onclick="selectBandLandingGarment('${garment.key}')">
                    <span class="band-landing-garment-media">
                        <img src="${garment.image}" alt="${garment.alt}" loading="${index === 0 ? 'eager' : 'lazy'}" decoding="async">
                    </span>
                    <span class="band-landing-garment-copy">
                        <strong>${garment.title}</strong>
                        <span>${garment.price}</span>
                        <span class="band-landing-garment-cta">VER DISEÑOS</span>
                    </span>
                </button>`).join('')}
            </div>
        </section>`;
}

function renderCatalogSection(config, collections, completeArchive) {
    return `        <section class="band-landing-catalog"${config.showGarmentSelector === false ? ' id="catalogoPrincipal"' : ''} aria-labelledby="bandCatalogTitle">
            <div class="band-landing-section-head">
                <p>ARCHIVO FMD</p>
                <h2 id="bandCatalogTitle">DISEÑOS DE ${config.displayName}</h2>
                <div class="band-landing-design-note">
                    <strong>TU DISEÑO, TU PRENDA</strong>
                    <span>Remeras, hoodies y buzos con diseño solo al frente o frente y dorso.</span>
                </div>
            </div>
            <nav id="categoryNav" hidden aria-hidden="true"></nav>
${completeArchive ? `            <div class="band-landing-all-designs">
                <div>
                    <span>${completeArchive.kicker || 'CATÁLOGO COMPLETO'}</span>
                    <strong>${completeArchive.copy || `Explorá todos los diseños de ${config.band}.`}</strong>
                </div>
                <button type="button" data-band-landing-collection="" onclick="selectBandLandingCollection('')">${completeArchive.label || 'VER TODOS LOS DISEÑOS'} <span data-collection-count=""></span></button>
            </div>` : ''}
${collections.length ? `            <div class="band-landing-collections" id="bandLandingCollections" aria-label="Explorar ${config.band} por colección">
${!completeArchive || config.band === 'Helloween' ? `                <button type="button" class="band-landing-collection-btn${config.defaultCollection ? '' : ' active'}" data-band-landing-collection="" onclick="selectBandLandingCollection('')">${config.allCollectionLabel || 'TODOS'} <span data-collection-count=""></span></button>` : ''}
${collections.map(collection => `                <button type="button" class="band-landing-collection-btn${config.defaultCollection === collection.id ? ' active' : ''}" data-band-landing-collection="${collection.id}" onclick="selectBandLandingCollection('${collection.id}')">${collection.label} <span data-collection-count="${collection.id}"></span></button>`).join('\n')}
            </div>` : ''}
            <div class="catalog-toolbar">
                <button type="button" id="megadethBackBtn" hidden></button>
                <button type="button" id="slayerBackBtn" hidden></button>
                <button type="button" id="maidenBackBtn" hidden></button>
                <div class="search-box">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="M21 21l-4.35-4.35"></path>
                    </svg>
                    <input type="text" id="searchInput" placeholder="Buscar un diseño de ${config.band}..." aria-label="Buscar diseños de ${config.band}">
                    <button class="search-clear" id="searchClear" aria-label="Limpiar búsqueda">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18" aria-hidden="true">
                            <path d="M18 6L6 18M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                <div class="band-filters band-landing-hidden-controls" aria-hidden="true">
                    <button type="button" id="filterToggle" tabindex="-1">Filtros</button>
                    <div id="filterDropdown"></div>
                </div>
                <div class="toolbar-row">
                    <span class="products-count" id="productsCount">DISEÑOS ${config.displayName}</span>
                    <div class="view-toggle band-landing-hidden-controls" aria-hidden="true">
                        <button type="button" class="view-btn active" id="viewGrid" tabindex="-1">Grilla</button>
                        <button type="button" class="view-btn" id="viewGallery" tabindex="-1">Lista</button>
                    </div>
                </div>
                <div class="search-results-info" id="searchResultsInfo"></div>
            </div>

            <section class="products-section" aria-live="polite">
                <div class="products-grid" id="productsGrid"></div>
                <div class="catalog-load-more" id="catalogLoadMore" hidden>
                    <p id="catalogLoadMoreStatus"></p>
                    <button type="button" onclick="loadMoreCatalogDesigns()">VER MÁS DISEÑOS</button>
                </div>
            </section>
        </section>`;
}

function renderLanding(config, sharedCommerceMarkup) {
    const commerceMarkup = customizeSharedCommerceMarkup(config, sharedCommerceMarkup);
    const collections = Array.isArray(config.collections) ? config.collections : [];
    const postShow = config.postShow && typeof config.postShow === 'object' ? config.postShow : null;
    const postShowFeatured = postShow?.featured && typeof postShow.featured === 'object'
        ? postShow.featured
        : null;
    const postShowFeaturedImages = Array.isArray(postShowFeatured?.images) && postShowFeatured.images.length
        ? postShowFeatured.images
        : postShowFeatured
            ? [
                { src: postShowFeatured.frontImage, alt: 'Eagle Fly Free, estampa frontal', label: 'FRENTE' },
                { src: postShowFeatured.backImage, alt: 'Eagle Fly Free, dorso conmemorativo Buenos Aires 2026', label: 'DORSO BUENOS AIRES 2026' }
            ]
            : [];
    const postShowFeaturedGroups = Array.isArray(postShowFeatured?.groups)
        ? postShowFeatured.groups.filter(group => Array.isArray(group.images) && group.images.length)
        : [];
    const postShowFeaturedCtas = Array.isArray(postShowFeatured?.ctas) && postShowFeatured.ctas.length
        ? postShowFeatured.ctas
        : postShowFeatured
            ? [{ designId: postShowFeatured.designId, label: postShowFeatured.ctaLabel }]
            : [];
    const eventDay = config.eventDay && typeof config.eventDay === 'object' ? config.eventDay : null;
    const instagram = config.instagram && typeof config.instagram === 'object' ? config.instagram : null;
    const finishedGarments = Array.isArray(config.finishedGarments) ? config.finishedGarments : [];
    const shippingPromoMarkup = config.hideShippingPromo ? '' : `        <section class="july-shipping-promo purchase-volume-promo" aria-label="Promoción por cantidad">
            <p>${config.promoKicker || 'PROMO SEPTIEMBRE'}</p>
            <strong>${config.promoTitle || 'SUMÁ PRENDAS <em>Y APROVECHÁ EL ENVÍO</em>'}</strong>
            <div class="shipping-promo-options">
                <span><b>1 PRENDA</b><em>Envío a sucursal Andreani: $5.000</em><em>Envío a domicilio: $8.000</em></span>
                <span><b>2 PRENDAS</b><em>Envío gratis a sucursal Andreani</em><em>Envío a domicilio: $5.000</em></span>
                <span class="is-best"><b>3 PRENDAS O MÁS · 10% OFF</b><em>Envío gratis a sucursal Andreani</em><em>Envío gratis a domicilio</em></span>
            </div>
        </section>`;
    const completeArchive = config.prominentAllDesigns || (collections.length ? {
        kicker: 'CATÁLOGO COMPLETO',
        label: 'VER TODOS LOS DISEÑOS',
        copy: `Explorá todos los diseños de ${config.band}.`
    } : null);
    const garmentSelectorMarkup = renderGarmentSelector(config);
    const catalogMarkup = renderCatalogSection(config, collections, completeArchive);
    const catalogFirst = config.band === 'Helloween';
    const showcaseFirst = catalogFirst || config.showcaseFirst === true;
    const showcaseMarkup = config.showcase ? `
        <section class="band-design-showcase" id="bandDesignShowcase" aria-labelledby="bandDesignShowcaseTitle">
            <div class="band-design-showcase-head">
                <h2 id="bandDesignShowcaseTitle">${config.showcase.title}</h2>
                <p>${config.showcase.copy}</p>
            </div>
            <div class="band-design-showcase-viewport" id="bandDesignShowcaseViewport" aria-live="off">
                <div class="band-design-showcase-track" id="bandDesignShowcaseTrack"></div>
            </div>
            <button type="button" class="band-design-showcase-cta" onclick="openBandShowcaseCollection()">${config.showcase.ctaLabel}</button>
        </section>` : '';
    const featuredCollection = config.featuredCollection && typeof config.featuredCollection === 'object'
        ? config.featuredCollection
        : null;
    const featuredCollectionCards = Array.isArray(featuredCollection?.cards) ? featuredCollection.cards : [];
    const featuredCollectionMarkup = featuredCollection && featuredCollectionCards.length ? `
        <section class="band-featured-collection" aria-labelledby="bandFeaturedCollectionTitle">
            <div class="band-featured-collection-head">
                <p>${featuredCollection.kicker}</p>
                <h2 id="bandFeaturedCollectionTitle">${featuredCollection.title}</h2>
                <span>${featuredCollection.copy}</span>
            </div>
            <div class="band-featured-collection-grid">
${featuredCollectionCards.map((card, index) => `                <button type="button" class="band-featured-collection-card" onclick="openCatalogDesign('${card.designId}', 'remera')" aria-label="Ver ${card.label}">
                    <img src="${card.image}" alt="${card.label} de ${config.band}" loading="${index < 2 ? 'eager' : 'lazy'}" decoding="async">
                    <strong>${card.label}</strong>
                </button>`).join('\n')}
            </div>
            <p class="band-featured-collection-note">${featuredCollection.note}</p>
            <button type="button" class="band-featured-collection-cta" onclick="showBandLandingFeaturedCollection('${featuredCollection.query}')">${featuredCollection.ctaLabel}</button>
        </section>` : '';
    const campaignFeature = config.campaignFeature && typeof config.campaignFeature === 'object'
        ? config.campaignFeature
        : null;
    const campaignFeatureImages = Array.isArray(campaignFeature?.images) ? campaignFeature.images : [];
    const campaignFeatureMarkup = campaignFeature && campaignFeature.designId && campaignFeatureImages.length ? `
        <section class="band-campaign-feature band-campaign-feature--${campaignFeature.theme || 'default'}" id="bandCampaignFeature" data-design-id="${campaignFeature.designId}" aria-labelledby="bandCampaignFeatureTitle">
            <div class="band-campaign-feature-head">
                <p>${campaignFeature.kicker}</p>
                <h2 id="bandCampaignFeatureTitle">${campaignFeature.title}</h2>
                <span>${campaignFeature.copy}</span>
            </div>
            <div class="band-campaign-feature-gallery">
${campaignFeatureImages.map((image, index) => `                <button type="button" class="band-campaign-feature-card${image.primary ? ' is-primary' : ''}" onclick="openCatalogDesignPreview('${campaignFeature.designId}', 'remera', '${image.printMode || 'simple'}', '${image.src}')" aria-label="Ver ${image.label}: ${campaignFeature.title}">
                    <img src="${image.src}" alt="${image.alt}" width="${image.width}" height="${image.height}" loading="${index === 0 ? 'eager' : 'lazy'}" decoding="async">
                    <strong>${image.label}</strong>
                </button>`).join('\n')}
            </div>
            <p class="band-campaign-feature-note">${campaignFeature.note}</p>
            <button type="button" class="band-campaign-feature-cta" onclick="openCatalogDesignPreview('${campaignFeature.designId}', 'remera', '${campaignFeature.defaultPrintMode || 'simple'}', '${campaignFeature.defaultPreview || campaignFeatureImages[0].src}')">${campaignFeature.ctaLabel}</button>
        </section>` : '';
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <meta name="theme-color" content="#050505">
    <title>${config.title}</title>
    <meta name="description" content="${config.description}">
    <link rel="canonical" href="${config.canonical}">

    <meta property="og:title" content="${config.title}">
    <meta property="og:description" content="${config.description}">
    <meta property="og:image" content="${config.imageUrl}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="1200">
    <meta property="og:url" content="${config.canonical}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Five Magics Designs">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${config.title}">
    <meta name="twitter:description" content="${config.description}">
    <meta name="twitter:image" content="${config.imageUrl}">

    <link rel="icon" type="image/png" href="/images/logo/MARCA DE AGUA.png">
    <link rel="apple-touch-icon" sizes="180x180" href="/images/logo/MARCA DE AGUA.png">
    <link rel="manifest" href="/site.webmanifest">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Oswald:wght@400;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/styles/main.css">
    <link rel="stylesheet" href="/styles/band-landing.css">

    <script async src="https://www.googletagmanager.com/gtag/js?id=G-1H3XPM82ED"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-1H3XPM82ED');
        window.FMD_BAND_LANDING = Object.freeze(${serializeInlineConfig(config)});
${postShow ? `        if (Date.now() >= Date.parse(${JSON.stringify(postShow.activateAt)})) {
            document.documentElement.classList.add('fmd-post-show-active');
        }` : ''}
${eventDay ? `        if (Date.now() >= Date.parse(${JSON.stringify(eventDay.startsAt)}) && Date.now() < Date.parse(${JSON.stringify(eventDay.endsAt)})) {
            document.documentElement.classList.add('fmd-event-day-active');
        }` : ''}
    </script>
</head>
<body class="band-landing-page" data-band="${config.band}">
    <!-- Archivo generado por scripts/build-band-landings.js. -->
    <header class="band-landing-header">
        <div class="header-content">
            <a href="/#catalogoPrincipal" class="logo" aria-label="Volver al catálogo FMD">FIVE <span>MAGICS</span></a>
            <div class="header-actions">
                <a href="/#catalogoPrincipal" class="btn-back-catalog" aria-label="Explorar más bandas en el catálogo FMD">EXPLORAR MÁS BANDAS</a>
${instagram ? `                <a href="${instagram.href}" class="band-landing-instagram-header" target="_blank" rel="noopener" aria-label="Ver ${instagram.handle} en Instagram">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"></rect><circle cx="12" cy="12" r="4"></circle><circle cx="17.4" cy="6.6" r="1"></circle></svg>
                </a>` : ''}
                <a href="${whatsappUrl(`Hola FMD! Quiero consultar por los diseños de ${config.band}.`)}" class="btn-wa-header" target="_blank" rel="noopener"${catalogFirst ? ' aria-label="Consultar por WhatsApp"' : ''}>
${catalogFirst ? `                    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
` : ''}                    <span>CONSULTAR</span>
                </a>
            </div>
        </div>
    </header>

    <button id="cartBtn" title="Ver pedido">
        Ver pedido
        <span class="cart-count">0</span>
    </button>
    <div id="cartPanel">
        <div class="cart-panel-header">
            <h2>Mi pedido</h2>
            <button class="cart-panel-close" id="cartPanelClose" aria-label="Cerrar pedido">&times;</button>
        </div>
        <div id="cartList"></div>
        <div id="cartSummary"></div>
    </div>

    <main>
${campaignFeatureMarkup}
${showcaseFirst ? showcaseMarkup : ''}
        <section class="band-landing-hero${postShow ? ' band-landing-pre-show' : ''}" aria-labelledby="bandLandingTitle">
            <div class="band-landing-hero-copy">
                <p class="band-landing-brand">FIVE MAGICS DESIGNS</p>
                <h1 id="bandLandingTitle">${config.heroDisplayName || config.displayName}</h1>
                <h2>${config.heroTitle}</h2>
${eventDay ? `                <p class="helloween-event-day-line">${eventDay.label}</p>` : ''}
                <p>${config.heroCopy}</p>
${config.heroQualityLine ? `                <p class="band-landing-quality-line">${config.heroQualityLine}</p>` : ''}
                <a class="band-landing-primary-cta" href="#catalogoPrincipal">${config.heroCtaLabel || 'VER DISEÑOS'}</a>
${config.heroNotice ? `                <p class="band-landing-hero-notice">${config.heroNotice}</p>\n` : ''}${config.relatedArchive ? `                <a class="band-landing-related-archive" href="${config.relatedArchive.href}" aria-label="${config.relatedArchive.label}: ${config.relatedArchive.title}">
                    <span>${config.relatedArchive.label}</span>
                    <strong>${config.relatedArchive.title}</strong>
                    <span aria-hidden="true">→</span>
                </a>` : ''}
            </div>
            <div class="band-landing-hero-art">
                <img src="${config.image}" alt="Diseño ${config.band} disponible en Five Magics Designs" width="1200" height="1200">
            </div>
        </section>
${postShow ? `
        <section class="band-landing-hero helloween-post-show-hero" aria-labelledby="helloweenPostShowTitle" aria-hidden="true">
            <div class="band-landing-hero-copy">
                <p class="band-landing-brand">FIVE MAGICS DESIGNS</p>
                <h1 id="helloweenPostShowTitle">${postShow.title}</h1>
                <h2>${postShow.subtitle}</h2>
                <p><strong data-band-design-count-copy>${postShow.highlight}</strong><br>${postShow.copy}</p>
                <a class="band-landing-primary-cta" href="#catalogoPrincipal">${postShow.ctaLabel}</a>
            </div>
            <div class="band-landing-hero-art">
                <img src="${config.image}" alt="Colección Helloween post-show en Five Magics Designs" width="1200" height="1200">
            </div>
        </section>` : ''}${featuredCollectionMarkup ? `\n${featuredCollectionMarkup}` : ''}
${catalogFirst ? `${garmentSelectorMarkup}
${catalogMarkup}` : ''}${postShowFeatured ? `
        <section class="helloween-post-show-featured" aria-labelledby="helloweenFeaturedTitle">
            <div class="helloween-post-show-featured-media${postShowFeaturedGroups.length ? ' has-option-groups' : ''}">
${postShowFeaturedGroups.length ? postShowFeaturedGroups.map(group => `                <section class="helloween-featured-option-group">
                    <h3>${group.title}</h3>
                    <div class="helloween-featured-option-grid">
${group.images.map(image => `                        <figure>
                            <img src="${image.src}" alt="${image.alt}" loading="eager" decoding="async">
                            <figcaption>${image.label}</figcaption>
                        </figure>`).join('\n')}
                    </div>
                    <div class="helloween-featured-option-controls" aria-label="Navegar opciones">
                        <button type="button" data-option-prev aria-label="Opción anterior">&#8249;</button>
                        <output aria-live="polite">1 / ${group.images.length}</output>
                        <button type="button" data-option-next aria-label="Opción siguiente">&#8250;</button>
                    </div>
                </section>`).join('\n') : `
${postShowFeaturedImages.map(image => `                <figure>
                    <img src="${image.src}" alt="${image.alt}" loading="eager" decoding="async">
                    <figcaption>${image.label}</figcaption>
                </figure>`).join('\n')}`}
            </div>
            <div class="helloween-post-show-featured-copy">
                <h2 id="helloweenFeaturedTitle">${postShowFeatured.title}</h2>
                <p class="band-landing-brand">${postShowFeatured.kicker}</p>
                <strong>${postShowFeatured.copy}</strong>
                <small>${postShowFeatured.note}</small>
                <div class="helloween-featured-actions">
${postShowFeaturedCtas.map(cta => `                    <button type="button" onclick="openCatalogDesign('${cta.designId}', 'remera')">${cta.label}</button>`).join('\n')}
                </div>
            </div>
        </section>` : ''}

${config.moveShippingAfterShowcase ? '' : shippingPromoMarkup}
        <section class="production-tracking-strip" aria-label="Producción y seguimiento">
            <strong>${config.productionTitle || '<span>PRODUCCIÓN</span> 48 A 72 H HÁBILES'}</strong>
            <p>${config.productionCopy || 'Una vez despachado, te enviamos el enlace de seguimiento. Plazo total estimado: 3 a 7 días hábiles según destino.'}</p>
${config.productionNotice ? `            <p class="production-tracking-alert">${config.productionNotice}</p>` : ''}${config.productionCta ? `
            <a class="production-tracking-cta" href="${config.productionCta.href}" target="_blank" rel="noopener">${config.productionCta.label}</a>` : ''}
        </section>
${finishedGarments.length ? `        <section class="finished-garments" aria-labelledby="finishedGarmentsTitle">
            <div class="finished-garments-head">
                <p>PRENDAS TERMINADAS</p>
                <h2 id="finishedGarmentsTitle">ASÍ QUEDAN IMPRESAS</h2>
                <span>Fotos de prendas producidas por FMD, con impresión DTG directa sobre la tela.</span>
            </div>
            <div class="finished-garments-controls">
                <button type="button" data-finished-prev aria-label="Foto anterior">&#8249;</button>
                <output data-finished-counter aria-live="polite">1 / ${finishedGarments.length}</output>
                <button type="button" data-finished-next aria-label="Foto siguiente">&#8250;</button>
            </div>
            <div class="finished-garments-track" data-finished-track tabindex="0" aria-label="Fotografías de prendas terminadas; desplazá para ver más">
${finishedGarments.map((photo, index) => `                <button type="button" class="finished-garments-slide" data-finished-open="${index}" aria-label="Ampliar fotografía ${index + 1} de ${finishedGarments.length}">
                    <img src="${photo.src}" alt="${photo.alt}" width="1122" height="1402" loading="lazy" decoding="async">
                </button>`).join('\n')}
            </div>
            <div class="finished-garments-footer">
                <p>Estas son algunas de las prendas que ya salieron del taller.</p>
                <a href="#bandCatalogTitle">VER LOS 75 DISEÑOS</a>
            </div>
        </section>` : ''}
${showcaseFirst ? '' : showcaseMarkup}
${config.moveShippingAfterShowcase ? shippingPromoMarkup : ''}
${catalogFirst ? '' : garmentSelectorMarkup}
${config.showSizeGuide ? `
        <details class="band-landing-size-guide" id="tablaDeMedidas">
            <summary>
                <span>CONSULTÁ LA TABLA DE MEDIDAS</span>
                <small>Compará las medidas antes de elegir el talle</small>
            </summary>
            <div class="band-landing-size-guide-body">
                <div class="band-landing-size-guide-tabs" aria-label="Elegir tabla de medidas">
                    <button type="button" class="active" data-landing-size-guide="hombre" onclick="selectLandingSizeGuide('hombre')">Remera hombre</button>
                    <button type="button" data-landing-size-guide="mujer" onclick="selectLandingSizeGuide('mujer')">Remera mujer</button>
                    <button type="button" data-landing-size-guide="oversize" onclick="selectLandingSizeGuide('oversize')">Oversize</button>
                    <button type="button" data-landing-size-guide="ninos" onclick="selectLandingSizeGuide('ninos')">Niños</button>
                    <button type="button" data-landing-size-guide="hoodies" onclick="selectLandingSizeGuide('hoodies')">Hoodie</button>
                    <button type="button" data-landing-size-guide="buzo-redondo" onclick="selectLandingSizeGuide('buzo-redondo')">Buzo</button>
                </div>
                <div class="band-landing-size-guide-content">
                    <h3 id="landingSizeGuideTitle">Tabla de medidas</h3>
                    <p id="landingSizeGuideCopy"></p>
                    <div id="landingSizeGuideTable"></div>
                    <p class="band-landing-size-guide-note">Medí una prenda similar extendida sobre una superficie plana. Las medidas pueden variar hasta un 5%.</p>
                    <p class="size-selection-policy size-selection-policy-table">Queremos que te quede perfecta: compará las medidas antes de elegir el talle. Como preparamos cada prenda especialmente para vos, no realizamos cambios por talle.</p>
                </div>
            </div>
        </details>` : ''}

${catalogFirst ? '' : catalogMarkup}

${instagram ? `        <section class="band-landing-instagram" aria-label="Instagram de Five Magics Designs">
            <p>SEGUINOS EN INSTAGRAM</p>
            <strong>${instagram.handle}</strong>
            <a href="${instagram.href}" target="_blank" rel="noopener">VER INSTAGRAM</a>
        </section>

` : ''}        <section class="band-landing-custom" id="bandLandingFinal" aria-labelledby="bandCustomTitle">
            <p id="bandLandingFinalKicker">PERSONALIZADOS FMD</p>
            <h2 id="bandCustomTitle">${config.finalTitle}</h2>
            <div id="bandLandingFinalCopy">${config.finalCopy}</div>
            <a id="bandLandingFinalCta" href="${whatsappUrl(config.whatsappMessage)}" target="_blank" rel="noopener">${config.finalCtaLabel || 'CONSULTAR POR WHATSAPP'}</a>
        </section>
    </main>

    <div class="image-modal" id="imageModal" onclick="closeImageModal()">
        <button class="image-modal-close" type="button" aria-label="Cerrar imagen" onclick="closeImageModal()">&times;</button>
        <img id="imageModalImg" src="" alt="">
    </div>
${finishedGarments.length ? `    <dialog class="finished-garments-lightbox" id="finishedGarmentsLightbox" aria-label="Fotografía ampliada de prendas terminadas">
        <button type="button" data-finished-close aria-label="Cerrar fotografía">&times;</button>
        <img alt="" width="1122" height="1402">
    </dialog>
    <script src="/js/finished-garments.js" defer></script>` : ''}
${commerceMarkup}

${postShow ? `    <script>
        (() => {
            const activationTime = Date.parse(${JSON.stringify(postShow.activateAt)});
            const syncPostShowState = () => {
                const active = Date.now() >= activationTime;
                document.documentElement.classList.toggle('fmd-post-show-active', active);
                document.querySelector('.band-landing-pre-show')?.setAttribute('aria-hidden', String(active));
                document.querySelector('.helloween-post-show-hero')?.setAttribute('aria-hidden', String(!active));
                if (!active) {
                    window.setTimeout(syncPostShowState, Math.min(activationTime - Date.now(), 2147483647));
                }
            };
            syncPostShowState();
        })();
    </script>
` : ''}${eventDay ? `    <script>
        (() => {
            const startsAt = Date.parse(${JSON.stringify(eventDay.startsAt)});
            const endsAt = Date.parse(${JSON.stringify(eventDay.endsAt)});
            const syncEventDayState = () => {
                const now = Date.now();
                document.documentElement.classList.toggle('fmd-event-day-active', now >= startsAt && now < endsAt);
                if (now < endsAt) {
                    window.setTimeout(syncEventDayState, Math.min((now < startsAt ? startsAt : endsAt) - now, 2147483647));
                }
            };
            syncEventDayState();
        })();
    </script>
` : ''}    <script src="/js/band-archives-config.js" defer></script>
    <script src="/js/band-archives-config.js" defer></script>
    <script src="/js/catalog-design.js" defer></script>
    <script src="/js/app.js" defer></script>
</body>
</html>
`;
}

function main() {
    const indexSource = fs.readFileSync(INDEX_PATH, 'utf8');
    const sharedCommerceMarkup = extractSharedCommerceMarkup(indexSource);
    const requestedSlug = String(process.argv[2] || '').trim().toLowerCase();
    const selectedLandings = requestedSlug
        ? LANDINGS.filter(config => String(config.slug || '').toLowerCase() === requestedSlug)
        : LANDINGS;
    if (!selectedLandings.length) {
        throw new Error(`No existe una configuración para el archivo "${requestedSlug}".`);
    }
    selectedLandings.forEach(config => {
        const outputPath = path.join(ROOT, config.output);
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        fs.writeFileSync(outputPath, renderLanding(config, sharedCommerceMarkup), 'utf8');
        process.stdout.write(`Generada ${path.relative(ROOT, outputPath)} para ${config.band}\n`);
    });
    fs.writeFileSync(SITEMAP_PATH, renderSitemap(), 'utf8');
    process.stdout.write('Sitemap actualizado\n');
}

main();
