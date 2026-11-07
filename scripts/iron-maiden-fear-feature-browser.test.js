'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
    const designId = 'iron-maiden-fear-of-the-dark-halloween-2026-original-fmd';
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
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'fmd-maiden-fear-'));
    const chrome = spawn(process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
    let socket, send, launchError;
    chrome.on('error', error => { launchError = error; });
    const errors = [], failedAssets = [];
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
        const reportDir=path.join(root,'reports/maiden-fear-feature');
        fs.mkdirSync(reportDir,{recursive:true});
        for(const width of [390,1440]){
            await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<500});
            await send('Page.navigate',{url:origin+'/iron-maiden/'});
            await waitFor('catalogDesigns.length>0&&document.querySelectorAll(".catalog-design-card").length>0');
            const page=await evaluate(`(async()=>{
                const section=document.getElementById('bandFearFeature');
                for(const img of section.querySelectorAll('img')){img.loading='eager';await img.decode();}
                return {
                    beforeAnniversary:Boolean(section.compareDocumentPosition(document.getElementById('bandAnniversaryCollection'))&Node.DOCUMENT_POSITION_FOLLOWING),
                    firstSection:[...document.querySelectorAll('main>section')].find(s=>!s.classList.contains('band-landing-hero'))?.id,
                    firstDesign:document.querySelector('.catalog-design-card')?.dataset.designId,
                    order:BAND_LANDING_DESIGN_ORDER[0],
                    images:[...section.querySelectorAll('img')].map(i=>({src:i.getAttribute('src'),loaded:i.naturalWidth>0,width:i.getBoundingClientRect().width,height:i.getBoundingClientRect().height})),
                    overflow:document.documentElement.scrollWidth>innerWidth+1
                };
            })()`);
            assert(page.beforeAnniversary);assert.equal(page.firstSection,'bandFearFeature');
            assert.equal(page.firstDesign,designId);assert.equal(page.order,designId);
            assert(page.images.every(i=>i.loaded && Math.abs(i.height/i.width-1.25)<0.03));assert.equal(page.images.length,2);assert(!page.overflow);
            await evaluate('document.getElementById("bandFearFeature").scrollIntoView({behavior:"instant",block:"start"})');
            await pause(350);
            const shot=await send('Page.captureScreenshot',{format:'png'});
            fs.writeFileSync(path.join(reportDir,'feature-'+width+'.png'),Buffer.from(shot.data,'base64'));
            for(const option of [0,1]){
                const state=await evaluate(`(()=>{
                    document.querySelectorAll('#bandFearFeature .band-featured-collection-card')[${option}].click();
                    selectSize('M');selectColor('negro');
                    cart.clearCart();
                    return {id:currentCatalogDesign.designId,mode:selectedPrintMode,price:resolveModalPriceConfig(),front:selectedCatalogFrontRef?.image,back:selectedCatalogBackRef,added:addToCartFromModal(),summary:cart.generateSummary()};
                })()`);
                assert.equal(state.id,designId);assert(state.added);
                assert.equal(state.price.simple,38000);assert.equal(state.price.doble,45000);
                assert.equal(state.mode,option?'double':'simple');
                assert(state.front.includes(option?'FOTD DOBLE FECHAS.jpg':'FOTD FRENTE.jpg'));
                assert(state.summary.includes(option?'* Precio: $45.000':'* Precio: $38.000'),state.summary);
                if(option){assert.equal(state.back.productId,7315);assert.equal(state.back.variantIndex,2);assert(state.summary.includes('Set List Argentina 2026'));}
                await evaluate('closeModal(false,false);cart.clearCart()');
            }
        }
        assert.deepEqual(errors, []); assert.deepEqual(failedAssets, []);
        console.log(JSON.stringify({status:'PASS',designId,firstFeature:true,firstCatalogCard:true,widths:[390,1440],images:true,simple:38000,double:45000,setlistBack:true,cartWhatsapp:true,errors,failedAssets}));
    } finally {
        if (send) await send('Browser.close').catch(() => {});
        socket?.close();
        for (let i = 0; i < 20 && chrome.exitCode === null; i++) await pause(100);
        if (chrome.exitCode === null) chrome.kill();
        server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    }
}

main().catch(error => { console.error(error); process.exitCode = 1; });




