(function initPanteraLanding() {
    'use strict';

    document.querySelectorAll('[data-pantera-collection]').forEach(link => {
        link.addEventListener('click', event => {
            event.preventDefault();
            currentSearch = '';
            document.getElementById('searchInput').value = '';
            selectBandLandingGarment('remera');
            selectBandLandingCollection(link.dataset.panteraCollection);
            document.getElementById('productsGrid').scrollIntoView({
                behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
                block: 'start'
            });
        });
    });
})();
