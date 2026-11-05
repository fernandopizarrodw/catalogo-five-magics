(function initSlayerCampaign() {
    'use strict';

    const image = document.getElementById('slayerLaunchImage');
    if (!image) return;
    const assets = {
        remera: {
            front: '/images/slayer/frente/slayer_reign_in_blood_frente.jpg',
            back: '/images/slayer/dorso/slayer_reign_in_blood_dorso.jpg',
            double: '/images/slayer/dobles/remera_reign_in_blood_doble.jpg',
            argentina: '/images/slayer/dobles/remera_reign_in_blood_doble_argentina.jpg'
        },
        sin_mangas: {
            front: '/images/slayer/frente/slayer_reign_in_blood_frente_sin_mangas.jpg',
            back: '/images/slayer/dorso/slayer_reign_in_blood_dorso_sin_mangas.jpg',
            double: '/images/slayer/dobles/remera_reign_in_blood_doble_sin_mangas.jpg'
        }
    };
    const labels = { front: 'Solo frente', back: 'Dorso', double: 'Frente y dorso', argentina: 'Frente + dorso Argentina 2026' };
    let style = 'remera';
    let view = 'front';

    function render() {
        if (!assets[style][view]) view = 'double';
        image.src = assets[style][view];
        image.alt = `Reign in Blood · ${style === 'sin_mangas' ? 'Sin mangas unisex' : 'Remera'} · ${labels[view]}`;
        document.querySelectorAll('[data-slayer-style]').forEach(button => {
            button.setAttribute('aria-pressed', String(button.dataset.slayerStyle === style));
        });
        document.querySelectorAll('[data-slayer-view]').forEach(button => {
            button.setAttribute('aria-pressed', String(button.dataset.slayerView === view));
            button.hidden = !assets[style][button.dataset.slayerView];
        });
    }

    document.querySelectorAll('[data-slayer-style]').forEach(button => {
        button.addEventListener('click', () => { style = button.dataset.slayerStyle; render(); });
    });
    document.querySelectorAll('[data-slayer-view]').forEach(button => {
        button.addEventListener('click', () => { view = button.dataset.slayerView; render(); });
    });
    document.getElementById('slayerSleevelessAccess')?.addEventListener('click', () => {
        style = 'sin_mangas'; render();
    });
    document.querySelector('[data-slayer-browse="sin_mangas"]')?.addEventListener('click', event => {
        event.preventDefault();
        currentSearch = '';
        document.getElementById('searchInput').value = '';
        selectBandLandingCollection('');
        selectBandLandingGarment('sin_mangas');
    });
    document.getElementById('slayerLaunchZoom')?.addEventListener('click', () => openZoom(image.src, image.alt));
    document.querySelectorAll('[data-slayer-3d-design]').forEach(link => {
        link.addEventListener('click', event => {
            event.preventDefault();
            const designId = link.getAttribute('data-slayer-3d-design');
            if (!catalogDesignById.has(designId)) {
                showNotification('Estamos cargando los diseños. Probá de nuevo en un momento.', 2500);
                return;
            }
            openCatalogDesign(designId, 'remera_clasica');
        });
    });
    document.querySelector('[data-slayer-3d-collection]')?.addEventListener('click', event => {
        event.preventDefault();
        currentSearch = '';
        document.getElementById('searchInput').value = '';
        selectBandLandingGarment('remera');
        selectBandLandingCollectionAndScroll('3d-fmd');
    });
    document.querySelectorAll('.slayer-hero-actions .band-landing-primary-cta, .slayer-text-link').forEach(link => {
        link.addEventListener('click', event => {
            event.preventDefault();
            currentSearch = '';
            const search = document.getElementById('searchInput');
            if (search) search.value = '';
            selectBandLandingCollection('');
            selectBandLandingGarment('remera');
        });
    });
    document.getElementById('slayerLaunchChoose')?.addEventListener('click', () => {
        const designId = 'cd-slayer-reign-in-blood--p7101';
        if (!catalogDesignById.has(designId)) {
            showNotification('Estamos cargando los diseños. Probá de nuevo en un momento.', 2500);
            return;
        }
        openCatalogDesign(designId, style === 'sin_mangas' ? 'sin_mangas' : 'remera_clasica');
        selectColor('negro');
        if (view !== 'front') {
            const backName = view === 'argentina' ? 'Dorso Reign in Blood · Argentina 2026' : 'Dorso Reign in Blood · Logo rojo';
            const doubleIndex = currentModalSourceRefs.findIndex(ref => ref.autoSelectBack === backName);
            if (doubleIndex >= 0) goToSlide(doubleIndex, false);
            selectPrintMode('double');
            if (!selectedCatalogBackRef) selectCatalogDesignBack(7101, 2);
        } else {
            selectPrintMode('simple');
        }
    });
})();
