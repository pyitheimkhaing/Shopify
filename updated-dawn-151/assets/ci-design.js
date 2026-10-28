/* Reviews carousel for the cid- design system. */
(function () {
  function init(root) {
    var track = root.querySelector('.cid-rev__track');
    var prev = root.querySelector('.cid-rev__arrow--prev');
    var next = root.querySelector('.cid-rev__arrow--next');
    if (!track || !prev || !next || root.__cidBound) return;
    root.__cidBound = true;

    function step() {
      var card = track.querySelector('.cid-rev__card');
      if (!card) return 300;
      var cs = getComputedStyle(track);
      var gap = parseFloat(cs.columnGap || cs.gap) || 24;
      return card.getBoundingClientRect().width + gap;
    }
    function update() {
      var max = track.scrollWidth - track.clientWidth;
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft >= max - 2;
    }
    prev.addEventListener('click', function () { track.scrollBy({ left: -step(), behavior: 'smooth' }); });
    next.addEventListener('click', function () { track.scrollBy({ left: step(), behavior: 'smooth' }); });
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }
  function boot() { document.querySelectorAll('[data-cid-reviews]').forEach(init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  document.addEventListener('shopify:section:load', boot);
})();
