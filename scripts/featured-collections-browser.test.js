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
    const expected = ['Megadeth','Slayer','Iron Maiden','Ricardo Iorio','Helloween','Metallica','Pantera'];
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
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'fmd-featured-'));
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
        const reportDir=path.join(root,'reports/featured-collections');
        fs.mkdirSync(reportDir,{recursive:true});
        const results=[];
        for(const width of [390,1440]){
            await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<500});
            await send('Page.navigate',{url:origin+'/'});
            await waitFor('document.querySelectorAll(".catalog-featured-collection-card").length===7');
            assert(await evaluate('!document.getElementById("homeNewsGrid") && !document.querySelector(".home-news-section-in-catalog")'),'Outdated news block must be absent');
            assert(await evaluate('document.querySelector("[data-directory-section=featured]").nextElementSibling?.dataset.directorySection === "more"'),'More bands must follow featured collections directly');
            const state=await evaluate(`(async()=>{
                const cards=[...document.querySelectorAll('.catalog-featured-collection-card')];
                for(const card of cards){const img=card.querySelector('img');img.loading='eager';await img.decode();}
                return {
                    names:cards.map(c=>c.querySelector('.catalog-featured-collection-name').textContent.trim()),
                    images:cards.map(c=>{const i=c.querySelector('img');const b=i.getBoundingClientRect();return {alt:i.alt,src:i.getAttribute('src'),w:i.naturalWidth,h:i.naturalHeight,boxWidth:b.width,boxHeight:b.height,fit:getComputedStyle(i).objectFit};}),
                    links:cards.map(c=>({name:c.textContent.trim(),href:c.getAttribute('href'),filter:c.dataset.bandFilter})),
                    defInMore:[...document.querySelectorAll('[data-directory-section="more"] .catalog-band-card')].some(c=>c.textContent.includes('Def Leppard')),
                    counts:Object.fromEntries(['Pantera','Ricardo Iorio','Metallica'].map(b=>[b,catalogDesigns.filter(d=>normalizeText(d.band)===normalizeText(b)).length])),
                    overflow:document.documentElement.scrollWidth>innerWidth+1
                };
            })()`);
            assert.deepEqual(state.names,expected);
            assert(state.defInMore,'Def Leppard must remain in More Bands');
            assert(!state.overflow,'Horizontal overflow '+width);
            for(const img of state.images){assert(img.w>0&&img.h>0,img.src);assert(img.alt.includes('Frente y dorso'),img.alt);assert(!img.src.includes('hoodie'));assert.equal(img.fit,'contain',img.src);}
            for(const link of state.links){
                if(link.href){assert((await fetch(new URL(link.href,origin))).ok,link.href);}
                else assert(link.filter,link.name);
            }
            await evaluate('document.querySelector("[data-directory-section=featured]").scrollIntoView({behavior:"instant",block:"start"})');
            await pause(350);
            const shot=await send('Page.captureScreenshot',{format:'png'});
            fs.writeFileSync(path.join(reportDir,'featured-'+width+'.png'),Buffer.from(shot.data,'base64'));
            results.push({width,...state});
            await evaluate('document.querySelector(".catalog-featured-collection-card[href=\\"/pantera/\\"]").click()');
            await waitFor('location.pathname==="/pantera/"&&document.querySelectorAll(".catalog-design-card").length>0');
        }
        fs.writeFileSync(path.join(reportDir,'results.json'),JSON.stringify(results,null,2));
        assert.deepEqual(errors, []); assert.deepEqual(failedAssets, []);
        console.log(JSON.stringify({status:'PASS',featured:expected,widths:[390,1440],images:true,fullMockups:true,links:true,defLeppardInMore:true,counts:results[0].counts,errors,failedAssets}));
    } finally {
        if (send) await send('Browser.close').catch(() => {});
        socket?.close();
        for (let i = 0; i < 20 && chrome.exitCode === null; i++) await pause(100);
        if (chrome.exitCode === null) chrome.kill();
        server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    }
}

main().catch(error => { console.error(error); process.exitCode = 1; });


