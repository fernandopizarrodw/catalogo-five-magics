'use strict';

const assert = require('node:assert/strict');
const DESIGN_IDS = [
    'peace-sells-anniversary-edition',
    'peace-sells-portada-clasica',
    'peace-sells-vic-en-llamas',
    'peace-sells-circular',
    'peace-sells-formacion-clasica',
    'peace-sells-arte-clasico',
    'peace-sells-40th-anniversary',
    'peace-sells-vic-violeta',
    'peace-sells-vic-naranja',
    'peace-sells-vic-rojo'
];

async function main() {
    const pages = await fetch('http://127.0.0.1:9333/json').then(response => response.json());
    const page = pages.find(item => item.type === 'page');
    assert(page?.webSocketDebuggerUrl, 'Chrome CDP no disponible');
    const socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
        socket.addEventListener('open', resolve, { once: true });
        socket.addEventListener('error', reject, { once: true });
    });
    let id = 0;
    const pending = new Map();
    socket.addEventListener('message', event => {
        const message = JSON.parse(event.data);
        if (!pending.has(message.id)) return;
        const handlers = pending.get(message.id);
        pending.delete(message.id);
        message.error ? handlers.reject(new Error(message.error.message)) : handlers.resolve(message.result);
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
        const requestId = ++id;
        pending.set(requestId, { resolve, reject });
        socket.send(JSON.stringify({ id: requestId, method, params }));
    });
    const evaluate = async expression => {
        const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
        if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
        return result.result.value;
    };

    try {
        await send('Page.navigate', { url: 'http://127.0.0.1:5500/megadeth/' });
        for (let attempt = 0; attempt < 80; attempt++) {
            if (await evaluate("document.readyState === 'complete' && typeof selectBandLandingCollection === 'function' && document.querySelectorAll('.catalog-design-card').length > 0")) break;
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        const expression = '(async () => {' +
            "selectBandLandingCollection('peace-sells');" +
            'await new Promise(resolve => setTimeout(resolve, 100));' +
            'const ids = ' + JSON.stringify(DESIGN_IDS) + ';' +
            "const cards = ids.map(id => document.querySelector('.catalog-design-card[data-design-id=' + id + ']'));" +
            "const images = cards.map(card => card?.querySelector('img')?.src).filter(Boolean);" +
            "const missing = (await Promise.all(images.map(async src => ({ src, ok: (await fetch(src)).ok })))).filter(item => !item.ok);" +
            "cards[0].querySelector('.catalog-design-card-main').click();" +
            "selectPrintMode('double');" +
            "return { found: cards.filter(Boolean).length, missing, specificBacks: currentCatalogDesign.backOptions.map(back => back.label), visibleBackChoices: getCatalogDesignBackChoices().map(back => back.label), modalOpen: document.getElementById('modal').classList.contains('active') };" +
            '})()';
        const result = await evaluate(expression);
        assert.equal(result.found, 10, JSON.stringify(result));
        assert.equal(result.missing.length, 0, JSON.stringify(result.missing));
        assert.equal(result.specificBacks.length, 3, JSON.stringify(result));
        assert.deepEqual(result.visibleBackChoices, result.specificBacks, JSON.stringify(result));
        assert(result.modalOpen, 'El modal no abrió');
        console.log('Peace Sells: 10 frentes y 3 dorsos por diseño, sin imágenes rotas');
    } finally {
        socket.close();
    }
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
