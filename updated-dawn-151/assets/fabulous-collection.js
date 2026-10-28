(() => {
  const init = () => {
    if (!document.body.classList.contains('fabulous-collection-page')) return;
    const header = document.querySelector('[data-fbc-header]');
    const main = document.querySelector('[data-fbc-main]');
    if (!header || header.dataset.fbcReady === 'true') return;
    header.dataset.fbcReady = 'true';

    const menu = header.querySelector('.fbc-header__drawer');
    const search = header.querySelector('.fbc-header__search');
    const headerScrim = header.querySelector('.fbc-header__scrim');
    const sortDrawer = main?.querySelector('.fbc-main__sort-drawer');
    const sortScrim = main?.querySelector('.fbc-main__sort-scrim');
    const menuButton = header.querySelector('[data-fbc-menu-open]');
    const searchButtons = header.querySelectorAll('[data-fbc-search-open]');
    const sortButton = main?.querySelector('[data-fbc-sort-open]');
    let lastTrigger = null;

    const close = (restoreFocus = true) => {
      document.body.classList.remove('fbc-menu-open', 'fbc-search-open', 'fbc-sort-open');
      menu.setAttribute('aria-hidden', 'true');
      search.setAttribute('aria-hidden', 'true');
      sortDrawer?.setAttribute('aria-hidden', 'true');
      menuButton.setAttribute('aria-expanded', 'false');
      sortButton?.setAttribute('aria-expanded', 'false');
      searchButtons.forEach(button => button.setAttribute('aria-expanded', 'false'));
      headerScrim.hidden = true;
      if (sortScrim) sortScrim.hidden = true;
      if (restoreFocus && lastTrigger) lastTrigger.focus();
      lastTrigger = null;
    };

    menuButton.addEventListener('click', () => {
      close(false);
      lastTrigger = menuButton;
      document.body.classList.add('fbc-menu-open');
      menu.setAttribute('aria-hidden', 'false');
      menuButton.setAttribute('aria-expanded', 'true');
      headerScrim.hidden = false;
      menu.focus();
    });
    searchButtons.forEach(button => button.addEventListener('click', () => {
      close(false);
      lastTrigger = button;
      document.body.classList.add('fbc-search-open');
      search.setAttribute('aria-hidden', 'false');
      button.setAttribute('aria-expanded', 'true');
      headerScrim.hidden = false;
      search.querySelector('input[name="q"]').focus();
    }));
    sortButton?.addEventListener('click', () => {
      close(false);
      lastTrigger = sortButton;
      document.body.classList.add('fbc-sort-open');
      sortDrawer.setAttribute('aria-hidden', 'false');
      sortButton.setAttribute('aria-expanded', 'true');
      sortScrim.hidden = false;
      sortDrawer.focus();
    });
    header.querySelectorAll('[data-fbc-close]').forEach(button => button.addEventListener('click', () => close()));
    main?.querySelectorAll('[data-fbc-sort-close]').forEach(button => button.addEventListener('click', () => close()));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && /fbc-(menu|search|sort)-open/.test(document.body.className)) close();
    });

    const desktopSort = main?.querySelector('[data-fbc-autosort]');
    if (desktopSort) desktopSort.addEventListener('change', () => desktopSort.form.requestSubmit());
    document.querySelectorAll('.fbc-footer [data-fbc-localization]').forEach(select => {
      select.addEventListener('change', () => select.form.requestSubmit());
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  document.addEventListener('shopify:section:load', init);
})();
