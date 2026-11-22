'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const configs = require('../js/band-archives-config.js');
const root = path.resolve(__dirname, '..');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
    const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
    const server = http.createServer((req, res) => {
        try {
            let file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
            if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403).end(); return; }
            if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
            res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
            fs.createReadStream(file).pipe(res);
        } catch { res.writeHead(404).end(); }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'fmd-band-sleeveless-'));
    const chrome = spawn(process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
    let socket, send, launchError;
    chrome.on('error', error => { launchError = error; });
    const errors = [], failedAssets = [], results = [];
    const reportDir = path.join(root, 'reports/band-sleeveless');
    fs.mkdirSync(reportDir, { recursive: true });
    try {
        const portFile = path.join(profile, 'DevToolsActivePort');
        for (let i = 0; i < 100 && !fs.existsSync(portFile); i++) { if (launchError) throw launchError; await pause(100); }
        const port = fs.readFileSync(portFile, 'utf8').split('\n')[0];
        const targets = await fetch(`http://127.0.0.1:${port}/json`).then(r => r.json());
        socket = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
        await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
        let sequence = 0;
        const pending = new Map();
        socket.addEventListener('message', event => {
            const data = JSON.parse(event.data);
            if (data.method === 'Runtime.exceptionThrown') errors.push(data.params.exceptionDetails.exception?.description || data.params.exceptionDetails.text);
            if (data.method === 'Network.responseReceived' && data.params.response.url.startsWith(origin) && data.params.response.status >= 400) failedAssets.push(data.params.response.url);
            const request = pending.get(data.id);
            if (!request) return;
            pending.delete(data.id); clearTimeout(request.timeout);
            data.error ? request.reject(new Error(data.error.message)) : request.resolve(data.result);
        });
        send = (method, params = {}) => new Promise((resolve, reject) => {
            const id = ++sequence;
            const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`Timeout: ${method}`)); }, 15000);
            pending.set(id, { resolve, reject, timeout }); socket.send(JSON.stringify({ id, method, params }));
        });
        const evaluate = async expression => {
            const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
            if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
            return result.result.value;
        };
        const waitFor = async expression => {
            for (let i = 0; i < 150; i++) { if (await evaluate(expression).catch(() => false)) return; await pause(100); }
            throw new Error(`Not ready: ${expression}`);
        };
        const navigate = async pathname => {
            await send('Page.navigate', { url: origin + pathname });
            await waitFor('document.readyState === "complete" && catalogDesigns.length > 0 && document.querySelector("#productsGrid [data-design-id]")');
        };
        await send('Runtime.enable'); await send('Network.enable');
        await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
        await navigate('/?banda=Kreator#catalogoPrincipal');
        for (const designId of ['kreator-coma-of-souls', 'kreator-enemy-of-god', 'kreator-extreme-aggression', 'kreator-violent-revolution']) {
            assert(await evaluate(`catalogDesignById.has(${JSON.stringify(designId)})`), designId);
        }
        const bands = await evaluate(`[...new Set(catalogDesigns.filter(design => getCatalogDesignFrontRefs(design).some(ref => ref.role === 'front' && ref.garmentStyle === 'sin_mangas')).map(design => design.band))]`);
        assert(bands.includes('Kreator') && bands.includes('Slayer') && bands.includes('Iron Maiden'));

        const checkBand = async (band, width, landing) => {
            const scope = landing ? 'isCatalogDesignInScope(design)' : `normalizeText(design.band) === normalizeText(${JSON.stringify(band)})`;
            const expected = await evaluate(`catalogDesigns.filter(design => ${scope} && getCatalogDesignFrontRefs(design).some(ref => ref.role === 'front' && ref.garmentStyle === 'sin_mangas')).length`);
            const initialCount = await evaluate('getCatalogDesignResults().length');
            try {
                await waitFor('document.querySelector("#catalogBandSleeveless [data-sleeveless-design-id]")');
            } catch (error) {
                throw new Error(`${band}/${width}/landing=${landing}: ${error.message}; ${JSON.stringify(await evaluate('({garment:bandLandingGarment,collection:bandLandingCollection,section:document.getElementById("catalogBandSleeveless")?.textContent})'))}`);
            }
            assert.equal(await evaluate('document.querySelectorAll("#catalogBandSleeveless [data-sleeveless-design-id]").length'), Math.min(expected, 4), band);
            assert(await evaluate('document.getElementById("catalogBandSleeveless").compareDocumentPosition(productsGrid) & Node.DOCUMENT_POSITION_FOLLOWING'), band);
            await evaluate('document.getElementById("catalogBandSleeveless").scrollIntoView({behavior:"instant"})');
            await waitFor('[...document.querySelectorAll("#catalogBandSleeveless img")].every(img => img.complete && img.naturalWidth > 0)');
            await evaluate('Promise.all([...document.querySelectorAll("#catalogBandSleeveless img")].map(img => img.decode())).then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))');
            assert(await evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), `Overflow ${band}/${width}`);
            if (band === 'Kreator' || (band === 'Slayer' && landing)) {
                const shot = await send('Page.captureScreenshot', { format: 'png' });
                fs.writeFileSync(path.join(reportDir, `${landing ? 'landing-' : ''}${band.toLowerCase()}-${width}.png`), Buffer.from(shot.data, 'base64'));
            }
            const image = await evaluate('document.querySelector("#catalogBandSleeveless img").getAttribute("src")');
            await evaluate('document.querySelector("#catalogBandSleeveless .catalog-design-card-main").click()');
            assert.equal(await evaluate('selectedModalGarment'), 'sin_mangas', band);
            assert.equal(await evaluate('selectedCatalogFrontRef?.image'), image, band);
            await waitFor('document.querySelectorAll(".carousel-slide img")[currentSlide]?.complete && document.querySelectorAll(".carousel-slide img")[currentSlide]?.naturalWidth > 0');
            if (band === 'Kreator') {
                const order = await evaluate('cart.clearCart();selectPrintMode("simple");selectColor("negro");selectSize("M");({added:addToCartFromModal(),summary:cart.generateSummary(),age:selectedAge,cut:selectedCut,color:selectedColor,size:selectedSize,problem:getModalPurchaseProblem(3)})');
                assert(order.added, JSON.stringify(order)); assert(order.summary.includes('sin mangas')); assert(order.summary.includes('$38.000'));
                await evaluate('cart.clearCart()');
            }
            await evaluate('closeModal(false,false);document.querySelector("[data-band-sleeveless-browse]").click()');
            assert.equal(await evaluate('getCatalogDesignResults().length'), expected, band);
            assert(await evaluate(`getCatalogDesignResults().every(design => ${scope})`), `Mixed bands: ${band}`);
            await evaluate('while (!document.getElementById("catalogLoadMore").hidden) loadMoreCatalogDesigns()');
            assert.equal(await evaluate('document.querySelectorAll("#productsGrid [data-design-id]").length'), expected, band);
            const cardImage = await evaluate('document.querySelector("#productsGrid img").getAttribute("src")');
            await evaluate('document.querySelector("#productsGrid .catalog-design-card-main").click()');
            assert.equal(await evaluate('selectedModalGarment'), 'sin_mangas', band);
            assert.equal(await evaluate('selectedCatalogFrontRef?.image'), cardImage, band);
            await evaluate('closeModal(false,false);document.querySelector("[data-band-sleeveless-browse]").click()');
            assert(await evaluate('document.querySelector("#catalogBandSleeveless [data-sleeveless-design-id]") !== null'), band);
            if (!landing) assert.equal(await evaluate('getCatalogDesignResults().length'), initialCount, band);
            results.push({ band, width, landing, sleevelessDesigns: expected });
        };

        for (const width of [360, 1440]) {
            await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 500 });
            for (const [slug, band] of [['acdc', 'AC/DC'], ['metallica', 'Metallica']]) {
                await navigate('/' + slug + '/');
                assert.equal(await evaluate('BAND_LANDING_BAND'), band);
                assert(await evaluate('getCatalogDesignResults().length > 15 && getCatalogDesignResults().every(isCatalogDesignInScope)'));
                assert(await evaluate('document.documentElement.scrollWidth <= innerWidth + 1'));
                if (slug === 'metallica') {
                    assert(await evaluate('["metallica-hardwired-clasica", "metallica-hardwired-alternativa", "metallica-skull-heart"].every(id => getCatalogDesignResults().some(design => design.designId === id))'));
                }
                await evaluate('document.querySelector("#productsGrid .catalog-design-card-main").click()');
                assert.equal(await evaluate('currentCatalogDesign.band'), band);
                await evaluate('closeModal(false,false)');
            }
            await navigate('/megadeth/');
            await evaluate('selectBandLandingCollection("so-far")');
            assert(await evaluate('getCatalogDesignResults().some(design => design.designId === "megadeth-so-far-1988-live")'));
            await evaluate('openCatalogDesign("cd-megadeth-so-far-so-good--alternative", "sin_mangas"); selectColor("blanco"); selectPrintMode("double"); selectSize("M")');
            const soFar = await evaluate('({image:selectedCatalogFrontRef?.image, back:selectedCatalogBackRef?.label, price:resolveModalPriceConfig().doble, added:addToCartFromModal()})');
            assert(soFar.image?.endsWith('sin mangas blanca so far.jpg'), JSON.stringify(soFar));
            assert(soFar.back?.includes('So What!') && soFar.price === 42000 && soFar.added, JSON.stringify(soFar));
            await evaluate('closeModal(false,false); cart.clearCart(); selectBandLandingCollection("featured")');
            await evaluate('document.querySelector(".band-landing-hero a[href=\'#diseno-megadeth-hangar-18-outbreak-vaccination\']").click()');
            await waitFor('currentCatalogDesign?.designId === "megadeth-hangar-18-outbreak-vaccination"');
            await evaluate('closeModal(false,false)');
            assert.equal(await evaluate('document.querySelector("#productsGrid [data-design-id]")?.dataset.designId'), 'megadeth-hangar-18-outbreak-vaccination');
            await evaluate('document.querySelector("#productsGrid .catalog-design-card-main").click()');
            const megadeth = await evaluate('({images:currentModalSourceRefs.map(ref=>ref.image),back:currentCatalogDesign.backOptions.map(ref=>ref.image),selected:selectedCatalogFrontRef?.image})');
            assert.equal(megadeth.images.length, 5, JSON.stringify(megadeth));
            await evaluate('selectModalGarment("sin_mangas")');
            const sleevelessHangar = await evaluate('currentModalSourceRefs.map(ref => ref.image)');
            assert(sleevelessHangar.some(image => image.endsWith('Hangar 18 frente sin mangas.jpg')));
            assert(sleevelessHangar.some(image => image.endsWith('Hangar 18 frente y dorso sin mangas.jpg')));
            for (const [garment, color, simple, double] of [
                ['remera_clasica', 'negro', 38000, 45000],
                ['remera_clasica', 'blanco', 38000, 45000],
                ['sin_mangas', 'negro', 38000, 45000],
                ['sin_mangas', 'blanco', 35000, 42000]
            ]) {
                await evaluate(`selectModalGarment('${garment}'); selectColor('${color}'); selectSize('M')`);
                for (const [mode, expected] of [['simple', simple], ['double', double]]) {
                    const price = '$' + expected.toLocaleString('es-AR');
                    const result = await evaluate(`cart.clearCart(); selectPrintMode('${mode}'); ({
                        price: document.getElementById('modalPrice').textContent,
                        image: selectedCatalogFrontRef?.image,
                        consultation: buildModalConsultationWhatsappMessage(),
                        added: addToCartFromModal(), order: cart.generateSummary()
                    })`);
                    assert(result.price.endsWith(price), JSON.stringify(result));
                    assert(result.added && result.order.includes(price), JSON.stringify(result));
                    if (color === 'blanco') {
                        const expectedImage = garment === 'sin_mangas'
                            ? (mode === 'simple' ? 'Hangar 18 frente sin mangas_blanca.jpg' : 'H18BLANCAS DOBLES.jpg')
                            : (mode === 'simple' ? 'HANGAR FRENTE 4_5 MOCK OFICIAL_BLANCA.jpg' : 'h18BLANCA-REMERA DOBLE ESTAMPA copia.jpg');
                        assert(result.image.endsWith(expectedImage), JSON.stringify(result));
                    }
                    if (garment === 'sin_mangas' && color === 'blanco') assert(result.consultation.includes(price));
                }
            }
            await evaluate('cart.clearCart()');
            await evaluate('selectModalGarment("remera_clasica")');
            assert(megadeth.back.some(image => image.includes('HANGARDORSO')));
            assert(megadeth.selected.includes('HANGAR FRENTE'));
            await evaluate('selectColor("negro");selectSize("M");selectPrintMode("double")');
            const megadethOrder = await evaluate('({added:addToCartFromModal(),summary:cart.generateSummary(),back:selectedCatalogBackRef?.image,price:resolveModalPriceConfig().doble})');
            assert(megadethOrder.added, JSON.stringify(megadethOrder));
            assert(megadethOrder.back.includes('HANGARDORSO'));
            assert.equal(megadethOrder.price, 45000);
            assert(megadethOrder.summary.includes('$45.000'));
            await evaluate('cart.clearCart()');
            await evaluate('closeModal(false,false)');
            await navigate('/?banda=Kreator#catalogoPrincipal');
            await evaluate('openCatalogDesign("kreator-extreme-aggression","sin_mangas")');
            assert.equal(await evaluate('selectedModalGarment'), 'sin_mangas');
            assert(await evaluate('getCatalogDesignSleevelessPreview(currentCatalogDesign)?.image.includes("extreme sin mangas.jpg")'));
            await evaluate('closeModal(false,false)');
            await evaluate('openCatalogDesignForGarment("kreator-violent-revolution","sin_mangas")');
            assert(await evaluate('selectedCatalogFrontRef?.image.includes("violent sin mangas.jpg")'));
            await evaluate('closeModal(false,false)');
            for (const band of bands) {
                await evaluate(`openBandAccess(${JSON.stringify(band)})`);
                await checkBand(band, width, false);
            }
            await evaluate('openBandAccess("AC/DC")');
            assert.equal(await evaluate('document.getElementById("catalogBandSleeveless")'), null, 'Do not advertise missing mocks');
            await evaluate('showFullCatalog()');
            assert.equal(await evaluate('document.getElementById("catalogBandSleeveless")'), null, 'Clear previous band');
            await evaluate('filterByGarment("sin_mangas")');
            assert(await evaluate('getCatalogDesignResults().every(design => Boolean(getCatalogDesignSleevelessPreview(design)))'));
            assert(await evaluate('new Set(getCatalogDesignResults().map(design => design.band)).size') >= bands.length);
            for (const config of configs.filter(config => bands.some(band => band.toLowerCase() === config.band.toLowerCase()))) {
                await navigate(`/${config.slug}/`);
                if (config.slug === 'kreator') {
                    assert.equal(await evaluate('document.querySelector("#bandLandingTitle").textContent'), 'KREATOR · BUENOS AIRES 2026');
                    assert.equal(await evaluate('document.querySelector(".band-landing-hero .band-landing-primary-cta").textContent'), 'ELEGIR MI REMERA');
                    assert(await evaluate('document.querySelector(".band-landing-catalog").compareDocumentPosition(document.querySelector(".purchase-volume-promo")) & Node.DOCUMENT_POSITION_FOLLOWING'));
                    assert.deepEqual(await evaluate('[...document.querySelectorAll("#productsGrid [data-design-id]")].slice(0,6).map(card => card.dataset.designId)'), [
                        'kreator-extreme-aggression', 'cd-kreator-pleasure--p5091', 'kreator-coma-of-souls',
                        'kreator-enemy-of-god', 'kreator-violent-revolution', 'cd-kreator-krushers--p5091'
                    ]);
                    assert(await evaluate('["Gods of Violence","Phantom Antichrist","Pleasure to Kill"].every(name => getCatalogDesignResults().some(design => design.publicName === name))'));
                }
                await checkBand(config.band, width, true);
            }
        }
        assert.deepEqual(errors, []); assert.deepEqual(failedAssets, []);
        fs.writeFileSync(path.join(reportDir, 'results.json'), JSON.stringify({ status: 'PASS', results, errors, failedAssets }, null, 2));
        console.log(JSON.stringify({ status: 'PASS', bands: bands.length, widths: [360, 1440], routesChecked: results.length, visibleMocks: true, bandScopedFilters: true, correctModal: true, cart: true, errors, failedAssets, reportDir }));
    } finally {
        if (send) await send('Browser.close').catch(() => {});
        socket?.close();
        for (let i = 0; i < 20 && chrome.exitCode === null; i++) await pause(100);
        if (chrome.exitCode === null) chrome.kill();
        server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
