(function () {
  'use strict';

  if (window.fabricBannerCartInitialized) return;
  window.fabricBannerCartInitialized = true;
  var stickyObserver;
  var attributeQueue = Promise.resolve();
  var overlayOpener;
  var overlayChanged = false;
  var deliveryRequestId = 0;
  var lastSavedDeliveryPreference;

  function getCartUrl() {
    return window.routes && window.routes.cart_url ? window.routes.cart_url : '/cart';
  }

  function saveCartAttribute(name, value) {
    var task = attributeQueue.catch(function () {}).then(function () {
      return fetch(getCartUrl() + '.js', {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });
    }).then(function (response) {
      if (!response.ok) throw new Error('Could not read cart attributes.');
      return response.json();
    }).then(function (cart) {
      var attributes = Object.assign({}, cart.attributes || {});
      attributes[name] = value;
      return fetch((window.routes && window.routes.cart_update_url) || '/cart/update.js', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ attributes: attributes }),
      });
    }).then(function (response) {
      if (!response.ok) throw new Error('Could not save the cart preference.');
      return response.json();
    });
    attributeQueue = task.catch(function () {});
    return task;
  }

  function updateProofAttribute(checkbox) {
    var requested = checkbox.checked;
    document.querySelectorAll('[data-fb-proof]').forEach(function (control) {
      control.checked = requested;
    });
    var status = checkbox.closest('.fb-cart-proof')?.querySelector('[data-fb-proof-status]');
    if (status) status.textContent = 'Saving request…';

    saveCartAttribute('Free Design Proof', requested ? 'Requested' : '')
      .then(function () {
        if (status) status.textContent = requested ? 'Request saved with the cart.' : 'Request removed.';
      })
      .catch(function () {
        document.querySelectorAll('[data-fb-proof]').forEach(function (control) {
          control.checked = !requested;
        });
        if (status) status.textContent = 'Could not save this request. Please try again.';
      });
  }

  function updateDeliveryAttribute(input) {
    var card = input.closest('.fb-cart-delivery');
    if (lastSavedDeliveryPreference === undefined) {
      lastSavedDeliveryPreference = card ? card.dataset.fbDeliverySaved || '' : '';
    }
    var selected = input.value;
    var requestId = ++deliveryRequestId;
    document.querySelectorAll('[data-fb-delivery-option]').forEach(function (control) {
      control.checked = control.value === selected;
    });
    var status = card?.querySelector('[data-fb-delivery-status]');
    if (status) status.textContent = 'Saving Fabric Banner preference…';
    saveCartAttribute('Fabric Banner Delivery Preference', selected)
      .then(function () {
        lastSavedDeliveryPreference = selected;
        if (requestId !== deliveryRequestId) return;
        document.querySelectorAll('.fb-cart-delivery').forEach(function (deliveryCard) {
          deliveryCard.dataset.fbDeliverySaved = selected;
        });
        if (status) status.textContent = 'Preference saved. Checkout confirms available services and rates.';
      })
      .catch(function () {
        if (requestId !== deliveryRequestId) return;
        document.querySelectorAll('[data-fb-delivery-option]').forEach(function (control) {
          control.checked = control.value === lastSavedDeliveryPreference;
        });
        if (status) status.textContent = 'Could not save this preference. Please try again.';
      });
  }

  function applyDiscount(button) {
    var panel = button.closest('.fb-cart-coupon');
    var input = panel && panel.querySelector('[data-fb-discount-code]');
    var status = panel && panel.querySelector('[data-fb-discount-status]');
    var code = input ? input.value.trim() : '';
    if (!code) {
      if (status) status.textContent = 'Enter a coupon code.';
      if (input) input.focus();
      return;
    }

    if (status) status.textContent = 'Shopify will validate this code.';
    var destination = new URL(getCartUrl(), window.location.origin);
    var discountPath = '/discount/' + encodeURIComponent(code) + '?redirect=' + encodeURIComponent(destination.pathname + destination.search);
    window.location.assign(discountPath);
  }

  function syncCartIntro() {
    var notice = document.querySelector('[data-fb-cart-success]');
    if (!notice) return;
    var url = new URL(window.location.href);
    var added = url.searchParams.has('fb_added');
    var updated = url.searchParams.has('fb_updated');
    if (!added && !updated) return;
    notice.lastElementChild.textContent = updated
      ? 'Fabric Banner customization updated in your cart'
      : 'Product successfully added to your shopping cart';
    notice.hidden = false;
    url.searchParams.delete('fb_added');
    url.searchParams.delete('fb_updated');
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  }

  function observeMainCheckout() {
    if (stickyObserver) stickyObserver.disconnect();
    var sticky = document.querySelector('[data-fb-cart-sticky]');
    var mainCheckout = document.querySelector('#main-cart-footer .cart__ctas');
    if (!sticky || !mainCheckout || typeof IntersectionObserver === 'undefined') return;
    var targets = [mainCheckout];
    var cartEnding = document.querySelector('.fb-cart-minimal-footer');
    if (cartEnding) targets.push(cartEnding);
    var visible = new WeakMap();
    stickyObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { visible.set(entry.target, entry.isIntersecting); });
      sticky.classList.toggle('is-hidden', targets.some(function (target) { return visible.get(target); }));
    }, { threshold: 0.2 });
    targets.forEach(function (target) { stickyObserver.observe(target); });
  }

  function overlayElement(tag, className, label) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (label != null) node.textContent = label;
    return node;
  }

  function overlayMoney(cents, currency) {
    var code = typeof currency === 'string' && currency.length === 3 ? currency : 'USD';
    try {
      return new Intl.NumberFormat(document.documentElement.lang || 'en', {
        style: 'currency',
        currency: code,
      }).format(Number(cents || 0) / 100);
    } catch (error) {
      return (Number(cents || 0) / 100).toFixed(2) + ' ' + code;
    }
  }

  function updateCartBubble(count) {
    var icon = document.getElementById('cart-icon-bubble');
    if (!icon) return;
    var bubble = icon.querySelector('.cart-count-bubble');
    if (!count) {
      bubble?.remove();
      return;
    }
    if (!bubble) {
      bubble = overlayElement('div', 'cart-count-bubble');
      icon.appendChild(bubble);
    }
    bubble.replaceChildren();
    if (count < 100) {
      var visible = overlayElement('span', '', String(count));
      visible.setAttribute('aria-hidden', 'true');
      bubble.appendChild(visible);
    }
    bubble.appendChild(overlayElement('span', 'visually-hidden', count + (count === 1 ? ' item' : ' items') + ' in cart'));
  }

  function overlayDetailRow(list, name, value) {
    if (value == null || value === '') return;
    var row = overlayElement('div', 'fb-cart-icon-overlay__detail-row');
    row.appendChild(overlayElement('dt', '', name));
    var description = overlayElement('dd');
    if (typeof value === 'string' && value.includes('/uploads/')) {
      try {
        var fileUrl = new URL(value, window.location.origin);
        if (fileUrl.protocol === 'https:' || fileUrl.protocol === 'http:') {
          var fileLink = overlayElement('a', '', decodeURIComponent(fileUrl.pathname.split('/').pop()));
          fileLink.href = fileUrl.href;
          fileLink.target = '_blank';
          fileLink.rel = 'noopener noreferrer';
          description.appendChild(fileLink);
        }
      } catch (error) {
        description.textContent = value;
      }
    }
    if (!description.hasChildNodes()) description.textContent = String(value);
    row.appendChild(description);
    list.appendChild(row);
  }

  function overlayDetails(item) {
    var details = overlayElement('details', 'fb-cart-icon-overlay__details');
    details.appendChild(overlayElement('summary', '', 'Show Details'));
    var list = overlayElement('dl');
    (item.options_with_values || []).forEach(function (option) {
      overlayDetailRow(list, option.name, option.value);
    });
    Object.entries(item.properties || {}).forEach(function (entry) {
      if (entry[0].charAt(0) !== '_') overlayDetailRow(list, entry[0], entry[1]);
    });
    if (!list.childElementCount) list.appendChild(overlayElement('p', '', 'No additional customizations saved.'));
    details.appendChild(list);
    return details;
  }

  function overlayError(message) {
    var error = document.querySelector('[data-fb-overlay-error]');
    if (!error) return;
    error.textContent = message || '';
    error.hidden = !message;
  }

  function renderOverlayCart(cart) {
    var overlay = document.querySelector('[data-fb-cart-overlay]');
    if (!overlay) return;
    var itemsRoot = overlay.querySelector('[data-fb-overlay-items]');
    itemsRoot.replaceChildren();
    var currency = cart.currency || overlay.dataset.currency;
    if (!cart.items || !cart.items.length) {
      itemsRoot.appendChild(overlayElement('p', 'fb-cart-icon-overlay__empty', 'Your cart is empty.'));
      updateCartBubble(0);
      return;
    }
    cart.items.forEach(function (item, index) {
      var card = overlayElement('article', 'fb-cart-icon-overlay__item');
      var imageWrap = overlayElement('div', 'fb-cart-icon-overlay__image');
      if (item.image) {
        var image = overlayElement('img');
        image.src = item.image;
        image.alt = item.product_title || item.title || 'Cart product';
        image.loading = 'lazy';
        imageWrap.appendChild(image);
      } else {
        imageWrap.appendChild(overlayElement('span', '', 'No image'));
      }
      card.appendChild(imageWrap);
      var content = overlayElement('div', 'fb-cart-icon-overlay__content');
      var title = overlayElement('a', 'fb-cart-icon-overlay__title', item.product_title || item.title || 'Product');
      title.href = item.url || getCartUrl();
      content.appendChild(title);
      var linePrice = Number(item.final_line_price ?? item.line_price ?? (item.price * item.quantity));
      var originalLinePrice = Number(item.original_line_price ?? linePrice);
      var price = overlayElement('p', 'fb-cart-icon-overlay__price');
      if (originalLinePrice > linePrice) price.appendChild(overlayElement('s', '', overlayMoney(originalLinePrice, currency)));
      price.appendChild(overlayElement('strong', '', overlayMoney(linePrice, currency)));
      content.appendChild(price);
      content.appendChild(overlayDetails(item));
      card.appendChild(content);

      var controls = overlayElement('div', 'fb-cart-icon-overlay__controls');
      var stepper = overlayElement('div', 'fb-cart-icon-overlay__stepper');
      var rule = item.quantity_rule || {};
      var minimum = Math.max(1, Number(rule.min) || 1);
      var step = Math.max(1, Number(rule.increment) || 1);
      var maximum = Number(rule.max) || Infinity;
      var minus = overlayElement('button', '', '−');
      minus.type = 'button';
      minus.setAttribute('aria-label', 'Decrease quantity of ' + (item.product_title || item.title));
      minus.disabled = item.quantity <= minimum;
      minus.addEventListener('click', function () { changeOverlayQuantity(item, item.quantity - step); });
      var input = overlayElement('input');
      input.type = 'number';
      input.value = item.quantity;
      input.min = minimum;
      input.step = step;
      if (Number.isFinite(maximum)) input.max = maximum;
      input.setAttribute('aria-label', 'Quantity of ' + (item.product_title || item.title));
      input.addEventListener('change', function () {
        var requested = Number(input.value);
        if (!Number.isInteger(requested) || requested < minimum || requested > maximum || (requested - minimum) % step !== 0) {
          input.value = item.quantity;
          overlayError('Enter a valid quantity for this item.');
          return;
        }
        if (requested !== item.quantity) changeOverlayQuantity(item, requested);
      });
      var plus = overlayElement('button', '', '+');
      plus.type = 'button';
      plus.disabled = item.quantity + step > maximum;
      plus.setAttribute('aria-label', 'Increase quantity of ' + (item.product_title || item.title));
      plus.addEventListener('click', function () { changeOverlayQuantity(item, item.quantity + step); });
      stepper.append(minus, input, plus);
      controls.appendChild(stepper);

      var actions = overlayElement('div', 'fb-cart-icon-overlay__actions');
      var edit = overlayElement('a', '', 'Edit');
      if (item.handle === 'custom-farbric-banner') {
        var editUrl = new URL(item.url, window.location.origin);
        editUrl.searchParams.set('fb_edit', item.key);
        edit.href = editUrl.pathname + editUrl.search;
      } else {
        edit.href = getCartUrl() + '#CartItem-' + (index + 1);
        edit.setAttribute('aria-label', 'Edit ' + (item.product_title || item.title) + ' in cart');
      }
      actions.appendChild(edit);
      var remove = overlayElement('button', '', 'Delete');
      remove.type = 'button';
      remove.setAttribute('aria-label', 'Delete ' + (item.product_title || item.title));
      remove.addEventListener('click', function () { changeOverlayQuantity(item, 0); });
      actions.appendChild(remove);
      controls.appendChild(actions);
      card.appendChild(controls);
      itemsRoot.appendChild(card);
    });
    updateCartBubble(cart.item_count);
  }

  function changeOverlayQuantity(item, quantity) {
    var overlay = document.querySelector('[data-fb-cart-overlay]');
    if (!overlay || overlay.classList.contains('is-busy')) return;
    overlay.classList.add('is-busy');
    overlayError('');
    fetch((window.routes && window.routes.cart_change_url) || '/cart/change.js', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify({ id: item.key, quantity: quantity }),
    }).then(function (response) {
      return response.json().then(function (cart) {
        if (!response.ok || cart.status || cart.errors) throw new Error(cart.description || cart.message || 'Could not update the cart.');
        return cart;
      });
    }).then(function (cart) {
      overlayChanged = true;
      renderOverlayCart(cart);
      if (typeof publish === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
        publish(PUB_SUB_EVENTS.cartUpdate, { source: 'fb-cart-overlay', cartData: cart });
      }
    }).catch(function (error) {
      overlayError(error.message || 'Could not update the cart.');
    }).finally(function () {
      overlay.classList.remove('is-busy');
    });
  }

  function closeCartOverlay() {
    var overlay = document.querySelector('[data-fb-cart-overlay]');
    if (!overlay || overlay.hidden) return;
    overlay.hidden = true;
    document.body.classList.remove('fb-cart-overlay-open');
    if (overlayOpener) overlayOpener.focus();
    if (overlayChanged && window.location.pathname.replace(/\/$/, '') === getCartUrl().replace(/\/$/, '')) {
      window.location.reload();
    }
  }

  function openCartOverlay(opener) {
    var overlay = document.querySelector('[data-fb-cart-overlay]');
    if (!overlay) return;
    overlayOpener = opener;
    overlayChanged = false;
    overlay.hidden = false;
    document.body.classList.add('fb-cart-overlay-open');
    overlay.querySelector('.fb-cart-icon-overlay__panel').focus();
    overlayError('');
    overlay.querySelector('[data-fb-overlay-items]').replaceChildren(overlayElement('p', 'fb-cart-icon-overlay__empty', 'Loading cart…'));
    fetch(getCartUrl() + '.js', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(function (response) {
        if (!response.ok) throw new Error('Could not load the cart.');
        return response.json();
      })
      .then(renderOverlayCart)
      .catch(function () {
        overlayError('Could not load the cart. Use Go To Cart to view your items.');
      });
  }

  document.addEventListener('change', function (event) {
    if (event.target.matches('[data-fb-proof]')) updateProofAttribute(event.target);
    if (event.target.matches('[data-fb-delivery-option]')) updateDeliveryAttribute(event.target);
  });

  document.addEventListener('click', function (event) {
    var button = event.target.closest('[data-fb-apply-discount]');
    if (button) applyDiscount(button);
  });

  document.addEventListener('click', function (event) {
    if (!(event.target instanceof Element)) return;
    var cartIcon = event.target.closest('#cart-icon-bubble');
    if (!cartIcon || !document.querySelector('[data-fb-cart-overlay]')) return;
    event.preventDefault();
    event.stopPropagation();
    openCartOverlay(cartIcon);
  }, true);

  document.addEventListener('click', function (event) {
    if (!(event.target instanceof Element) || !event.target.closest('[data-fb-overlay-close]')) return;
    if (event.target.closest('[data-fb-cart-overlay]')) closeCartOverlay();
  });

  document.addEventListener('click', function (event) {
    if (!(event.target instanceof Element) || !event.target.closest('[data-fb-dawn-drawer-close]')) return;
    var drawer = event.target.closest('cart-drawer');
    if (drawer && typeof drawer.close === 'function') drawer.close();
  });

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Enter' || !event.target.matches('[data-fb-discount-code]')) return;
    event.preventDefault();
    var button = event.target.closest('.fb-cart-coupon')?.querySelector('[data-fb-apply-discount]');
    if (button) applyDiscount(button);
  });

  document.addEventListener('keydown', function (event) {
    var overlay = document.querySelector('[data-fb-cart-overlay]');
    if (!overlay || overlay.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeCartOverlay();
    } else if (event.key === 'Tab') {
      var focusable = Array.from(overlay.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), summary'));
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === overlay.querySelector('.fb-cart-icon-overlay__panel'))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
    subscribe(PUB_SUB_EVENTS.cartUpdate, function (event) {
      if (event.source !== 'cart-items') return;
      var pageItems = document.getElementById('main-cart-items');
      var page = pageItems && pageItems.closest('cart-items');
      var drawer = document.querySelector('cart-drawer');
      var hasBanner = pageItems
        ? !!pageItems.querySelector('.fb-cart-item')
        : !!(drawer && drawer.querySelector('.fb-cart-item'));
      var pageFooter = document.getElementById('main-cart-footer');
      if (page) page.classList.toggle('fb-cart-page', hasBanner);
      var count = document.querySelector('[data-fb-cart-count]');
      if (count && event.cartData && typeof event.cartData.item_count === 'number') {
        var itemCount = event.cartData.item_count;
        count.textContent = '(' + itemCount + ' ' + (itemCount === 1 ? 'item' : 'items') + ')';
      }
      if (pageFooter) {
        pageFooter.classList.toggle('fb-cart-page-footer', hasBanner);
        var checkout = pageFooter.querySelector('.cart__ctas');
        if (checkout) checkout.classList.toggle('fb-cart-checkout-sticky', hasBanner);
        if (!hasBanner) pageFooter.querySelector('.fb-cart-trust')?.remove();
      }
      if (drawer) {
        drawer.classList.toggle('fb-cart-drawer', hasBanner);
        drawer.querySelector('.drawer__footer')?.classList.toggle('fb-cart-footer', hasBanner);
        if (!hasBanner) drawer.querySelector('.fb-cart-trust')?.remove();
      }
      observeMainCheckout();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      syncCartIntro();
      observeMainCheckout();
    }, { once: true });
  } else {
    syncCartIntro();
    observeMainCheckout();
  }
})();
