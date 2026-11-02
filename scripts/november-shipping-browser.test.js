'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawn, execFile } = require('node:child_process');
const { promisify } = require('node:util');
const configs = require('../js/band-archives-config.js');

const root = path.resolve(__dirname, '..');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const expectedZones = { amba: [6000, 10000], centro: [7000, 11000], resto: [8000, 12000] };
const money = value => `$${value.toLocaleString('es-AR')}`;

async function main() {
    const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
    const server = http.createServer((req, res) => {
        try {
            let file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
            if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
            if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
            res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
            fs.createReadStream(file).pipe(res);
        } catch { res.writeHead(404).end(); }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const baseUrl = (process.env.SITE_URL || `http://127.0.0.1:${server.address().port}`).replace(/\/$/, '');
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'fmd-november-shipping-'));
    const chrome = spawn(process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
        '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
        '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'
    ], { windowsHide: true, stdio: 'ignore' });
    let launchError;
    chrome.on('error', error => { launchError = error; });
    let socket;
    let send;
    const results = { scenarios: [], pages: [], customOrders: [] };
    try {
        const portFile = path.join(profile, 'DevToolsActivePort');
        for (let attempt = 0; attempt < 100 && !fs.existsSync(portFile); attempt++) {
            if (launchError) throw launchError;
            await pause(100);
        }
        const port = fs.readFileSync(portFile, 'utf8').split('\n')[0];
        const pages = await fetch(`http://127.0.0.1:${port}/json`).then(res => res.json());
        socket = new WebSocket(pages.find(page => page.type === 'page').webSocketDebuggerUrl);
        await new Promise((resolve, reject) => {
            socket.addEventListener('open', resolve, { once: true });
            socket.addEventListener('error', reject, { once: true });
        });
        const pending = new Map();
        let sequence = 0;
        socket.addEventListener('message', event => {
            const message = JSON.parse(event.data);
            if (!pending.has(message.id)) return;
            const { resolve, reject, timeout } = pending.get(message.id);
            pending.delete(message.id);
            clearTimeout(timeout);
            message.error ? reject(new Error(message.error.message)) : resolve(message.result);
        });
        send = (method, params = {}) => new Promise((resolve, reject) => {
            const id = ++sequence;
            const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
            pending.set(id, { resolve, reject, timeout });
            socket.send(JSON.stringify({ id, method, params }));
        });
        const evaluate = async expression => {
            const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
            if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
            return result.result.value;
        };
        const navigate = async pathname => {
            await send('Page.navigate', { url: baseUrl + pathname });
            for (let attempt = 0; attempt < 100; attempt++) {
                await pause(100);
                if (await evaluate('document.readyState === "complete" && typeof catalogDesigns !== "undefined" && catalogDesigns.length > 0')) return;
            }
            throw new Error(`Catalog load timeout: ${pathname}`);
        };
        await send('Network.enable');
        await send('Network.setCacheDisabled', { cacheDisabled: true });
        await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
        await navigate('/');
        const base = await evaluate(`(() => {
            cart.clearCart(); selectedShippingZone = ''; selectedDeliveryMethod = '';
            localStorage.removeItem(SHIPPING_FORM_STORAGE_KEY);
            openCatalogDesign('cd-iron-maiden-eddie-gaucho-argentino--p7040', 'remera');
            selectRemeraVariant('hombre_clasica'); selectSize('M'); selectColor('negro'); selectPrintMode('simple');
            addToOrderAndOpenCart();
            window.__shippingMessages = [];
            window.open = url => { window.__shippingMessages.push(String(url)); return null; };
            return cart.getCart()[0];
        })()`);
        assert(base && !base.isDouble);
        const fillFields = `(() => {
            for (const [id, value] of Object.entries({ inputNombre: 'Cliente Prueba', inputApellido: 'FMD', inputTelefono: '1112345678', inputDireccion: 'Calle 123', inputCP: '5000', inputLocalidad: 'Córdoba', inputProvincia: 'Córdoba' })) {
                const input = document.getElementById(id);
                if (input) { input.value = value; input.dispatchEvent(new Event('input', { bubbles: true })); }
            }
        })()`;
        for (const [zoneId, prices] of Object.entries(expectedZones)) {
            for (const quantity of [1, 2, 3, 4]) {
                for (const method of ['retiro_andreani', 'domicilio', 'taller']) {
                    await evaluate(`cart.cart = Array.from({length: ${quantity}}, (_, i) => ({...${JSON.stringify(base)}, timestamp: Date.now() + i})); cart.saveCart(); openCartPreview(); selectDeliveryMethod('${method}');`);
                    await evaluate(fillFields);
                    if (method !== 'taller') await evaluate(`(() => { const select = document.getElementById('shippingZone'); select.value = '${zoneId}'; select.dispatchEvent(new Event('change', { bubbles: true })); })()`);
                    const state = await evaluate(`(() => { const totals = calculateCartTotal(); return { totals, name: document.getElementById('inputNombre').value, summary: cart.generateSummary(), aria: document.getElementById('btnConfirmCartWhatsapp').getAttribute('aria-disabled') }; })()`);
                    const shipping = method === 'taller' || quantity >= 3 || (quantity >= 2 && method === 'retiro_andreani') ? 0 : prices[method === 'domicilio' ? 1 : 0];
                    const subtotal = quantity * 38000;
                    const discount = quantity >= 3 ? subtotal * 0.1 : 0;
                    assert.equal(state.totals.envio, shipping, `${zoneId}/${quantity}/${method}`);
                    assert.equal(state.totals.descuento, discount);
                    assert.equal(state.totals.total, subtotal - discount + shipping);
                    assert.equal(state.totals.shippingPending, false);
                    assert.equal(state.name, 'Cliente Prueba', 'Zone changes must preserve customer data');
                    assert.equal(state.aria, 'false');
                    await evaluate('document.getElementById("btnConfirmCartWhatsapp").click()');
                    const url = await evaluate('window.__shippingMessages.at(-1)');
                    const message = new URL(url).searchParams.get('text');
                    const shippingLabel = method === 'domicilio' ? 'Envío a domicilio' : method === 'retiro_andreani' ? 'Envío a sucursal/punto Andreani' : 'Retiro en Villa Martelli';
                    assert(message.includes(`${shippingLabel}: ${shipping ? money(shipping) : 'GRATIS'}`));
                    assert(message.includes(`Total: ${money(subtotal - discount + shipping)}`));
                    if (method !== 'taller') assert(message.includes(`Zona: ${await evaluate(`SHIPPING_ZONES['${zoneId}'].label` )}`));
                    results.scenarios.push({ zone: zoneId, quantity, method, shipping, discount, total: state.totals.total });
                }
            }
        }
        // Missing zone cannot be mistaken for free shipping or sent as a final order.
        await evaluate(`cart.cart = [${JSON.stringify(base)}]; openCartPreview(); selectDeliveryMethod('domicilio'); selectShippingZone('');`);
        await evaluate(fillFields);
        const pendingState = await evaluate(`(() => { const before = window.__shippingMessages.length; document.getElementById('btnConfirmCartWhatsapp').click(); return { before, after: window.__shippingMessages.length, totals: calculateCartTotal(), summary: cart.generateSummary() }; })()`);
        assert.equal(pendingState.before, pendingState.after);
        assert(pendingState.totals.shippingPending);
        assert(pendingState.summary.includes('Total sin envío'));
        assert(!pendingState.summary.includes('GRATIS'));
        await evaluate(`selectShippingZone('resto'); cart.saveCart();`);
        await navigate('/');
        assert.equal(await evaluate('selectedShippingZone'), 'resto', 'Shipping zone must persist on reload');
        await evaluate('openCartPreview()');
        assert.equal(await evaluate('calculateCartTotal().envio'), 12000);
        for (const quantity of [3, 2, 1]) {
            const state = await evaluate(`(() => { const base = cart.getCart()[0]; cart.cart = Array.from({length:${quantity}}, () => ({...base})); renderCartPreview(); return calculateCartTotal(); })()`);
            assert.equal(state.envio, quantity >= 3 ? 0 : 12000);
            assert.equal(state.descuento, quantity >= 3 ? 11400 : 0);
        }
        const mixed = await evaluate(`(() => { const base = cart.getCart()[0]; cart.cart = [base, {...base, cut:'oversize', isDouble:true}, {...base, category:'Hoodies Otras Bandas', isDouble:true}]; renderCartPreview(); return calculateCartTotal(); })()`);
        assert.equal(mixed.subtotal, 146000);
        assert.equal(mixed.descuento, 14600);
        assert.equal(mixed.envio, 0);
        for (const [pathname, width] of [['/', 1440], ['/iron-maiden/', 390], ['/def-leppard/', 360], ['/marty-friedman/', 390]]) {
            await send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: width < 500 });
            await navigate(pathname);
            await evaluate(`cart.cart = [${JSON.stringify(base)}]; openCartPreview(); selectDeliveryMethod('retiro_andreani'); selectShippingZone('centro'); document.querySelector('.shipping-rate-details').open = true;`);
            const layout = await evaluate(`(() => { const box = document.querySelector('.cart-preview-container').getBoundingClientRect(); const select = document.getElementById('shippingZone').getBoundingClientRect(); return { viewport: innerWidth, checkoutWidth: box.width, selectLeft: select.left, selectRight: select.right, visibleText: document.querySelector('.shipping-rate-details').innerText, fee: calculateCartTotal().envio }; })()`);
            assert(layout.checkoutWidth <= width + 1, `${pathname}: checkout overflow`);
            assert(layout.selectLeft >= 0 && layout.selectRight <= width + 1, `${pathname}: zone selector overflow`);
            assert(layout.visibleText.includes('$8.000') && layout.visibleText.includes('$12.000'));
            assert.equal(layout.fee, 7000);
            results.pages.push({ pathname, width, layout });
            await evaluate(`document.getElementById('cartDeliveryGroup').scrollIntoView({block: 'start'})`);
            const shot = await send('Page.captureScreenshot', { format: 'png' });
            const reportDir = path.join(root, 'reports', 'november-shipping');
            fs.mkdirSync(reportDir, { recursive: true });
            fs.writeFileSync(path.join(reportDir, `${pathname.replaceAll('/', '') || 'home'}-${width}.png`), Buffer.from(shot.data, 'base64'));
            // Custom order prices include the existing $5,000 customization fee.
            await evaluate('closeCartPreview(); openCustomOrderBuilder()');
            for (const [zoneId, prices] of Object.entries(expectedZones)) {
                for (const method of ['andreani', 'domicilio', 'retiro']) {
                    const details = await evaluate(`(() => { document.getElementById('customOrderZone').value='${zoneId}'; document.getElementById('customOrderDelivery').value='${method}'; document.getElementById('customOrderGarment').value='oversize'; document.getElementById('customOrderPrint').value='double'; updateCustomOrderQuote(); return getCustomOrderDetails(); })()`);
                    assert.equal(details.productPrice, 53000);
                    assert.equal(details.shipping, method === 'retiro' ? 0 : prices[method === 'domicilio' ? 1 : 0]);
                }
            }
            const custom = await evaluate(`(() => {
                window.__customMessages = []; window.open = url => { window.__customMessages.push(String(url)); return null; };
                document.getElementById('customOrderDelivery').value='domicilio'; document.getElementById('customOrderZone').value='centro';
                document.getElementById('customOrderSize').value='2XL'; document.getElementById('customOrderReference').value='Referencia de prueba';
                document.getElementById('customOrderCP').value='5000'; updateCustomOrderQuote(); submitCustomOrder({preventDefault(){}});
                return window.__customMessages.at(-1);
            })()`);
            const customMessage = new URL(custom).searchParams.get('text');
            assert(customMessage.includes('Total: $64.000') && customMessage.includes('Envío a domicilio: $11.000'));
            results.customOrders.push({ pathname, message: customMessage });
        }
        for (const file of ['index.html', ...configs.map(config => config.output)]) {
            const html = fs.readFileSync(path.join(root, file), 'utf8');
            assert(!/punto Andreani \$5\.000|domicilio \$9\.000|Andreani · \$5\.000|Domicilio · \$9\.000/.test(html), `Old shipping copy: ${file}`);
            assert(html.includes('customOrderZone') && html.includes('shipping-20261102'), `Missing updated form/assets: ${file}`);
        }
        const pricing = await promisify(execFile)(process.execPath, [path.join(__dirname, 'pricing-browser.test.js')], {
            env: { ...process.env, CDP_URL: `http://127.0.0.1:${port}`, PAGE_URL: baseUrl + '/' }, windowsHide: true, timeout: 30000
        });
        assert(pricing.stdout.includes('validados correctamente'));
        const reportDir = path.join(root, 'reports', 'november-shipping');
        fs.writeFileSync(path.join(reportDir, 'results.json'), JSON.stringify(results, null, 2));
        console.log(JSON.stringify({ status: 'PASS', cartScenarios: results.scenarios.length, browserPages: results.pages.length, staticPages: configs.length + 1, persistence: 'PASS', quantityTransitions: 'PASS', mixedGarments: 'PASS', missingZone: 'PASS', customOrders: 'PASS', garmentPricing: 'PASS', reports: 'reports/november-shipping' }, null, 2));
    } finally {
        if (send) await send('Browser.close').catch(() => {});
        if (socket) socket.close();
        for (let attempt = 0; attempt < 20 && chrome.exitCode === null; attempt++) await pause(100);
        if (chrome.exitCode === null) chrome.kill();
        server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
    }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
