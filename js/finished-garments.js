(() => {
    const mobile = matchMedia('(max-width: 700px)');
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const narrowMobile = matchMedia('(max-width: 480px)');
    const enableSwipe = (track, move, breakpoint = mobile) => {
        let startX = 0;
        let startY = 0;
        let suppressClickUntil = 0;
        track.addEventListener('touchstart', event => {
            startX = event.changedTouches[0].clientX;
            startY = event.changedTouches[0].clientY;
        }, { passive: true });
        track.addEventListener('touchend', event => {
            if (!breakpoint.matches) return;
            const deltaX = event.changedTouches[0].clientX - startX;
            const deltaY = event.changedTouches[0].clientY - startY;
            if (Math.abs(deltaX) < 40 || Math.abs(deltaX) < Math.abs(deltaY)) return;
            suppressClickUntil = Date.now() + 400;
            move(deltaX < 0 ? 1 : -1);
        }, { passive: true });
        return () => Date.now() < suppressClickUntil;
    };

    const section = document.querySelector('.finished-garments');
    const track = section?.querySelector('[data-finished-track]');
    const slides = [...(track?.querySelectorAll('.finished-garments-slide') || [])];
    const counter = section?.querySelector('[data-finished-counter]');
    const dialog = document.getElementById('finishedGarmentsLightbox');
    if (!track || !slides.length || !dialog) return;

    track.classList.add('is-carousel');

    const currentIndex = () => {
        const center = track.scrollLeft + track.clientWidth / 2;
        const origin = slides[0].offsetLeft;
        return slides.reduce((best, slide, index) =>
            Math.abs(slide.offsetLeft - origin + slide.clientWidth / 2 - center)
                < Math.abs(slides[best].offsetLeft - origin + slides[best].clientWidth / 2 - center) ? index : best, 0);
    };
    const updateCounter = () => { counter.value = `${currentIndex() + 1} / ${slides.length}`; };
    const move = offset => {
        const index = Math.max(0, Math.min(slides.length - 1, currentIndex() + offset));
        track.scrollTo({ left: slides[index].offsetLeft - slides[0].offsetLeft, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
    };
    const shouldSuppressClick = enableSwipe(track, move);
    section.querySelector('[data-finished-prev]').addEventListener('click', () => move(-1));
    section.querySelector('[data-finished-next]').addEventListener('click', () => move(1));
    track.addEventListener('scroll', updateCounter, { passive: true });
    track.addEventListener('keydown', event => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
            event.preventDefault();
            move(event.key === 'ArrowRight' ? 1 : -1);
        }
    });

    let opener = null;
    slides.forEach(slide => slide.addEventListener('click', () => {
        if (shouldSuppressClick()) return;
        opener = slide;
        const source = slide.querySelector('img');
        const image = dialog.querySelector('img');
        image.src = source.src;
        image.alt = source.alt;
        dialog.showModal();
    }));
    dialog.querySelector('[data-finished-close]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => opener?.focus());
    section.querySelector('.finished-garments-footer a').addEventListener('click', event => {
        event.preventDefault();
        document.getElementById('bandCatalogTitle')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    });
    updateCounter();

    document.querySelectorAll('.helloween-featured-option-group').forEach(group => {
        const optionTrack = group.querySelector('.helloween-featured-option-grid');
        const options = [...optionTrack.querySelectorAll('figure')];
        const controls = group.querySelector('.helloween-featured-option-controls');
        if (!controls || options.length < 2) return;
        optionTrack.classList.add('is-carousel');
        const output = controls.querySelector('output');
        const index = () => options.reduce((best, option, i) =>
            Math.abs(option.offsetLeft - options[0].offsetLeft - optionTrack.scrollLeft)
                < Math.abs(options[best].offsetLeft - options[0].offsetLeft - optionTrack.scrollLeft) ? i : best, 0);
        const update = () => { output.value = `${index() + 1} / ${options.length}`; };
        const moveOption = offset => {
            const next = Math.max(0, Math.min(options.length - 1, index() + offset));
            optionTrack.scrollTo({ left: options[next].offsetLeft - options[0].offsetLeft, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
        };
        enableSwipe(optionTrack, moveOption, narrowMobile);
        controls.querySelector('[data-option-prev]').addEventListener('click', () => moveOption(-1));
        controls.querySelector('[data-option-next]').addEventListener('click', () => moveOption(1));
        optionTrack.addEventListener('scroll', update, { passive: true });
        update();
    });
})();
