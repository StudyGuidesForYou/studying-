// Modern script.js — preserves and improves original behavior
(() => {
  'use strict';

  // Helpers
  const qs = s => document.querySelector(s);
  const qsa = s => Array.from(document.querySelectorAll(s));
  const save = (k,v) => localStorage.setItem(k, JSON.stringify(v));
  const load = (k,def=null) => {
    try { const v = JSON.parse(localStorage.getItem(k)); return v === null ? def : v; } catch(e){ return def; }
  };

  // Config
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
  const appsRoot = qs('#apps-root');

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

  // -------- Code boxes behavior ----------
  codeBoxes.forEach((box, idx) => {
    box.addEventListener('input', () => {
      box.value = box.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,1);
      if (box.value && idx < codeBoxes.length - 1) codeBoxes[idx+1].focus();
      checkCode();
    });
    box.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !box.value && idx > 0) {
        codeBoxes[idx-1].focus();
      }
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
        setTimeout(()=> {
          codeRow.classList.remove('shake');
          codeBoxes.forEach(b => b.value = '');
          codeBoxes[0].focus();
          codeStatus.textContent = '';
        }, 650);
      }
    }
  }

  function unlock() {
    unlocked = true;
    // fade out code screen
    codeScreen.style.transition = 'opacity .45s ease, transform .45s ease';
    codeScreen.style.opacity = '0';
    codeScreen.style.transform = 'translateY(-8px)';
    setTimeout(()=> {
      codeScreen.style.display = 'none';
      mainLauncher.classList.remove('hidden');
      mainLauncher.style.opacity = '1';
      // show settings logo
      settingsLogo.classList.remove('hidden');
      settingsLogo.style.opacity = '1';
      // load persisted background
      applySavedBackground();
      urlInput.focus();
    }, 480);
  }

  // -------- Main launcher URL handling ----------
  openUrlBtn.addEventListener('click', () => {
    openURL();
  });
  urlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') openURL(); });

  function openURL() {
    let url = (urlInput.value || '').trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    viewer.src = url;
  }

  // -------- Settings UI (logo + panel) ----------
  // Only let user open settings after unlock
  settingsLogo.addEventListener('click', (e) => {
    if (!unlocked) return;
    toggleSettings(true);
  });

  settingsClose.addEventListener('click', () => toggleSettings(false));

  // overlay click to close
  settingsOverlay.addEventListener('click', (e) => {
    if (e.target === settingsOverlay) toggleSettings(false);
  });

  // ESC to close panel
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!settingsOverlay.classList.contains('hidden')) toggleSettings(false);
    }
  });

  function toggleSettings(open) {
    if (open) {
      settingsOverlay.classList.remove('hidden');
      settingsOverlay.setAttribute('aria-hidden','false');
      settingsPanel.classList.add('open');
      // load current bg color
      const savedColor = load('bg_color', null);
      if (savedColor) bgColor.value = savedColor;
    } else {
      settingsPanel.classList.remove('open');
      settingsOverlay.classList.add('hidden');
      settingsOverlay.setAttribute('aria-hidden','true');
    }
  }

  // -------- Background picker & image upload ----------
  bgColor.addEventListener('input', (e) => {
    const v = e.target.value;
    document.body.style.background = `linear-gradient(180deg, ${v}, var(--bg-2))`;
    save('bg_color', v);
    // remove image if any
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
      // show preview
      bgPreview.style.backgroundImage = `url(${data})`;
      bgPreview.style.display = 'block';
    };
    r.readAsDataURL(f);
  });

  bgClear.addEventListener('click', () => {
    document.body.style.background = '';
    localStorage.removeItem('bg_image');
    localStorage.removeItem('bg_color');
    bgPreview.style.backgroundImage = '';
    bgPreview.style.display = 'none';
  });

  function applySavedBackground() {
    const savedBg = load('bg_image', null);
    const savedColor = load('bg_color', null);
    if (savedBg) {
      document.body.style.backgroundImage = `url(${savedBg})`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      bgPreview.style.backgroundImage = `url(${savedBg})`;
      bgPreview.style.display = 'block';
    } else if (savedColor) {
      document.body.style.background = `linear-gradient(180deg, ${savedColor}, var(--bg-2))`;
      bgPreview.style.display = 'none';
    } else {
      // default
      document.body.style.background = '';
      bgPreview.style.display = 'none';
    }
  }

  // -------- Open apps (stopwatch/timer/alarm) ----------
  appButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const app = btn.dataset.app;
      openApp(app);
    });
  });

  function openApp(name) {
    let win;
    if (name === 'stopwatch') win = winStopwatch;
    if (name === 'timer') win = winTimer;
    if (name === 'alarm') win = winAlarm;
    if (!win) return;
    win.classList.remove('hidden');
    win.style.display = 'block';
    // place near top-left offset so multiple windows don't overlap exactly
    win.style.left = (50 + Math.random() * 200) + 'px';
    win.style.top  = (80 + Math.random() * 80) + 'px';
    makeDraggable(win);
  }

  // -------- Draggable windows helper ----------
  function makeDraggable(el) {
    if (el.__draggable) return; // already wired
    el.__draggable = true;
    const header = el.querySelector('.window-header');
    header.style.cursor = 'grab';
    let startX=0, startY=0, origX=0, origY=0, dragging=false;

    function onDown(e) {
      dragging = true;
      header.style.cursor = 'grabbing';
      startX = e.clientX;
      startY = e.clientY;
      const rect = el.getBoundingClientRect();
      origX = rect.left;
      origY = rect.top;
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
    // touch support
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

  // -------- Stopwatch implementation ----------
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

  // -------- Timer implementation ----------
  let timerHandle = null, timerRemaining = 0;
  timerStart.addEventListener('click', () => {
    const mins = parseFloat(timerMin.value || '0');
    if (!mins || mins <= 0) return;
    timerRemaining = Math.floor(mins * 60);
    timerStatus.textContent = `Time left: ${timerRemaining}s`;
    if (timerHandle) clearInterval(timerHandle);
    timerHandle = setInterval(() => {
      timerRemaining--;
      timerStatus.textContent = `Time left: ${timerRemaining}s`;
      if (timerRemaining <= 0) {
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

  // -------- Alarm implementation ----------
  let alarmTimeout = null;
  alarmSet.addEventListener('click', () => {
    const t = alarmTime.value;
    if (!t) { alarmStatus.textContent = 'Pick a time'; return; }
    const [hh, mm] = t.split(':').map(Number);
    const now = new Date();
    const alarm = new Date();
    alarm.setHours(hh, mm, 0, 0);
    if (alarm <= now) alarm.setDate(alarm.getDate() + 1); // next day
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
    alarmTimeout = null;
    alarmStatus.textContent = 'Cleared';
  });

  // -------- Persist / load background on boot ----------
  function init() {
    // Hide main-launcher until unlocked
    mainLauncher.classList.add('hidden');
    // show/hide settings logo initially hidden
    settingsLogo.classList.add('hidden');
    settingsLogo.style.opacity = '0';

    // attach clickers for app buttons inside panel
    qsa('.open-app').forEach(b => b.addEventListener('click', (e) => {
      const which = b.dataset.app;
      openApp(which);
    }));

    // load saved background if any (but only apply visually after unlock)
    const savedBg = load('bg_image', null);
    const savedColor = load('bg_color', null);
    if (savedBg) {
      bgPreview.style.backgroundImage = `url(${savedBg})`;
      bgPreview.style.display = 'block';
    } else if (savedColor) {
      bgColor.value = savedColor;
    } else {
      // defaults left to CSS
    }
  }

  init();

  // expose a debug API
  window.appUI = { openApp, toggleSettings, save, load };

})();
