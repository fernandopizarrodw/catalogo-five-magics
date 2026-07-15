(function initCatalogDesignModule(root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.FMDCatalogDesign = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function catalogDesignFactory() {
    'use strict';

    const DEFAULT_AVAILABLE_GARMENTS = Object.freeze([
        'remera',
        'hoodie',
        'buzo_cuello_redondo'
    ]);

    const GARMENT_ORDER = Object.freeze({
        remera: 0,
        hoodie: 1,
        buzo_cuello_redondo: 2
    });

    function normalizeText(value) {
        return String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, ' ')
            .trim();
    }

    function slugify(value) {
        return normalizeText(value).replace(/\s+/g, '-');
    }

    function unique(values) {
        return Array.from(new Set(values.filter(Boolean)));
    }

    function repairPublicText(value) {
        const replacements = {
            'Ã¡': 'á', 'Ã©': 'é', 'Ã­': 'í', 'Ã³': 'ó', 'Ãº': 'ú', 'Ã±': 'ñ',
            'Ã': 'Á', 'Ã‰': 'É', 'Ã': 'Í', 'Ã“': 'Ó', 'Ãš': 'Ú', 'Ã‘': 'Ñ',
            'â€”': '—', 'â€“': '–', 'â€œ': '“', 'â€': '”', 'Â': ''
        };
        return Object.entries(replacements).reduce(
            (text, [broken, fixed]) => text.split(broken).join(fixed),
            String(value || '')
        )
            .replace(/Killing Is my bussines/gi, 'Killing Is My Business')
            .replace(/\bdisenos\b/gi, 'dise\u00f1os');
    }

    function getPublicBand(product) {
        const rawBand = repairPublicText(product?.band || product?.category || 'FMD').trim();
        const labels = {
            epica: 'EPICA',
            acdc: 'AC/DC',
            personalizados: 'Personalizados'
        };
        return labels[normalizeText(rawBand).replace(/[^a-z0-9]/g, '')] || rawBand;
    }

    function isBackVariant(variant) {
        if (!variant) return false;
        if (normalizeText(variant.role) === 'back') return true;
        const searchable = normalizeText(`${variant.name || ''} ${variant.img || ''}`);
        if (searchable.includes('frente y dorso') || searchable.includes('front and back')) return false;
        return searchable.includes('dorso') || /(^|\s)back(\s|$)/.test(searchable);
    }

    function getGarment(variant, product) {
        const variantSearchable = normalizeText([
            variant?.garmentCategory,
            variant?.name,
            variant?.img
        ].filter(Boolean).join(' '));

        if (variantSearchable.includes('hoodie') || variantSearchable.includes('hoddies')) return 'hoodie';
        if (variantSearchable.includes('buzo cuello redondo') || variantSearchable.includes('buzo c r') || variantSearchable.includes('buzo')) {
            return 'buzo_cuello_redondo';
        }

        const variantGarments = Array.isArray(variant?.garments) ? variant.garments.map(normalizeText) : [];
        if (variantGarments.length === 1) {
            if (variantGarments[0] === 'hoodie') return 'hoodie';
            if (variantGarments[0] === 'buzo' || variantGarments[0] === 'buzo_cuello_redondo') return 'buzo_cuello_redondo';
        }

        const productCategory = normalizeText(product?.category);
        if (productCategory.includes('hoodie')) return 'hoodie';
        if (productCategory.includes('buzo cuello redondo')) return 'buzo_cuello_redondo';

        const productGarments = Array.isArray(product?.garments) ? product.garments.map(normalizeText) : [];
        if (productGarments.length === 1) {
            if (productGarments[0] === 'hoodie') return 'hoodie';
            if (productGarments[0] === 'buzo' || productGarments[0] === 'buzo_cuello_redondo') return 'buzo_cuello_redondo';
        }
        return 'remera';
    }

    function stripInternalSuffixes(value) {
        return String(value || '')
            .replace(/\s*-\s*(?:dise(?:n|ñ)os|hoodies|remeras|buzos)\s+sugeridos\s*$/i, '')
            .replace(/^\s*(?:hoodie|buzo(?:\s+cuello\s+redondo)?|remera)\s+/i, '')
            .trim();
    }

    function stripGarmentSuffix(value) {
        return String(value || '')
            .replace(/\s*-\s*(?:remera|hoodie|buzo(?:\s+cuello\s+redondo)?)\s*$/i, '')
            .trim();
    }

    function stripRoleWords(value) {
        return String(value || '')
            .replace(/\b(?:frente|front)\b/gi, ' ')
            .replace(/\b(?:dorso|back|espalda)\b/gi, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function stripBandPrefix(value, band) {
        const raw = String(value || '').trim();
        const bandText = String(band || '').trim();
        if (!raw || !bandText) return raw;
        const normalizedRaw = normalizeText(raw);
        const normalizedBand = normalizeText(bandText);
        if (!normalizedRaw.startsWith(`${normalizedBand} `)) return raw;
        const wordsToRemove = bandText.split(/\s+/).length;
        return raw.split(/\s+/).slice(wordsToRemove).join(' ').trim();
    }

    function getProductBaseName(product) {
        return stripInternalSuffixes(repairPublicText(product?.name || 'Diseño'));
    }

    function getConceptName(product, variant) {
        const productBaseName = getProductBaseName(product);
        let name = stripInternalSuffixes(stripGarmentSuffix(repairPublicText(variant?.name || productBaseName)));
        name = name
            .replace(/\s+(?:frente\s+y\s+dorso|combo|full\s+art(?:\s+png)?|hoodies?\s+models?|hoodies?)\s*$/i, '')
            .trim();
        const normalizedVariant = normalizeText(name);
        const normalizedProduct = normalizeText(product?.name);

        if (normalizedProduct && normalizedVariant.startsWith(`${normalizedProduct} `)) {
            name = name.split(/\s+/).slice(String(product.name).trim().split(/\s+/).length).join(' ');
        }

        name = stripBandPrefix(name, product?.band);
        name = stripRoleWords(name);
        name = name.replace(/^[-:–—\s]+|[-:–—\s]+$/g, '').trim();

        if (/^v\d+$/i.test(name)) {
            const publicBase = stripBandPrefix(productBaseName, product?.band).replace(/^[-:–—\s]+/, '').trim();
            const resolvedBase = normalizeText(publicBase) === normalizeText(name)
                ? productBaseName
                : publicBase;
            name = normalizeText(resolvedBase).endsWith(normalizeText(name))
                ? resolvedBase
                : `${resolvedBase} ${name}`.trim();
        } else if (/^variante\s+\d+$/i.test(name)) {
            const publicBase = stripBandPrefix(productBaseName, product?.band).replace(/^[-:–—\s]+/, '').trim();
            name = `${publicBase} - ${name}`.trim();
        }

        const genericNames = new Set(['', 'original']);
        if (genericNames.has(normalizeText(name))) {
            name = stripBandPrefix(productBaseName, product?.band);
        }

        const normalizedName = normalizeText(name);
        if (/^(?:\d{1,4}|art(?:\s+\d{4})?|red|black|white|[a-z0-9]{1,3})$/.test(normalizedName)) {
            const publicBase = stripBandPrefix(productBaseName, product?.band).replace(/^[-:–—\s]+/, '').trim();
            if (publicBase && !normalizeText(publicBase).includes(normalizedName)) {
                name = `${publicBase} ${name}`.trim();
            }
        }

        name = repairPublicText(name)
            .replace(/^[-:\u2013\u2014\s]+|[-:\u2013\u2014\s]+$/g, '')
            .replace(/^FMD\s+/i, '')
            .replace(/\s+FMD\s+FMD$/i, ' FMD')
            .replace(/\s+/g, ' ')
            .trim();

        return name || productBaseName || 'Diseño';
    }

    function generateProductAbbreviation(productName) {
        const cleaned = String(productName || 'PROD')
            .replace(/[^\w\s]/g, '')
            .toUpperCase()
            .trim();
        const words = cleaned.split(/\s+/).filter(Boolean);
        if (!words.length) return 'PROD';
        if (words.length === 1) return cleaned.substring(0, 6);
        if (words.length === 2 && words.join('').length <= 8) return words.join('');
        return words.map(word => word[0]).join('').substring(0, 6);
    }

    function generateOrderCodeBase(product, variantIndex) {
        const abbreviation = generateProductAbbreviation(product?.name);
        const productId = String(product?.id ?? '').padStart(3, '0');
        const hasVariants = Array.isArray(product?.variants) && product.variants.length > 1;
        return `${abbreviation}-${productId}${hasVariants ? `.V${variantIndex + 1}` : ''}`;
    }

    function makeSourceRef(product, variant, variantIndex) {
        return {
            productId: Number(product.id),
            variantIndex,
            image: variant?.img || product.img || '',
            label: String(variant?.name || product.name || 'Diseño').trim(),
            alt: String(variant?.alt || `${getPublicBand(product)} ${variant?.name || product.name || 'Diseño'}`).trim(),
            garment: getGarment(variant, product),
            role: isBackVariant(variant) ? 'back' : 'front',
            preferredPreview: variant?.preferredPreview === true
        };
    }

    function chooseCanonicalFront(fronts) {
        return [...fronts].sort((a, b) => {
            const garmentDiff = (GARMENT_ORDER[a.garment] ?? 99) - (GARMENT_ORDER[b.garment] ?? 99);
            if (garmentDiff) return garmentDiff;
            const productDiff = a.productId - b.productId;
            if (productDiff) return productDiff;
            return a.variantIndex - b.variantIndex;
        })[0];
    }

    function buildCatalogDesigns(products, options = {}) {
        const availableGarments = unique(options.availableGarments || DEFAULT_AVAILABLE_GARMENTS);
        const backTargetOverrides = options.backTargetOverrides || {};
        const explicitDesignIds = options.explicitDesignIds || {};
        const resolveDesignId = typeof options.resolveDesignId === 'function' ? options.resolveDesignId : null;
        const groups = new Map();

        function ensureGroup(product, variant, conceptName, explicitId, sourceKey) {
            const band = getPublicBand(product);
            const transitionId = `${slugify(band)}-${slugify(conceptName)}`;
            const embeddedDesignId = variant?.designId || product?.designId || '';
            const resolvedDesignId = resolveDesignId
                ? resolveDesignId({ product, variant, conceptName, sourceKey, transitionId, slugify, normalizeText })
                : '';
            const designId = explicitId || embeddedDesignId || resolvedDesignId || transitionId;
            if (!groups.has(designId)) {
                groups.set(designId, {
                    designId,
                    slug: variant?.designSlug || product?.designSlug || slugify(designId),
                    publicName: conceptName,
                    band,
                    fronts: [],
                    backOptions: [],
                    availableGarments: [...availableGarments],
                    previewsByGarment: {
                        remera: [],
                        hoodie: [],
                        buzo_cuello_redondo: []
                    },
                    sourceProductIds: [],
                    designFamilyIds: [],
                    categories: [],
                    collectionIds: [],
                    badges: [],
                    badgeDescriptions: [],
                    isNew: false,
                    visibilityTier: product?.visibilityTier || 'catalog',
                    commercialPriority: Number(product?.commercialPriority ?? product?.priority ?? 0) || 0,
                    identitySource: explicitId
                        ? 'explicit-map'
                        : embeddedDesignId
                            ? 'explicit-data'
                            : resolvedDesignId
                                ? 'conservative-resolver'
                                : 'transition-name'
                });
            }
            return groups.get(designId);
        }

        for (const product of products) {
            if (!product) continue;
            const variants = Array.isArray(product.variants) && product.variants.length
                ? product.variants
                : [{
                    img: product.img,
                    name: product.name,
                    role: 'front',
                    garmentCategory: product.category,
                    garments: product.garments
                }];
            let lastFrontDesignId = '';

            variants.forEach((variant, variantIndex) => {
                const sourceKey = `${product.id}:${variantIndex}`;
                const conceptName = getConceptName(product, variant);
                const explicitId = explicitDesignIds[sourceKey];
                const source = makeSourceRef(product, variant, variantIndex);

                if (source.role === 'back') {
                    const targetDesignId = variant?.backTargetDesignId || backTargetOverrides[sourceKey] || lastFrontDesignId;
                    if (!targetDesignId || !groups.has(targetDesignId)) {
                        const orphanGroup = ensureGroup(product, variant, conceptName, explicitId, sourceKey);
                        orphanGroup.backOptions.push({ ...source, orphan: true });
                        orphanGroup.sourceProductIds.push(Number(product.id));
                        return;
                    }
                    const targetGroup = groups.get(targetDesignId);
                    targetGroup.backOptions.push(source);
                    targetGroup.sourceProductIds.push(Number(product.id));
                    return;
                }

                const group = ensureGroup(product, variant, conceptName, explicitId, sourceKey);
                group.fronts.push(source);
                group.previewsByGarment[source.garment].push(source);
                group.sourceProductIds.push(Number(product.id));
                if (product.designFamilyId) group.designFamilyIds.push(product.designFamilyId);
                if (product.category) group.categories.push(product.category);
                if (Array.isArray(product.collectionIds)) group.collectionIds.push(...product.collectionIds);
                if (Array.isArray(variant?.collectionIds)) group.collectionIds.push(...variant.collectionIds);
                if (variant?.fmdBadge || product?.fmdBadge) group.badges.push(variant?.fmdBadge || product?.fmdBadge);
                if (variant?.fmdBadgeDescription || product?.fmdBadgeDescription) {
                    group.badgeDescriptions.push(variant?.fmdBadgeDescription || product?.fmdBadgeDescription);
                }
                group.isNew = group.isNew || Boolean(variant?.isNew || product?.isNew);
                group.commercialPriority = Math.max(
                    group.commercialPriority,
                    Number(product?.commercialPriority ?? product?.priority ?? 0) || 0
                );
                lastFrontDesignId = group.designId;
            });
        }

        return Array.from(groups.values()).map(group => {
            const canonicalFront = chooseCanonicalFront(group.fronts);
            const sourceProduct = products.find(product => Number(product.id) === canonicalFront?.productId);
            return {
                designId: group.designId,
                slug: group.slug,
                publicName: group.publicName,
                band: group.band,
                front: canonicalFront || null,
                backOptions: group.backOptions.map(back => ({ ...back })),
                availableGarments: [...group.availableGarments],
                previewsByGarment: Object.fromEntries(
                    Object.entries(group.previewsByGarment).map(([garment, previews]) => [garment, previews.map(preview => ({ ...preview }))])
                ),
                sourceProductIds: unique(group.sourceProductIds),
                designFamilyIds: unique(group.designFamilyIds),
                categories: unique(group.categories),
                collectionIds: unique(group.collectionIds),
                badges: unique(group.badges),
                badgeDescriptions: unique(group.badgeDescriptions),
                isNew: group.isNew,
                visibilityTier: group.visibilityTier,
                commercialPriority: group.commercialPriority,
                year: sourceProduct?.year || '',
                category: sourceProduct?.category || '',
                isPersonalized: normalizeText(sourceProduct?.category) === 'personalizados',
                orderCodeBase: canonicalFront && sourceProduct
                    ? generateOrderCodeBase(sourceProduct, canonicalFront.variantIndex)
                    : null,
                identitySource: group.identitySource
            };
        }).sort((a, b) => {
            const bandDiff = a.band.localeCompare(b.band, 'es', { sensitivity: 'base' });
            if (bandDiff) return bandDiff;
            return a.publicName.localeCompare(b.publicName, 'es', { sensitivity: 'base' });
        });
    }

    function validateCatalogDesigns(designs) {
        const errors = [];
        const seenIds = new Set();
        const seenSlugs = new Set();
        for (const design of designs) {
            if (!design.designId) errors.push('Diseño sin designId');
            if (seenIds.has(design.designId)) errors.push(`designId duplicado: ${design.designId}`);
            seenIds.add(design.designId);
            if (!design.slug) errors.push(`${design.designId}: slug vacío`);
            if (seenSlugs.has(design.slug)) errors.push(`slug duplicado: ${design.slug}`);
            seenSlugs.add(design.slug);
            if (!design.publicName) errors.push(`${design.designId}: nombre público vacío`);
            if (!design.band) errors.push(`${design.designId}: banda vacía`);
            if (!design.front?.image) errors.push(`${design.designId}: frente vacío`);
            if (!design.orderCodeBase) errors.push(`${design.designId}: código base vacío`);
            if (!Array.isArray(design.availableGarments) || !design.availableGarments.length) {
                errors.push(`${design.designId}: prendas disponibles vacías`);
            }
            for (const back of design.backOptions || []) {
                if (back.orphan) errors.push(`${design.designId}: dorso huérfano ${back.productId}:${back.variantIndex}`);
            }
        }
        return errors;
    }

    return {
        DEFAULT_AVAILABLE_GARMENTS,
        buildCatalogDesigns,
        generateOrderCodeBase,
        getConceptName,
        getGarment,
        getPublicBand,
        isBackVariant,
        normalizeText,
        repairPublicText,
        slugify,
        validateCatalogDesigns
    };
});
