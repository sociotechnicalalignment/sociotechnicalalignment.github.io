(function () {
  'use strict';

  // Mobile navigation toggle
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Interactive figures: the embedded plots capture scroll for zooming, so
  // keep them inert until the reader clicks, and hand scrolling back to the
  // page when the pointer leaves the figure.
  document.querySelectorAll('.frame').forEach(function (frame) {
    var overlay = frame.querySelector('.frame__overlay');
    if (!overlay) return;
    overlay.addEventListener('click', function () {
      frame.classList.add('is-active');
    });
    frame.addEventListener('mouseleave', function () {
      frame.classList.remove('is-active');
    });
  });

  // Figures: hide the loading placeholder once the iframe has loaded, and
  // offer a fullscreen view of the whole card.
  document.querySelectorAll('.frame__iframe').forEach(function (iframe) {
    var frame = iframe.closest('.frame');
    var done = function () { if (frame) frame.classList.remove('is-loading'); };
    iframe.addEventListener('load', done);
    // Already loaded from cache before this script ran
    try { if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete' && iframe.contentDocument.body && iframe.contentDocument.body.childElementCount) done(); } catch (e) {}
  });

  document.querySelectorAll('.figure-card__fs').forEach(function (btn) {
    var card = btn.closest('.figure-card');
    if (!card || !card.requestFullscreen) { btn.hidden = true; return; }
    btn.addEventListener('click', function () {
      if (document.fullscreenElement === card) {
        document.exitFullscreen();
      } else {
        card.requestFullscreen();
        var frame = card.querySelector('.frame');
        if (frame) frame.classList.add('is-active');
      }
    });
  });
  document.addEventListener('fullscreenchange', function () {
    document.querySelectorAll('.figure-card__fs i').forEach(function (icon) {
      var card = icon.closest('.figure-card');
      var on = document.fullscreenElement === card;
      icon.classList.toggle('fa-expand', !on);
      icon.classList.toggle('fa-compress', on);
    });
  });

  // Copy the BibTeX entry
  document.querySelectorAll('.cite__copy').forEach(function (btn) {
    var target = document.getElementById(btn.getAttribute('data-copy-target'));
    if (!target) return;
    btn.addEventListener('click', function () {
      var text = target.textContent;
      var ok = function () {
        btn.classList.add('is-done');
        btn.querySelector('span').textContent = 'Copied';
        setTimeout(function () {
          btn.classList.remove('is-done');
          btn.querySelector('span').textContent = 'Copy';
        }, 2000);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(ok, function () { fallback(); });
      } else {
        fallback();
      }
      function fallback() {
        var range = document.createRange();
        range.selectNodeContents(target);
        var sel = window.getSelection();
        sel.removeAllRanges(); sel.addRange(range);
        try { document.execCommand('copy'); ok(); } catch (e) {}
        sel.removeAllRanges();
      }
    });
  });

  // Reveal sections as they scroll into view
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  // Highlight the current section in the nav
  var links = Array.prototype.slice.call(document.querySelectorAll('.nav a[href^="#"]'));
  var sections = links.map(function (a) { return document.querySelector(a.getAttribute('href')); }).filter(Boolean);
  if (sections.length && 'IntersectionObserver' in window) {
    var active = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (a) {
          a.classList.toggle('is-active', a.getAttribute('href') === '#' + entry.target.id);
        });
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    sections.forEach(function (s) { active.observe(s); });
  }
})();
