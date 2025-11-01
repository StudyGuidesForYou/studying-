// ===== element refs =====
const classCodeScreen = document.getElementById('class-code-screen');
const codeInputs = Array.from(document.querySelectorAll('.code-input'));
const classCodeButton = document.getElementById('class-code-button');
const codeMessage = document.getElementById('code-message');

const mainScreen = document.getElementById('main-screen');
const settingsButton = document.getElementById('settings-button');
const settingsPanel = document.getElementById('settings-panel');

const urlInput = document.getElementById('url-input');
const urlButton = document.getElementById('url-button');
const mainIframe = document.getElementById('main-iframe');

const gameButtons = Array.from(document.querySelectorAll('.game-button'));
const gradientColorPicker = document.getElementById('gradient-color');
const bgSelect = document.getElementById('bg-select');

// ===== helpers =====
function showMessage(msg, isError = false){
  codeMessage.textContent = msg;
  codeMessage.style.color = isError ? '#ff9b9b' : '#bff0ff';
}

// ===== code input UX: auto-advance, backspace =====
codeInputs.forEach((inp, idx) => {
  // only allow a single visible char
  inp.addEventListener('input', e => {
    // remove any extra characters (paste safety)
    if (inp.value.length > 1) inp.value = inp.value.slice(0,1);
    if (inp.value.length === 1 && idx < codeInputs.length - 1) {
      codeInputs[idx+1].focus();
    }
  });

  inp.addEventListener('keydown', e => {
    if (e.key === 'Backspace') {
      if (inp.value === '' && idx > 0) {
        codeInputs[idx-1].focus();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      checkClassCode();
    }
  });
});

// ===== check class code and fade transition =====
function checkClassCode(){
  const code = codeInputs.map(i => i.value).join('');
  if (code.toLowerCase() === 'sigma') {
    showMessage('✅ Code accepted!');
    // fade out class screen
    classCodeScreen.style.transition = 'opacity 400ms ease';
    classCodeScreen.style.opacity = '0';
    setTimeout(()=> {
      classCodeScreen.style.display = 'none';
      // show main screen
      mainScreen.style.display = 'flex';
      mainScreen.style.opacity = '0';
      // small delay to allow layout, then fade in
      setTimeout(()=> {
        mainScreen.style.transition = 'opacity 350ms ease';
        mainScreen.style.opacity = '1';
        // show settings button
        settingsButton.style.display = 'block';
        settingsButton.style.opacity = '1';
      }, 50);
      // focus url input
      if (urlInput) urlInput.focus();
    }, 420);
  } else {
    showMessage('❌ Incorrect code', true);
    // clear inputs quickly
    setTimeout(()=> {
      codeInputs.forEach(i => i.value = '');
      codeInputs[0].focus();
    }, 300);
  }
}
classCodeButton.addEventListener('click', checkClassCode);

// allow pressing Enter when focused on any code input -> handled above

// ===== settings toggling & behavior =====
settingsButton.addEventListener('click', () => {
  const open = settingsPanel.style.display === 'flex';
  settingsPanel.style.display = open ? 'none' : 'flex';
  settingsPanel.setAttribute('aria-hidden', open ? 'true' : 'false');
});

// gradient color preview (applies subtle overlay to aurora outline)
if (gradientColorPicker) {
  gradientColorPicker.addEventListener('input', () => {
    const v = gradientColorPicker.value;
    document.documentElement.style.setProperty('--accent', v);
    // update glass outline colors by toggling ::before via CSS variable not used here; simple approach:
    // change a subtle tint on the page by applying box-shadow on .glass when color changes (kept simple)
  });
}

// background image selector (local images folder)
if (bgSelect) {
  bgSelect.addEventListener('change', () => {
    const val = bgSelect.value;
    if (!val) {
      document.getElementById('aurora-bg').style.backgroundImage = '';
    } else {
      document.getElementById('aurora-bg').style.backgroundImage = `url('./images/${val}')`;
      document.getElementById('aurora-bg').style.backgroundSize = 'cover';
      document.getElementById('aurora-bg').style.backgroundPosition = 'center';
    }
  });
}

// ===== url launcher =====
function normalizeUrl(u){
  if(!u) return '';
  try {
    const url = new URL(u);
    return url.href;
  } catch(e){
    // try adding https
    try { return new URL('https://' + u).href; } catch(e2){ return ''; }
  }
}

function launchURL(){
  let raw = (urlInput.value || '').trim();
  const normalized = normalizeUrl(raw);
  if (!normalized) return;
  mainIframe.src = normalized;
  urlInput.value = '';
}
urlButton.addEventListener('click', launchURL);
urlInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    launchURL();
  }
});

// ===== game buttons =====
gameButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const url = btn.dataset.url;
    if (!url) return;
    urlInput.value = url;
    launchURL();
  });
});

// ===== iframe redirect warning (best-effort override) =====
mainIframe.addEventListener('load', () => {
  try {
    const w = mainIframe.contentWindow;
    // override window.open inside iframe (same-origin only)
    if (w && typeof w.open === 'function') {
      w.open = function(url, name, specs){
        const proceed = confirm(`⚠️ The page inside the iframe is trying to open a new window:\n${url}\nProceed?`);
        if (proceed) return window.open(url, name, specs);
        return null;
      };
    }
  } catch(err){
    // cross-origin prevented — can't override
    console.debug('iframe open override unavailable (cross-origin).');
  }
});
