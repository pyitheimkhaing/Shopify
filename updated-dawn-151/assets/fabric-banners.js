(function () {
  "use strict";

  // Built from the real product media rendered by Liquid (li[data-src] in .fb-thumbs).
  var gallery = [];

  // Pill data-attr -> exact Shopify "Size" option value (spacing is inconsistent on the store; do not normalize).
  var SIZE_VALUES = {
    "3x2": "3 x 2",
    "4x2": "4 x 2",
    "4x3": "4 x 3",
    "6x2": "6 x2",
    "6x3": "6 x 3",
    "6x4": "6 x4",
    "8x4": "8 x 4"
  };

  // Known dimensions in feet, backed by Shopify Size option values.
  var SIZE_DIMS = {
    "3x2": [3, 2],
    "4x2": [4, 2],
    "4x3": [4, 3],
    "6x2": [6, 2],
    "6x3": [6, 3],
    "6x4": [6, 4],
    "8x4": [8, 4]
  };

  var UNIT_VALUES = { ft: "Feet", "in": "Inch" };
  var SIZE_TYPE_POPULAR = "Popular Size";
  var SIZE_TYPE_CUSTOM = "Custom Size";

  var state = {
    index: 0,
    thumbOffset: 0,
    unit: "ft",
    size: "3x2",
    sizeType: SIZE_TYPE_POPULAR,
    w: 3,
    h: 2,
    variantId: null,
    print: "one",
    mount: "grommets",
    pocket: "top",
    qty: 1,
    ship: "standard"
  };

  var variants = [];
  var current = null;
  var offerQty = 1;

  function loadVariants() {
    var el = document.querySelector('script[id^="fb-variants-"]');
    if (!el) return;
    try {
      variants = JSON.parse(el.textContent);
    } catch (e) {
      variants = [];
    }
  }

  function findVariant() {
    var opt1 = UNIT_VALUES[state.unit];
    var opt2 = state.sizeType;
    var opt3 = SIZE_VALUES[state.size];
    if (!opt3) return null;
    if (state.variantId) {
      for (var selectedIndex = 0; selectedIndex < variants.length; selectedIndex++) {
        var selected = variants[selectedIndex];
        if (String(selected.id) === String(state.variantId) && selected.option1 === opt1 && selected.option2 === opt2 && selected.option3 === opt3) return selected;
      }
    }
    for (var i = 0; i < variants.length; i++) {
      var v = variants[i];
      if (v.option1 === opt1 && v.option2 === opt2 && v.option3 === opt3) return v;
    }
    return null;
  }

  function exactSizeKey(w, h) {
    var wf = state.unit === "in" ? w / 12 : w;
    var hf = state.unit === "in" ? h / 12 : h;
    var keys = Object.keys(SIZE_DIMS);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var d = SIZE_DIMS[key];
      if (Math.abs(d[0] - wf) < 0.001 && Math.abs(d[1] - hf) < 0.001) return key;
    }
    return null;
  }

  function printLabel() {
    return state.print === "both" ? "Both sides" : "One side";
  }

  function mountLabel() {
    return state.mount === "pockets" ? "Pole pockets" : state.mount === "none" ? "None" : "Brass grommets";
  }

  function pocketLabel() {
    return state.pocket === "tb" ? "Top and bottom" : state.pocket === "lr" ? "Left and right" : "Top only";
  }

  function shipLabel() {
    if (state.ship === "express") return "Express requested";
    if (state.ship === "overnight") return "Overnight requested";
    return "Standard requested";
  }

  function syncArtworkStatus(uploadLater) {
    var status = $("#fb-prop-artwork-status");
    if (!status) return;
    var fileInput = $("#fb-form-artwork");
    var existingArtwork = $("#fb-prop-artwork-existing");
    var hasArtwork = !!((fileInput && !fileInput.disabled && fileInput.files && fileInput.files.length) ||
      (existingArtwork && !existingArtwork.disabled && existingArtwork.value));
    status.value = hasArtwork ? "Uploaded" : uploadLater ? "Upload Later" : "";
    status.disabled = !status.value;
  }

  function syncForm() {
    current = findVariant();
    var idInput = $("#fb-variant-id");
    if (idInput) {
      idInput.value = current ? String(current.id) : "";
      idInput.disabled = !current;
    }
    var print = $("#fb-prop-print");
    var mount = $("#fb-prop-mount");
    var pocket = $("#fb-prop-pocket");
    var ship = $("#fb-prop-ship");
    if (print) print.value = printLabel();
    if (mount) mount.value = mountLabel();
    if (pocket) {
      pocket.value = pocketLabel();
      pocket.disabled = state.mount !== "pockets";
    }
    if (ship) ship.value = shipLabel();
    var width = $("#fb-prop-width");
    var height = $("#fb-prop-height");
    var unit = $("#fb-prop-unit");
    var sizeType = $("#fb-prop-size-type");
    if (width) width.value = state.w;
    if (height) height.value = state.h;
    if (unit) unit.value = UNIT_VALUES[state.unit];
    if (sizeType) sizeType.value = state.sizeType;
    var custom = state.sizeType === SIZE_TYPE_CUSTOM;
    var customWidth = $("#fb-prop-custom-width");
    var customHeight = $("#fb-prop-custom-height");
    var customUnit = $("#fb-prop-custom-unit");
    if (customWidth) {
      customWidth.value = custom ? String(state.w) : "";
      customWidth.disabled = !custom;
    }
    if (customHeight) {
      customHeight.value = custom ? String(state.h) : "";
      customHeight.disabled = !custom;
    }
    if (customUnit) {
      customUnit.value = custom ? UNIT_VALUES[state.unit] : "";
      customUnit.disabled = !custom;
    }
    var qtyIn = $("#fb-qty");
    if (qtyIn) qtyIn.value = state.qty;
    var btn = $("#fb-add-to-cart");
    var continueBtn = $("#fb-continue-btn");
    if (btn) {
      var label = btn.querySelector("span");
      var form = $(".fb-pricebar__form");
      var ok = !!current && current.available && !(form && form.dataset.fbEditPending === "true");
      if (ok) {
        btn.removeAttribute("disabled");
        if (label) label.textContent = window.variantStrings ? window.variantStrings.addToCart : "Add to cart";
        if (continueBtn) {
          continueBtn.removeAttribute("disabled");
          var cLabel = continueBtn.querySelector("span");
          if (cLabel) cLabel.textContent = "Continue";
        }
      } else {
        btn.setAttribute("disabled", "disabled");
        var fallbackText = current
          ? window.variantStrings ? window.variantStrings.soldOut : "Sold out"
          : window.variantStrings ? window.variantStrings.unavailable : "Unavailable";
        if (label) {
          label.textContent = fallbackText;
        }
        if (continueBtn) {
          continueBtn.setAttribute("disabled", "disabled");
          var cLabel = continueBtn.querySelector("span");
          if (cLabel) cLabel.textContent = fallbackText;
        }
      }
    }
  }

  function updateSizeUi() {
    $all("[data-fb-size]").forEach(function (b) {
      var key = b.getAttribute("data-fb-size");
      var active = state.sizeType === SIZE_TYPE_CUSTOM ? key === "custom" : key === state.size;
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-pressed", active ? "true" : "false");
      if (SIZE_DIMS[key]) {
        var dims = SIZE_DIMS[key];
        var factor = state.unit === "in" ? 12 : 1;
        b.textContent = (dims[0] * factor) + " x " + (dims[1] * factor);
      }
    });
    var sizeBlock = $(".fb-size-block");
    if (sizeBlock) sizeBlock.classList.toggle("is-custom", state.sizeType === SIZE_TYPE_CUSTOM);
    var popular = $("[data-fb-size-type='popular']");
    if (popular) {
      var isPopular = state.sizeType === SIZE_TYPE_POPULAR;
      popular.classList.toggle("is-active", isPopular);
      popular.setAttribute("aria-pressed", isPopular ? "true" : "false");
    }
    var custom = $('[data-fb-size="custom"]');
    if (custom) custom.setAttribute("aria-pressed", state.sizeType === SIZE_TYPE_CUSTOM ? "true" : "false");
    var wInput = $("#fb-size-w");
    var hInput = $("#fb-size-h");
    if (wInput) wInput.max = state.unit === "in" ? "1200" : "100";
    if (hInput) hInput.max = state.unit === "in" ? "1800" : "150";
  }

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function $all(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function toast(msg) {
    var el = $("#fb-toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("is-visible");
    setTimeout(function () {
      el.classList.remove("is-visible");
    }, 2200);
  }

  function syncModalScroll() {
    var root = document.documentElement;
    var anyOpen = $all(".fb-modal.is-open").length > 0;
    if (anyOpen) {
      root.setAttribute("data-fb-modal-lock", "1");
      root.style.overflow = "hidden";
    } else if (root.getAttribute("data-fb-modal-lock") === "1") {
      root.style.overflow = "";
      root.removeAttribute("data-fb-modal-lock");
    }
  }

  function openModal(id) {
    var m = document.getElementById(id);
    if (id === "fb-lightbox") resetLightboxZoom();
    if (id === "fb-offers-modal") {
      offerQty = state.qty;
      updateOfferPreview();
    }
    if (m) m.classList.add("is-open");
    syncModalScroll();
  }

  function closeModal(el) {
    var m = el.closest ? el.closest(".fb-modal") : el;
    if (m) m.classList.remove("is-open");
    if (m && m.id === "fb-lightbox") resetLightboxZoom();
    syncModalScroll();
  }

  function resetLightboxZoom() {
    var modal = $("#fb-lightbox");
    if (!modal) return;
    var image = $("#fb-lightbox-img", modal);
    var stage = $(".fb-lightbox__stage", modal);
    var button = $(".fb-lightbox__zoom", modal);
    modal.classList.remove("is-zoomed");
    if (image) {
      image.style.width = "";
      image.style.height = "";
    }
    if (stage) {
      stage.scrollLeft = 0;
      stage.scrollTop = 0;
    }
    if (button) {
      button.textContent = "+";
      button.setAttribute("aria-label", "Zoom image");
      button.setAttribute("aria-pressed", "false");
    }
  }

  function initLightboxZoom() {
    var modal = $("#fb-lightbox");
    if (!modal) return;
    var image = $("#fb-lightbox-img", modal);
    var stage = $(".fb-lightbox__stage", modal);
    var button = $(".fb-lightbox__zoom", modal);
    if (!image || !stage || !button) return;
    function toggleZoom() {
      if (modal.classList.contains("is-zoomed")) {
        resetLightboxZoom();
        return;
      }
      var fitted = image.getBoundingClientRect();
      if (!fitted.width || !fitted.height) return;
      image.style.width = Math.round(fitted.width * 2) + "px";
      image.style.height = Math.round(fitted.height * 2) + "px";
      modal.classList.add("is-zoomed");
      button.textContent = "−";
      button.setAttribute("aria-label", "Fit image to screen");
      button.setAttribute("aria-pressed", "true");
      requestAnimationFrame(function () {
        stage.scrollLeft = Math.max(0, (stage.scrollWidth - stage.clientWidth) / 2);
        stage.scrollTop = Math.max(0, (stage.scrollHeight - stage.clientHeight) / 2);
      });
    }
    button.addEventListener("click", toggleZoom);
    image.addEventListener("click", toggleZoom);
  }

  function submitConfiguredProduct() {
    var form = $(".fb-pricebar__form");
    var submit = $("#fb-add-to-cart");
    renderPrice();
    if (!form || !submit || submit.disabled) return;
    if (typeof form.requestSubmit === "function") form.requestSubmit(submit);
    else submit.click();
  }

  function loadGallery() {
    gallery = $all(".fb-thumbs li").map(function (li) {
      return {
        src: li.getAttribute("data-src"),
        srcset: li.getAttribute("data-srcset") || "",
        full: li.getAttribute("data-full") || li.getAttribute("data-src"),
        alt: li.getAttribute("data-alt") || ""
      };
    });
  }

  function setGallery(i) {
    if (!gallery.length) return;
    state.index = (i + gallery.length) % gallery.length;
    var item = gallery[state.index];
    var img = $("#fb-main-image");
    if (img) {
      img.src = item.src;
      if (item.srcset) img.setAttribute("srcset", item.srcset);
      else img.removeAttribute("srcset");
      img.alt = item.alt;
    }
    $all(".fb-thumbs li").forEach(function (li, idx) {
      li.classList.toggle("is-active", idx === state.index);
    });
    $all(".fb-dots button").forEach(function (btn, idx) {
      btn.classList.toggle("is-active", idx === state.index);
    });
    var lightbox = $("#fb-lightbox-img");
    if (lightbox) {
      lightbox.src = item.full;
      lightbox.alt = item.alt;
    }
  }

  function renderPrice() {
    syncForm();
    var each = $("#fb-each-price");
    var old = $("#fb-old-each");
    var total = $("#fb-total-price");
    var badge = $("#fb-discount-badge");
    var onSale = !!current && current.compare_at_price > current.price;
    if (each) each.textContent = current ? current.price_formatted + " ea." : "Price unavailable for this size";
    if (old) {
      old.textContent = onSale ? current.compare_at_price_formatted + " ea." : "";
      old.style.display = onSale ? "inline" : "none";
    }
    if (total) {
      total.textContent = current ? formatTotal(current.price * state.qty, current) : "";
    }
    if (badge) {
      var pct = onSale ? Math.round((1 - current.price / current.compare_at_price) * 100) : 0;
      badge.textContent = pct ? pct + "% off" : "";
      badge.style.display = pct ? "inline" : "none";
    }
    var body = $("#fb-price-breakdown");
    if (body) {
      var subtotal = current ? formatTotal(current.price * state.qty, current) : "Unavailable";
      var unit = current ? current.price_formatted : "Unavailable";
      body.innerHTML =
        "<tr class='fb-price-line'><th>Subtotal<small>" + unit + " per unit × " + state.qty + "</small></th><td>" + subtotal + "</td></tr>" +
        "<tr class='fb-price-line'><th>Delivery<small>" + shipLabel() + "</small></th><td>At checkout</td></tr>" +
        "<tr class='fb-price-grand'><th>Product total<small>Excludes delivery and checkout discounts</small></th><td>" + subtotal + "</td></tr>" +
        "<tr class='fb-price-config'><th>Selected options</th><td>" + state.w + " x " + state.h + " " + (UNIT_VALUES[state.unit] || "") + "; " + printLabel() + "; " + mountLabel() + (state.mount === "pockets" ? " (" + pocketLabel() + ")" : "") + "</td></tr>";
    }
    updateOfferPreview();
  }

  function updateOfferPreview() {
    var qty = $("#fb-offers-qty");
    var each = $("#fb-offers-each");
    var total = $("#fb-offers-total");
    if (qty) qty.textContent = String(offerQty);
    if (each) each.textContent = current ? current.price_formatted + " per unit × " + offerQty : "Price unavailable";
    if (total) total.textContent = current ? formatTotal(current.price * offerQty, current) : "Unavailable";
  }

  // Variant prices arrive in minor units plus a Liquid-formatted string; reuse the string's
  // prefix/suffix and digit layout so the total keeps the store's currency format.
  function formatTotal(cents, v) {
    var m = v.price_formatted.match(/^([^\d]*)([\d.,\s]+)(.*)$/);
    if (!m) return (cents / 100).toFixed(2);
    var sample = m[2].trim();
    var decSep = /,\d{2}$/.test(sample) ? "," : ".";
    var thouSep = decSep === "," ? "." : ",";
    var parts = (cents / 100).toFixed(2).split(".");
    var whole = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, sample.indexOf(thouSep) > -1 ? thouSep : "");
    return m[1] + whole + decSep + parts[1] + m[3];
  }

  function updateOptionLabels() {
    var print = $("#fb-print-value");
    var mount = $("#fb-mount-value");
    var pocket = $("#fb-pocket-value");
    if (print) print.textContent = state.print === "both" ? "Both sides" : "One side";
    if (mount) {
      mount.textContent =
        state.mount === "pockets" ? "Pole pockets" : state.mount === "none" ? "None" : "Brass grommets";
    }
    if (pocket) pocket.textContent = state.pocket === "tb" ? "Top & bottom" : state.pocket === "lr" ? "Left & right" : "Top only";
    var pocketRow = $("#fb-pocket-row");
    if (pocketRow) {
      pocketRow.classList.toggle("is-hidden", state.mount !== "pockets");
      if (state.mount !== "pockets") {
        pocketRow.classList.remove("is-open");
        var pocketHead = pocketRow.querySelector(".fb-opt-row__head");
        if (pocketHead) pocketHead.setAttribute("aria-expanded", "false");
      }
    }
  }

  function setTab(name) {
    $all("[data-fb-tab]").forEach(function (btn) {
      btn.classList.toggle("is-active", btn.getAttribute("data-fb-tab") === name);
    });
    $all("[data-fb-panel]").forEach(function (panel) {
      var match = panel.getAttribute("data-fb-panel") === name;
      if (match) panel.removeAttribute("hidden");
      else panel.setAttribute("hidden", "");
    });
  }

  function initGallery() {
    loadGallery();
    $all(".fb-thumbs li").forEach(function (li, idx) {
      li.addEventListener("click", function () {
        setGallery(idx);
      });
    });
    $all(".fb-dots button").forEach(function (btn, idx) {
      btn.addEventListener("click", function () {
        setGallery(idx);
      });
    });
    var prev = $(".fb-thumbs-btn--prev");
    var next = $(".fb-thumbs-btn--next");
    if (prev) prev.addEventListener("click", function () { setGallery(state.index - 1); });
    if (next) next.addEventListener("click", function () { setGallery(state.index + 1); });
    var main = $(".fb-gallery__main");
    if (main) {
      main.addEventListener("click", function () {
        setGallery(state.index);
        openModal("fb-lightbox");
      });
    }
    var startX = 0;
    var galleryEl = $(".fb-gallery");
    if (galleryEl) {
      galleryEl.addEventListener("touchstart", function (e) {
        startX = e.changedTouches[0].screenX;
      }, { passive: true });
      galleryEl.addEventListener("touchend", function (e) {
        var dx = e.changedTouches[0].screenX - startX;
        if (Math.abs(dx) > 40) setGallery(state.index + (dx < 0 ? 1 : -1));
      }, { passive: true });
    }
  }

  function initConfig() {
    $all("[data-fb-unit]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var newUnit = btn.getAttribute("data-fb-unit");
        if (newUnit !== state.unit) {
          state.variantId = null;
          var factor = newUnit === "in" ? 12 : 1 / 12;
          if (state.sizeType === SIZE_TYPE_CUSTOM) {
            state.w = Math.round(state.w * factor * 100) / 100;
            state.h = Math.round(state.h * factor * 100) / 100;
          } else {
            var dims = SIZE_DIMS[state.size];
            state.w = dims[0] * (newUnit === "in" ? 12 : 1);
            state.h = dims[1] * (newUnit === "in" ? 12 : 1);
          }
          state.unit = newUnit;
          if (state.sizeType === SIZE_TYPE_CUSTOM) state.size = exactSizeKey(state.w, state.h);
          if (wIn) wIn.value = state.w;
          if (hIn) hIn.value = state.h;
        }
        $all("[data-fb-unit]").forEach(function (b) {
          b.classList.toggle("is-active", b === btn);
          b.setAttribute("aria-pressed", b === btn ? "true" : "false");
        });
        updateSizeUi();
        renderPrice();
      });
    });

    var wIn = $("#fb-size-w");
    var hIn = $("#fb-size-h");

    var popularSizeType = $("[data-fb-size-type='popular']");
    if (popularSizeType) {
      popularSizeType.addEventListener("click", function () {
        state.variantId = null;
        state.sizeType = SIZE_TYPE_POPULAR;
        if (!state.size) state.size = "3x2";
        var dims = SIZE_DIMS[state.size];
        var mult = state.unit === "in" ? 12 : 1;
        state.w = dims[0] * mult;
        state.h = dims[1] * mult;
        if (wIn) wIn.value = state.w;
        if (hIn) hIn.value = state.h;
        updateSizeUi();
        renderPrice();
      });
    }

    $all("[data-fb-size]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.variantId = null;
        var val = btn.getAttribute("data-fb-size");
        if (val === "custom") {
          state.w = parseFloat(wIn && wIn.value) || 1;
          state.h = parseFloat(hIn && hIn.value) || 1;
          state.sizeType = SIZE_TYPE_CUSTOM;
          state.size = exactSizeKey(state.w, state.h);
        } else if (SIZE_DIMS[val]) {
          state.sizeType = SIZE_TYPE_POPULAR;
          state.size = val;
          var mult = state.unit === "in" ? 12 : 1;
          state.w = SIZE_DIMS[val][0] * mult;
          state.h = SIZE_DIMS[val][1] * mult;
          if (wIn) wIn.value = state.w;
          if (hIn) hIn.value = state.h;
        }
        updateSizeUi();
        renderPrice();
      });
    });

    function customChange() {
      state.variantId = null;
      state.w = parseFloat(wIn.value) || 1;
      state.h = parseFloat(hIn.value) || 1;
      state.sizeType = SIZE_TYPE_CUSTOM;
      state.size = exactSizeKey(state.w, state.h);
      updateSizeUi();
      renderPrice();
    }
    if (wIn) wIn.addEventListener("change", customChange);
    if (hIn) hIn.addEventListener("change", customChange);

    $all(".fb-opt-row__head").forEach(function (head) {
      head.addEventListener("click", function () {
        var row = head.closest(".fb-opt-row");
        var open = row.classList.contains("is-open");
        $all(".fb-opt-row").forEach(function (r) {
          r.classList.remove("is-open");
          var trigger = r.querySelector(".fb-opt-row__head");
          if (trigger) trigger.setAttribute("aria-expanded", "false");
        });
        if (!open) {
          row.classList.add("is-open");
          head.setAttribute("aria-expanded", "true");
        }
      });
    });

    $all("[data-fb-print]").forEach(function (card) {
      card.addEventListener("click", function () {
        state.variantId = null;
        state.print = card.getAttribute("data-fb-print");
        $all("[data-fb-print]").forEach(function (c) {
          c.classList.toggle("is-active", c === card);
          c.setAttribute("aria-pressed", c === card ? "true" : "false");
        });
        updateOptionLabels();
        renderPrice();
      });
    });

    $all("[data-fb-mount]").forEach(function (card) {
      card.addEventListener("click", function () {
        state.variantId = null;
        state.mount = card.getAttribute("data-fb-mount");
        $all("[data-fb-mount]").forEach(function (c) {
          c.classList.toggle("is-active", c === card);
          c.setAttribute("aria-pressed", c === card ? "true" : "false");
        });
        updateOptionLabels();
        renderPrice();
      });
    });

    $all("[data-fb-pocket]").forEach(function (card) {
      card.addEventListener("click", function () {
        state.variantId = null;
        state.pocket = card.getAttribute("data-fb-pocket");
        $all("[data-fb-pocket]").forEach(function (c) {
          c.classList.toggle("is-active", c === card);
          c.setAttribute("aria-pressed", c === card ? "true" : "false");
        });
        updateOptionLabels();
        renderPrice();
      });
    });

    $all("[data-fb-ship]").forEach(function (card) {
      card.addEventListener("click", function () {
        state.variantId = null;
        state.ship = card.getAttribute("data-fb-ship");
        $all("[data-fb-ship]").forEach(function (c) {
          c.classList.toggle("is-selected", c === card);
        });
        renderPrice();
      });
    });

    var qtyIn = $("#fb-qty");
    var mobQtyIn = $("#fb-mobile-qty-val");
    function setQty(n) {
      state.qty = Math.max(1, Math.min(99999, n));
      if (qtyIn) qtyIn.value = state.qty;
      if (mobQtyIn) mobQtyIn.value = state.qty;
      renderPrice();
    }
    var minus = $("#fb-qty-minus");
    var plus = $("#fb-qty-plus");
    if (minus) minus.addEventListener("click", function () { setQty(state.qty - 1); });
    if (plus) plus.addEventListener("click", function () { setQty(state.qty + 1); });
    if (qtyIn) qtyIn.addEventListener("change", function () { setQty(parseInt(qtyIn.value, 10) || 1); });

    var mobMinus = $("#fb-mobile-qty-minus");
    var mobPlus = $("#fb-mobile-qty-plus");
    if (mobMinus) mobMinus.addEventListener("click", function () { setQty(state.qty - 1); });
    if (mobPlus) mobPlus.addEventListener("click", function () { setQty(state.qty + 1); });
    if (mobQtyIn) mobQtyIn.addEventListener("change", function () { setQty(parseInt(mobQtyIn.value, 10) || 1); });
  }

  function initTabs() {
    $all("[data-fb-tab]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setTab(btn.getAttribute("data-fb-tab"));
      });
    });
    $all("[data-fb-goto-tab]").forEach(function (el) {
      el.addEventListener("click", function () {
        var name = el.getAttribute("data-fb-goto-tab");
        setTab(name);
        var panel = $('[data-fb-panel="' + name + '"]');
        if (panel) panel.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
    var more = $("#fb-readmore");
    if (more) {
      more.addEventListener("click", function () {
        var prose = $(".fb-content .fb-prose");
        if (!prose) return;
        prose.classList.toggle("is-collapsed");
        more.textContent = prose.classList.contains("is-collapsed") ? "Read more" : "Read less";
      });
    }
  }

  function formatBytes(bytes) {
    if (bytes === 0) return "0 Bytes";
    var k = 1024;
    var sizes = ["Bytes", "KB", "MB", "GB"];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }

  function initModals() {
    var uploadForContinue = false;
    var uploadLaterBtn = $("#fb-upload-later");
    $all("[data-fb-open]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (btn.id === "fb-artwork-change") {
          uploadForContinue = false;
          if (uploadLaterBtn) uploadLaterBtn.textContent = "Upload Later";
        }
        openModal(btn.getAttribute("data-fb-open"));
      });
    });
    var offersMinus = $("#fb-offers-minus");
    var offersPlus = $("#fb-offers-plus");
    var offersApply = $("#fb-offers-apply");
    if (offersMinus) offersMinus.addEventListener("click", function () {
      offerQty = Math.max(1, offerQty - 1);
      updateOfferPreview();
    });
    if (offersPlus) offersPlus.addEventListener("click", function () {
      offerQty = Math.min(99999, offerQty + 1);
      updateOfferPreview();
    });
    if (offersApply) offersApply.addEventListener("click", function () {
      var qtyInput = $("#fb-qty");
      if (qtyInput) {
        qtyInput.value = String(offerQty);
        qtyInput.dispatchEvent(new Event("change", { bubbles: true }));
      }
      closeModal(offersApply);
    });
    $all(".fb-modal__close, .fb-modal__backdrop").forEach(function (el) {
      el.addEventListener("click", function () {
        if (el.closest("#fb-upload-modal")) uploadForContinue = false;
        closeModal(el);
      });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        $all(".fb-modal.is-open").forEach(function (m) {
          m.classList.remove("is-open");
        });
        uploadForContinue = false;
        resetLightboxZoom();
        syncModalScroll();
      }
    });

    var methodModal = $("#fb-design-method-modal");
    var continueBtn = $("#fb-continue-btn");
    if (continueBtn) continueBtn.addEventListener("click", function () { openModal("fb-design-method-modal"); });
    var methodDesign = $("#fb-method-design");
    if (methodDesign) methodDesign.addEventListener("click", function () {
      closeModal(methodModal);
      openModal("fb-design-modal");
      var launch = $("#fb-design-start");
      if (launch) launch.click();
    });
    var methodUpload = $("#fb-method-upload");
    if (methodUpload) methodUpload.addEventListener("click", function () {
      uploadForContinue = true;
      if (uploadLaterBtn) uploadLaterBtn.textContent = "Upload Later & Continue";
      closeModal(methodModal);
      openModal("fb-upload-modal");
    });
    var methodSkip = $("#fb-method-skip");
    if (methodSkip) methodSkip.addEventListener("click", function () {
      closeModal(methodModal);
      syncArtworkStatus(true);
      submitConfiguredProduct();
    });

    // --- ARTWORK UPLOAD INTEGRATION ---
    var modalInput = $("#fb-upload-input");
    var formInput = $("#fb-form-artwork");
    var existingArtworkInput = $("#fb-prop-artwork-existing");
    var dropzone = $("#fb-dropzone");
    var errBox = $("#fb-upload-error");
    var previewBox = $("#fb-upload-modal-preview");
    var previewName = $("#fb-upload-modal-filename");
    var previewSize = $("#fb-upload-modal-filesize");
    var confirmBtn = $("#fb-upload-confirm");

    var statusBox = $("#fb-artwork-status");
    var statusName = $("#fb-artwork-filename");
    var statusSize = $("#fb-artwork-filesize");
    var removeBtn = $("#fb-artwork-remove");
    var uploadModal = document.getElementById("fb-upload-modal");

    var pendingFile = null;
    var MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
    var ALLOWED_EXTS = ["jpg", "jpeg", "png", "svg", "pdf", "ai", "eps"];

    function validateFile(file) {
      if (!file) return "Please choose a file to upload.";
      var parts = file.name.split(".");
      var ext = parts.length > 1 ? parts.pop().toLowerCase() : "";
      if (ALLOWED_EXTS.indexOf(ext) === -1) {
        return "Unsupported file type (" + (ext ? "." + ext : "unknown") + "). Supported formats: JPG, PNG, PDF, SVG, AI, EPS.";
      }
      if (file.size > MAX_FILE_SIZE) {
        return "File exceeds the 25MB limit (current: " + formatBytes(file.size) + "). Please choose a smaller file.";
      }
      return null;
    }

    function showUploadError(msg) {
      if (!errBox) return;
      if (msg) {
        errBox.textContent = msg;
        errBox.classList.remove("is-hidden");
      } else {
        errBox.textContent = "";
        errBox.classList.add("is-hidden");
      }
    }

    function stageFile(file) {
      var err = validateFile(file);
      if (err) {
        pendingFile = null;
        showUploadError(err);
        if (previewBox) previewBox.classList.add("is-hidden");
        return;
      }
      showUploadError(null);
      pendingFile = file;
      if (previewName) previewName.textContent = file.name;
      if (previewSize) previewSize.textContent = "(" + formatBytes(file.size) + ")";
      if (previewBox) previewBox.classList.remove("is-hidden");
    }

    function commitFile(file) {
      if (!file || !formInput) return;
      try {
        var dt = new DataTransfer();
        dt.items.add(file);
        formInput.files = dt.files;
      } catch (err) {
        try {
          if (modalInput && modalInput.files.length) formInput.files = modalInput.files;
        } catch (fallbackError) {
          // Keep the form file field disabled if the browser rejects assignment.
        }
      }
      var attached = formInput.files && formInput.files[0];
      if (!attached || attached.name !== file.name || attached.size !== file.size || attached.lastModified !== file.lastModified) {
        showUploadError("The file could not be attached. Please choose it again.");
        return;
      }
      formInput.disabled = false;
      if (existingArtworkInput) existingArtworkInput.disabled = true;
      syncArtworkStatus(false);

      // Update active buy box status pill
      if (statusName) statusName.textContent = attached.name;
      if (statusSize) statusSize.textContent = "(" + formatBytes(attached.size) + ")";
      if (statusBox) statusBox.classList.remove("is-hidden");

      toast("Artwork attached: " + file.name);
      closeModal(uploadModal);
      if (uploadForContinue) {
        uploadForContinue = false;
        submitConfiguredProduct();
      }
    }

    function removeFile(silent) {
      pendingFile = null;
      if (modalInput) modalInput.value = "";
      if (formInput) {
        formInput.value = "";
        formInput.disabled = true;
      }
      if (existingArtworkInput) {
        existingArtworkInput.value = "";
        existingArtworkInput.disabled = true;
      }
      if (statusBox) statusBox.classList.add("is-hidden");
      if (statusName) statusName.textContent = "";
      if (statusSize) statusSize.textContent = "";
      if (previewBox) previewBox.classList.add("is-hidden");
      showUploadError(null);
      syncArtworkStatus(false);
      if (!silent) toast("Artwork removed.");
    }

    if (uploadLaterBtn) uploadLaterBtn.addEventListener("click", function () {
      var keepExistingArtwork = existingArtworkInput && !existingArtworkInput.disabled && existingArtworkInput.value;
      if (keepExistingArtwork) {
        pendingFile = null;
        if (modalInput) modalInput.value = "";
        if (formInput) {
          formInput.value = "";
          formInput.disabled = true;
        }
        if (previewBox) previewBox.classList.add("is-hidden");
        showUploadError(null);
      } else {
        removeFile(true);
      }
      syncArtworkStatus(true);
      closeModal(uploadLaterBtn);
      if (uploadForContinue) {
        uploadForContinue = false;
        submitConfiguredProduct();
      }
    });

    if (modalInput) {
      modalInput.addEventListener("change", function () {
        if (modalInput.files && modalInput.files[0]) {
          stageFile(modalInput.files[0]);
        }
      });
    }

    if (confirmBtn) {
      confirmBtn.addEventListener("click", function () {
        if (pendingFile) {
          commitFile(pendingFile);
        }
      });
    }

    if (removeBtn) {
      removeBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        removeFile();
      });
    }

    // Drag and Drop support
    if (dropzone) {
      ["dragenter", "dragover"].forEach(function (eventName) {
        dropzone.addEventListener(eventName, function (e) {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.add("is-dragover");
        }, false);
      });

      ["dragleave", "drop"].forEach(function (eventName) {
        dropzone.addEventListener(eventName, function (e) {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.remove("is-dragover");
        }, false);
      });

      dropzone.addEventListener("drop", function (e) {
        var dt = e.dataTransfer;
        if (dt && dt.files && dt.files.length) {
          stageFile(dt.files[0]);
        }
      });
    }

    // --- DESIGN ONLINE / INKYBAY INTEGRATION ---
    var designBtn = $("#fb-design-start");
    var designStatus = $("#fb-design-status");
    var designModal = document.getElementById("fb-design-modal");

    function findInkybayLauncher() {
      // Look for Inkybay / Efoli launcher elements in DOM
      var selectors = [
        "#in-customize-btn",
        ".inkybay-customize-btn",
        "#EFOLI_CUSTOMIZE_IT_BUTTON",
        "div[id*='EFOLI_CUSTOMIZE']",
        "button[id*='EFOLI_CUSTOMIZE']",
        "a[href*='apps/inkybay']",
        "[data-inkybay-btn]"
      ];
      for (var i = 0; i < selectors.length; i++) {
        var el = document.querySelector(selectors[i]);
        if (el && el.offsetParent !== null) return el;
      }
      return null;
    }

    if (designBtn) {
      designBtn.addEventListener("click", function () {
        var launcher = findInkybayLauncher();
        if (launcher) {
          closeModal(designModal);
          launcher.click();
          return;
        }

        // Check if global Inkybay API is present on window
        if (window.Inkybay && typeof window.Inkybay.openCustomizer === "function") {
          closeModal(designModal);
          window.Inkybay.openCustomizer();
          return;
        }

        // Keep the customer in the existing integration if its product launcher is unavailable.
        if (designStatus) {
          designStatus.innerHTML =
            "<p class='fb-design-note'>The online designer is not available for this product right now.</p>" +
            "<p class='fb-design-hint'>Please check the Inkybay product assignment or choose Upload Artwork instead.</p>";
          designStatus.classList.remove("is-hidden");
        }
      });
    }
  }

  function initShare() {
    $all("[data-fb-share]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var net = btn.getAttribute("data-fb-share");
        var url = encodeURIComponent(window.location.href);
        var title = encodeURIComponent(document.title);
        var map = {
          facebook: "https://www.facebook.com/sharer/sharer.php?u=" + url,
          twitter: "https://twitter.com/intent/tweet?url=" + url + "&text=" + title,
          pinterest: "https://pinterest.com/pin/create/button/?url=" + url
        };
        if (navigator.share && net === "native") {
          navigator.share({ title: document.title, url: window.location.href });
          return;
        }
        if (map[net]) window.open(map[net], "_blank", "noopener,width=600,height=480");
      });
    });
  }

  function initFaq() {
    $all(".fb-helpful button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var wrap = btn.parentElement;
        $all("button", wrap).forEach(function (b) {
          b.classList.remove("is-on");
        });
        btn.classList.add("is-on");
      });
    });
    var form = $("#fb-ask-form");
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var msg = $("#fb-ask-msg");
        if (msg) msg.classList.add("is-visible");
        form.reset();
      });
    }
  }

  function initReviews() {
    var shown = 5;
    var items = $all(".fb-review");
    function apply() {
      items.forEach(function (el, i) {
        el.classList.toggle("is-hidden-review", i >= shown);
      });
      var more = $("#fb-load-more");
      if (more) more.style.display = shown >= items.length ? "none" : "inline-block";
    }
    apply();
    var more = $("#fb-load-more");
    if (more) {
      more.addEventListener("click", function () {
        shown += 5;
        apply();
      });
    }
    var filter = $("#fb-review-filter");
    if (filter) {
      filter.addEventListener("change", function () {
        var val = filter.value;
        items.forEach(function (el) {
          var stars = el.getAttribute("data-stars");
          el.style.display = val === "all" || stars === val ? "" : "none";
        });
      });
    }
    $all("[data-fb-helpful-review]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        btn.classList.toggle("is-on");
      });
    });
  }

  function initMobilePricebar() {
    // Ensure dynamically injected Shopify Inbox launcher clears the bottom bar on mobile
    function adjustChatLauncher() {
      if (window.innerWidth >= 768) return;
      var selectors = [
        'inbox-online-store-chat:not([is-open="true"])',
        '#shopify-chat:not([is-open="true"])',
        '#dummy-chat-button-iframe',
        'iframe#ShopifyChat',
        '#shopify-chat > iframe',
        'iframe[name="chat-widget"]',
        'iframe[id*="chat"]',
        '.chat-launcher',
        '#chat-button',
        '[data-testid="chat-widget-button"]'
      ];
      selectors.forEach(function (sel) {
        var elements = document.querySelectorAll(sel);
        elements.forEach(function (el) {
          el.style.setProperty("bottom", "calc(125px + env(safe-area-inset-bottom))", "important");
          el.style.setProperty("z-index", "90", "important");
        });
      });
    }

    if (window.matchMedia("(max-width: 767px)").matches) {
      adjustChatLauncher();
      var chatObserver = new MutationObserver(adjustChatLauncher);
      chatObserver.observe(document.body, { childList: true, subtree: true });
      // Polling fallback during first 8 seconds while Shopify chat scripts asynchronously boot
      var chatPollCount = 0;
      var chatPollInterval = setInterval(function () {
        adjustChatLauncher();
        chatPollCount++;
        if (chatPollCount > 16) clearInterval(chatPollInterval);
      }, 500);
    }
  }

  // Relocate Globo options (Add Lamination & Add wind slits) into customization area if rendered inside #proPriceBox
  function initGloboRelocation() {
    function relocateGloboOptions() {
      var target = document.getElementById("fb-globo-options");
      if (!target) return;
      var priceBox = document.getElementById("proPriceBox");
      if (!priceBox) return;

      // Select individual option control elements from the price box or anywhere inside document if rendered outside
      var controlSelector = '.globo-form-control, .globo-option-item, .gpo-option-wrapper, [class*="globo-form-control"], [class*="gpo-option-wrapper"]';
      var controls = priceBox.querySelectorAll(controlSelector);
      
      // If individual controls are not yet found, check if a whole container is inside priceBox
      if (!controls.length && !target.children.length) {
        var globoContainer = priceBox.querySelector('.globo-form-app, .gpo-container, .gpo-properties, [class*="globo-form-app"], [class*="gpo-container"]');
        if (globoContainer) {
          // Extract the individual controls out of the container so they become direct children of target
          var innerControls = globoContainer.querySelectorAll(controlSelector);
          if (innerControls.length) {
            innerControls.forEach(function (ctrl) {
              target.appendChild(ctrl);
            });
            // Remove empty container if left behind
            if (globoContainer.parentElement && !globoContainer.children.length) {
              globoContainer.parentElement.removeChild(globoContainer);
            }
          } else {
            target.appendChild(globoContainer);
          }
        }
      } else if (controls.length) {
        controls.forEach(function (ctrl) {
          if (!target.contains(ctrl)) {
            target.appendChild(ctrl);
          }
        });
      }

      // If any intermediate wrapper was previously moved into target, flatten its children into target
      Array.prototype.slice.call(target.children).forEach(function (child) {
        if (!child.matches(controlSelector)) {
          var nested = child.querySelectorAll(controlSelector);
          if (nested.length) {
            nested.forEach(function (ctrl) {
              target.appendChild(ctrl);
            });
            if (child.parentElement) {
              child.parentElement.removeChild(child);
            }
          }
        }
      });

      // Target now has the actual field cards as direct children.
      // Clean up unwanted standalone '-' or '--' text nodes/placeholders safely without removing select options
      var allRenderedControls = target.querySelectorAll(controlSelector);
      allRenderedControls.forEach(function (c) {
        // Reset any old inline grid styles from previous attempts so CSS grid handles equal 50% columns cleanly
        c.style.gridColumn = '';
        c.style.order = '';

        var textEls = c.querySelectorAll('p, span, small, .globo-description, .gpo-description, .globo-form-text, .help-block');
        textEls.forEach(function (el) {
          // Never touch select elements or option elements
          if (el.tagName === 'SELECT' || el.tagName === 'OPTION' || el.closest('select')) return;
          var t = (el.textContent || '').trim();
          if (t === '-' || t === '—' || t === '--') {
            el.style.display = 'none';
          }
        });

        // Also check direct text nodes of the control or wrapper
        Array.prototype.slice.call(c.childNodes).forEach(function (node) {
          if (node.nodeType === Node.TEXT_NODE) {
            var val = (node.nodeValue || '').trim();
            if (val === '-' || val === '—' || val === '--') {
              node.nodeValue = '';
            }
          }
        });
      });
    }

    relocateGloboOptions();
    var globoObserver = new MutationObserver(relocateGloboOptions);
    globoObserver.observe(document.body, { childList: true, subtree: true });
    var globoPollCount = 0;
    var globoPollInterval = setInterval(function () {
      relocateGloboOptions();
      globoPollCount++;
      if (globoPollCount > 20) clearInterval(globoPollInterval);
    }, 400);
  }

  function restoreFabricBannerEdit() {
    var editKey = new URLSearchParams(window.location.search).get("fb_edit");
    var form = $(".fb-pricebar__form");
    if (!editKey || !form) return;
    form.dataset.fbEditKey = editKey;
    form.dataset.fbEditPending = "true";
    var addButton = $("#fb-add-to-cart");
    var continueButton = $("#fb-continue-btn");
    if (addButton) addButton.disabled = true;
    if (continueButton) continueButton.disabled = true;

    fetch((window.routes && window.routes.cart_url ? window.routes.cart_url : "/cart") + ".js", {
      credentials: "same-origin",
      headers: { Accept: "application/json" }
    })
      .then(function (response) {
        if (!response.ok) throw new Error("Could not load the saved cart customization.");
        return response.json();
      })
      .then(function (cart) {
        var line = (cart.items || []).filter(function (item) {
          return item.key === editKey && variants.some(function (variant) {
            return String(variant.id) === String(item.variant_id);
          });
        })[0];
        if (!line) {
          delete form.dataset.fbEditPending;
          delete form.dataset.fbEditKey;
          toast("The saved cart item was not found. Review your cart before adding a new banner.");
          syncForm();
          return;
        }
        var startingQuantities = {};
        (cart.items || []).forEach(function (item) { startingQuantities[item.key] = item.quantity; });
        form.dataset.fbEditCartQuantities = JSON.stringify(startingQuantities);

        var properties = line.properties || {};
        var options = line.options_with_values || [];
        var optionValues = options.map(function (option) { return option.value || ""; });
        var savedUnit = properties._fb_unit || properties["Custom Unit"] || optionValues[0] || "Feet";
        state.unit = /inch/i.test(savedUnit) ? "in" : "ft";
        state.sizeType = properties._fb_size_type || optionValues[1] || SIZE_TYPE_POPULAR;
        state.sizeType = /custom/i.test(state.sizeType) ? SIZE_TYPE_CUSTOM : SIZE_TYPE_POPULAR;

        var sizeText = optionValues[2] || "";
        var parsedDimensions = sizeText.match(/([\d.]+)\s*[x×]\s*([\d.]+)/i);
        state.w = parseFloat(properties._fb_width || properties["Custom Width"]) || (parsedDimensions ? parseFloat(parsedDimensions[1]) : state.w);
        state.h = parseFloat(properties._fb_height || properties["Custom Height"]) || (parsedDimensions ? parseFloat(parsedDimensions[2]) : state.h);
        state.size = exactSizeKey(state.w, state.h);
        state.variantId = line.variant_id || line.id;

        var print = String(properties["Print Sides"] || "").toLowerCase();
        state.print = print.indexOf("both") !== -1 ? "both" : "one";
        var mounting = String(properties.Mounting || "").toLowerCase();
        state.mount = mounting.indexOf("pocket") !== -1 ? "pockets" : mounting === "none" ? "none" : "grommets";
        var placement = String(properties["Pole Pocket Placement"] || "").toLowerCase();
        state.pocket = placement.indexOf("left") !== -1 ? "lr" : placement.indexOf("top and bottom") !== -1 ? "tb" : "top";
        var delivery = String(properties["Delivery Option"] || "").toLowerCase();
        state.ship = delivery.indexOf("overnight") !== -1 ? "overnight" : delivery.indexOf("express") !== -1 ? "express" : "standard";
        state.qty = Math.max(1, parseInt(line.quantity, 10) || 1);

        var widthInput = $("#fb-size-w");
        var heightInput = $("#fb-size-h");
        if (widthInput) widthInput.value = state.w;
        if (heightInput) heightInput.value = state.h;
        $all("[data-fb-unit]").forEach(function (button) {
          var active = button.getAttribute("data-fb-unit") === state.unit;
          button.classList.toggle("is-active", active);
          button.setAttribute("aria-pressed", active ? "true" : "false");
        });
        $all("[data-fb-print]").forEach(function (button) {
          var active = button.getAttribute("data-fb-print") === state.print;
          button.classList.toggle("is-active", active);
          button.setAttribute("aria-pressed", active ? "true" : "false");
        });
        $all("[data-fb-mount]").forEach(function (button) {
          var active = button.getAttribute("data-fb-mount") === state.mount;
          button.classList.toggle("is-active", active);
          button.setAttribute("aria-pressed", active ? "true" : "false");
        });
        $all("[data-fb-pocket]").forEach(function (button) {
          var active = button.getAttribute("data-fb-pocket") === state.pocket;
          button.classList.toggle("is-active", active);
          button.setAttribute("aria-pressed", active ? "true" : "false");
        });
        $all("[data-fb-ship]").forEach(function (button) {
          button.classList.toggle("is-selected", button.getAttribute("data-fb-ship") === state.ship);
        });

        var oldArtwork = properties.Artwork;
        var oldArtworkInput = $("#fb-prop-artwork-existing");
        var artworkStatus = $("#fb-artwork-status");
        var artworkName = $("#fb-artwork-filename");
        var artworkSize = $("#fb-artwork-filesize");
        if (oldArtwork && oldArtworkInput) {
          oldArtworkInput.value = oldArtwork;
          oldArtworkInput.disabled = false;
          if (artworkName) artworkName.textContent = String(oldArtwork).split("/").pop();
          if (artworkSize) artworkSize.textContent = "Previously uploaded; upload a new file to replace it.";
          if (artworkStatus) artworkStatus.classList.remove("is-hidden");
        }
        syncArtworkStatus(properties["Artwork Status"] === "Upload Later");

        var managedPropertyNames = {
          "Print Sides": true,
          Mounting: true,
          "Pole Pocket Placement": true,
          "Delivery Option": true,
          _fb_width: true,
          _fb_height: true,
          _fb_unit: true,
          _fb_size_type: true,
          "Custom Width": true,
          "Custom Height": true,
          "Custom Unit": true,
          "Artwork Status": true,
          Artwork: true
        };
        Object.keys(properties).forEach(function (name) {
          if (managedPropertyNames[name] || properties[name] == null || properties[name] === "") return;
          var propertyName = "properties[" + name + "]";
          var alreadyPresent = Array.prototype.some.call(form.elements, function (element) {
            return element.name === propertyName;
          });
          if (alreadyPresent) return;
          var restoredProperty = document.createElement("input");
          restoredProperty.type = "hidden";
          restoredProperty.name = propertyName;
          restoredProperty.value = properties[name];
          restoredProperty.setAttribute("data-fb-restored-property", "");
          form.appendChild(restoredProperty);
        });
        if (!form.dataset.fbRestoredPropertyGuard) {
          form.dataset.fbRestoredPropertyGuard = "true";
          form.addEventListener("submit", function () {
            var controls = Array.prototype.slice.call(form.elements);
            $all("[data-fb-restored-property]", form).forEach(function (restoredProperty) {
              var duplicate = controls.some(function (element) {
                return element !== restoredProperty && element.name === restoredProperty.name && !element.hasAttribute("data-fb-restored-property");
              });
              if (duplicate && restoredProperty.parentNode) restoredProperty.parentNode.removeChild(restoredProperty);
            });
          }, true);
        }

        updateSizeUi();
        updateOptionLabels();
        delete form.dataset.fbEditPending;
        syncForm();
        renderPrice();
      })
      .catch(function (error) {
        console.warn("Fabric Banner customization could not be restored.", error);
        form.dataset.fbEditPending = "true";
        toast("Could not restore this customization. Refresh the cart and try again.");
      });
  }

  function boot() {
    var product = $(".fb-product");
    if (!product || product.dataset.fbInitialized === "true") return;
    product.dataset.fbInitialized = "true";
    initGallery();
    initLightboxZoom();
    initConfig();
    initTabs();
    initModals();
    initShare();
    initFaq();
    initReviews();
    initMobilePricebar();
    initGloboRelocation();
    loadVariants();
    updateOptionLabels();
    updateSizeUi();
    renderPrice();
    setTab("description");
    restoreFabricBannerEdit();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
