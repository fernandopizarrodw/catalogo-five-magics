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
    const designId = 'marty-friedman-introduction';
    const products = JSON.parse(fs.readFileSync(path.join(root,'data/products.json'),'utf8'));
    const previous = JSON.parse(require('node:child_process').execFileSync('git',['show','HEAD:data/products.json'],{cwd:root,encoding:'utf8',maxBuffer:20000000}));
    assert.deepEqual(products.filter(p=>p.id!==7314),previous.filter(p=>p.id!==7314));
    const old = previous.find(p=>p.id===7314), current=products.find(p=>p.id===7314);
    for(let i=0;i<old.variants.length;i++){assert.equal(current.variants[i].img,old.variants[i].img);assert.equal(current.variants[i].name,old.variants[i].name);assert.equal(current.variants[i].designId,old.variants[i].designId);}
    assert.equal(current.variants.length,old.variants.length+2);
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
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'fmd-marty-introduction-'));
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
        for(const page of ['/marty-friedman/','/?banda=Marty%20Friedman#catalogoPrincipal']){
            for(const width of [390,1440]){
                await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<500});
                await send('Page.navigate',{url:origin+page});
                await waitFor('catalogDesigns.length>0&&document.querySelectorAll(".catalog-design-card").length>0');
                assert.equal(await evaluate(`document.querySelectorAll('.catalog-design-card[data-design-id="${designId}"]').length`),1);
                await evaluate(`document.querySelector('.catalog-design-card[data-design-id="${designId}"] .catalog-design-card-main').click()`);
                const refs=await evaluate('currentModalSourceRefs.map(r=>({image:r.image,role:r.role}))');
                assert.equal(refs.length,3);
                assert(refs[0].image.endsWith('/INTRODUCTION.jpg'));
                assert(refs[1].image.endsWith('/INTRODUCTION-DORSO.jpg'));assert.equal(refs[1].role,'back');
                assert(refs[2].image.endsWith('/marty_introduction_doble.jpg'));
                for(let slide=0;slide<3;slide++){
                    await evaluate(`goToSlide(${slide},false)`);
                    await waitFor('document.querySelectorAll(".carousel-slide img")[currentSlide]?.complete&&document.querySelectorAll(".carousel-slide img")[currentSlide]?.naturalWidth>0');
                }
                for(const garment of ['remera_clasica','oversize']){
                    for(const mode of ['simple','double']){
                        await evaluate(`selectRemeraVariant('${garment==='oversize'?'oversize_unisex':'hombre_clasica'}');goToSlide(${mode==='double'?2:0},false);selectPrintMode('${mode}');selectColor('negro');selectSize('M');cart.clearCart()`);
                        const order=await evaluate('({added:addToCartFromModal(),item:cart.getCart()[0],summary:cart.generateSummary()})');
                        assert(order.added,JSON.stringify(order));
                        assert.equal(order.item.frontCode,'MF-7314.V10');
                        const price=garment==='oversize'?(mode==='double'?48000:41000):(mode==='double'?45000:38000);
                        assert(order.summary.includes('* Precio: $'+price.toLocaleString('es-AR')),JSON.stringify({page,width,garment,mode,summary:order.summary}));
                        if(mode==='double'){assert.equal(order.item.backCode,'MF-7314.V16');assert(order.summary.includes('Dorso: Introduction'));assert(!order.summary.includes('a definir'));}
                        assert.equal(await evaluate('cart.getCart().length'),1);
                    }
                }
                assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'Overflow '+width);
                await evaluate('closeModal(false,false);cart.clearCart()');
            }
        }
        assert.deepEqual(errors, []); assert.deepEqual(failedAssets, []);
        console.log(JSON.stringify({status:'PASS',designId,views:['front','back','double'],pages:['general','marty'],widths:[390,1440],prices:{classic:[38000,45000],oversize:[41000,48000]},cartWhatsapp:true,oldVariantsPreserved:true,errors,failedAssets}));
    } finally {
        if (send) await send('Browser.close').catch(() => {});
        socket?.close();
        for (let i = 0; i < 20 && chrome.exitCode === null; i++) await pause(100);
        if (chrome.exitCode === null) chrome.kill();
        server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
