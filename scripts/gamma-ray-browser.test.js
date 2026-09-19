'use strict';

const assert = require('node:assert/strict');

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
    const navigate = async url => {
        await send('Page.navigate', { url });
        for (let attempt = 0; attempt < 80; attempt++) {
            if (await evaluate("document.readyState === 'complete' && document.querySelectorAll('.catalog-design-card').length > 0")) return;
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        throw new Error(`La pagina no termino de cargar: ${url}`);
    };

    try {
        await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
        await navigate('http://127.0.0.1:5500/?banda=Gamma%20Ray#catalogoPrincipal');
        const catalog = await evaluate(`(async () => {
            const cards = [...document.querySelectorAll('.catalog-design-card')];
            const names = cards.map(card => card.querySelector('.catalog-design-copy strong')?.textContent.trim());
            const bands = cards.map(card => card.querySelector('.catalog-design-band')?.textContent.trim());
            const images = [...new Set(cards.map(card => card.querySelector('img')?.src).filter(Boolean))];
            const missing = (await Promise.all(images.map(async src => ({ src, ok: (await fetch(src)).ok })))).filter(item => !item.ok);
            cards[0].querySelector('.catalog-design-card-main').click();
            return {
                cards: cards.length,
                names,
                bands,
                missing,
                modalOpen: document.getElementById('modal').classList.contains('active'),
                band: document.getElementById('productsCount').textContent
            };
        })()`);
        assert.equal(catalog.cards, 9, JSON.stringify(catalog));
        assert.equal(new Set(catalog.names).size, 9, JSON.stringify(catalog.names));
        assert.equal(catalog.missing.length, 0, JSON.stringify(catalog.missing));
        assert(catalog.modalOpen, 'El primer diseño no abre el modal');
        assert(catalog.bands.every(band => band === 'Gamma Ray'), JSON.stringify(catalog.bands));

        await navigate('http://127.0.0.1:5500/helloween/');
        const related = await evaluate(`(() => {
            const link = document.querySelector('.band-landing-related-archive');
            return { href: link?.getAttribute('href'), text: link?.textContent.replace(/\\s+/g, ' ').trim() };
        })()`);
        assert.equal(related.href, '/?banda=Gamma%20Ray#catalogoPrincipal');
        assert(related.text.includes('GAMMA RAY') && related.text.includes('KAI HANSEN'), JSON.stringify(related));
        console.log('Gamma Ray: 9 diseños, imágenes, modal y acceso desde Helloween correctos');
    } finally {
        socket.close();
    }
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
