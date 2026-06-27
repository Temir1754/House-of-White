(function () {
  var STORAGE_KEY = 'how_cookie_consent';
  if (localStorage.getItem(STORAGE_KEY)) return;

  var style = document.createElement('style');
  style.textContent = [
    '#cookie-consent{position:fixed;left:0;right:0;bottom:0;z-index:9999;',
    'display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:16px;',
    'padding:18px 24px;background:#0D0D0D;color:#E9E2D4;',
    'border-top:1px solid rgba(233,226,212,0.13);',
    'font-family:Jost,-apple-system,system-ui,sans-serif;font-size:14px;',
    'box-shadow:0 -4px 20px rgba(0,0,0,0.25);}',
    '#cookie-consent p{margin:0;max-width:560px;line-height:1.5;color:#E9E2D4;}',
    '#cookie-consent a{color:#B49B78;text-decoration:underline;}',
    '#cookie-consent button{flex-shrink:0;cursor:pointer;border:1px solid #B49B78;',
    'background:#B49B78;color:#0D0D0D;padding:10px 22px;font-size:13px;',
    'letter-spacing:.04em;text-transform:uppercase;font-family:inherit;}',
    '#cookie-consent button:hover{background:#cdb084;}',
  ].join('');
  document.head.appendChild(style);

  var banner = document.createElement('div');
  banner.id = 'cookie-consent';
  banner.innerHTML =
    '<p>We use cookies to improve your experience on this site. By continuing to browse, you agree to our use of cookies.</p>' +
    '<button type="button">Accept</button>';

  banner.querySelector('button').addEventListener('click', function () {
    localStorage.setItem(STORAGE_KEY, '1');
    banner.remove();
  });

  document.addEventListener('DOMContentLoaded', function () {
    document.body.appendChild(banner);
  });
})();
