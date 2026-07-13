const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const INDEX_PATH = path.join(ROOT, 'index.html');

const LANDINGS = [
    {
        output: 'nightwish/index.html',
        slug: 'nightwish',
        band: 'Nightwish',
        displayName: 'NIGHTWISH',
        title: 'Nightwish: remeras, hoodies y buzos | Five Magics Designs',
        description: 'Diseños de Nightwish en remeras, hoodies y buzos hechos a pedido. Elegí estampa frontal o doble, talle, color y forma de entrega.',
        canonical: 'https://catalogo.fivemagicsdesigns.com/nightwish/',
        image: '/images/banda_sugeridas/nightwish/remera_nightwish_once.jpg',
        imageUrl: 'https://catalogo.fivemagicsdesigns.com/images/banda_sugeridas/nightwish/remera_nightwish_once.jpg',
        heroTitle: 'REMERAS, HOODIES Y BUZOS',
        heroCopy: 'Diseños disponibles con estampa frontal o doble. Elegí tu favorito y armá tu pedido.',
        finalTitle: '¿BUSCABAS OTRO DISEÑO DE NIGHTWISH?',
        finalCopy: 'También hacemos diseños personalizados a partir de una tapa, imagen o idea.',
        whatsappMessage: 'Hola FMD! Quiero consultar por un diseño de Nightwish a partir de una tapa, imagen o idea.',
        defaultGarment: 'hoodie',
        usesShownComposition: true,
        garments: [
            { key: 'hoodie', title: 'HOODIES', price: 'Desde $52.000', image: '/images/banda_sugeridas/nightwish/hoodie_nightwish_once.jpg', alt: 'Hoodie Nightwish Once' },
            { key: 'buzo_cuello_redondo', title: 'BUZOS', price: 'Desde $50.000', image: '/images/banda_sugeridas/nightwish/buzo_nightwish_once.jpg', alt: 'Buzo cuello redondo Nightwish Once' },
            { key: 'remera', title: 'REMERAS', price: 'Desde $37.000', image: '/images/banda_sugeridas/nightwish/remera_nightwish_once.jpg', alt: 'Remera Nightwish Once' }
        ]
    }
];

function extractSharedCommerceMarkup(source) {
    const startMarker = '    <div class="zoom-overlay" id="zoomOverlay">';
    const endMarker = '    <script src="js/catalog-design.js" defer></script>';
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
        usesShownComposition: config.usesShownComposition
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
            'Pod&eacute;s elegir el dorso ahora o definirlo por WhatsApp.',
            'La composici&oacute;n se entrega como se muestra. Si quer&eacute;s modificarla, consultanos antes de confirmar.'
        )
        .replace(
            '<strong>Producción estimada: 4 a 7 días hábiles.</strong> Envíos por Andreani a domicilio o punto de retiro. Retiro sin cargo en Villa Martelli.',
            '<strong>Producción estimada: 4 a 7 días hábiles.</strong> Envíos por Andreani o retiro sin cargo en Villa Martelli.'
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

        <section class="band-landing-garment-selector" id="catalogoPrincipal" aria-label="Elegir prenda ${config.band}">
            <div class="band-landing-garment-grid" role="tablist" aria-label="Prendas disponibles">
${config.garments.map((garment, index) => `
                <button type="button" class="band-landing-garment-card${index === 0 ? ' active' : ''}" data-band-landing-garment="${garment.key}" role="tab" aria-selected="${index === 0 ? 'true' : 'false'}" onclick="selectBandLandingGarment('${garment.key}')">
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

        <section class="band-landing-catalog" aria-labelledby="bandCatalogTitle">
            <div class="band-landing-section-head">
                <p>ARCHIVO FMD</p>
                <h2 id="bandCatalogTitle">DISEÑOS DE ${config.displayName}</h2>
            </div>

            <nav id="categoryNav" hidden aria-hidden="true"></nav>
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

    <script src="/js/catalog-design.js" defer></script>
    <script src="/js/app.js" defer></script>
</body>
</html>
`;
}

function main() {
    const indexSource = fs.readFileSync(INDEX_PATH, 'utf8');
    const sharedCommerceMarkup = extractSharedCommerceMarkup(indexSource);
    LANDINGS.forEach(config => {
        const outputPath = path.join(ROOT, config.output);
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        fs.writeFileSync(outputPath, renderLanding(config, sharedCommerceMarkup), 'utf8');
        process.stdout.write(`Generada ${path.relative(ROOT, outputPath)} para ${config.band}\n`);
    });
}

main();
