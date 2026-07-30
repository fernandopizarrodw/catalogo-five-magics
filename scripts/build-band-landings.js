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
        usesShownComposition: config.usesShownComposition,
        usesShownCompositionGarments: Array.isArray(config.usesShownCompositionGarments)
            ? config.usesShownCompositionGarments
            : [],
        collections: Array.isArray(config.collections) ? config.collections : [],
        designOrder: Array.isArray(config.designOrder) ? config.designOrder : [],
        sharedDesignIds: Array.isArray(config.sharedDesignIds) ? config.sharedDesignIds : [],
        albumOrder: Array.isArray(config.albumOrder) ? config.albumOrder : []
    })
        .replace(/</g, '\\u003c');
}

function whatsappUrl(message) {
    return `https://wa.me/541169667685?text=${encodeURIComponent(message)}`;
}

function customizeSharedCommerceMarkup(config, markup) {
    if (!config.usesShownComposition) return markup;

    let output = markup
        .replace(
            'Corte amplio unisex · Largo más justo que el hoodie · Estampa DTG',
            'Buzo cuello redondo oversize unisex · Largo más justo que el hoodie · Estampa DTG'
        )
        .replace(
            '<strong>Plazo estimado total: 4 a 7 días hábiles, según el destino.</strong> Envíos por Andreani a domicilio o punto de retiro. Retiro sin cargo en Villa Martelli.',
            '<strong>Plazo estimado total: 4 a 7 días hábiles, según el destino.</strong> Envíos por Andreani o retiro sin cargo en Villa Martelli.'
        )
        .replace('🛒 Guardar en carrito', 'AGREGAR AL CARRITO')
        .replace('<summary>Dorso y personalización</summary>', '<summary>Detalles del producto</summary>')
        .replace('<div class="spec-value">☢️ DTG Premium</div>', '<div class="spec-value" id="modalSpecPrint">☢️ DTG Premium</div>')
        .replace('<div class="spec-value">🖤 Sin tacto plástico</div>', '<div class="spec-value" id="modalSpecFabric">🖤 Algodón peinado</div>')
        .replace('<div class="spec-value">⚡ Algodón peinado</div>', '<div class="spec-value" id="modalSpecGarment">⚡ Remera clásica unisex</div>')
        .replace(/\s*<a href="#" class="btn-wa btn-wa-secondary" id="modalWaBtn">[\s\S]*?<\/a>/, '');

    const helpLink = `

                    <a href="#" class="btn-wa btn-wa-secondary band-landing-modal-help" id="modalWaBtn">
                        ¿Tenés alguna duda? Consultanos
                    </a>
`;
    output = output.replace(
        '\n                    <details class="modal-advanced-panel" id="modalAdvancedPanel">',
        `${helpLink}\n                    <details class="modal-advanced-panel" id="modalAdvancedPanel">`
    );
    return output;
}

function renderLanding(config, sharedCommerceMarkup) {
    const commerceMarkup = customizeSharedCommerceMarkup(config, sharedCommerceMarkup);
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
    </script>
</head>
<body class="band-landing-page" data-band="${config.band}">
    <!-- Archivo generado por scripts/build-band-landings.js. -->
    <header class="band-landing-header">
        <div class="header-content">
            <a href="/#catalogoPrincipal" class="logo" aria-label="Volver al catálogo FMD">FIVE <span>MAGICS</span></a>
            <div class="header-actions">
                <a href="/#catalogoPrincipal" class="btn-back-catalog">VER TODO FMD</a>
                <a href="${whatsappUrl(`Hola FMD! Quiero hacer un pedido de ${config.band}.`)}" class="btn-wa-header" target="_blank" rel="noopener">
                    <span>WhatsApp</span>
                </a>
            </div>
        </div>
    </header>

    <button id="cartBtn" title="Ver carrito">
        Ver carrito
        <span class="cart-count">0</span>
    </button>
    <div id="cartPanel">
        <div class="cart-panel-header">
            <h2>Mi carrito</h2>
            <button class="cart-panel-close" id="cartPanelClose" aria-label="Cerrar carrito">&times;</button>
        </div>
        <div id="cartList"></div>
        <div id="cartSummary"></div>
    </div>

    <main>
        <section class="band-landing-hero" aria-labelledby="bandLandingTitle">
            <div class="band-landing-hero-copy">
                <p class="band-landing-brand">FIVE MAGICS DESIGNS</p>
                <h1 id="bandLandingTitle">${config.displayName}</h1>
                <h2>${config.heroTitle}</h2>
                <p>${config.heroCopy}</p>
                <a class="band-landing-primary-cta" href="#catalogoPrincipal">VER DISEÑOS</a>
            </div>
            <div class="band-landing-hero-art">
                <img src="${config.image}" alt="Diseño ${config.band} disponible en Five Magics Designs" width="1200" height="1200">
            </div>
        </section>

        <section class="july-shipping-promo" aria-label="Beneficios FMD">
            <p>BENEFICIOS FMD</p>
            <strong>ENVÍO GRATIS</strong>
            <span>1 prenda · A punto de retiro Andreani · Todo el país</span>
            <b>2 PRENDAS · ENVÍO GRATIS A DOMICILIO</b>
            <b>3 PRENDAS O MÁS · 10% OFF + ENVÍO GRATIS A DOMICILIO</b>
        </section>

        <section class="band-landing-garment-selector" id="catalogoPrincipal" aria-label="Elegir prenda ${config.band}">
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
        </section>
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
                </div>
            </div>
        </details>` : ''}

        <section class="band-landing-catalog" aria-labelledby="bandCatalogTitle">
            <div class="band-landing-section-head">
                <p>ARCHIVO FMD</p>
                <h2 id="bandCatalogTitle">DISEÑOS DE ${config.displayName}</h2>
            </div>
            <nav id="categoryNav" hidden aria-hidden="true"></nav>
${Array.isArray(config.collections) && config.collections.length ? `            <div class="band-landing-collections" id="bandLandingCollections" aria-label="Explorar ${config.band} por colección">
                <button type="button" class="band-landing-collection-btn active" data-band-landing-collection="" onclick="selectBandLandingCollection('')">TODOS <span data-collection-count=""></span></button>
${config.collections.map(collection => `                <button type="button" class="band-landing-collection-btn" data-band-landing-collection="${collection.id}" onclick="selectBandLandingCollection('${collection.id}')">${collection.label} <span data-collection-count="${collection.id}"></span></button>`).join('\n')}
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
        </section>

        <section class="band-landing-custom" aria-labelledby="bandCustomTitle">
            <p>PERSONALIZADOS FMD</p>
            <h2 id="bandCustomTitle">${config.finalTitle}</h2>
            <div>${config.finalCopy}</div>
            <a href="${whatsappUrl(config.whatsappMessage)}" target="_blank" rel="noopener">CONSULTAR POR WHATSAPP</a>
        </section>
    </main>

    <div class="image-modal" id="imageModal" onclick="closeImageModal()">
        <button class="image-modal-close" type="button" aria-label="Cerrar imagen" onclick="closeImageModal()">&times;</button>
        <img id="imageModalImg" src="" alt="">
    </div>

${commerceMarkup}

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
