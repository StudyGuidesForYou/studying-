// Aurora-blue modern behavior — script.js
(() => {
  'use strict';

  // helpers
  const qs = s => document.querySelector(s);
  const qsa = s => Array.from(document.querySelectorAll(s));
  const save = (k,v) => localStorage.setItem(k, JSON.stringify(v));
  const load = (k,def=null) => { try { const v = JSON.parse(localStorage.getItem(k)); return v === null ? def : v; } catch(e){ return def; }};

  // config
  const CORRECT = 'SIGMA'; // class code (uppercase)
  // DOM
  const codeBoxes = qsa('.code-box');
  const codeStatus = qs('#code-status');
  const codeRow = qs('#code-row');
  const codeScreen = qs('#class-code-screen');

  const mainLauncher = qs('#main-launcher');
  const urlInput = qs('#url-input');
  const openUrlBtn = qs('#open-url');
  const viewer = qs('#viewer');

  const settingsLogo = qs('#settings-logo');
  const settingsOverlay = qs('#settings-overlay');
  const settingsPanel = qs('#settings-panel');
  const settingsClose = qs('#settings-close');
  const bgColor = qs('#bg-color');
  const bgFile = qs('#bg-file');
  const bgClear = qs('#bg-clear');
  const bgPreview = qs('#bg-preview');

  const appButtons = qsa('.app-btn');

  // app windows
  const winStopwatch = qs('#win-stopwatch');
  const winTimer     = qs('#win-timer');
  const winAlarm     = qs('#win-alarm');

  // stopwatch elements
  const swDisplay = qs('#sw-display');
  const swStart = qs('#sw-start');
  const swStop = qs('#sw-stop');
  const swReset = qs('#sw-reset');

  // timer elements
  const timerMin = qs('#timer-min');
  const timerStart = qs('#timer-start');
  const timerStop = qs('#timer-stop');
  const timerStatus = qs('#timer-status');

  // alarm elements
  const alarmTime = qs('#alarm-time');
  const alarmSet = qs('#alarm-set');
  const alarmClear = qs('#alarm-clear');
  const alarmStatus = qs('#alarm-status');

  // state
  let unlocked = false;

  // --- ensure initial visibility states
  function initialState() {
    // show only code screen
    codeScreen.style.display = 'flex';
    codeScreen.style.opacity = '1';
    mainLauncher.classList.add('hidden');
    settingsLogo.classList.add('hidden');
    settingsLogo.style.opacity = '0';
    settingsOverlay.classList.add('hidden');
  }
  initialState();

  // --- code-boxes navigation + input
  codeBoxes.forEach((box, idx) => {
    box.addEventListener('input', () => {
      box.value = (box.value || '').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,1);
      if (box.value && idx < codeBoxes.length - 1) codeBoxes[idx+1].focus();
      checkCode();
    });
    box.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !box.value && idx > 0) codeBoxes[idx-1].focus();
      if (e.key === 'Enter') checkCode(true);
    });
  });

  function checkCode(force=false) {
    const code = codeBoxes.map(b => b.value || '').join('');
    if (code.length === codeBoxes.length || force) {
      if (code.toUpperCase() === CORRECT) {
        unlock();
      } else {
        codeStatus.textContent = 'Incorrect code';
        codeStatus.style.color = 'var(--danger)';
        codeRow.classList.add('shake');
        setTimeout(() => {
          codeRow.classList.remove('shake');
          codeBoxes.forEach(b => b.value = '');
          codeBoxes[0].focus();
          codeStatus.textContent = '';
        }, 700);
      }
    }
  }

  function unlock() {
    unlocked = true;
    // fade out code screen
    codeScreen.style.transition = 'opacity .45s ease, transform .45s ease';
    codeScreen.style.opacity = '0';
    codeScreen.style.transform = 'translateY(-8px)';
    setTimeout(() => {
      codeScreen.style.display = 'none';
      mainLauncher.classList.remove('hidden');
      mainLauncher.style.opacity = '1';
      // show settings logo
      settingsLogo.classList.remove('hidden');
      settingsLogo.style.opacity = '1';
      applySavedBackground(); // apply persisted bg
      urlInput.focus();
    }, 480);
  }

  // --- launcher
  openUrlBtn.addEventListener('click', openURL);
  urlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') openURL(); });
  function openURL() {
    let url = (urlInput.value || '').trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    viewer.src = url;
  }

  // --- settings: only open after unlock
  settingsLogo.addEventListener('click', () => { if (!unlocked) return; toggleSettings(true); });
  settingsClose.addEventListener('click', () => toggleSettings(false));
  settingsOverlay.addEventListener('click', (e) => { if (e.target === settingsOverlay) toggleSettings(false); });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') toggleSettings(false); });

  function toggleSettings(open) {
    if (open) {
      settingsOverlay.classList.remove('hidden');
      settingsOverlay.setAttribute('aria-hidden', 'false');
      settingsPanel.classList.add('open');
      const savedColor = load('bg_color', null);
      if (savedColor) bgColor.value = savedColor;
    } else {
      settingsPanel.classList.remove('open');
      settingsOverlay.classList.add('hidden');
      settingsOverlay.setAttribute('aria-hidden', 'true');
    }
  }

  // --- background controls
  bgColor.addEventListener('input', (e) => {
    const v = e.target.value;
    document.documentElement.style.setProperty('--bg-1', v);
    save('bg_color', v);
    localStorage.removeItem('bg_image');
    bgPreview.style.backgroundImage = '';
    bgPreview.style.display = 'none';
  });

  bgFile.addEventListener('change', (ev) => {
    const f = ev.target.files && ev.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const data = r.result;
      document.body.style.backgroundImage = `url(${data})`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      save('bg_image', data);
      bgPreview.style.backgroundImage = `url(${data})`;
      bgPreview.style.display = 'block';
    };
    r.readAsDataURL(f);
  });

  bgClear.addEventListener('click', () => {
    document.body.style.background = '';
    localStorage.removeItem('bg_image');
    localStorage.removeItem('bg_color');
    if (bgPreview) { bgPreview.style.backgroundImage = ''; bgPreview.style.display = 'none'; }
  });

  function applySavedBackground() {
    const savedBg = load('bg_image', null);
    const savedColor = load('bg_color', null);
    if (savedBg) {
      document.body.style.backgroundImage = `url(${savedBg})`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      if (bgPreview) { bgPreview.style.backgroundImage = `url(${savedBg})`; bgPreview.style.display = 'block'; }
    } else if (savedColor) {
      document.documentElement.style.setProperty('--bg-1', savedColor);
    }
  }

  // --- open app buttons
  appButtons.forEach(btn => btn.addEventListener('click', () => openApp(btn.dataset.app)));

  function openApp(name) {
    let win;
    if (name === 'stopwatch') win = winStopwatch;
    if (name === 'timer') win = winTimer;
    if (name === 'alarm') win = winAlarm;
    if (!win) return;
    win.classList.remove('hidden');
    win.style.display = 'block';
    // position roughly near top-left with offset
    win.style.left = (60 + Math.random() * 180) + 'px';
    win.style.top  = (100 + Math.random() * 40) + 'px';
    makeDraggable(win);
  }

  // --- make draggable helper
  function makeDraggable(el) {
    if (!el) return;
    if (el.__draggable) return;
    el.__draggable = true;
    const header = el.querySelector('.window-header');
    header.style.cursor = 'grab';
    let startX=0, startY=0, origX=0, origY=0, dragging=false;

    function onDown(e) {
      dragging = true;
      header.style.cursor = 'grabbing';
      startX = e.clientX; startY = e.clientY;
      const rect = el.getBoundingClientRect();
      origX = rect.left; origY = rect.top;
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      e.preventDefault();
    }
    function onMove(e) {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      el.style.left = (origX + dx) + 'px';
      el.style.top  = (origY + dy) + 'px';
    }
    function onUp() {
      dragging = false;
      header.style.cursor = 'grab';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
    header.addEventListener('mousedown', onDown);
    // touch
    header.addEventListener('touchstart', (ev) => {
      const t = ev.touches[0];
      startX = t.clientX; startY = t.clientY;
      const rect = el.getBoundingClientRect();
      origX = rect.left; origY = rect.top;
      document.addEventListener('touchmove', onTouchMove, {passive:false});
      document.addEventListener('touchend', onTouchEnd);
      ev.preventDefault();
    });
    function onTouchMove(ev) {
      const t = ev.touches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      el.style.left = (origX + dx) + 'px';
      el.style.top  = (origY + dy) + 'px';
      ev.preventDefault();
    }
    function onTouchEnd() {
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    }
  }

  // --- stopwatch implementation
  let swStartTs = null, swElapsed = 0, swRaf = null, swRunning = false;
  function swFormat(ms) {
    const total = Math.floor(ms);
    const minutes = Math.floor(total / 60000);
    const seconds = Math.floor((total % 60000) / 1000);
    const centi = Math.floor((total % 1000) / 10);
    return `${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}.${String(centi).padStart(2,'0')}`;
  }
  function swTick() {
    const now = performance.now();
    const ms = swElapsed + (now - swStartTs);
    swDisplay.textContent = swFormat(ms);
    swRaf = requestAnimationFrame(swTick);
  }
  swStart.addEventListener('click', () => {
    if (swRunning) return;
    swStartTs = performance.now();
    swRunning = true;
    swRaf = requestAnimationFrame(swTick);
  });
  swStop.addEventListener('click', () => {
    if (!swRunning) return;
    swElapsed += performance.now() - swStartTs;
    swRunning = false;
    cancelAnimationFrame(swRaf);
  });
  swReset.addEventListener('click', () => {
    swStartTs = null; swElapsed = 0;
    swDisplay.textContent = '00:00.00';
    swRunning = false;
    cancelAnimationFrame(swRaf);
  });

  // --- timer
  let timerHandle = null;
  timerStart.addEventListener('click', () => {
    const mins = parseFloat(timerMin.value || '0');
    if (!mins || mins <= 0) return;
    let remaining = Math.floor(mins * 60);
    timerStatus.textContent = `Time left: ${remaining}s`;
    if (timerHandle) clearInterval(timerHandle);
    timerHandle = setInterval(() => {
      remaining--;
      timerStatus.textContent = `Time left: ${remaining}s`;
      if (remaining <= 0) {
        clearInterval(timerHandle);
        timerHandle = null;
        timerStatus.textContent = 'Done';
        alert('Timer finished');
      }
    }, 1000);
  });
  timerStop.addEventListener('click', () => {
    if (timerHandle) { clearInterval(timerHandle); timerHandle = null; timerStatus.textContent = 'Stopped'; }
  });

  // --- alarm
  let alarmTimeout = null;
  alarmSet.addEventListener('click', () => {
    const t = alarmTime.value;
    if (!t) { alarmStatus.textContent = 'Pick a time'; return; }
    const [hh, mm] = t.split(':').map(Number);
    const now = new Date();
    const alarm = new Date();
    alarm.setHours(hh, mm, 0, 0);
    if (alarm <= now) alarm.setDate(alarm.getDate() + 1);
    const ms = alarm - now;
    if (alarmTimeout) clearTimeout(alarmTimeout);
    alarmTimeout = setTimeout(() => {
      alert('Alarm');
      alarmStatus.textContent = 'Alarm triggered';
      alarmTimeout = null;
    }, ms);
    alarmStatus.textContent = `Alarm set for ${alarm.toLocaleString()}`;
  });
  alarmClear.addEventListener('click', () => {
    if (alarmTimeout) clearTimeout(alarmTimeout);
    alarmTimeout = null; alarmStatus.textContent = 'Cleared';
  });

  // --- init load
  function init() {
    mainLauncher.classList.add('hidden');
    settingsLogo.classList.add('hidden');
    settingsOverlay.classList.add('hidden');
    // load saved background preview
    const savedBg = load('bg_image', null);
    const savedColor = load('bg_color', null);
    if (savedBg && bgPreview) { bgPreview.style.backgroundImage = `url(${savedBg})`; bgPreview.style.display = 'block'; }
    if (savedColor && bgColor) bgColor.value = savedColor;
    // initially focus first box
    if (codeBoxes && codeBoxes[0]) codeBoxes[0].focus();
  }
  init();

  // small expose for debugging
  window.launcherUI = { openApp, toggleSettings, load, save };

})();
