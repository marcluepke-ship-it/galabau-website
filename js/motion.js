(() => {
  'use strict';
  const story = document.querySelector('.story');
  const stage = document.querySelector('.story-stage');
  const intro = story?.querySelector('.hero-intro');
  const label = story?.querySelector('[data-scene-label]');
  const process = document.querySelector('[data-process]');
  const demo = document.querySelector('.demo-scroll');
  const demoViewport = document.querySelector('.new-page');
  const garden = story?.querySelector('.hero-photo');
  const gardenImage = garden?.querySelector('img');
  const oldGarden = story?.querySelector('.os-body img');
  const newGarden = story?.querySelector('.demo-hero-image');
  const project = document.querySelector('.feature-projects');
  const promise = document.querySelector('.hero-promise');
  let gardenGeometry = null;
  let projectStart = 0;
  let projectDistance = 1;
  let typingTimer;
  const skinLabels = {klassisch: 'Neu: Klassisch', modern: 'Neu: Modern', natur: 'Neu: Natürlich'};
  let lastSkin = '';
  let lastMessage = false;
  let lastMessage2 = false;
  const reveals = [...document.querySelectorAll('[data-reveal]')];
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (n) => Math.max(0, Math.min(1, n));
  const range = (n, start, end) => clamp((n - start) / (end - start));
  const ease = (n) => n * n * (3 - 2 * n);
  const hasStory = Boolean(story && stage);
  const activeRegions = new Set();
  let storyTop = 0;
  let distance = 1;
  let processStart = 0;
  let processDistance = 1;
  let scheduled = false;
  let needsMeasure = true;
  let forceUpdate = true;
  let lastLabel = '';
  let lastProcessProgress = '';
  let revealObserver;
  // The process line continues, loops once around the next chapter title and swings out.
  const linkHost = document.querySelector('.packages');
  const linkHeading = document.getElementById('packages-title');
  const linkRail = document.querySelector('.process-rail');
  let link = null;
  let linkStart = 0;
  let linkDistance = 1;
  let lastLink = '';
  if (linkHost && linkHeading && linkRail) {
    const ns = 'http://www.w3.org/2000/svg';
    link = document.createElementNS(ns, 'svg');
    link.setAttribute('class', 'chapter-link');
    link.setAttribute('aria-hidden', 'true');
    link.innerHTML = '<path pathLength="1"/>';
    linkHost.prepend(link);
  }

  function measureLink(position) {
    const host = linkHost.getBoundingClientRect();
    const rail = linkRail.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(linkHeading);
    const title = range.getBoundingClientRect();
    const sx = rail.left - host.left + rail.width / 2;
    const sy = rail.bottom - host.top;
    const x1 = Math.max(6, title.left - host.left - 34);
    const x2 = Math.min(host.width - 8, title.right - host.left + 40);
    const y1 = title.top - host.top - 34;
    const y2 = title.bottom - host.top + 20;
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const k = .78;
    const ax = mx + (x2 - mx) * .55;
    const ex = host.width + 40;
    const ey = y1 - 6;
    const f = (n) => n.toFixed(1);
    link.querySelector('path').setAttribute('d', [
      `M${f(sx)} ${f(sy)}`,
      `C${f(sx)} ${f(sy + (y1 - sy) * .6)} ${f(ax + 160)} ${f(y1 - 4)} ${f(ax)} ${f(y1)}`,
      `C${f(ax - 40)} ${f(y1)} ${f(mx + 40)} ${f(y1)} ${f(mx)} ${f(y1)}`,
      `C${f(mx - (mx - x1) * k)} ${f(y1)} ${f(x1)} ${f(my - (my - y1) * k)} ${f(x1)} ${f(my)}`,
      `C${f(x1)} ${f(my + (y2 - my) * k)} ${f(mx - (mx - x1) * k)} ${f(y2)} ${f(mx)} ${f(y2)}`,
      `C${f(mx + (x2 - mx) * k)} ${f(y2)} ${f(x2)} ${f(my + (y2 - my) * k)} ${f(x2)} ${f(my)}`,
      `C${f(x2)} ${f(my - (my - y1) * .9)} ${f(x2 + (ex - x2) * .35)} ${f(ey + 20)} ${f(ex)} ${f(ey - 30)}`,
    ].join(' '));
    linkStart = rail.bottom + position - innerHeight * .8;
    linkDistance = Math.max(1, (title.top + title.height / 2 + position - innerHeight * .4) - linkStart);
  }

  function setLink(progress) {
    if (!link) return;
    const value = progress.toFixed(4);
    if (value !== lastLink) {
      link.style.setProperty('--link', value);
      lastLink = value;
    }
  }

  // Only resize, font loading, and layout changes refresh geometry. The scroll
  // path uses these cached document coordinates without asking for layout.
  function measure(position) {
    if (hasStory) {
      storyTop = story.getBoundingClientRect().top + position;
      distance = Math.max(1, story.offsetHeight - stage.offsetHeight);
      if (demo && demoViewport) stage.style.setProperty('--demo-travel', `${Math.max(0, demo.scrollHeight - demoViewport.clientHeight + 22)}px`);
      measureGarden();
    }
    if (project) {
      const bounds = project.getBoundingClientRect();
      projectStart = bounds.top + position - innerHeight * .94;
      projectDistance = Math.max(1, innerHeight * .62);
    }
    if (process) {
      const bounds = process.getBoundingClientRect();
      processStart = bounds.top + position - innerHeight * .78;
      processDistance = Math.max(1, bounds.height + innerHeight * .43);
    }
    if (link) measureLink(position);
    needsMeasure = false;
  }

  // Both landing rectangles are measured only when layout changes. The one
  // original photograph travels between them; its crop keeps the source ratio.
  function measureGarden() {
    if (!garden || !gardenImage || !oldGarden || !newGarden || !demoViewport) return;
    const savedSkin = demoViewport.dataset.skin;
    stage.classList.add('is-measuring-garden');
    demoViewport.dataset.skin = 'klassisch';
    const host = stage.getBoundingClientRect();
    const rectangle = (element, contentOnly = false) => {
      const box = element.getBoundingClientRect();
      const style = contentOnly ? getComputedStyle(element) : null;
      const left = style ? parseFloat(style.borderLeftWidth) || 0 : 0;
      const top = style ? parseFloat(style.borderTopWidth) || 0 : 0;
      const right = style ? parseFloat(style.borderRightWidth) || 0 : 0;
      const bottom = style ? parseFloat(style.borderBottomWidth) || 0 : 0;
      return {x: box.left - host.left + left, y: box.top - host.top + top,
        width: box.width - left - right, height: box.height - top - bottom};
    };
    const old = rectangle(oldGarden, true);
    const modern = rectangle(newGarden);
    gardenGeometry = host.width > 0 && host.height > 0 && old.width > 0 && modern.width > 0
      ? {full: {x: 0, y: 0, width: host.width, height: host.height}, old, modern,
        ratio: (gardenImage.naturalWidth || 1600) / (gardenImage.naturalHeight || 686)} : null;
    demoViewport.dataset.skin = savedSkin || 'klassisch';
    stage.classList.remove('is-measuring-garden');
    stage.classList.toggle('garden-linked', Boolean(gardenGeometry) && !preference.matches);
  }

  // Scroll writes only what changed: unchanged custom properties would still restyle the whole stage.
  const stageVars = new Map();
  function setStageVar(name, value) {
    if (stageVars.get(name) === value) return;
    stageVars.set(name, value);
    stage.style.setProperty(name, value);
  }

  function setTransform(element, value) {
    if (element.style.transform !== value) element.style.transform = value;
  }

  function updateGarden(p) {
    if (!gardenGeometry) return;
    const {full, old, modern, ratio} = gardenGeometry;
    const upgrading = p > .51;
    const from = upgrading ? old : full;
    const to = upgrading ? modern : old;
    const t = ease(upgrading ? range(p, .51, .73) : range(p, .07, .34));
    const mix = (key) => from[key] + (to[key] - from[key]) * t;
    const width = Math.max(1, mix('width'));
    const height = Math.max(1, mix('height'));
    setTransform(garden, `translate3d(${mix('x').toFixed(2)}px,${mix('y').toFixed(2)}px,0) scale(${(width / full.width).toFixed(5)},${(height / full.height).toFixed(5)})`);
    const push = upgrading ? 1 : 1 + .32 * ease(range(p, 0, .11)) * (1 - ease(range(p, .1, .3)));
    setTransform(gardenImage, `scale(${(Math.max(1, ratio * height / width) * push).toFixed(5)},${(Math.max(1, width / (height * ratio)) * push).toFixed(5)})`);
    setStageVar('--photo-opacity', (1 - ease(range(p, .735, .77))).toFixed(4));
    setStageVar('--garden-restored', p >= .73 ? '1' : '0');
  }

  function finishTyping() {
    clearTimeout(typingTimer);
    promise?.classList.remove('is-typing');
  }

  function typePromise() {
    if (!promise || preference.matches || scrollY > 80 || promise.classList.contains('has-type')) return;
    let delay = 180;
    for (const part of promise.querySelectorAll('[data-type-part]')) {
      const emphasis = part.hasAttribute('data-type-emphasis');
      if (emphasis) delay += 110;
      const fragment = document.createDocumentFragment();
      for (const character of part.textContent) {
        const glyph = document.createElement('span');
        glyph.className = 'type-glyph';
        glyph.textContent = character;
        const step = emphasis ? 48 : 28;
        glyph.style.setProperty('--type-delay', `${delay}ms`);
        glyph.style.setProperty('--type-step', `${step}ms`);
        fragment.append(glyph);
        delay += step;
      }
      part.replaceChildren(fragment);
      if (emphasis) promise.style.setProperty('--type-underline-delay', `${delay - 70}ms`);
    }
    promise.classList.add('has-type', 'is-typing');
    typingTimer = setTimeout(finishTyping, delay + 80);
  }

  // The alternate looks appear late in the story: fetch them after the first paint, not alongside the hero.
  const lateImages = [...(stage?.querySelectorAll('img[data-src]') || [])];
  function loadLateImages() {
    for (const image of lateImages.splice(0)) image.src = image.dataset.src;
  }
  if (lateImages.length) {
    if (document.readyState === 'complete') setTimeout(loadLateImages, 1200);
    else addEventListener('load', () => setTimeout(loadLateImages, 1200), {once: true});
  }

  function updateStory(position) {
    const p = clamp((position - storyTop) / distance);
    if (p > .35 && lateImages.length) loadLateImages();
    const introExit = ease(range(p, .025, .20));
    const reveal = ease(range(p, .18, .34));
    const improve = ease(range(p, .53, .73));
    setStageVar('--progress', p.toFixed(4));
    setStageVar('--intro-opacity', (1 - introExit).toFixed(4));
    setStageVar('--intro-y', `${(-introExit * 75).toFixed(1)}px`);
    setStageVar('--photo-scale', (1.03 + range(p, 0, .30) * .07).toFixed(4));
    setStageVar('--photo-opacity', (1 - ease(range(p, .14, .34))).toFixed(4));
    setStageVar('--shade-opacity', (1 - ease(range(p, .06, .26))).toFixed(4));
    setStageVar('--frame-opacity', reveal.toFixed(4));
    setStageVar('--frame-scale', (.9 + reveal * .1).toFixed(4));
    setStageVar('--frame-rotate', '0deg');
    updateGarden(p);
    setStageVar('--old-opacity', (1 - improve).toFixed(4));
    setStageVar('--wipe', improve.toFixed(4));
    setStageVar('--new-shown', improve > .001 ? '1' : '0');
    setStageVar('--old-shown', (1 - ease(range(p, .72, .75))).toFixed(4));
    setStageVar('--wipe-edge', Math.min(1, improve * (1 - improve) * 6).toFixed(4));
    setStageVar('--new-opacity', improve.toFixed(4));
    setStageVar('--old-caption', (ease(range(p, .19, .34)) * (1 - ease(range(p, .48, .58)))).toFixed(4));
    setStageVar('--new-caption', ease(range(p, .61, .79)).toFixed(4));
    const light = ease(range(p, .2, .33)) * (1 - improve);
    setStageVar('--stage-light', light.toFixed(4));
    setStageVar('--old-load', range(p, .27, .42).toFixed(4));
    setStageVar('--side-in', ease(range(p, .26, .36)).toFixed(4));
    setStageVar('--swatch-in', ease(range(p, .62, .7)).toFixed(4));
    const message = p > .68;
    if (message !== lastMessage) {
      lastMessage = message;
      stage.classList.toggle('has-message', message);
    }
    const message2 = p > .84;
    if (message2 !== lastMessage2) {
      lastMessage2 = message2;
      stage.classList.toggle('has-message-2', message2);
    }
    setStageVar('--demo-scroll', ease(range(p, .9, 1)).toFixed(4));
    if (intro) intro.inert = introExit > .98;
    const skin = p < .78 ? 'klassisch' : p < .88 ? 'modern' : 'natur';
    setSkin(skin, p >= .6);
    const text = p < .24 ? 'Die Arbeit' : p < .62 ? 'Der alte Auftritt' : skinLabels[skin];
    if (label && text !== lastLabel) {
      label.textContent = text;
      lastLabel = text;
    }
  }

  // One customer site, three looks: the swap is masked by a short blur so it reads as one change.
  function setSkin(skin, onStage) {
    if (!demoViewport) return;
    const stageSkin = onStage ? skin : '';
    if (stage.dataset.skin !== stageSkin) {
      if (stageSkin) stage.dataset.skin = stageSkin;
      else delete stage.dataset.skin;
    }
    if (skin === lastSkin) return;
    const swapped = lastSkin && onStage;
    lastSkin = skin;
    demoViewport.dataset.skin = skin;
    if (swapped && demo?.animate) {
      demo.animate([{filter: 'blur(3px)', opacity: .6}, {filter: 'blur(0)', opacity: 1}], {duration: 380, easing: 'cubic-bezier(.23,1,.32,1)'});
    }
  }

  function update() {
    scheduled = false;
    const position = scrollY;
    if (needsMeasure) measure(position);
    if (preference.matches) {
      if (hasStory) {
        stage.removeAttribute('style');
        stageVars.clear();
        stage.classList.remove('is-light', 'has-message', 'has-message-2', 'garden-linked');
        garden?.style.removeProperty('transform');
        gardenImage?.style.removeProperty('transform');
        lastMessage = false;
        lastMessage2 = false;
        delete stage.dataset.skin;
        if (demoViewport) demoViewport.dataset.skin = 'klassisch';
        lastSkin = '';
      }
      if (intro) intro.inert = false;
      setProcessProgress(1);
      setLink(1);
      project?.classList.remove('has-photo-handoff');
    } else {
      if (hasStory && (forceUpdate || activeRegions.has(story))) updateStory(position);
      if (process && (forceUpdate || activeRegions.has(process))) {
        setProcessProgress(clamp((position - processStart) / processDistance));
      }
      if (link && (forceUpdate || activeRegions.has(linkHost))) {
        setLink(ease(clamp((position - linkStart) / linkDistance)));
      }
      if (project && (forceUpdate || activeRegions.has(project))) {
        const arrival = ease(clamp((position - projectStart) / projectDistance));
        project.style.setProperty('--photo-arrival', arrival.toFixed(4));
        project.classList.add('has-photo-handoff');
      }
    }
    forceUpdate = false;
  }

  function setProcessProgress(progress) {
    if (!process) return;
    const value = progress.toFixed(4);
    if (value !== lastProcessProgress) {
      process.style.setProperty('--process-progress', value);
      lastProcessProgress = value;
    }
  }

  function schedule() {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(update);
    }
  }

  function refreshGeometry() {
    needsMeasure = true;
    forceUpdate = true;
    schedule();
  }

  function observeReveals() {
    revealObserver?.disconnect();
    if (preference.matches || !('IntersectionObserver' in window)) {
      reveals.forEach((element) => element.classList.add('is-seen'));
      return;
    }
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-seen');
        revealObserver.unobserve(entry.target);
      });
    }, {rootMargin: '0px 0px -8% 0px', threshold: .08});
    reveals.filter((element) => !element.classList.contains('is-seen'))
      .forEach((element) => revealObserver.observe(element));
  }

  // Leaving a region flushes its endpoint once. Otherwise, offscreen chapters
  // schedule no scroll work; observer callbacks handle large anchor jumps too.
  const regions = [hasStory ? story : null, process, link ? linkHost : null, project].filter(Boolean);
  if ('IntersectionObserver' in window) {
    const regionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) activeRegions.add(entry.target);
        else activeRegions.delete(entry.target);
      });
      forceUpdate = true;
      schedule();
    }, {rootMargin: '150px 0px', threshold: 0});
    regions.forEach((region) => regionObserver.observe(region));
  } else {
    regions.forEach((region) => activeRegions.add(region));
  }

  const side = stage?.querySelector('.scene-side');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  let pointerX = 0, pointerY = 0, targetX = 0, targetY = 0, pointerFrame = 0;
  function pointerTick() {
    pointerX += (targetX - pointerX) * .08;
    pointerY += (targetY - pointerY) * .08;
    side.style.setProperty('--mx', pointerX.toFixed(3));
    side.style.setProperty('--my', pointerY.toFixed(3));
    pointerFrame = Math.abs(targetX - pointerX) > .002 || Math.abs(targetY - pointerY) > .002 ? requestAnimationFrame(pointerTick) : 0;
  }
  function aimPointer(x, y) {
    targetX = x; targetY = y;
    if (!pointerFrame) pointerFrame = requestAnimationFrame(pointerTick);
  }
  if (side) {
    stage.addEventListener('pointermove', (event) => {
      if (preference.matches || !finePointer.matches) return;
      aimPointer(event.clientX / innerWidth * 2 - 1, event.clientY / innerHeight * 2 - 1);
    }, {passive: true});
    stage.addEventListener('pointerleave', () => aimPointer(0, 0), {passive: true});
  }

  addEventListener('scroll', () => {
    if (!preference.matches && activeRegions.size) schedule();
  }, {passive: true});
  addEventListener('resize', refreshGeometry, {passive: true});
  addEventListener('pageshow', refreshGeometry);
  addEventListener('load', refreshGeometry, {once: true});
  preference.addEventListener('change', () => {
    finishTyping();
    observeReveals();
    refreshGeometry();
  });
  if ('ResizeObserver' in window) {
    const layoutObserver = new ResizeObserver(refreshGeometry);
    regions.forEach((region) => layoutObserver.observe(region));
    if (hasStory) layoutObserver.observe(stage);
  }
  document.fonts?.ready.then(() => { refreshGeometry(); typePromise(); });
  if (!document.fonts) typePromise();
  observeReveals();
  refreshGeometry();

  // A small number of broad, related color states creates continuity beyond the hero.
  const chapters = document.querySelectorAll('[data-tone]');
  if ('IntersectionObserver' in window) {
    const toneObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) document.body.dataset.tone = entry.target.dataset.tone;
      });
    }, {rootMargin: '-35% 0px -40% 0px', threshold: 0});
    chapters.forEach((chapter) => toneObserver.observe(chapter));
  }
})();
