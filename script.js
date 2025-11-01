// Modernized script.js — preserves original features but cleaned, reorganized & improved
// Features: settings sidebar, particles bg, custom cursor with bg removal, volumes, tools (stopwatch/timer/alarm/notes),
// centered code screen that unlocks a launcher with iframe, localStorage persistence, tasteful tones.

(() => {
  'use strict';

  // --- tiny helpers ------------------------------------------------------
  const qs = sel => document.querySelector(sel);
  const qsa = sel => Array.from(document.querySelectorAll(sel));
  const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const load = (k, def = null) => {
    try { const v = JSON.parse(localStorage.getItem(k)); return v === null ? def : v; } catch (e) { return def; }
  };

  // --- DOM refs ---------------------------------------------------------
  const logoBtn = qs('#logo-btn');
  const sidePanel = qs('#side-panel');
  const sideClose = qs('#side-close');
  const bgCanvas = qs('#bg-canvas');
  const customCursor = qs('#custom-cursor');

  const codeBoxes = qsa('.code-box'); // array-like
  const pasteBtn = qs('#paste-btn');
  const clearBtn = qs('#clear-btn');
  const enterBtn = qs('#enter-btn');
  const statusLine = qs('#status-line');
  const codeRow = qs('#code-row');
  const codeScreen = qs('#code-screen');
  const appScreen = qs('#app-screen');
  const urlInput = qs('#url-input');
  const goBtn = qs('#go-btn');
  const frame = qs('#the-frame');

  const bgColor = qs('#bg-color');
  const bgFile = qs('#bg-file');
  const bgClear = qs('#bg-clear');

  const masterVol = qs('#master-vol');
  const sfxVol = qs('#sfx-vol');
  const frameVol = qs('#frame-vol');
  const masterVal = qs('#master-val');
  const sfxVal = qs('#sfx-val');
  const frameVal = qs('#frame-val');

  const cursorFile = qs('#cursor-file');
  const cursorSize = qs('#cursor-size');
  const cursorSizeVal = qs('#cursor-size-val');
  const cursorClear = qs('#cursor-clear');

  const openStopwatch = qs('#open-stopwatch');
  const openTimer = qs('#open-timer');
  const openAlarm = qs('#open-alarm');
  const openNotes = qs('#open-notes');

  const modal = qs('#tools-modal');
  const modalBody = qs('#modal-body');
  const modalClose = qs('#modal-close');

  // --- audio context & prefs -------------------------------------------
  const audioCtx = (() => {
    try { return new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
  })();

  let master = load('master_vol', 1);
  let sfx = load('sfx_vol', 1);
  let iframeVolume = load('frame_vol', 1);

  const uiSetVolumes = () => {
    if (masterVol) masterVol.value = Math.round(master * 100);
    if (sfxVol) sfxVol.value = Math.round(sfx * 100);
    if (frameVol) frameVol.value = Math.round(iframeVolume * 100);
    if (masterVal) masterVal.textContent = Math.round(master * 100);
    if (sfxVal) sfxVal.textContent = Math.round(sfx * 100);
    if (frameVal) frameVal.textContent = Math.round(iframeVolume * 100);
  };
  uiSetVolumes();

  function playTone(freq = 440, time = 0.08, type = 'sine') {
    if (!audioCtx) return;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type; o.frequency.value = freq;
    o.connect(g); g.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    g.gain.value = 0.0001;
    g.gain.exponentialRampToValueAtTime(0.0009 * master * sfx, now + 0.01);
    o.start(now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + time);
    o.stop(now + time + 0.02);
  }

  // --- particles background --------------------------------------------
  (function particles() {
    const c = bgCanvas; if (!c) return;
    const ctx = c.getContext('2d');
    let w = 0, h = 0, parts = [];
    function resize() { w = c.width = innerWidth; h = c.height = innerHeight; parts = []; const count = Math.floor(Math.max(40, (w * h) / 60000)); for (let i = 0; i < count; i++) parts.push({ x: Math.random() * w, y: Math.random() * h, r: 1 + Math.random() * 2.2, dx: (Math.random() - 0.5) * 0.6, dy: (Math.random() - 0.5) * 0.6 }); }
    function frameF() {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      parts.forEach(p => {
        p.x += p.dx; p.y += p.dy;
        if (p.x < -10) p.x = w + 10; if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10; if (p.y > h + 10) p.y = -10;
        ctx.beginPath(); ctx.fillStyle = 'rgba(40,120,255,0.06)'; ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      });
      requestAnimationFrame(frameF);
    }
    window.addEventListener('resize', resize); resize(); frameF();
  })();

  // --- custom cursor ---------------------------------------------------
  let cursorData = load('cursor_data', null);
  let cursorSizeValNum = load('cursor_size', 48);
  if (cursorSize) cursorSize.value = cursorSizeValNum;
  if (cursorSizeVal) cursorSizeVal.textContent = cursorSizeValNum;
  if (cursorData && customCursor) {
    customCursor.src = cursorData;
    customCursor.style.width = cursorSizeValNum + 'px';
    document.body.classList.add('has-custom-cursor');
    customCursor.classList.remove('hidden');
  }
  window.addEventListener('pointermove', (e) => {
    if (customCursor && !customCursor.classList.contains('hidden')) {
      customCursor.style.left = e.clientX + 'px';
      customCursor.style.top = e.clientY + 'px';
    }
  });

  // remove light background from uploaded image (best-effort)
  if (cursorFile) cursorFile.addEventListener('change', ev => {
    const f = ev.target.files && ev.target.files[0]; if (!f) return;
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = () => {
        try {
          const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
          const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
          const id = ctx.getImageData(0, 0, c.width, c.height); const data = id.data;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i + 1], b = data[i + 2];
            if (r > 230 && g > 230 && b > 230) data[i + 3] = 0;
          }
          ctx.putImageData(id, 0, 0); const out = c.toDataURL('image/png'); cursorData = out; save('cursor_data', out);
          if (customCursor) { customCursor.src = out; customCursor.style.width = (cursorSize && +cursorSize.value || 48) + 'px'; customCursor.classList.remove('hidden'); document.body.classList.add('has-custom-cursor'); }
        } catch (e) {
          // CORS/large images fallback
          cursorData = reader.result; save('cursor_data', cursorData);
          if (customCursor) { customCursor.src = cursorData; customCursor.classList.remove('hidden'); document.body.classList.add('has-custom-cursor'); }
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(f);
  });

  if (cursorSize) cursorSize.addEventListener('input', e => { const v = +e.target.value; save('cursor_size', v); if (cursorSizeVal) cursorSizeVal.textContent = v; if (customCursor) customCursor.style.width = v + 'px'; });

  if (cursorClear) cursorClear.addEventListener('click', () => { cursorData = null; save('cursor_data', null); if (customCursor) { customCursor.classList.add('hidden'); document.body.classList.remove('has-custom-cursor'); } if (cursorFile) cursorFile.value = ''; });

  // --- sidebar / logo button -------------------------------------------
  if (logoBtn) logoBtn.addEventListener('click', () => {
    const opening = !sidePanel.classList.contains('open');
    logoBtn.classList.toggle('open', opening);
    sidePanel.classList.toggle('open', opening);
    sidePanel.setAttribute('aria-hidden', !opening);
    playTone(opening ? 720 : 440, 0.08, opening ? 'triangle' : 'sine');
  });
  if (sideClose) sideClose.addEventListener('click', () => { sidePanel.classList.remove('open'); logoBtn.classList.remove('open'); });

  // --- background settings ---------------------------------------------
  const savedBg = load('bg_image', null);
  const savedBgColor = load('bg_color', null);
  if (savedBgColor) {
    if (bgColor) bgColor.value = savedBgColor;
    document.body.style.background = `linear-gradient(180deg, ${savedBgColor}, #07102a)`;
  }
  if (savedBg) {
    document.body.style.backgroundImage = `url(${savedBg})`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
  }
  if (bgColor) bgColor.addEventListener('input', e => { save('bg_color', e.target.value); document.body.style.background = `linear-gradient(180deg, ${e.target.value}, #07102a)`; });
  if (bgFile) bgFile.addEventListener('change', ev => {
    const f = ev.target.files && ev.target.files[0]; if (!f) return;
    const r = new FileReader(); r.onload = () => { save('bg_image', r.result); document.body.style.backgroundImage = `url(${r.result})`; document.body.style.backgroundSize = 'cover'; document.body.style.backgroundPosition = 'center'; }; r.readAsDataURL(f);
  });
  if (bgClear) bgClear.addEventListener('click', () => { localStorage.removeItem('bg_image'); localStorage.removeItem('bg_color'); document.body.style.background = ''; if (bgFile) bgFile.value = ''; if (bgColor) bgColor.value = '#07102a'; });

  // --- volume controls -------------------------------------------------
  if (masterVol) masterVol.addEventListener('input', e => { master = e.target.value / 100; save('master_vol', master); if (masterVal) masterVal.textContent = e.target.value; });
  if (sfxVol) sfxVol.addEventListener('input', e => { sfx = e.target.value / 100; save('sfx_vol', sfx); if (sfxVal) sfxVal.textContent = e.target.value; });
  if (frameVol) frameVol.addEventListener('input', e => { iframeVolume = e.target.value / 100; save('frame_vol', iframeVolume); if (frameVal) frameVal.textContent = e.target.value; try { if (frame && frame.contentWindow) frame.contentWindow.postMessage({ type: 'set-volume', volume: iframeVolume }, '*'); } catch (e) { /* ignore */ } });

  uiSetVolumes();
  function uiSetVolumes() { if (masterVal) masterVal.textContent = Math.round((load('master_vol', master)) * 100); if (sfxVal) sfxVal.textContent = Math.round((load('sfx_vol', sfx)) * 100); if (frameVal) frameVal.textContent = Math.round((load('frame_vol', iframeVolume)) * 100); }

  // --- modal helpers ---------------------------------------------------
  function openModal(html) { if (!modal) return; modalBody.innerHTML = html; modal.classList.remove('hidden'); }
  function closeModal() { if (!modal) return; modal.classList.add('hidden'); setTimeout(() => modalBody.innerHTML = '', 300); }
  if (modalClose) modalClose.addEventListener('click', closeModal);

  // --- tools: stopwatch, timer, alarm, notes ---------------------------
  if (openStopwatch) openStopwatch.addEventListener('click', () => {
    openModal(`<h3>Stopwatch</h3><div id="sw-time" style="font-size:28px;margin:10px 0">00:00.00</div><div style="display:flex;gap:8px"><button id="sw-start" class="tool-btn">Start</button><button id="sw-stop" class="tool-btn">Stop</button><button id="sw-reset" class="tool-btn">Reset</button></div>`);
    let start = 0, raf = 0, running = false;
    const out = qs('#sw-time');
    const startBtn = qs('#sw-start'), stopBtn = qs('#sw-stop'), resetBtn = qs('#sw-reset');
    function fmt(t) { const ms = Math.floor(t % 1000 / 10); const s = Math.floor(t / 1000) % 60; const m = Math.floor(t / 60000); return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(ms).padStart(2,'0')}`; }
    function tick() { if (!running) return; const now = performance.now() - start; out.textContent = fmt(now); raf = requestAnimationFrame(tick); }
    function parseTime(s) { const parts = s.split(/[:.]/); if (parts.length < 3) return 0; return (parseInt(parts[0]) * 60000 + parseInt(parts[1]) * 1000 + parseInt(parts[2]) * 10); }
    startBtn.addEventListener('click', () => { if (!running) { running = true; start = performance.now() - (parseTime(out.textContent) || 0); tick(); playTone(880, 0.06, 'sine'); } });
    stopBtn.addEventListener('click', () => { running = false; cancelAnimationFrame(raf); playTone(220, 0.06, 'sine'); });
    resetBtn.addEventListener('click', () => { running = false; cancelAnimationFrame(raf); out.textContent = '00:00.00'; playTone(520, 0.06, 'sine'); });
  });

  if (openTimer) openTimer.addEventListener('click', () => {
    openModal(`<h3>Timer</h3><input id="timer-min" type="number" min="0" placeholder="minutes" style="width:120px;padding:8px"><div style="display:flex;gap:8px;margin-top:10px"><button id="timer-start" class="tool-btn">Start</button><button id="timer-stop" class="tool-btn">Stop</button></div><div id="timer-status" style="margin-top:12px;color:var(--muted)"></div>`);
    let t = 0, handle = null; const status = qs('#timer-status');
    qs('#timer-start').addEventListener('click', () => { const m = parseInt(qs('#timer-min').value || 0); t = m * 60; if (!t) return; status.textContent = `Time left: ${t}s`; handle = setInterval(() => { t--; status.textContent = `Time left: ${t}s`; if (t <= 0) { clearInterval(handle); playTone(880, 0.3, 'sine'); status.textContent = 'Time up!'; } }, 1000); playTone(720, 0.06, 'sine'); });
    qs('#timer-stop').addEventListener('click', () => { if (handle) clearInterval(handle); status.textContent = 'Stopped'; playTone(220, 0.06, 'sine'); });
  });

  if (openAlarm) openAlarm.addEventListener('click', () => {
    openModal(`<h3>Alarm</h3><input id="alarm-min" type="number" min="0" placeholder="Minutes from now" style="width:140px;padding:8px"><div style="display:flex;gap:8px;margin-top:10px"><button id="alarm-set" class="tool-btn">Set Alarm</button></div><div id="alarm-status" style="margin-top:12px;color:var(--muted)"></div>`);
    qs('#alarm-set').addEventListener('click', () => { const mins = parseInt(qs('#alarm-min').value || 0); if (!mins) { qs('#alarm-status').textContent = 'Enter minutes'; return; } qs('#alarm-status').textContent = `Alarm set for ${mins} minute(s)`; setTimeout(() => { playTone(880, 0.8, 'sine'); alert('Alarm'); }, mins * 60 * 1000); });
  });

  if (openNotes) openNotes.addEventListener('click', () => {
    const saved = load('notes_content', '');
    openModal(`<h3>Notes</h3><textarea id="notes-text" style="width:100%;height:220px;padding:10px;border-radius:8px;background:rgba(255,255,255,0.02);color:#fff">${saved}</textarea><div style="display:flex;gap:8px;margin-top:8px"><button id="notes-save" class="tool-btn">Save</button><button id="notes-clear" class="tool-btn">Clear</button></div>`);
    qs('#notes-save').addEventListener('click', () => { save('notes_content', qs('#notes-text').value); playTone(720, 0.06, 'sine'); });
    qs('#notes-clear').addEventListener('click', () => { qs('#notes-text').value = ''; localStorage.removeItem('notes_content'); });
  });

  if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  // --- code screen logic -----------------------------------------------
  const CORRECT = 'sigma';
  if (codeBoxes && codeBoxes.length) {
    codeBoxes[0].focus();
    codeBoxes.forEach((box, idx) => {
      box.addEventListener('input', () => {
        box.value = box.value.replace(/[^a-zA-Z]/g, '').slice(0,1).toUpperCase();
        if (box.value && idx < codeBoxes.length - 1) codeBoxes[idx + 1].focus();
      });
      box.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !box.value && idx > 0) { codeBoxes[idx - 1].focus(); }
        if (e.key === 'Enter') trySubmit();
      });
    });
  }

  // optional paste button
  if (pasteBtn) pasteBtn.addEventListener('click', async () => {
    try {
      const txt = await navigator.clipboard.readText();
      const t = txt.trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0,5);
      for (let i = 0; i < 5; i++) codeBoxes[i].value = t[i] || '';
      playTone(720, 0.06, 'triangle');
    } catch (e) {
      playTone(180, 0.06, 'sawtooth');
    }
  });

  if (clearBtn) clearBtn.addEventListener('click', () => { codeBoxes.forEach(b => b.value = ''); codeBoxes[0].focus(); playTone(180, 0.04, 'sine'); if (statusLine) { statusLine.textContent = ''; statusLine.style.color = ''; } });
  if (enterBtn) enterBtn.addEventListener('click', trySubmit);

  function trySubmit() {
    const code = codeBoxes.map(b => b.value || '').join('').toLowerCase();
    if (code.length < 5) {
      if (statusLine) { statusLine.textContent = 'Enter 5 letters'; statusLine.style.color = 'var(--muted)'; }
      playTone(220, 0.06, 'sawtooth');
      return;
    }
    if (code !== CORRECT) {
      if (statusLine) { statusLine.textContent = 'Incorrect code'; statusLine.style.color = 'var(--danger)'; }
      if (codeRow) codeRow.classList.add('shake');
      playTone(220, 0.12, 'sawtooth');
      setTimeout(() => { if (codeRow) codeRow.classList.remove('shake'); codeBoxes.forEach(b => b.value = ''); codeBoxes[0].focus(); }, 475);
      return;
    }

    // success
    if (statusLine) { statusLine.textContent = 'Correct! Unlocking...'; statusLine.style.color = 'var(--accent)'; }
    playTone(880, 0.12, 'sine');
    if (codeScreen) { codeScreen.style.transition = 'opacity .45s ease, transform .45s ease'; codeScreen.style.opacity = '0'; codeScreen.style.transform = 'translateY(-8px)'; }
    setTimeout(() => {
      if (codeScreen) codeScreen.classList.add('hidden');
      if (appScreen) { appScreen.classList.remove('hidden'); appScreen.setAttribute('aria-hidden', 'false'); }
      if (urlInput) urlInput.focus();
      if (logoBtn) logoBtn.classList.add('show');
    }, 480);
  }

  // --- launcher open URL -----------------------------------------------
  if (goBtn) goBtn.addEventListener('click', () => {
    let url = (urlInput && urlInput.value || '').trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    if (frame) frame.src = url;
    try { if (frame && frame.contentWindow) frame.contentWindow.postMessage({ type: 'set-volume', volume: iframeVolume }, '*'); } catch (e) { /* ignore */ }
    playTone(660, 0.06, 'triangle');
  });
  if (urlInput) urlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') goBtn.click(); });

  // prevent page scroll
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';

  // init UI values
  uiSetVolumes();
  if (masterVol) masterVol.value = Math.round(master * 100);
  if (sfxVol) sfxVol.value = Math.round(sfx * 100);
  if (frameVol) frameVol.value = Math.round(iframeVolume * 100);

  // load saved cursor size/display
  (function loadCursorSize() {
    const cs = load('cursor_size', 48); if (cursorSize) cursorSize.value = cs; if (cursorSizeVal) cursorSizeVal.textContent = cs; if (customCursor) customCursor.style.width = cs + 'px';
  })();

  // ESC closes modal or panel
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (modal && !modal.classList.contains('hidden')) closeModal();
      else if (sidePanel && sidePanel.classList.contains('open')) { sidePanel.classList.remove('open'); logoBtn.classList.remove('open'); }
    }
  });

  function closeModal() { if (!modal) return; modal.classList.add('hidden'); setTimeout(() => modalBody.innerHTML = '', 300); }
  function openModal(html) { if (!modal) return; modalBody.innerHTML = html; modal.classList.remove('hidden'); }

  // persist defaults
  save('master_vol', master);
  save('sfx_vol', sfx);
  save('frame_vol', iframeVolume);

  // debug
  window.__app = { save, load };

})();
