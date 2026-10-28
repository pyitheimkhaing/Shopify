document.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('[data-site-header]');
  let lastScrollY = window.scrollY;
  let headerTicking = false;
  const updateHeader = () => {
    const currentScrollY = window.scrollY;
    const scrollingDown = currentScrollY > lastScrollY;
    if (currentScrollY < 80 || !scrollingDown) header?.classList.remove('is-hidden');
    else if (currentScrollY - lastScrollY > 2) header?.classList.add('is-hidden');
    lastScrollY = Math.max(currentScrollY, 0);
    headerTicking = false;
  };
  window.addEventListener('scroll', () => {
    if (!headerTicking) {
      window.requestAnimationFrame(updateHeader);
      headerTicking = true;
    }
  }, { passive: true });

  const menu = document.querySelector('[data-menu-toggle]');
  const drawer = document.querySelector('[data-menu-drawer]');
  const close = document.querySelector('[data-menu-close]');
  const toggle = (open) => { if (!drawer) return; drawer.classList.toggle('is-open', open); document.body.classList.toggle('drawer-open', open); };
  menu?.addEventListener('click', () => toggle(true));
  close?.addEventListener('click', () => toggle(false));
  drawer?.addEventListener('click', (e) => { if (e.target === drawer) toggle(false); });
  const search = document.querySelector('[data-search-overlay]');
  document.querySelector('[data-search-toggle]')?.addEventListener('click', () => search?.classList.add('is-open'));
  document.querySelector('[data-search-close]')?.addEventListener('click', () => search?.classList.remove('is-open'));

  document.querySelectorAll('[data-tabs] [data-tab]').forEach(button => {
    button.addEventListener('click', () => {
      const group = button.closest('[data-tabs]');
      group.querySelectorAll('button').forEach(item => item.classList.remove('is-active'));
      group.querySelectorAll('[data-tab-panel]').forEach(panel => panel.hidden = panel.dataset.tabPanel !== button.dataset.tab);
      button.classList.add('is-active');
    });
  });
  document.querySelectorAll('[data-choice]').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll(`[data-choice="${button.dataset.choice}"]`).forEach(item => item.classList.remove('is-selected'));
      button.classList.add('is-selected');
      const output = document.querySelector(`[data-choice-output="${button.dataset.choice}"]`);
      if (output) output.textContent = button.textContent.trim();
    });
  });
  document.querySelectorAll('[data-upload-demo]').forEach(input => input.addEventListener('change', () => {
    const box = input.closest('[data-upload-wrap]');
    box?.classList.add('has-file');
    const label = box?.querySelector('[data-upload-label]');
    if (label && input.files[0]) label.textContent = input.files[0].name;
    document.querySelector('[data-preview-modal]')?.showModal();
    runPreview();
  }));
  document.querySelectorAll('[data-preview-trigger]').forEach(button => button.addEventListener('click', () => {
    const panel = document.querySelector('[data-live-preview]');
    panel?.classList.add('is-loading');
    window.setTimeout(() => panel?.classList.remove('is-loading'), 900);
    panel?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }));

  document.querySelectorAll('[data-gallery-src]').forEach(button => button.addEventListener('click', () => {
    const main = document.querySelector('[data-gallery-main]');
    if (main) main.src = button.dataset.gallerySrc;
    document.querySelectorAll('[data-gallery-src]').forEach(item => item.classList.remove('is-selected'));
    button.classList.add('is-selected');
  }));

  const tips = document.querySelector('[data-photo-tips-modal]');
  document.querySelector('[data-photo-tips]')?.addEventListener('click', () => tips?.showModal());
  const preview = document.querySelector('[data-preview-modal]');
  const runPreview = () => {
    if (!preview) return;
    preview.querySelector('.preview-loading').hidden = false;
    preview.querySelector('.preview-complete').hidden = true;
    window.setTimeout(() => {
      preview.querySelector('.preview-loading').hidden = true;
      preview.querySelector('.preview-complete').hidden = false;
    }, 1800);
  };
  document.querySelector('[data-open-preview]')?.addEventListener('click', () => {
    preview?.showModal();
    runPreview();
  });
  document.querySelectorAll('[data-modal-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog')?.close()));
  document.querySelector('[data-retry-toggle]')?.addEventListener('click', (event) => {
    const panel = event.currentTarget.nextElementSibling;
    if (panel) panel.hidden = !panel.hidden;
  });
  document.querySelector('[data-new-version]')?.addEventListener('click', runPreview);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      toggle(false);
      search?.classList.remove('is-open');
    }
  });
});
