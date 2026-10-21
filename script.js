/* =========================================================================
   WESTWIND HOA WEBSITE — SHARED SITE SCRIPT
   =========================================================================
   This file is loaded on every page (see the <script src="script.js"> tag
   near the bottom of each .html file). It has four independent jobs:

     1. Mobile nav toggle       — the hamburger menu on small screens
     2. Dropdown menus          — Documents / Community / Report & Resources /
                                   Pool menus in the top nav
     3. Scroll-reveal animation — the gentle fade/slide-in effect as sections
                                   enter the viewport
     4. PDF inline viewer       — lets people view a PDF (governing documents,
                                   minutes, budgets, newsletters, forms) right
                                   on the page in a popup, instead of forcing
                                   a download. See the "PDF INLINE VIEWER"
                                   section below for how to use it on a new
                                   page.

   Everything below runs once the HTML has finished loading
   (DOMContentLoaded), so it's safe to look up elements by class/id right
   away without them being missing.
   ========================================================================= */

document.addEventListener('DOMContentLoaded', function () {

  /* -----------------------------------------------------------------------
     1. MOBILE NAV TOGGLE
     -------------------------------------------------------------------
     On small screens, style.css hides the horizontal nav-links list and
     shows a hamburger button (.nav-toggle) instead. Clicking it adds an
     "open" class to .nav-links, which style.css uses to slide the menu
     into view. Clicking any link inside the menu closes it again, so
     tapping a link doesn't leave the mobile menu open on the next page.
  ----------------------------------------------------------------------- */
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var isOpen = links.classList.toggle('open');
      // aria-expanded tells screen readers whether the menu is open —
      // keep this in sync with the actual visual state.
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* -----------------------------------------------------------------------
     2. DROPDOWN MENUS (Documents / Community / Report & Resources / Pool)
     -------------------------------------------------------------------
     Each dropdown is a <li class="has-dropdown"> containing a
     <button class="dropdown-toggle"> and a <ul class="submenu">.

     IMPORTANT: the "open" class added/removed here is the ONLY thing that
     controls whether a submenu is visible — see style.css's
     ".has-dropdown.open .submenu" rule. There is deliberately no CSS
     ":hover" rule doing this job too. Earlier this menu was controlled by
     BOTH a CSS :hover rule AND this "open" class at the same time, which
     caused a real bug: a click (including the synthetic "click" some
     trackpads/touchscreens fire when a person just meant to hover) would
     add the "open" class, and then moving the mouse away only ended the
     CSS :hover state — the "open" class stuck around since nothing was
     listening for the mouse actually leaving, so the menu stayed open
     until the person clicked elsewhere on the page. Keeping a single
     class as the one source of truth, managed entirely here, fixes that.

     - mouseenter on desktop opens a dropdown; mouseleave closes it
       (with a short delay so moving diagonally from the button down into
       the submenu doesn't accidentally close it along the way).
     - A click on the button also opens/closes it — this is what makes it
       work on touch devices, which have no concept of "hover" at all.
     - Clicking anywhere outside every dropdown closes whichever one (if
       any) is open.
     - Only one dropdown is ever open at a time.
  ----------------------------------------------------------------------- */
  var closeTimer = null;

  function closeAllDropdowns(except) {
    document.querySelectorAll('.has-dropdown.open').forEach(function (el) {
      if (el !== except) {
        el.classList.remove('open');
        var b = el.querySelector('.dropdown-toggle');
        if (b) b.setAttribute('aria-expanded', 'false');
      }
    });
  }

  document.querySelectorAll('.has-dropdown').forEach(function (item) {
    var btn = item.querySelector('.dropdown-toggle');
    var openedByHoverAt = 0;

    // --- Click: primary mechanism, and the ONLY mechanism on touch ---
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var wasOpen = item.classList.contains('open');
      // A mouse click arrives right after hover has opened the menu;
      // treat that click as "keep it open", not "toggle it shut".
      var canHover = window.matchMedia && window.matchMedia('(hover: hover)').matches;
      if (wasOpen && (canHover || Date.now() - openedByHoverAt < 700)) { return; }
      closeAllDropdowns();
      item.classList.toggle('open', !wasOpen);
      btn.setAttribute('aria-expanded', !wasOpen ? 'true' : 'false');
    });

    // --- Hover: desktop-only convenience, fully managed here ---
    item.addEventListener('mouseenter', function () {
      clearTimeout(closeTimer);
      closeAllDropdowns(item);
      if (!item.classList.contains('open')) openedByHoverAt = Date.now();
      item.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
    });
    item.addEventListener('mouseleave', function () {
      // Small delay avoids the menu flickering shut if the cursor
      // briefly crosses a gap while moving from the button into the
      // submenu below it.
      closeTimer = setTimeout(function () {
        item.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      }, 150);
    });
  });

  // Clicking anywhere else on the page closes any open dropdown.
  document.addEventListener('click', function () {
    closeAllDropdowns();
  });


  /* -----------------------------------------------------------------------
     3. SCROLL-REVEAL ANIMATION
     -------------------------------------------------------------------
     Purely decorative: sections and cards fade/slide gently into place as
     the person scrolls down and they enter the viewport. This is done by
     tagging elements with a "reveal" (single element) or "reveal-stagger"
     (a container whose direct children each animate in with a slight
     delay between them — see the .reveal-stagger CSS rule) class, then
     watching for them to scroll into view with an IntersectionObserver.

     Nothing here needs to be touched when adding new page content — any
     element matching the selectors below is automatically picked up.
     If IntersectionObserver isn't supported (very old browsers), we skip
     the animation entirely and just show everything immediately, so the
     content is never accidentally left invisible.
  ----------------------------------------------------------------------- */
  document.querySelectorAll('section .cards, section .doc-groups, section .announce-list, section .board-grid, .lib-table')
    .forEach(function (el) { el.classList.add('reveal-stagger'); });
  document.querySelectorAll('section .section-head, section .callout, section .feature, .page-hero .wrap > *')
    .forEach(function (el) { el.classList.add('reveal'); });

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          io.unobserve(entry.target); // only need to animate in once
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.reveal, .reveal-stagger').forEach(function (el) {
      io.observe(el);
    });
  } else {
    document.querySelectorAll('.reveal, .reveal-stagger').forEach(function (el) {
      el.classList.add('in-view');
    });
  }


  /* -----------------------------------------------------------------------
     4. PDF INLINE VIEWER
     -------------------------------------------------------------------
     WHAT THIS DOES
     Lets someone view a PDF (a governing document, meeting minutes, a
     budget, a newsletter issue, a fillable form) directly on the page in
     a popup window, using the browser's own built-in PDF renderer — no
     download required. There's still always a separate "Download" link
     next to it for anyone who wants the actual file.

     HOW TO USE THIS ON ANY PAGE
     Add a button (or link) anywhere with these two data attributes:

         <button class="btn-view-pdf"
                 data-pdf-src="docs/SomeDocument.pdf"
                 data-pdf-title="Some Document">
           View
         </button>

     That's it — this script finds every element with a data-pdf-src
     attribute on page load and wires up a click handler automatically.
     No page-specific JavaScript needed. The modal markup itself
     (#pdf-viewer-modal) is injected into the page once, the first time
     it's needed, so pages that don't use the PDF viewer at all pay no
     extra cost.

     The viewer closes on: clicking the × button, clicking the dark
     backdrop outside the document, or pressing Escape.
  ----------------------------------------------------------------------- */
  var pdfTriggers = document.querySelectorAll('[data-pdf-src]');
  if (pdfTriggers.length > 0) {

    // Build the modal once and append it to <body>. It starts hidden
    // (no "open" class) — CSS in style.css controls the show/hide state.
    var modal = document.createElement('div');
    modal.id = 'pdf-viewer-modal';
    modal.className = 'pdf-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Document viewer');
    modal.innerHTML =
      '<div class="pdf-modal-backdrop"></div>' +
      '<div class="pdf-modal-card">' +
        '<div class="pdf-modal-bar">' +
          '<span class="pdf-modal-title"></span>' +
          '<div class="pdf-modal-actions">' +
            '<a class="pdf-modal-download" href="#" target="_blank" rel="noopener">Download</a>' +
            '<button class="pdf-modal-close" type="button" aria-label="Close document viewer">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
            '</button>' +
          '</div>' +
        '</div>' +
        '<iframe class="pdf-modal-frame" title="PDF document"></iframe>' +
      '</div>';
    document.body.appendChild(modal);

    var frame = modal.querySelector('.pdf-modal-frame');
    var titleEl = modal.querySelector('.pdf-modal-title');
    var downloadLink = modal.querySelector('.pdf-modal-download');

    function openPdfModal(src, title) {
      titleEl.textContent = title || 'Document';
      downloadLink.href = src;
      frame.src = src;
      modal.classList.add('open');
      document.body.classList.add('pdf-modal-locked'); // stops background scroll
    }

    function closePdfModal() {
      modal.classList.remove('open');
      document.body.classList.remove('pdf-modal-locked');
      // Clear the iframe src on close so the PDF actually stops loading/
      // playing in the background rather than sitting there hidden.
      frame.src = '';
    }

    // Wire up every "View" trigger found on the page.
    pdfTriggers.forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        openPdfModal(el.getAttribute('data-pdf-src'), el.getAttribute('data-pdf-title'));
      });
    });

    modal.querySelector('.pdf-modal-close').addEventListener('click', closePdfModal);
    modal.querySelector('.pdf-modal-backdrop').addEventListener('click', closePdfModal);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.classList.contains('open')) closePdfModal();
    });
  }

});
