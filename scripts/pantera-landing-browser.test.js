'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawn, execFileSync } = require('node:child_process');
const { buildCatalogDesigns } = require('../js/catalog-design.js');
const config = require('../js/band-archives-config.js').find(c => c.slug === 'pantera');
const root = path.resolve(__dirname, '..');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
    const products = JSON.parse(fs.readFileSync(path.join(root, 'data/products.json'), 'utf8'));
    const designs = buildCatalogDesigns(products, { resolveDesignId: ({product,conceptName,transitionId,slugify}) => product.designFamilyId
        ? `cd-${slugify(product.designFamilyId)}--${slugify(conceptName)}` : `cd-${transitionId}--p${product.id}` }).filter(d=>d.band==='Pantera');
    assert.equal(designs.length,36);
    assert(designs.every(d=>config.designOrder.includes(d.designId)));
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
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'fmd-pantera-'));
    const chrome = spawn(process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
    let socket, send, launchError;
    chrome.on('error', error => { launchError = error; });
    const errors = [], failedAssets = [];
    const reportDir = path.join(root, 'reports/pantera-landing');
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
            throw new Error(`Not ready: ${expression}; ${JSON.stringify({errors,failedAssets,state:await evaluate('({ready:document.readyState,count:typeof catalogDesigns!=="undefined"?catalogDesigns.length:-1})')})}`);
        };
        await send('Runtime.enable'); await send('Network.enable');
        await send('Page.navigate', { url: `${origin}/pantera/` });
        await waitFor('document.readyState === "complete" && catalogDesignById.has("cd-pantera-cowboys-from-hell--p4192") && document.querySelector("#productsGrid [data-design-id]")');
        assert.equal(await evaluate('catalogDesigns.filter(d=>d.band==="Pantera").length'), 36);
        assert(await evaluate('getCatalogDesignResults().every(d=>d.band === "Pantera")'));
        for (const width of [360, 1440]) {
            await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 500 });
            await evaluate('window.scrollTo({top:0,behavior:"instant"})');
            await waitFor('document.querySelector(".band-landing-hero-art img").complete && document.querySelector(".band-landing-hero-art img").naturalWidth>0');
            assert(await evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), `Overflow at ${width}`);
            if (width < 500) assert(await evaluate('document.querySelector(".pantera-header-chat").getBoundingClientRect().width>0'));
            const shot = await send('Page.captureScreenshot', { format: 'png' });
            fs.writeFileSync(path.join(reportDir, `hero-${width}.png`), Buffer.from(shot.data, 'base64'));
            for (const collection of ['', 'albums', 'members', 'cfh', 'live']) {
                await evaluate(`currentSearch='no-match';document.getElementById('searchInput').value=currentSearch;document.querySelector('[data-pantera-collection="${collection}"]').click()`);
                const state = await evaluate('({collection:bandLandingCollection,search:currentSearch,garment:bandLandingGarment,results:getCatalogDesignResults().map(d=>d.designId)})');
                assert.equal(state.collection, collection); assert.equal(state.search, ''); assert.equal(state.garment, 'remera');
                assert(state.results.length > 0, `Empty collection: ${collection}`);
                const expected = collection ? config.collections.find(c=>c.id===collection).match.designIds : config.designOrder;
                assert(state.results.every(id=>expected.includes(id)));
                await waitFor('!document.querySelector("#productsGrid .catalog-design-card img") || (document.querySelector("#productsGrid .catalog-design-card img").complete && document.querySelector("#productsGrid .catalog-design-card img").naturalWidth>0)');
            }
            await evaluate('selectBandLandingCollection("");selectBandLandingGarment("hoodie")');
            assert.equal(await evaluate('getCatalogDesignResults().length'), designs.filter(d=>d.previewsByGarment.hoodie.length).length);
            await evaluate('selectBandLandingGarment("buzo_cuello_redondo")');
            assert.deepEqual(await evaluate('getCatalogDesignResults().map(d=>d.designId)'), ['pantera-cfh-simbolo-rojo']);
            await evaluate('selectBandLandingGarment("remera")');
            assert.equal(await evaluate('getCatalogDesignResults().length'), 33);
            const simple = await evaluate(`(() => {cart.clearCart();openCatalogDesign('pantera-live-from-donington-94','remera_clasica');selectSize('M');selectColor('negro');selectPrintMode('simple');return {added:addToCartFromModal(),summary:cart.generateSummary()};})()`);
            assert(simple.added); assert(simple.summary.includes('Donington')); assert(simple.summary.includes('* Precio: $38.000'));
            await evaluate('selectRemeraVariant("oversize_unisex")');
            assert.deepEqual(await evaluate('({simple:resolveModalPriceConfig().simple,double:resolveModalPriceConfig().doble})'), {simple:41000,double:48000});
            await evaluate('closeModal(false,false);cart.clearCart();openCatalogDesign("cd-pantera-tour-2000--p418","remera_clasica");selectSize("L");selectColor("negro");selectCatalogDesignBack(418,2)');
            const double = await evaluate('({added:addToCartFromModal(),item:cart.getCart()[0],summary:cart.generateSummary()})');
            assert(double.added); assert.equal(double.item.backCode,'PT2-418.V3'); assert(double.summary.includes('* Precio: $45.000'));
            assert(double.item.frontImage.endsWith('pantera_tour_2000_frente.jpg'));
            assert(double.item.backImage.endsWith('pantera_tour_2000_dorso.jpg'));
            await evaluate('closeModal(false,false);cart.clearCart();document.getElementById("tablaDeMedidas").open=true;selectLandingSizeGuide("hombre")');
            assert((await evaluate('document.getElementById("landingSizeGuideTable").textContent')).includes('Ancho axila a axila'));
            await evaluate('document.getElementById("tablaDeMedidas").open=false');
        }
        await send('Page.navigate', { url: `${origin}/pantera/#diseno-cd-pantera-tour-2000--p418` });
        await waitFor('currentCatalogDesign?.designId === "cd-pantera-tour-2000--p418"');
        await send('Page.reload');
        await waitFor('currentCatalogDesign?.designId === "cd-pantera-tour-2000--p418"');
        assert.deepEqual(errors, []); assert.deepEqual(failedAssets, []);
        console.log(JSON.stringify({status:'PASS',designs:36,remeras:33,hoodies:7,buzos:1,widths:[360,1440],collections:true,prices:true,frontAndBack:true,cartWhatsapp:true,directLink:true,errors,failedAssets,screenshots:reportDir}));

    } finally {
        if (send) await send('Browser.close').catch(() => {});
        socket?.close();
        for (let i = 0; i < 20 && chrome.exitCode === null; i++) await pause(100);
        if (chrome.exitCode === null) chrome.kill();
        server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

