(function () {
  var side = document.querySelector('.scroll-top-btn') ? 'left' : 'right';

  var style = document.createElement('style');
  style.textContent = [
    '#contact-fab{position:fixed;' + side + ':32px;bottom:32px;z-index:90;display:flex;flex-direction:column;align-items:center;gap:12px;font-family:Jost,-apple-system,system-ui,sans-serif}',
    '#contact-fab .cf-items{display:flex;flex-direction:column;align-items:center;gap:12px}',
    '#contact-fab .cf-item{width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(13,13,13,0.85);border:1px solid rgba(233,226,212,0.13);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);opacity:0;transform:translateY(12px) scale(.92);pointer-events:none;transition:opacity .3s ease,transform .3s ease,border-color .3s ease;text-decoration:none}',
    '#contact-fab .cf-item svg{width:19px;height:19px;stroke:#E9E2D4;fill:none;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}',
    '#contact-fab .cf-item:hover{border-color:#B49B78}',
    '#contact-fab .cf-item:hover svg{stroke:#B49B78}',
    '#contact-fab.open .cf-item{opacity:1;transform:none;pointer-events:auto}',
    '#contact-fab .cf-toggle{width:54px;height:54px;border-radius:50%;border:1px solid rgba(233,226,212,0.13);background:rgba(13,13,13,0.85);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;cursor:pointer;position:relative;transition:border-color .3s ease;padding:0}',
    '#contact-fab .cf-toggle:hover{border-color:#B49B78}',
    '#contact-fab .cf-toggle svg{position:absolute;width:22px;height:22px;stroke:#E9E2D4;fill:none;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;transition:opacity .25s ease,transform .25s ease}',
    '#contact-fab .cf-icon-close{opacity:0;transform:rotate(-45deg) scale(.6)}',
    '#contact-fab.open .cf-icon-chat{opacity:0;transform:rotate(45deg) scale(.6)}',
    '#contact-fab.open .cf-icon-close{opacity:1;transform:rotate(0) scale(1)}',
    '@media(max-width:600px){#contact-fab{' + side + ':18px;bottom:18px}#contact-fab .cf-item{width:42px;height:42px}#contact-fab .cf-toggle{width:50px;height:50px}}',
  ].join('');
  document.head.appendChild(style);

  var wrap = document.createElement('div');
  wrap.id = 'contact-fab';
  wrap.innerHTML =
    '<div class="cf-items">' +
      '<a class="cf-item" href="https://www.instagram.com/howdesign_ae?igsh=MTJ1bGYxOG4zbGNxZg%3D%3D" target="_blank" rel="noopener" aria-label="Instagram"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none"/></svg></a>' +
      '<a class="cf-item" href="tel:+971586771200" aria-label="Call"><svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.8 19.8 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.8 19.8 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.95.36 1.87.69 2.75a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.33-1.26a2 2 0 012.11-.45c.88.33 1.8.56 2.75.69A2 2 0 0122 16.92z"/></svg></a>' +
      '<a class="cf-item" href="mailto:how.design.ae@gmail.com" aria-label="Email"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg></a>' +
      '<a class="cf-item" href="https://wa.me/971586771200" target="_blank" rel="noopener" aria-label="WhatsApp"><svg viewBox="0 0 24 24"><path d="M3 21l1.7-5A9 9 0 1112 21a8.9 8.9 0 01-4.3-1.1L3 21z"/><path d="M8.5 9c.3 3 3.5 6.2 6.5 6.5"/></svg></a>' +
    '</div>' +
    '<button type="button" class="cf-toggle" aria-label="Contact us" aria-expanded="false">' +
      '<svg class="cf-icon-chat" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>' +
      '<svg class="cf-icon-close" viewBox="0 0 24 24"><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></svg>' +
    '</button>';

  var items = wrap.querySelectorAll('.cf-item');
  for (var i = 0; i < items.length; i++) {
    items[i].style.transitionDelay = (i * 50) + 'ms';
  }

  function init() {
    document.body.appendChild(wrap);
    var toggle = wrap.querySelector('.cf-toggle');
    toggle.addEventListener('click', function () {
      var open = wrap.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', function (e) {
      if (wrap.classList.contains('open') && !wrap.contains(e.target)) {
        wrap.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
