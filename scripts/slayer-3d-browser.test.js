'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawn, execFileSync } = require('node:child_process');
const { buildCatalogDesigns } = require('../js/catalog-design.js');
const config = require('../js/band-archives-config.js').find(c => c.slug === 'slayer');
const root = path.resolve(__dirname, '..');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
    const products = JSON.parse(fs.readFileSync(path.join(root, 'data/products.json'), 'utf8'));
    const previous = JSON.parse(execFileSync('git', ['show', 'HEAD:data/products.json'], { cwd: root, encoding: 'utf8', maxBuffer: 20000000 }));
    const designs = buildCatalogDesigns(products).filter(d => d.band === 'Slayer');
    const oldDesigns = buildCatalogDesigns(previous).filter(d => d.band === 'Slayer');
    assert.equal(designs.length, oldDesigns.length + 13);
    for (const old of oldDesigns) {
        const current = designs.find(d => d.designId === old.designId);
        assert(current, `Lost link: ${old.designId}`);
        assert.equal(current.orderCodeBase, old.orderCodeBase);
    }
    const ids = config.collections.find(c => c.id === '3d-fmd').match.designIds;
    assert.equal(ids.length, 11);
    assert(designs.every(d => config.designOrder.includes(d.designId)));
    const html = fs.readFileSync(path.join(root, 'slayer/index.html'), 'utf8');
    const inline = JSON.parse(html.match(/window.FMD_BAND_LANDING = Object.freeze\(([^\n]+)\);/)[1]);
    assert.deepEqual(inline.collections, config.collections);
    assert.deepEqual(inline.designOrder, config.designOrder);
    const referenced = JSON.stringify(products.filter(p => p.band === 'Slayer'));
    for (const folder of ['3D editions', 'frente', 'dorso', 'dobles']) {
        for (const name of fs.readdirSync(path.join(root, 'images/slayer', folder))) {
            assert(referenced.includes(`images/slayer/${folder}/${name}`), `Unlinked: ${name}`);
        }
    }
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
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'fmd-slayer-3d-'));
    const chrome = spawn(process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
    let socket, send, launchError;
    chrome.on('error', error => { launchError = error; });
    const errors = [], failedAssets = [];
    const reportDir = path.join(root, 'reports/slayer-3d');
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
        await send('Runtime.enable'); await send('Network.enable');
        await send('Page.navigate', { url: `${origin}/slayer/` });
        await waitFor('document.readyState === "complete" && catalogDesignById.has("slayer-3d-fmd-goat-flame")');
        for (const width of [360, 1440]) {
            await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 500 });
            await evaluate('document.getElementById("ediciones3DFmd").scrollIntoView({behavior:"instant",block:"start"})');
            await waitFor('[...document.querySelectorAll(".slayer-3d-card img")].filter(i=>i.offsetParent).every(i=>i.complete && i.naturalWidth>0)');
            assert(await evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), `Overflow at ${width}`);
            const shot = await send('Page.captureScreenshot', { format: 'png' });
            fs.writeFileSync(path.join(reportDir, `section-${width}.png`), Buffer.from(shot.data, 'base64'));
            for (const id of ['slayer-3d-fmd-reign-in-blood', 'slayer-3d-fmd-goat-flame', 'slayer-3d-fmd-aguila']) {
                await evaluate(`document.querySelector('[data-slayer-3d-design="${id}"]').click()`);
                assert.equal(await evaluate('currentCatalogDesign?.designId'), id, JSON.stringify({ errors, state: await evaluate('({ready:document.readyState,band:BAND_LANDING_BAND,has:catalogDesignById.has("slayer-3d-fmd-reign-in-blood"),launch:!!document.getElementById("slayerLaunchImage")})') }));
                await waitFor('document.querySelectorAll(".carousel-slide img")[currentSlide]?.complete && document.querySelectorAll(".carousel-slide img")[currentSlide]?.naturalWidth > 0');
                await evaluate('closeModal(false,false)');
            }
            await evaluate('currentSearch="nothing";document.getElementById("searchInput").value=currentSearch;selectBandLandingGarment("sin_mangas");document.querySelector("[data-slayer-3d-collection]").click()');
            assert.deepEqual(await evaluate('({collection:bandLandingCollection,garment:bandLandingGarment,search:currentSearch,count:getCatalogDesignResults().length})'), { collection: '3d-fmd', garment: 'remera', search: '', count: 11 });
            for (const id of ids.filter(id => id.startsWith('slayer-3d-fmd-'))) {
                await evaluate(`openCatalogDesign('${id}','remera_clasica');selectColor('negro');selectSize('M')`);
                assert.equal(await evaluate('selectedPrintMode'), 'simple');
                assert.deepEqual(await evaluate('({simple:resolveModalPriceConfig().simple,double:resolveModalPriceConfig().doble})'), { simple: 38000, double: 45000 });
                await waitFor('document.querySelectorAll(".carousel-slide img")[currentSlide]?.complete && document.querySelectorAll(".carousel-slide img")[currentSlide]?.naturalWidth > 0');
                await evaluate('closeModal(false,false)');
            }
            const order = await evaluate(`(() => {
                cart.clearCart();openCatalogDesign('slayer-3d-fmd-goat-flame','remera_clasica');
                const index=currentModalSourceRefs.findIndex(r=>r.autoSelectBack==='Dorso Goat Flame - Tour 2026');
                goToSlide(index,false);selectSize('M');selectColor('negro');
                const added=addToCartFromModal();return {added,item:cart.getCart()[0],summary:cart.generateSummary()};
            })()`);
            assert(order.added); assert.equal(order.item.frontCode, 'S3F-7316.V10'); assert.equal(order.item.backCode, 'S3F-7316.V11');
            assert(order.summary.includes('* Precio: $45.000')); assert(order.summary.includes('Goat Flame')); assert(order.summary.includes('Tour 2026'));
            assert.equal(await evaluate('cart.getCart().length'), 1);
            await evaluate('selectRemeraVariant("oversize_unisex")');
            assert.deepEqual(await evaluate('({simple:resolveModalPriceConfig().simple,double:resolveModalPriceConfig().doble})'), { simple: 41000, double: 48000 });
            await evaluate('closeModal(false,false);cart.clearCart();openCatalogDesign("slayer-reign-in-blood-tres-cruces","remera_clasica");selectSize("L");selectColor("negro")');
            assert.equal(await evaluate('selectedPrintMode'), 'double');
            assert.equal(await evaluate('selectedCatalogBackRef?.label'), 'Dorso Reign in Blood - Tres Cruces', JSON.stringify(await evaluate('({front:currentCatalogDesign.front,backs:currentCatalogDesign.backOptions,choices:getCatalogDesignBackChoices(),print:selectedPrintMode,garment:selectedModalGarment})')));
            assert(await evaluate('addToCartFromModal()'));
            assert((await evaluate('cart.generateSummary()')).includes('* Precio: $45.000'));
            await evaluate('closeModal(false,false);cart.clearCart()');
        }
        await send('Page.navigate', { url: `${origin}/slayer/#diseno-slayer-3d-fmd-reign-in-blood` });
        await waitFor('currentCatalogDesign?.designId === "slayer-3d-fmd-reign-in-blood"');
        await send('Page.reload');
        await waitFor('currentCatalogDesign?.designId === "slayer-3d-fmd-reign-in-blood"');
        assert.deepEqual(errors, []); assert.deepEqual(failedAssets, []);
        console.log(JSON.stringify({ status: 'PASS', slayerDesigns: designs.length, newDesigns: 13, collection3d: ids.length, widths: [360, 1440], prices: true, frontBackCodes: true, cartMessage: true, permanentLinks: true, errors, failedAssets, screenshots: reportDir }));
    } finally {
        if (send) await send('Browser.close').catch(() => {});
        socket?.close();
        for (let i = 0; i < 20 && chrome.exitCode === null; i++) await pause(100);
        if (chrome.exitCode === null) chrome.kill();
        server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
