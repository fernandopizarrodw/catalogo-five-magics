// === CONFIGURACIÓN DE PRECIOS ===
const PRECIOS = {
    simple: 37000,
    doble: 42000,
    simple_personalizado: 40000,
    doble_personalizado: 45000
};
const PRECIOS_CHICOS = {
    simple: 32000,
    doble: 35000
};
const PRECIOS_HOODIES = {
    simple: 52000,
    doble: 59000
};
const COMBO_HOODIE_REMERA = 99000; // Incluye envío gratis
const PRECIOS_ENVIO = {
    una_unidad: 5000,
    dos_plus: 0,
    tres_plus: { descuento: 0.10, envio: 0 }
};
const FECHA_VIGENCIA = "Marzo 2026";
const WHATSAPP = "541169667685";

let db = [];
let selectedAge = 'adulto';
let selectedSize = '';
let selectedCut = 'clasica';
let selectedColor = 'negro'; // 'adulto' o 'chico'

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

// Función para cambiar entre Adulto y Chico
function selectAge(age) {
    selectedAge = age;
    selectedSize = ''; // Reset talle al cambiar edad
    
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
    
    updateModalPrices();
}

// Función para seleccionar talle
function selectSize(size) {
    selectedSize = size;
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
    if (selectedAge === 'adulto') {
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
}

// Función para seleccionar color
function selectColor(color) {
    selectedColor = color;
    const activeStyle = 'background:#e8432e;border:1px solid #e8432e;color:#fff;padding:6px 12px;border-radius:5px;font-size:0.8rem;font-weight:500;cursor:pointer;display:flex;align-items:center;gap:6px;';
    const inactiveStyle = 'background:#1a1a1a;border:1px solid #333;color:#888;padding:6px 12px;border-radius:5px;font-size:0.8rem;font-weight:500;cursor:pointer;display:flex;align-items:center;gap:6px;';
    
    document.querySelectorAll('#colorSelector button').forEach(btn => {
        const isActive = btn.dataset.color === color;
        btn.classList.toggle('active', isActive);
        btn.style.cssText = isActive ? activeStyle : inactiveStyle;
    });
}

// Actualizar precios según selección adulto/chico y tipo de producto
function updateModalPrices() {
    if (!currentProduct) return;
    
    // Detectar si es hoodie
    const isHoodie = currentProduct.category === 'Hoodies FMD';
    
    // Seleccionar tabla de precios según tipo de producto y edad
    let precios;
    if (isHoodie) {
        precios = PRECIOS_HOODIES;
    } else {
        precios = selectedAge === 'chico' ? PRECIOS_CHICOS : PRECIOS;
    }
    
    const tipo = currentProduct.tipoPrecio || 'simple';
    const precio = precios[tipo] || precios.simple;
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
        if (isHoodie) {
            priceNote.innerHTML = '🎁 COMBO Hoodie + Remera: <strong style="color:var(--price);">$99.000</strong> (envío gratis)';
        } else {
            priceNote.textContent = '2+ prendas → envío gratis · 1 unidad → envío según zona';
        }
    }
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

    // Generar código único para un producto
    generateCode(productId, variantIndex = 0, isDouble = false) {
        const product = db.find(p => p.id === productId);
        if (!product) return null;
        
        const abbrev = this.generateProductAbbreviation(product.name);
        const baseCode = `${abbrev}-${String(productId).padStart(3, '0')}`;
        const variantPart = product.variants && product.variants.length > 1 ? `.V${variantIndex + 1}` : '';
        const doublePart = isDouble ? '.DBL' : '';
        return `${baseCode}${variantPart}${doublePart}`;
    }

    // Agregar al carrito
    addToCart(productId, variantIndex = 0, isDouble = false, options = {}) {
        const product = db.find(p => p.id === productId);
        if (!product) return false;

        // Forzar doble estampa en todos los hoodies
        let forceDouble = isDouble;
        if (product.category === 'Hoodies FMD') {
            forceDouble = true;
        }

        const code = this.generateCode(productId, variantIndex, forceDouble);
        const variantName = product.variants && product.variants[variantIndex] 
            ? product.variants[variantIndex].name 
            : product.name;

        const item = {
            id: productId,
            code: code,
            productName: product.name,
            category: product.category,
            variantIndex: variantIndex,
            variantName: variantName,
            isDouble: forceDouble,
            age: options.age || 'adulto',
            size: options.size || '',
            cut: options.cut || 'clasica',
            color: options.color || 'negro',
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
        
        // Códigos en lista vertical
        const codes = this.cart.map(item => `[${item.code}]`).join('\n');


        // Ordenar productos: adulto primero, luego niño; dentro de adulto, hoodie/remera
        const sortOrder = item => {
            // 0: adulto hoodie, 1: adulto remera, 2: niño
            if (item.age === 'chico') return 2;
            if (item.category === 'Hoodies FMD') return 0;
            return 1;
        };
        const sortedCart = [...this.cart].sort((a, b) => sortOrder(a) - sortOrder(b));

        // Detalles de cada producto (ajustes de lenguaje y talle)
        const details = sortedCart.map(item => {
            const isHoodie = item.category === 'Hoodies FMD';
            const doble = item.isDouble ? ' (Doble estampa)' : '';
            const edad = item.age === 'chico' ? 'Niño' : 'Adulto';
            let talle;
            if (!item.size) {
                talle = 'Talle a confirmar con asesoramiento FMD';
            } else {
                talle = `Talle ${item.size}`;
            }
            const color = item.color === 'blanco' ? 'Blanca' : 'Negra';
            let tipoPrenda;
            if (isHoodie) {
                tipoPrenda = 'Hoodie oversize unisex';
            } else if (item.cut === 'oversize') {
                tipoPrenda = 'Remera oversize unisex';
            } else {
                tipoPrenda = 'Remera clásica';
            }
            return `${item.productName}${doble}\n${edad} | ${talle} | ${tipoPrenda} | ${color}`;
        }).join('\n\n');

        const total = this.cart.length;
        const tipoConteo = total === 1 ? 'prenda' : 'prendas';

        // Formato limpio para WhatsApp
        let envioMsg = '';
        if (total === 1) {
            envioMsg = '\n\n*Envío a calcular según CP*';
        }

        // Detectar combos hoodie+remera (promo)
        const tieneHoodie = sortedCart.some(i => i.category === 'Hoodies FMD');
        const tieneRemera = sortedCart.some(i => i.category !== 'Hoodies FMD');
        let promoMsg = '';
        if (tieneHoodie && tieneRemera) {
            promoMsg = '\n\n> Este pedido incluye productos combinables en promo vigente.';
        }

        return `CÓDIGOS:\n${codes}\n\nDETALLE DEL PEDIDO:\n\n${details}\n\nTotal de ${tipoConteo}: ${total}${envioMsg}${promoMsg}`;
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
                        Revisar y enviar por WhatsApp
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

        // Ordenar los isNew por productId descendente y respetar el límite estricto
        displayCards.sort((a, b) => b.productId - a.productId);

        // 3. Rellenar el resto de espacios hasta el límite con productos recientes
        if (displayCards.length < limit) {
            const sortedProducts = [...db].sort((a,b)=> (b.id||0) - (a.id||0));

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
                            : `${formatPreciosDual()}<div style="font-size:0.62rem;color:var(--text-muted);margin-top:4px;">Envío gratis 2+ · 1 unidad consultar</div>`
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
        renderLatestReleases(5); // Mostrar solo 5 nuevos lanzamientos
        renderHoodiesGrid(); // Hoodies destacados
        renderHeroOrbit(5); // Poblar órbita del hero con 5 cards 3D
        filterProducts(); // Renderizar después de cargar
    } catch (error) {
        console.error('Error:', error);
        // Fallback para desarrollo local
        db = [];
    }
}

// Renderizar sección destacada de Hoodies FMD
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
            const isDoble = product.tipoPrecio === 'doble';
            const precio = isDoble ? PRECIOS_HOODIES.doble : PRECIOS_HOODIES.simple;
            // Si es la 5ta card y hay más de 5, poner el botón y el blur
            if (idx === maxVisible - 1 && hoodies.length > maxVisible) {
                html += `<div class="product-card hoodie-card ver-mas-card" id="verMasHoodiesCard" style="position:relative;overflow:hidden;cursor:pointer;" onclick="mostrarMasHoodies(event)">
                    <div class="ver-mas-blur"></div>
                    <span class="variants-badge hoodie-badge">🧥 HOODIE</span>
                    <img src="${product.img}" class="product-img" loading="lazy">
                    <div class="product-info">
                        <div class="product-name">${product.name}</div>
                        <div class="product-meta">${product.year} · ${isDoble ? 'Doble estampa' : 'Simple'}</div>
                        <div class="product-price-row">
                            <span class="product-price hoodie-price">$${precio.toLocaleString('es-AR')}</span>
                        </div>
                    </div>
                    <button class="ver-mas-btn-overlay">VER MÁS HOODIES</button>
                </div>`;
            } else if (idx < maxVisible - 1) {
                html += `<div class="product-card hoodie-card" onclick="openModal(${product.id})">
                    <span class="variants-badge hoodie-badge">🧥 HOODIE</span>
                    <img src="${product.img}" class="product-img" loading="lazy">
                    <div class="product-info">
                        <div class="product-name">${product.name}</div>
                        <div class="product-meta">${product.year} · ${isDoble ? 'Doble estampa' : 'Simple'}</div>
                        <div class="product-price-row">
                            <span class="product-price hoodie-price">$${precio.toLocaleString('es-AR')}</span>
                        </div>
                    </div>
                </div>`;
            } else if (idx >= maxVisible) {
                html += `<div class="product-card hoodie-card hoodie-hidden" style="display:none;" onclick="openModal(${product.id})">
                    <span class="variants-badge hoodie-badge">🧥 HOODIE</span>
                    <img src="${product.img}" class="product-img" loading="lazy">
                    <div class="product-info">
                        <div class="product-name">${product.name}</div>
                        <div class="product-meta">${product.year} · ${isDoble ? 'Doble estampa' : 'Simple'}</div>
                        <div class="product-price-row">
                            <span class="product-price hoodie-price">$${precio.toLocaleString('es-AR')}</span>
                        </div>
                    </div>
                </div>`;
            }
        });
        hoodiesGrid.innerHTML = html;
    // Mostrar más hoodies al hacer clic en VER MÁS
    window.mostrarMasHoodies = function(event) {
        event.stopPropagation();
        const cards = document.querySelectorAll('.hoodie-hidden');
        cards.forEach(card => { card.style.display = 'block'; });
        const verMasCard = document.getElementById('verMasHoodiesCard');
        if (verMasCard) verMasCard.style.display = 'none';
    }
    } catch(e) { console.warn('renderHoodiesGrid error', e); }
}

// Renderizar órbita del hero con últimos lanzamientos
function renderHeroOrbit(limit = 8) {
    try {
        const orbitRing = document.getElementById('orbitRing');
        if (!orbitRing || !Array.isArray(db) || !db.length) return;

        let orbitItems = [];

        // 1. Productos con isNew: true
        db.forEach(product => {
            if (product.isNew && orbitItems.length < limit) {
                orbitItems.push({
                    productId: product.id,
                    img: product.img,
                    title: product.name
                });
            }
        });

        // 2. Variantes con isNew: true
        db.forEach(product => {
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

        // 3. Rellenar con los últimos productos si necesario
        if (orbitItems.length < limit) {
            const sortedProducts = [...db].sort((a, b) => (b.id || 0) - (a.id || 0));
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

function formatPreciosDual() {
    const pSimple = '$' + PRECIOS.simple.toLocaleString('es-AR');
    const pDoble = '$' + PRECIOS.doble.toLocaleString('es-AR');
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

// Abrir WhatsApp con mensaje
function openWhatsapp(message) {
    if (typeof gtag !== 'undefined') {
        gtag('event', 'whatsapp_click', {
            'event_category': 'engagement',
            'event_label': 'Mensaje WhatsApp'
        });
    }
    
    const encodedMessage = encodeURIComponent(message);
    window.location.href = `https://wa.me/${WHATSAPP}?text=${encodedMessage}`;
}

const BASE_URL = window.location.origin + window.location.pathname;
const DORSO_CATEGORIES = new Set(['Album','Tour','Musician','Dave Mustaine','Metallica','Pantera','Iron Maiden','Avenged Sevenfold']);

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
    
    // Reemplazar el href con un onclick que use la función centralizada
    btn.onclick = (e) => {
        e.preventDefault();
        openWhatsapp(text);
    };
    
    btn.href = '#'; // Placeholder para accesibilidad
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

function openModal(id, variantIndex = undefined) {
    currentProduct = db.find(p => p.id === id);
    if (!currentProduct) return;

    scrollPosition = window.pageYOffset;
    document.body.classList.add('modal-open');
    document.body.style.top = `-${scrollPosition}px`;

    history.pushState({ modal: true, id }, '', `#producto-${id}`);
    const hasSpecificVariant = variantIndex !== undefined && variantIndex !== null;
    currentSlide = hasSpecificVariant ? variantIndex : 0;
    const images = getImages(currentProduct);

    carousel.innerHTML = images.map(v => `
        <div class="carousel-slide"><img src="${v.img}" alt="${currentProduct.name}"></div>
    `).join('');

    carouselDots.innerHTML = images.length > 1 ? images.map((_, i) => `<div class="carousel-dot${i === currentSlide ? ' active' : ''}" data-index="${i}"></div>`).join('') : '';
    
    // Añadir click listeners a los dots para que sean navegables
    if (images.length > 1) {
        document.querySelectorAll('.carousel-dot').forEach(dot => {
            dot.addEventListener('click', function() {
                const index = parseInt(this.dataset.index);
                goToSlide(index, true); // smooth = true para clicks en dots
            });
        });
    }

    // Ir al slide correcto (sin animación al abrir)
    if (hasSpecificVariant && currentSlide > 0) {
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
    
    // Estilos para reset
    const activeStyle = 'background:#e8432e;border:1px solid #e8432e;color:#fff;padding:6px 12px;border-radius:5px;font-size:0.8rem;font-weight:500;cursor:pointer;';
    const inactiveStyle = 'background:#1a1a1a;border:1px solid #333;color:#888;padding:6px 12px;border-radius:5px;font-size:0.8rem;font-weight:500;cursor:pointer;';
    const activeColorStyle = 'background:#e8432e;border:1px solid #e8432e;color:#fff;padding:6px 12px;border-radius:5px;font-size:0.8rem;font-weight:500;cursor:pointer;display:flex;align-items:center;gap:6px;';
    const inactiveColorStyle = 'background:#1a1a1a;border:1px solid #333;color:#888;padding:6px 12px;border-radius:5px;font-size:0.8rem;font-weight:500;cursor:pointer;display:flex;align-items:center;gap:6px;';
    
    // Reset todas las opciones del modal
    selectedAge = 'adulto';
    selectedSize = '';
    selectedCut = 'clasica';
    selectedColor = 'negro';
    
    // Reset botones de edad
    document.querySelectorAll('#ageSelector button').forEach(btn => {
        const isActive = btn.dataset.age === 'adulto';
        btn.classList.toggle('active', isActive);
        btn.style.cssText = isActive ? activeStyle : inactiveStyle;
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
    
    // Reset botones de corte
    document.querySelectorAll('#cutSelector button').forEach(btn => {
        const isActive = btn.dataset.cut === 'clasica';
        btn.classList.toggle('active', isActive);
        btn.style.cssText = isActive ? activeStyle : inactiveStyle;
    });
    
    // Reset botones de color
    document.querySelectorAll('#colorSelector button').forEach(btn => {
        const isActive = btn.dataset.color === 'negro';
        btn.classList.toggle('active', isActive);
        btn.style.cssText = isActive ? activeColorStyle : inactiveColorStyle;
    });
    
    // === LÓGICA ESPECIAL PARA HOODIES ===
    const isHoodie = currentProduct.category === 'Hoodies FMD';
    const hoodieInfoBanner = document.getElementById('hoodieInfoBanner');
    const ageGroup = document.getElementById('ageGroup');
    const cutGroup = document.getElementById('cutGroup');
    
    if (isHoodie) {
        // Mostrar banner de hoodie
        if (hoodieInfoBanner) hoodieInfoBanner.style.display = 'block';
        
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
    } else {
        // Restaurar comportamiento normal para remeras
        if (hoodieInfoBanner) hoodieInfoBanner.style.display = 'none';
        if (ageGroup) ageGroup.style.display = 'flex';
        if (cutGroup) cutGroup.style.display = 'flex';
    }
    
    updateModalInfo();
    
    // Mostrar/ocultar flechas según cantidad de imágenes
    try {
        const prevBtn = document.getElementById('carouselPrev');
        const nextBtn = document.getElementById('carouselNext');
        const dotsContainer = document.getElementById('carouselDots');
        
        if (hasSpecificVariant) {
            // Ocultar navegación si es variante específica
            if(prevBtn) prevBtn.style.display = 'none';
            if(nextBtn) nextBtn.style.display = 'none';
            if(dotsContainer) dotsContainer.style.display = 'none';
        } else {
            // Mostrar/ocultar según cantidad de imágenes
            if (images.length > 1) {
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
    
    // Actualizar código del producto
    const code = cart.generateCode(currentProduct.id, currentSlide, selectedBacks.size > 0 || selectedDorsoChips.size > 0);
    const displayCodeEl = document.getElementById('displayCode');
    if (displayCodeEl) {
        displayCodeEl.textContent = code;
    }
    
    // Actualizar breadcrumb
    const breadcrumbCategory = document.getElementById('breadcrumbCategory');
    const breadcrumbProduct = document.getElementById('breadcrumbProduct');
    if (breadcrumbCategory) breadcrumbCategory.textContent = getCategoryLabel(currentProduct.category);
    if (breadcrumbProduct) breadcrumbProduct.textContent = currentProduct.name;
    
    // Actualizar contador de productos
    updateProductCounter();
    
    document.getElementById('modalMeta').textContent = formatCategoryMeta(currentProduct.year, getCategoryLabel(currentProduct.category));
    document.getElementById('modalDesc').textContent = currentProduct.desc || '';
    
    // Actualizar precios según selector adulto/chico
    updateModalPrices();
    
    document.getElementById('modalCounter').textContent = `${currentSlide + 1}/${images.length}`;
    const shouldShowBadge = currentProduct.tipoPrecio === 'doble' || DORSO_CATEGORIES.has(currentProduct.category);
    document.getElementById('badgeDoble').style.display = shouldShowBadge ? 'block' : 'none';
    const vName = images[currentSlide]?.name || '';
    document.getElementById('variantName').textContent = vName;
    document.getElementById('variantName').style.display = vName ? 'block' : 'none';
    const msg = `Hola FMD, quiero más información sobre ${currentProduct.name}`;
    const modalWaBtn = document.getElementById('modalWaBtn');
    if (modalWaBtn) {
        modalWaBtn.onclick = (e) => {
            e.preventDefault();
            openWhatsapp(msg);
        };
        modalWaBtn.href = '#';
    }
    renderBackExamples();
    updateDobleWaLink();
    document.querySelectorAll('.carousel-dot').forEach((dot, i) => { dot.classList.toggle('active', i === currentSlide); });
    updateShareLinks();
    renderRelatedProducts(currentProduct.category);
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
        const isDoble = p.tipoPrecio === 'doble';
        const isDorsoIdea = p.category === 'Dorsales';
        const badgeText = hasVariants ? `${p.variants.length} diseños <span style='font-size:1.2em;margin-left:6px;'>➔</span>` : (isDoble ? '🔥 Doble estampa' : '');
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

        return `<div class="product-card" onclick="openModal(${p.id})">
            <div class="product-badges">${badges}</div>
            <img src="${p.img}" class="product-img" loading="lazy">
            <div class="product-info">
                <div class="product-name">${p.name}</div>
                ${code ? `<div class="product-code" style="font-size:0.85em;color:var(--magic-orange);font-weight:600;letter-spacing:1px;">${code}</div>` : ''}
                <div class="product-meta">${formatCategoryMeta(p.year, getCategoryLabel(p.category))}</div>
                <div class="product-price-row">
                    ${
                        isDorsoIdea
                        ? `<span class="product-envio" style="color:var(--magic-green);border:1px solid rgba(57,255,20,.25);">Solo doble estampa</span>`
                        : `${formatPreciosDual()}<div style="font-size:0.62rem;color:var(--text-muted);margin-top:4px;">Envío gratis 2+ · 1 unidad consultar</div>`
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
    copyToClipboard(url);
}

function updateShareLinks() {
    if (!currentProduct) return;
    const images = getImages(currentProduct);
    const variant = images?.[currentSlide]?.name ? `\nVariante: ${images[currentSlide].name}` : '';
    const msg = `Mirá este diseño:\n${currentProduct.name}${variant}\n${getProductUrl()}`;
    
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
    
    document.querySelector('meta[property="og:title"]').setAttribute('content', `${currentProduct.name} - Five Magics Designs`);
    document.querySelector('meta[property="og:description"]').setAttribute('content', `${currentProduct.name}${year} • ${getCategoryLabel(currentProduct.category)}\n${desc}...`);
    document.querySelector('meta[property="og:image"]').setAttribute('content', productImage);
    document.querySelector('meta[property="og:url"]').setAttribute('content', productUrl);
    
    document.querySelector('meta[name="twitter:title"]').setAttribute('content', currentProduct.name);
    document.querySelector('meta[name="twitter:description"]').setAttribute('content', `${getCategoryLabel(currentProduct.category)}${year}`);
    document.querySelector('meta[name="twitter:image"]').setAttribute('content', productImage);
}

// Cálculo de contadores dinámicos
const CATEGORY_LABELS = {
    'Album': 'Álbumes Megadeth',
    'Hoodies FMD': 'Hoodies Megadeth',
    'Hoodies Otras Bandas': 'Hoodies Otras Bandas',
    'Bandas Sugeridas': 'Bandas Sugeridas',
    'Dave Mustaine': 'Dave Mustaine',
    'Dorsales': 'Ideas de Dorso',
    'Musician': 'Miembros Megadeth',
    'Personalizados': 'Pedidos Especiales',
    'Singles': 'Singles Especiales',
    'Tour': 'Tours',
    'VicRattlehead': 'Vic Rattlehead',
    'AC/DC': 'AC/DC',
    'Pantera': 'Pantera',
    'Iron Maiden': 'Iron Maiden',
    'Metallica': 'Metallica',
    'Avenged Sevenfold': 'Avenged Sevenfold'
};

const MEGADETH_CATS = new Set(['Album','Musician','Tour','VicRattlehead','Singles','Dorsales']);

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
        setNavBadge('Avenged Sevenfold', byCategory['Avenged Sevenfold']||0);
        setNavBadge('AC/DC', byCategory['AC/DC']||0);
        setNavBadge('Pantera', byCategory['Pantera']||0);
        setNavBadge('Iron Maiden', byCategory['Iron Maiden']||0);
        setNavBadge('Metallica', byCategory['Metallica']||0);
        setNavBadge('Hoodies FMD', byCategory['Hoodies FMD']||0);
        setNavBadge('Hoodies Otras Bandas', byCategory['Hoodies Otras Bandas']||0);
        setNavBadge('Bandas Sugeridas', byCategory['Bandas Sugeridas']||0);
        setNavBadge('Dave Mustaine', byCategory['Dave Mustaine']||0);
        setNavBadge('Dorsales', byCategory['Dorsales']||0);
        setNavBadge('Musician', byCategory['Musician']||0);
        setNavBadge('Personalizados', byCategory['Personalizados']||0);
        setNavBadge('Singles', byCategory['Singles']||0);
        setNavBadge('Tour', byCategory['Tour']||0);
        setNavBadge('VicRattlehead', byCategory['VicRattlehead']||0);

        // Filtros: textos con cantidad (y corrección de etiqueta de Megadeth)
        const setPill = (filter, label) => {
            const el = document.querySelector(`.filter-pill[data-filter="${filter}"]`);
            if(el) el.textContent = label;
        };
        setPill('all', `Todo (${totalAll})`);
        setPill('Album', `${getCategoryLabel('Album')} (${byCategory['Album']||0})`);
        setPill('Hoodies FMD', `${getCategoryLabel('Hoodies FMD')} (${byCategory['Hoodies FMD']||0})`);
        setPill('Hoodies Otras Bandas', `${getCategoryLabel('Hoodies Otras Bandas')} (${byCategory['Hoodies Otras Bandas']||0})`);
        setPill('Dave Mustaine', `${getCategoryLabel('Dave Mustaine')} (${byCategory['Dave Mustaine']||0})`);
        setPill('Pantera', `${getCategoryLabel('Pantera')} (${byCategory['Pantera']||0})`);
        setPill('Iron Maiden', `${getCategoryLabel('Iron Maiden')} (${byCategory['Iron Maiden']||0})`);
        setPill('Metallica', `${getCategoryLabel('Metallica')} (${byCategory['Metallica']||0})`);
        setPill('Avenged Sevenfold', `${getCategoryLabel('Avenged Sevenfold')} (${byCategory['Avenged Sevenfold']||0})`);
        setPill('Musician', `${getCategoryLabel('Musician')} (${byCategory['Musician']||0})`);
        setPill('Tour', `${getCategoryLabel('Tour')} (${byCategory['Tour']||0})`);
        setPill('VicRattlehead', `${getCategoryLabel('VicRattlehead')} (${byCategory['VicRattlehead']||0})`);
        setPill('Personalizados', `${getCategoryLabel('Personalizados')} (${byCategory['Personalizados']||0})`);
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

function sendViaWhatsapp() {
    const summary = cart.generateSummary();
    const message = `Hola FMD! 🤘\n\nQuiero encargar los siguientes productos:\n\n${summary}\n\n¿Podrían confirmarme precio final y disponibilidad?`;
    openWhatsapp(message);
}

// === MODAL VISTA PREVIA DEL CARRITO ===
function openCartPreview() {
    const modal = document.getElementById('cartPreviewModal');
    if (!modal) return;
    
    renderCartPreview();
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCartPreview() {
    const modal = document.getElementById('cartPreviewModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function getProductImage(productId, variantIndex = 0) {
    const product = db.find(p => p.id === productId);
    if (!product) return 'images/logo/MARCA DE AGUA.png';
    
    if (product.variants && product.variants[variantIndex]) {
        return product.variants[variantIndex].img;
    }
    return product.img || 'images/logo/MARCA DE AGUA.png';
}

function calculateItemPrice(item) {
    let precios;
    if (item.category === 'Hoodies FMD') {
        precios = PRECIOS_HOODIES;
    } else if (item.age === 'chico') {
        precios = PRECIOS_CHICOS;
    } else {
        precios = PRECIOS;
    }
    return item.isDouble ? precios.doble : precios.simple;
}

function calculateCartTotal() {
    const items = cart.getCart();
    let subtotal = 0;
    
    items.forEach(item => {
        subtotal += calculateItemPrice(item);
    });
    
    // Calcular envío según cantidad
    let envio = 0;
    let descuento = 0;
    const cantidad = items.length;
    
    if (cantidad === 1) {
        envio = PRECIOS_ENVIO.una_unidad;
    } else if (cantidad >= 3) {
        descuento = subtotal * PRECIOS_ENVIO.tres_plus.descuento;
        envio = PRECIOS_ENVIO.tres_plus.envio;
    } else {
        envio = PRECIOS_ENVIO.dos_plus;
    }
    
    return {
        subtotal,
        envio,
        descuento,
        total: subtotal - descuento + envio,
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
        shippingNote = `<div class="cart-preview-shipping-note">📦 Agregá 1 prenda más para envío GRATIS</div>`;
    } else if (totals.cantidad >= 2) {
        shippingNote = `<div class="cart-preview-shipping-note">🚚 ¡ENVÍO GRATIS! ${totals.cantidad >= 3 ? '+ 10% descuento 🎉' : ''}</div>`;
    }
    
    footer.innerHTML = `
        <div class="cart-preview-summary">
            <div class="cart-preview-summary-row">
                <span>Subtotal (${totals.cantidad} ${totals.cantidad === 1 ? 'prenda' : 'prendas'})</span>
                <span class="value">$${totals.subtotal.toLocaleString('es-AR')}</span>
            </div>
            ${totals.descuento > 0 ? `
                <div class="cart-preview-summary-row">
                    <span>Descuento 10% (3+ prendas)</span>
                    <span class="value" style="color: var(--magic-green);">-$${totals.descuento.toLocaleString('es-AR')}</span>
                </div>
            ` : ''}
            <div class="cart-preview-summary-row">
                <span>Envío</span>
                <span class="value">${totals.cantidad === 1 ? 'A calcular según CP' : (totals.envio > 0 ? '$' + totals.envio.toLocaleString('es-AR') : 'GRATIS')}</span>
            </div>
            <div class="cart-preview-summary-row total">
                <span>Total estimado</span>
                <span class="value">$${totals.total.toLocaleString('es-AR')}</span>
            </div>
        </div>
        ${shippingNote}
        <div class="cart-preview-actions">
            <button class="btn-preview-continue" onclick="closeCartPreview()">
                ← Seguir eligiendo
            </button>
            <button class="btn-preview-whatsapp" onclick="confirmAndSendWhatsapp()">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Confirmar y enviar por WhatsApp
            </button>
        </div>
    `;
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
    closeCartPreview();
    sendViaWhatsapp();
}

function toggleCartPanel() {
    cart.togglePanel();
}

function addToCartFromModal() {
    if (!currentProduct) return false;
    
    const isDouble = selectedBacks.size > 0 || selectedDorsoChips.size > 0;
    const variantIndex = currentSlide;
    
    const options = {
        age: selectedAge,
        size: selectedSize,
        cut: selectedCut,
        color: selectedColor
    };
    
    const success = cart.addToCart(currentProduct.id, variantIndex, isDouble, options);
    
    if (success) {
        showNotification('✓ Agregado al carrito', 2000);
    }
    
    return success;
}

// Agregar al carrito y abrir WhatsApp directamente
function addToCartAndOpenWhatsapp() {
    if (!currentProduct) return;
    
    addToCartFromModal();
    
    // Pequeño delay para que se vea la notificación
    setTimeout(() => {
        const summary = cart.generateSummary();
        const message = `Hola FMD! 🤘\n\nQuiero encargar los siguientes productos:\n\n${summary}\n\n¿Podrían confirmarme precio final y disponibilidad?`;
        openWhatsapp(message);
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
    const related = db.filter(p => p.category === category && p.id !== currentProduct.id).slice(0, 6);
    
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
        
        const results = db.filter(p => {
            const name = (p.name || '').toLowerCase();
            const desc = (p.desc || '').toLowerCase();
            const category = (p.category || '').toLowerCase();
            return name.includes(query) || desc.includes(query) || category.includes(query);
        }).slice(0, 8);
        
        if (results.length === 0) {
            searchModalResults.innerHTML = '<div class="search-empty">Sin resultados para "' + e.target.value + '"</div>';
            return;
        }
        
        searchModalResults.innerHTML = results.map(p => `
            <div class="search-result-item" onclick="openModal(${p.id}); document.getElementById('searchModal').classList.remove('active');">
                <div class="search-result-name">${p.name}</div>
                <div class="search-result-meta">${p.year} · ${p.category}</div>
            </div>
        `).join('');
    };
    
    // Cerrar modal con tecla Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && searchModal.classList.contains('active')) {
            searchModal.classList.remove('active');
        }
    });
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    setView('grid');
    initSearchModal();
    // Pequeño delay para asegurar que db está lleno
    setTimeout(loadProductFromHash, 500);
});

// Escuchar cambios en hash (si usuario navega directamente a #producto-123)
window.addEventListener('hashchange', loadProductFromHash);
