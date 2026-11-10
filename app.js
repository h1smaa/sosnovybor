(() => {
  'use strict';
  const photos = window.SOSNOVY_PHOTOS || [];
  // One shared viewer for every page; section content and navigation stay in HTML.
  if (!document.querySelector('#lightbox')) document.body.insertAdjacentHTML('beforeend', `
    <dialog class="lightbox" id="lightbox" aria-label="Просмотр фотографий">
      <div class="lightbox-toolbar"><p id="photo-count" aria-live="polite"></p><button type="button" id="fullscreen" aria-label="Развернуть на весь экран">⛶</button><button type="button" id="close-lightbox" aria-label="Закрыть просмотр">✕</button></div>
      <button class="photo-prev" type="button" aria-label="Предыдущая фотография">‹</button>
      <figure><img id="lightbox-image" alt=""><figcaption id="lightbox-caption"></figcaption></figure>
      <button class="photo-next" type="button" aria-label="Следующая фотография">›</button>
      <p class="lightbox-help">Листайте стрелками или свайпом · Esc — закрыть</p>
    </dialog>`);
  const menu = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('#navigation');
  function closeMenu() {
    menu.setAttribute('aria-expanded', 'false');
    navigation.classList.remove('is-open');
  }
  menu.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open));
    navigation.classList.toggle('is-open', open);
  });
  navigation.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') { closeMenu(); menu.focus(); }
  });
  document.addEventListener('click', event => { if (!event.target.closest('.header')) closeMenu(); });
  window.matchMedia('(min-width: 701px)').addEventListener('change', closeMenu);

  const grid = document.querySelector('#gallery-grid');
  const more = document.querySelector('#show-more');
  const status = document.querySelector('#gallery-status');
  const filters = [...document.querySelectorAll('[data-filter]')];
  const dialog = document.querySelector('#lightbox');
  const fullImage = document.querySelector('#lightbox-image');
  const caption = document.querySelector('#lightbox-caption');
  const count = document.querySelector('#photo-count');
  const fullscreen = document.querySelector('#fullscreen');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let filtered = photos;
  let viewerPhotos = photos;
  let limit = 6;
  let current = 0;
  let lastTrigger = null;

  function renderGallery(focusIndex = -1) {
    if (!grid) return;
    grid.replaceChildren();
    filtered.slice(0, limit).forEach((photo, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'gallery-item';
      button.setAttribute('aria-haspopup', 'dialog');
      button.setAttribute('aria-label', `Открыть фотографию: ${photo.alt}`);
      const image = document.createElement('img');
      image.src = `assets/images/${photo.slug}-480.webp`;
      image.width = photo.width;
      image.height = photo.height;
      image.loading = 'lazy';
      image.decoding = 'async';
      image.alt = photo.alt;
      const zoom = document.createElement('span');
      zoom.className = 'zoom';
      zoom.textContent = '⛶';
      zoom.setAttribute('aria-hidden', 'true');
      const title = document.createElement('span');
      title.className = 'gallery-caption';
      title.textContent = photo.alt;
      const frame = document.createElement('span');
      frame.className = 'photo-frame';
      frame.append(image, zoom);
      button.append(frame, title);
      button.addEventListener('click', () => openPhoto(index, button));
      grid.append(button);
    });
    more.hidden = limit >= filtered.length;
    status.textContent = `Показано ${Math.min(limit, filtered.length)} из ${filtered.length} фотографий${more.hidden ? '' : '. Остальные — по кнопке «Показать ещё»'}`;
    if (focusIndex >= 0) grid.children[focusIndex]?.focus({ preventScroll: true });
    if (!reducedMotion.matches) {
      [...grid.children].forEach((item, index) => item.animate(
        [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }],
        { duration: 260, delay: Math.min(index, 5) * 25, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' }
      ));
    }
  }
  function setFilter(category) {
    filtered = category === 'all' ? photos : photos.filter(photo => photo.category === category);
    limit = 6;
    filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === category)));
    renderGallery();
  }
  filters.forEach(button => button.addEventListener('click', () => setFilter(button.dataset.filter)));
  document.querySelectorAll('[data-gallery-filter]').forEach(link => link.addEventListener('click', () => setFilter(link.dataset.galleryFilter)));
  more?.addEventListener('click', () => { const firstNew = limit; limit += 6; renderGallery(firstNew); });

  function showPhoto(index) {
    current = (index + viewerPhotos.length) % viewerPhotos.length;
    const photo = viewerPhotos[current];
    fullImage.classList.add('is-loading');
    fullImage.alt = photo.alt;
    fullImage.src = `assets/images/${photo.slug}-960.webp`;
    caption.textContent = photo.alt;
    count.textContent = `${current + 1} / ${viewerPhotos.length}`;
  }
  function openPhoto(index, trigger, collection = filtered) {
    lastTrigger = trigger;
    viewerPhotos = collection;
    showPhoto(index);
    dialog.showModal();
    document.body.classList.add('modal-open');
    document.querySelector('#close-lightbox').focus();
  }
  function closePhoto() { dialog.close(); }
  fullImage.addEventListener('load', () => {
    fullImage.classList.remove('is-loading');
    if (!reducedMotion.matches) fullImage.animate(
      [{ opacity: .4, transform: 'scale(.99)' }, { opacity: 1, transform: 'scale(1)' }],
      { duration: 220, easing: 'ease-out' }
    );
  });
  fullImage.addEventListener('error', () => {
    fullImage.classList.remove('is-loading');
    caption.textContent = 'Не удалось открыть фотографию. Попробуйте следующий кадр.';
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('modal-open');
    fullImage.removeAttribute('src');
    if (document.fullscreenElement === dialog) document.exitFullscreen?.().catch(() => {});
    if (lastTrigger?.isConnected) lastTrigger.focus({ preventScroll: true });
  });
  document.querySelector('#close-lightbox').addEventListener('click', closePhoto);
  document.querySelector('.photo-prev').addEventListener('click', () => showPhoto(current - 1));
  document.querySelector('.photo-next').addEventListener('click', () => showPhoto(current + 1));
  dialog.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); closePhoto(); }
    if (event.key === 'Tab') {
      const controls = [...dialog.querySelectorAll('button:not(:disabled)')].filter(button => button.getClientRects().length);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    if (event.key === 'ArrowLeft') { event.preventDefault(); showPhoto(current - 1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); showPhoto(current + 1); }
  });
  dialog.addEventListener('click', event => { if (event.target === dialog) closePhoto(); });
  let touchStart = null;
  fullImage.addEventListener('touchstart', event => {
    touchStart = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
  }, { passive: true });
  fullImage.addEventListener('touchend', event => {
    if (touchStart === null) return;
    const delta = event.changedTouches[0].clientX - touchStart.x;
    const vertical = event.changedTouches[0].clientY - touchStart.y;
    if (Math.abs(delta) > 50 && Math.abs(delta) > Math.abs(vertical) * 1.3) showPhoto(current + (delta < 0 ? 1 : -1));
    touchStart = null;
  }, { passive: true });
  fullImage.addEventListener('touchcancel', () => { touchStart = null; }, { passive: true });
  fullscreen.hidden = !document.fullscreenEnabled;
  fullscreen.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await dialog.requestFullscreen();
    } catch { fullscreen.hidden = true; }
  });
  document.addEventListener('fullscreenchange', () => fullscreen.setAttribute('aria-label', document.fullscreenElement ? 'Выйти из полноэкранного режима' : 'Развернуть на весь экран'));
  const requestedCategory = new URLSearchParams(window.location.search).get('category');
  if (grid && filters.some(button => button.dataset.filter === requestedCategory)) setFilter(requestedCategory);
  else renderGallery();

  // Section photographs share the same viewer; the gallery keeps its filtered sequence.
  document.querySelectorAll('main img').forEach(image => {
    if (image.closest('#gallery, .hero-photo, .cover-photo, a, button')) return;
    const slug = image.getAttribute('src')?.match(/\/([^/]+)-(?:480|960)\.webp$/)?.[1];
    const index = photos.findIndex(photo => photo.slug === slug);
    if (index < 0) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'photo-trigger';
    button.setAttribute('aria-label', `Открыть фотографию: ${image.alt}`);
    button.setAttribute('aria-haspopup', 'dialog');
    image.before(button);
    button.append(image);
    button.addEventListener('click', () => openPhoto(index, button, photos));
  });

  // Content remains visible with no JS, reduced motion, or no observer support.
  const revealTargets = [...document.querySelectorAll('.about, .outdoors-heading, .water-layout, .gazebo-layout, .comfort-heading, .amenities, .comfort-photos, .gallery-heading, .contacts, .destinations, .editorial-row, .stay-section, .contact-invitation, .page-next, .contact-details')];
  let observer;
  function configureReveals() {
    observer?.disconnect();
    revealTargets.forEach(element => element.classList.remove('reveal-pending'));
    if (reducedMotion.matches || !('IntersectionObserver' in window)) return;
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.remove('reveal-pending');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0, rootMargin: '0px 0px -35px 0px' });
    revealTargets.forEach(element => {
      if (element.getBoundingClientRect().top < window.innerHeight - 35) return;
      element.classList.add('reveal-pending');
      observer.observe(element);
    });
  }
  configureReveals();
  reducedMotion.addEventListener('change', configureReveals);
})();
