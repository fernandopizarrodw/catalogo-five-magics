(function initBandArchivesConfig(root, factory) {
    const configs = factory();
    if (typeof module === 'object' && module.exports) module.exports = configs;
    if (root) root.FMD_BAND_ARCHIVES = configs;
})(typeof globalThis !== 'undefined' ? globalThis : this, function bandArchivesFactory() {
    'use strict';

    return Object.freeze([
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
        },
        {
            output: 'slayer/index.html',
            slug: 'slayer',
            band: 'Slayer',
            displayName: 'SLAYER',
            title: 'Slayer: remeras, hoodies y buzos | Five Magics Designs',
            description: 'Diseños de Slayer en remeras, hoodies y buzos hechos a pedido. Elegí estampa frontal o doble, talle, color y forma de entrega.',
            canonical: 'https://catalogo.fivemagicsdesigns.com/slayer/',
            image: '/images/slayer/fmd_originals/remeras/remera_slayer_fmd_angel_of_death.jpg',
            imageUrl: 'https://catalogo.fivemagicsdesigns.com/images/slayer/fmd_originals/remeras/remera_slayer_fmd_angel_of_death.jpg',
            heroTitle: 'REMERAS, HOODIES Y BUZOS',
            heroCopy: 'Diseños disponibles con estampa frontal o doble. Elegí tu favorito y armá tu pedido.',
            finalTitle: '¿BUSCABAS OTRO DISEÑO DE SLAYER?',
            finalCopy: 'También hacemos diseños personalizados a partir de una tapa, imagen o idea.',
            whatsappMessage: 'Hola FMD! Quiero consultar por un diseño de Slayer a partir de una tapa, imagen o idea.',
            defaultGarment: 'hoodie',
            usesShownComposition: true,
            garments: [
                { key: 'hoodie', title: 'HOODIES', price: 'Desde $52.000', image: '/images/slayer/fmd_originals/hoodies/hoodie_slayer_fmd_angel_of_death.jpg', alt: 'Hoodie Slayer FMD Angel of Death' },
                { key: 'buzo_cuello_redondo', title: 'BUZOS', price: 'Desde $50.000', image: '/images/slayer/fmd_originals/buzos/buzo_slayer_fmd_angel_of_death.jpg', alt: 'Buzo cuello redondo Slayer FMD Angel of Death' },
                { key: 'remera', title: 'REMERAS', price: 'Desde $37.000', image: '/images/slayer/fmd_originals/remeras/remera_slayer_fmd_angel_of_death.jpg', alt: 'Remera Slayer FMD Angel of Death' }
            ]
        },
        {
            output: 'megadeth/index.html',
            slug: 'megadeth',
            band: 'Megadeth',
            displayName: 'MEGADETH',
            title: 'Megadeth: remeras, hoodies y buzos | Five Magics Designs',
            description: 'Diseños de Megadeth en remeras, hoodies y buzos hechos a pedido. Explorá álbumes, Vic Rattlehead, Dave Mustaine, tours y ediciones FMD.',
            canonical: 'https://catalogo.fivemagicsdesigns.com/megadeth/',
            image: '/images/albums/Rust_in_peace/rust_in_peace.jpg',
            imageUrl: 'https://catalogo.fivemagicsdesigns.com/images/albums/Rust_in_peace/rust_in_peace.jpg',
            heroTitle: 'REMERAS, HOODIES Y BUZOS',
            heroCopy: 'Explorá diseños clásicos, ediciones FMD y todo el universo Megadeth. Elegí tu favorito y armá tu pedido.',
            finalTitle: '¿BUSCABAS OTRO DISEÑO DE MEGADETH?',
            finalCopy: 'También hacemos diseños personalizados a partir de una tapa, imagen o idea.',
            whatsappMessage: 'Hola FMD! Quiero consultar por un diseño de Megadeth a partir de una tapa, imagen o idea.',
            defaultGarment: 'remera',
            usesShownComposition: false,
            garments: [
                { key: 'hoodie', title: 'HOODIES', price: 'Desde $52.000', image: '/images/hoddies_fmd/rust_in_peace.jpg', alt: 'Hoodie Megadeth Rust in Peace' },
                { key: 'buzo_cuello_redondo', title: 'BUZOS', price: 'Desde $50.000', image: '/images/buzos cuello redondo/megadeth_rust_in_peace_original_fmd.jpg', alt: 'Buzo cuello redondo Megadeth Rust in Peace FMD' },
                { key: 'remera', title: 'REMERAS', price: 'Desde $37.000', image: '/images/albums/Rust_in_peace/rust_in_peace.jpg', alt: 'Remera Megadeth Rust in Peace' }
            ],
            collections: [
                { id: 'albums', label: 'ÁLBUMES', match: { categories: ['Album'] } },
                { id: 'vic', label: 'VIC RATTLEHEAD', match: { categories: ['VicRattlehead'] } },
                { id: 'mustaine', label: 'DAVE MUSTAINE', match: { categories: ['Dave Mustaine'] } },
                { id: 'tours', label: 'TOURS', match: { categories: ['Tour'] } },
                { id: 'originals', label: 'ORIGINALES FMD', match: { badges: ['ORIGINAL FMD'] } }
            ]
        }
    ]);
});
