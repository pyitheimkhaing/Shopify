document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.mobile-menu-toggle');
  var nav = document.querySelector('#MobileNav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      nav.classList.toggle('is-open', !open);
    });
  }

  var trustGrid = document.querySelector('.trust-grid');
  if (trustGrid && trustGrid.querySelectorAll('.trust-item').length >= 4) {
    var trustMq = window.matchMedia('(max-width: 800px)');
    var trustTimer;
    var runTrustRotate = function () {
      if (trustTimer) {
        clearInterval(trustTimer);
        trustTimer = null;
      }
      trustGrid.classList.remove('is-alt');
      if (!trustMq.matches) return;
      trustTimer = setInterval(function () {
        trustGrid.classList.toggle('is-alt');
      }, 3000);
    };
    if (trustMq.addEventListener) trustMq.addEventListener('change', runTrustRotate);
    else trustMq.addListener(runTrustRotate);
    runTrustRotate();
  }

  var footerNavs = document.querySelectorAll('.ci-footer-nav');
  var footerMq = window.matchMedia('(max-width: 800px)');
  footerNavs.forEach(function (section) {
    var title = section.querySelector('h6');
    if (!title) return;
    title.addEventListener('click', function () {
      if (!footerMq.matches) return;
      var open = section.classList.contains('is-open');
      footerNavs.forEach(function (other) { other.classList.remove('is-open'); });
      if (!open) section.classList.add('is-open');
    });
  });

  var carousel = document.querySelector('.reviews-carousel');
  if (!carousel) return;
  var track = carousel.querySelector('.reviews-track');
  var prev = carousel.querySelector('.reviews-prev');
  var next = carousel.querySelector('.reviews-next');
  if (!track || !prev || !next) return;

  var step = function () {
    var card = track.querySelector('.review-card');
    if (!card) return 415;
    var styles = window.getComputedStyle(track);
    var gap = parseFloat(styles.columnGap || styles.gap) || 24;
    return card.getBoundingClientRect().width + gap;
  };

  var update = function () {
    var max = track.scrollWidth - track.clientWidth;
    prev.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft >= max - 2;
  };

  prev.addEventListener('click', function () {
    track.scrollBy({ left: -step(), behavior: 'smooth' });
  });
  next.addEventListener('click', function () {
    track.scrollBy({ left: step(), behavior: 'smooth' });
  });
  track.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
});
