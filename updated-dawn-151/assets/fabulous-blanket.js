(() => {
  document.querySelectorAll('[data-fabulous-blanket]').forEach((root) => {
    const variants = JSON.parse(root.querySelector('[data-blanket-variants]').textContent || '[]');
    const form = root.querySelector('.fabulous-blanket__form');
    const idInput = form.querySelector('[name="id"]');
    const qtyInput = form.querySelector('[name="quantity"]');
    const button = form.querySelector('[data-add-button]');
    const buttonText = button.querySelector('span');
    const price = root.querySelector('[data-sale-price]');
    const compare = root.querySelector('[data-compare-price]');
    const saleBadge = root.querySelector('[data-sale-badge]');
    const errorWrap = root.querySelector('.product-form__error-message-wrapper');
    const errorText = errorWrap.querySelector('.product-form__error-message');
    const nameInput = form.querySelector('[data-blanket-name]');
    const photoInput = form.querySelector('[data-blanket-photo]');
    const photoName = form.querySelector('[data-photo-name]');
    let selectedVariant = variants.find((variant) => String(variant.id) === idInput.value) || variants[0];

    const formatMoney = (cents) => {
      if (window.Shopify && typeof window.Shopify.formatMoney === 'function') {
        return window.Shopify.formatMoney(cents, root.dataset.moneyFormat);
      }
      return new Intl.NumberFormat(document.documentElement.lang || 'en-US', {
        style: 'currency',
        currency: root.dataset.currency || 'USD'
      }).format(cents / 100);
    };
    const showError = (message) => {
      errorText.textContent = message || '';
      errorWrap.hidden = !message;
    };
    const validatePersonalization = () => {
      if (nameInput && !nameInput.value.trim()) {
        showError('Enter the name for this blanket.');
        nameInput.focus();
        return false;
      }
      if (photoInput) {
        const file = photoInput.files?.[0];
        if (!file) {
          showError('Select a photo for this blanket.');
          photoInput.focus();
          return false;
        }
        const supported = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
        if (!supported) {
          showError('Choose a JPG, PNG, or WebP image.');
          photoInput.focus();
          return false;
        }
        if (file.size > 20 * 1024 * 1024) {
          showError('Choose an image no larger than 20 MB.');
          photoInput.focus();
          return false;
        }
      }
      return true;
    };
    photoInput?.addEventListener('change', () => {
      const file = photoInput.files?.[0];
      if (photoName) photoName.textContent = file ? `Selected: ${file.name}` : 'Choose a JPG, PNG, or WebP image.';
      showError('');
    });
    nameInput?.addEventListener('input', () => showError(''));
    form.addEventListener('invalid', (event) => {
      if (!errorWrap.hidden) return;
      if (event.target === nameInput) showError('Enter the name for this blanket.');
      if (event.target === photoInput) showError('Select a photo for this blanket.');
    }, true);
    const updateVariant = (event) => {
      const options = [...form.querySelectorAll('[data-option-position]')].map((group) => group.querySelector('[data-option-value]:checked')?.value);
      selectedVariant = variants.find((variant) => options.every((value, index) => variant.options[index] === value));
      const available = !!selectedVariant?.available;
      idInput.value = selectedVariant?.id || '';
      idInput.disabled = !available;
      button.disabled = !available;
      buttonText.textContent = !selectedVariant ? 'Unavailable' : available ? 'Add to cart' : 'Sold out';
      if (selectedVariant) {
        price.textContent = formatMoney(selectedVariant.price);
        const onSale = selectedVariant.compare_at_price > selectedVariant.price;
        compare.hidden = !onSale;
        saleBadge.hidden = !onSale;
        compare.textContent = onSale ? formatMoney(selectedVariant.compare_at_price) : '';
        const rule = selectedVariant.quantity_rule || {};
        qtyInput.min = rule.min || 1;
        qtyInput.step = rule.increment || 1;
        if (rule.max) qtyInput.max = rule.max;
        else qtyInput.removeAttribute('max');
        if (Number(qtyInput.value) < Number(qtyInput.min)) qtyInput.value = qtyInput.min;
        for (const group of form.querySelectorAll('[data-option-position]')) {
          const selectedValue = group.querySelector('[data-option-value]:checked')?.value;
          const selectedLabel = group.querySelector('[data-option-selected]');
          if (selectedLabel && selectedValue) selectedLabel.textContent = selectedValue;
        }
        const variantImage = selectedVariant.featured_image?.src || selectedVariant.image?.src || selectedVariant.image;
        if (variantImage && mainImage) {
          const pathFor = (value) => {
            try { return new URL(value, window.location.href).pathname; }
            catch { return value; }
          };
          const matchingThumb = thumbs.findIndex((thumb) => pathFor(thumb.dataset.image) === pathFor(variantImage));
          if (matchingThumb >= 0) showImage(matchingThumb, !!event);
          else {
            mainImage.src = variantImage;
            mainImage.srcset = '';
          }
        }
        const url = new URL(window.location.href);
        url.searchParams.set('variant', selectedVariant.id);
        window.history.replaceState({}, '', url);
      }
      showError('');
    };
    form.querySelectorAll('[data-option-value]').forEach((input) => input.addEventListener('change', updateVariant));
    root.querySelector('[data-qty-minus]').addEventListener('click', () => {
      qtyInput.stepDown();
      if (Number(qtyInput.value) < Number(qtyInput.min || 1)) qtyInput.value = qtyInput.min || 1;
    });
    root.querySelector('[data-qty-plus]').addEventListener('click', () => qtyInput.stepUp());

    const thumbs = [...root.querySelectorAll('[data-gallery-thumb]')];
    const mainImage = root.querySelector('.fabulous-blanket__main-image');
    let galleryIndex = 0;
    const showImage = (index, scrollThumb = true) => {
      if (!thumbs.length || !mainImage || mainImage.tagName !== 'IMG') return;
      galleryIndex = (index + thumbs.length) % thumbs.length;
      const thumb = thumbs[galleryIndex];
      mainImage.src = thumb.dataset.image;
      mainImage.srcset = '';
      mainImage.alt = thumb.dataset.alt;
      thumbs.forEach((item, i) => {
        item.classList.toggle('is-active', i === galleryIndex);
        item.setAttribute('aria-current', String(i === galleryIndex));
      });
      if (scrollThumb) thumb.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    };
    thumbs.forEach((thumb, index) => thumb.addEventListener('click', () => showImage(index)));
    root.querySelector('[data-gallery-prev]').addEventListener('click', () => showImage(galleryIndex - 1));
    root.querySelector('[data-gallery-next]').addEventListener('click', () => showImage(galleryIndex + 1));
    const stage = root.querySelector('.fabulous-blanket__stage');
    let touchStartX = null;
    stage.addEventListener('touchstart', (event) => {
      touchStartX = event.changedTouches[0]?.clientX ?? null;
    }, { passive: true });
    stage.addEventListener('touchend', (event) => {
      const touchEndX = event.changedTouches[0]?.clientX;
      if (touchStartX === null || touchEndX === undefined) return;
      const movement = touchEndX - touchStartX;
      if (Math.abs(movement) > 45) showImage(galleryIndex + (movement < 0 ? 1 : -1));
      touchStartX = null;
    }, { passive: true });
    const themeSection = root.closest('.shopify-section');
    const reviewHost = themeSection?.nextElementSibling;
    const newsletterHost = themeSection?.parentElement?.querySelector('.newsletter')?.closest('.shopify-section');
    reviewHost?.classList.add('fabulous-blanket__review-host');
    if (newsletterHost?.querySelector('.newsletter')) newsletterHost.classList.add('fabulous-blanket__newsletter-host');
    updateVariant();

    // The native product-form component handles ordinary additions, including
    // Shopify's file line-item property. When add-ons are selected, add the
    // blanket with its uploaded photo first, then add their real variant IDs.
    form.addEventListener('submit', async (event) => {
      if (!validatePersonalization()) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      const addons = [...form.querySelectorAll('[data-addon-variant]:checked')];
      if (!addons.length) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!selectedVariant?.available) return showError('This combination is unavailable.');
      const quantity = Number(qtyInput.value);
      if (!Number.isSafeInteger(quantity) || quantity < Number(qtyInput.min || 1)) return showError('Enter a valid quantity.');
      const items = [];
      addons.forEach((addon) => items.push({ id: Number(addon.dataset.addonVariant), quantity }));
      const cartAdd = window.routes?.cart_add_url || '/cart/add';
      const url = cartAdd.endsWith('.js') ? cartAdd : cartAdd + '.js';
      button.disabled = true;
      buttonText.textContent = 'Adding…';
      showError('');
      let blanketAdded = false;
      try {
        const blanketResponse = await fetch(url, {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: new FormData(form)
        });
        const blanketResult = await blanketResponse.json();
        if (!blanketResponse.ok || blanketResult.status) throw new Error(blanketResult.description || blanketResult.message || 'Could not add the blanket.');
        blanketAdded = true;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ items })
        });
        const result = await response.json();
        if (!response.ok || result.status) throw new Error(result.description || result.message || 'Could not add the selected add-ons.');
        window.location.assign(window.routes?.cart_url || '/cart');
      } catch (error) {
        showError(blanketAdded ? 'The blanket was added, but the add-ons were not. Please review your cart before trying again.' : (error.message || 'Could not add the blanket.'));
        button.disabled = false;
        buttonText.textContent = blanketAdded ? 'Review your cart' : 'Add to cart';
        if (blanketAdded) {
          button.type = 'button';
          button.addEventListener('click', () => window.location.assign(window.routes?.cart_url || '/cart'), { once: true });
        }
      }
    }, true);
  });
})();
