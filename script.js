// Elements
const classCodeScreen = document.getElementById('class-code-screen');
const mainScreen = document.getElementById('main-screen');
const codeInputs = document.querySelectorAll('.code-input');
const classCodeButton = document.getElementById('class-code-button');
const codeMessage = document.getElementById('code-message');

const urlInput = document.getElementById('url-input');
const urlButton = document.getElementById('url-button');
const privateOpenButton = document.getElementById('private-open-button');
const iframe = document.getElementById('main-iframe');
const iframeOverlay = document.getElementById('iframe-overlay') || document.createElement('div'); // fallback if missing
const overlayText = document.getElementById('iframe-overlay-text');
const overlayOpen = document.getElementById('overlay-open');
const overlayHelp = document.getElementById('overlay-help');

// --- Code input UX ---
codeInputs.forEach((input, idx) => {
  input.addEventListener('input', () => {
    input.value = input.value.slice(0,1);
    if (input.value && idx < codeInputs.length - 1) codeInputs[idx + 1].focus();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && input.value === '' && idx > 0) codeInputs[idx - 1].focus();
  });
});

// Check class code and transition
function checkClassCode() {
  let code = '';
  codeInputs.forEach(i => code += (i.value || ''));
  if (code.toLowerCase() === 'sigma') {
    codeMessage.textContent = '✅ Code accepted!';
    codeMessage.style.color = '#a6ffec';
    // fade out class screen and show main screen
    classCodeScreen.style.transition = 'opacity .45s ease';
    classCodeScreen.style.opacity = 0;
    setTimeout(() => {
      classCodeScreen.style.display = 'none';
      // show main screen
      mainScreen.style.display = 'flex';
      // small timeout to allow styles to apply then animate in
      setTimeout(() => {
        mainScreen.classList.add('visible');
        // focus URL input for convenience
        urlInput.focus();
      }, 50);
    }, 480);
  } else {
    codeMessage.textContent = '❌ Incorrect code!';
    codeMessage.style.color = '#ff7b7b';
    codeInputs.forEach(i => i.value = '');
    codeInputs[0].focus();
  }
}
classCodeButton.addEventListener('click', checkClassCode);
codeInputs.forEach(input => input.addEventListener('keypress', e => {
  if (e.key === 'Enter') { e.preventDefault(); checkClassCode(); }
}));

// --- Utility: normalize URL ---
function normalizeUrl(input) {
  let u = input.trim();
  if (!u) return '';
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  return u;
}

// --- iframe loading + detection of embed refusal ---
// We'll attempt to detect embedding failure by using a timeout combined with the iframe "load" event.
// This is not perfect for all cross-origin cases, but it's a useful UX fallback.
let iframeLoadTimer = null;
function showOverlay(message) {
  if (!iframeOverlay || !overlayText) return;
  overlayText.textContent = message;
  iframeOverlay.classList.remove('hidden');
}
function hideOverlay() {
  if (!iframeOverlay) return;
  iframeOverlay.classList.add('hidden');
}

function loadIntoIframe(url) {
  hideOverlay();
  // don't persist URL anywhere
  iframe.src = url;

  // clear old timer
  if (iframeLoadTimer) { clearTimeout(iframeLoadTimer); iframeLoadTimer = null; }

  // set a fallback timer — if load event doesn't fire in 2s, show overlay/fallback
  iframeLoadTimer = setTimeout(() => {
    // likely blocked or taking too long — present user with safe fallback options
    showOverlay('This site may block embedding in an iframe. You can open it privately instead.');
  }, 2000);

  // on successful load, hide overlay
  iframe.onload = () => {
    if (iframeLoadTimer) { clearTimeout(iframeLoadTimer); iframeLoadTimer = null; }
    hideOverlay();
  };

  // also handle onerror as best-effort (rare for cross-origin)
  iframe.onerror = () => {
    if (iframeLoadTimer) { clearTimeout(iframeLoadTimer); iframeLoadTimer = null; }
    showOverlay('Failed to load inside the iframe. Open in a new tab instead.');
  };
}

// --- Buttons ---
urlButton.addEventListener('click', () => {
  const u = normalizeUrl(urlInput.value);
  if (!u) return;
  loadIntoIframe(u);
  urlInput.value = ''; // do not save
});

// Private open: open in new tab without sender referrer and with noopener
privateOpenButton.addEventListener('click', () => {
  const u = normalizeUrl(urlInput.value || iframe.src || '');
  if (!u) return;
  // open without giving referrer and without giving the new window access to opener
  window.open(u, '_blank', 'noopener,noreferrer');
  urlInput.value = '';
});

// Overlay open button action
if (overlayOpen) {
  overlayOpen.addEventListener('click', () => {
    const u = iframe.src || normalizeUrl(urlInput.value);
    if (!u) return;
    window.open(u, '_blank', 'noopener,noreferrer');
  });
}
if (overlayHelp) {
  overlayHelp.addEventListener('click', () => {
    alert(
      "Many websites intentionally prevent embedding in iframes (via headers like X-Frame-Options or CSP). " +
      "This is a security measure. Use 'Open Privately' to open the site in a separate tab with no referrer."
    );
  });
}

// Allow Enter key on url input
urlInput.addEventListener('keypress', e => { if (e.key === 'Enter') { e.preventDefault(); urlButton.click(); } });

// Make sure we never write URLs to localStorage or update history
// (we simply avoid any code that persists or pushes state)

// Accessibility: hide iframe overlay by default if it's not present in DOM
if (!document.getElementById('iframe-overlay')) {
  // Create minimal overlay elements if missing (defensive)
  // (This block is defensive and optional.)
  const ol = document.createElement('div');
  ol.id = 'iframe-overlay';
  ol.className = 'hidden';
  ol.innerHTML = `<p id="iframe-overlay-text"></p><div class="overlay-actions"><button id="overlay-open">Open in new tab (no referrer)</button><button id="overlay-help">Why blocked?</button></div>`;
  document.getElementById('iframe-container').appendChild(ol);
  // attach events
  document.getElementById('overlay-open').addEventListener('click', () => {
    const u = iframe.src || normalizeUrl(urlInput.value);
    if (!u) return;
    window.open(u, '_blank', 'noopener,noreferrer');
  });
  document.getElementById('overlay-help').addEventListener('click', () => {
    alert('Some sites prevent embedding. Open privately.');
  });
}
