/* Main client JS — settings, UI, cursor, tools, iframe launcher
   - Saves preferences to localStorage
   - SFX & master volume applied to internal tones
   - Cursor is implemented as an absolutely positioned image that follows the mouse
   - Side panel opens with logo rotating
*/

(() => {
  // --------- Helpers & storage ----------
  const qs = s => document.querySelector(s);
  const qsa = s => Array.from(document.querySelectorAll(s));
  const save = (k,v) => localStorage.setItem(k, JSON.stringify(v));
  const load = (k, def=null) => {
    try { const v = JSON.parse(localStorage.getItem(k)); return v===null?def:v; } catch(e){ return def; }
  };

  // --------- DOM ----------
  const logoBtn = qs('#logo-btn');
  const sidePanel = qs('#side-panel');
  const bgCanvas = qs('#bg-canvas');
  const customCursor = qs('#custom-cursor');

  const codeBoxes = qsa('.code-box');
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

  // side panel controls
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
  const openWeather = qs('#open-weather');
  const openNotes = qs('#open-notes');

  const modal = qs('#tools-modal');
  const modalBody = qs('#modal-body');
  const modalClose = qs('#modal-close');

  // --------- Audio / tones ----------
  const audioCtx = (() => {
    try { return new (window.AudioContext || window.webkitAudioContext)(); } catch(e){ return null; }
  })();

  // volume settings (0..1)
  let master = load('master_vol', 1);
  let sfx = load('sfx_vol', 1);
  let iframeVolume = load('frame_vol', 1);

  function applyVolumeSettingsToUI(){
    masterVol.value = Math.round(master*100);
    sfxVol.value = Math.round(sfx*100);
    frameVol.value = Math.round(iframeVolume*100);
    masterVal.textContent = Math.round(master*100);
    sfxVal.textContent = Math.round(sfx*100);
    frameVal.textContent = Math.round(iframeVolume*100);
  }
  applyVolumeSettingsToUI();

  function playTone(freq=440, time=0.08, type='sine'){
    if (!audioCtx) return;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type; o.frequency.value = freq;
    // combine master * sfx
    g.gain.value = 0.0001;
    o.connect(g); g.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    g.gain.exponentialRampToValueAtTime(0.0008 * master * sfx, now + 0.01);
    o.start(now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + time);
    o.stop(now + time + 0.02);
  }

  // --------- Particle background ----------
  (function particles(){
    const c = bgCanvas, ctx = c.getContext('2d');
    let parts = [], w=0,h=0;
    function resize(){ w=c.width=innerWidth; h=c.height=innerHeight; parts=[]; for(let i=0;i<70;i++) parts.push({x:Math.random()*w,y:Math.random()*h,r:1+Math.random()*2,dx:(Math.random()-0.5)*0.5,dy:(Math.random()-0.5)*0.5}); }
    function frame(){
      ctx.clearRect(0,0,w,h);
      parts.forEach(p=>{
        p.x+=p.dx; p.y+=p.dy;
        if(p.x<0)p.x=w; if(p.x>w)p.x=0; if(p.y<0)p.y=h; if(p.y>h)p.y=0;
        ctx.beginPath(); ctx.fillStyle='rgba(255,255,255,0.02)'; ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
      });
      requestAnimationFrame(frame);
    }
    window.addEventListener('resize', resize);
    resize(); frame();
  })();

  // --------- Custom cursor logic ----------
  let cursorData = load('cursor_data', null);
  let cursorSizeValNum = load('cursor_size', 48);
  if (cursorData) {
    customCursor.src = cursorData;
    customCursor.style.width = cursorSizeValNum + 'px';
    customCursor.classList.remove('hidden');
  }

  // follow mouse
  window.addEventListener('pointermove', (e) => {
    if (!customCursor.classList.contains('hidden')) {
      customCursor.style.left = e.clientX + 'px';
      customCursor.style.top = e.clientY + 'px';
    }
  });

  cursorSize.value = cursorSizeValNum;
  qs('#cursor-size-val').textContent = cursorSizeValNum;

  // cursor upload
  cursorFile && cursorFile.addEventListener('change', (ev) => {
    const f = ev.target.files && ev.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      cursorData = r.result;
      save('cursor_data', cursorData);
      customCursor.src = cursorData;
      customCursor.style.width = cursorSize.value + 'px';
      customCursor.classList.remove('hidden');
    };
    r.readAsDataURL(f);
  });

  cursorSize && cursorSize.addEventListener('input', (e) => {
    const v = +e.target.value;
    save('cursor_size', v);
    cursorSizeVal.textContent = v;
    customCursor.style.width = v + 'px';
  });

  cursorClear && cursorClear.addEventListener('click', () => {
    cursorData = null; save('cursor_data', null);
    customCursor.classList.add('hidden'); cursorFile.value = '';
  });

  // hide cursor on touch devices
  if ('ontouchstart' in window) {
    customCursor.classList.add('hidden');
  }

  // --------- Side panel toggle with rotating logo ----------
  logoBtn.addEventListener('click', () => {
    const opening = !sidePanel.classList.contains('open');
    logoBtn.classList.toggle('open', opening);
    sidePanel.classList.toggle('open', opening);
    sidePanel.setAttribute('aria-hidden', !opening);
    playTone(opening?720:440, 0.08, opening?'triangle':'sine');
  });

  // --------- Background controls ----------
  // load saved bg
  const savedBg = load('bg_image', null);
  const savedBgColor = load('bg_color', null);
  if (savedBgColor) {
    bgColor.value = savedBgColor;
    document.body.style.background = `linear-gradient(180deg, ${savedBgColor}, var(--bg-2))`;
  }
  if (savedBg) {
    document.body.style.backgroundImage = `url(${savedBg})`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
  }

  bgColor && bgColor.addEventListener('input', (e) => {
    const v = e.target.value;
    save('bg_color', v);
    document.body.style.background = `linear-gradient(180deg, ${v}, var(--bg-2))`;
  });

  bgFile && bgFile.addEventListener('change', (ev) => {
    const f = ev.target.files && ev.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      save('bg_image', r.result);
      document.body.style.backgroundImage = `url(${r.result})`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
    };
    r.readAsDataURL(f);
  });

  bgClear && bgClear.addEventListener('click', () => {
    localStorage.removeItem('bg_image');
    localStorage.removeItem('bg_color');
    document.body.style.background = '';
    bgFile.value = '';
    bgColor.value = '#000000';
    document.body.style.background = '';
  });

  // --------- Volume controls UI binding ----------
  masterVol && masterVol.addEventListener('input', e => {
    master = e.target.value/100; save('master_vol', master); masterVal.textContent = e.target.value;
  });
  sfxVol && sfxVol.addEventListener('input', e => {
    sfx = e.target.value/100; save('sfx_vol', sfx); sfxVal.textContent = e.target.value;
  });
  frameVol && frameVol.addEventListener('input', e => {
    iframeVolume = e.target.value/100; save('frame_vol', iframeVolume); frameVal.textContent = e.target.value;
    // best-effort: postMessage to iframe to set volume if it supports it
    try {
      frame.contentWindow.postMessage({ type:'set-volume', volume: iframeVolume }, '*');
    } catch(e){}
  });

  // --------- Tools modal handling ----------
  function openModal(html) {
    modalBody.innerHTML = html;
    modal.classList.remove('hidden');
  }
  function closeModal() {
    modal.classList.add('hidden');
    setTimeout(()=> modalBody.innerHTML = '', 300);
  }
  modalClose && modalClose.addEventListener('click', closeModal);

  // Stopwatch
  openStopwatch && openStopwatch.addEventListener('click', () => {
    openModal(`
      <h3>Stopwatch</h3>
      <div id="sw-time" style="font-size:28px;margin:10px 0">00:00.00</div>
      <div style="display:flex;gap:8px">
        <button id="sw-start" class="tool-btn">Start</button>
        <button id="sw-stop" class="tool-btn">Stop</button>
        <button id="sw-reset" class="tool-btn">Reset</button>
      </div>
    `);
    let start=0, raf=0, running=false;
    const out = qs('#sw-time');
    const startBtn = qs('#sw-start'), stopBtn = qs('#sw-stop'), resetBtn = qs('#sw-reset');
    function fmt(t){ const ms=Math.floor(t%1000/10); const s=Math.floor(t/1000)%60; const m=Math.floor(t/60000); return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(ms).padStart(2,'0')}`; }
    function tick(){ if(!running) return; const now=performance.now()-start; out.textContent = fmt(now); raf = requestAnimationFrame(tick); }
    startBtn.addEventListener('click', ()=>{ if(!running){ running=true; start = performance.now() - (parseTime(out.textContent)||0); tick(); playTone(880,0.06,'sine'); }});
    stopBtn.addEventListener('click', ()=>{ running=false; cancelAnimationFrame(raf); playTone(220,0.06,'sine');});
    resetBtn.addEventListener('click', ()=>{ running=false; cancelAnimationFrame(raf); out.textContent='00:00.00'; playTone(520,0.06,'sine');});
    function parseTime(s){ const parts=s.split(/[:.]/); if(parts.length<3) return 0; return (parseInt(parts[0])*60000 + parseInt(parts[1])*1000 + parseInt(parts[2])*10); }
  });

  // Timer
  openTimer && openTimer.addEventListener('click', () => {
    openModal(`
      <h3>Timer</h3>
      <input id="timer-min" type="number" min="0" placeholder="minutes" style="width:120px;padding:8px">
      <div style="display:flex;gap:8px;margin-top:10px"><button id="timer-start" class="tool-btn">Start</button><button id="timer-stop" class="tool-btn">Stop</button></div>
      <div id="timer-status" style="margin-top:12px;color:var(--muted)"></div>
    `);
    let t = 0, handle=null; const status = qs('#timer-status');
    qs('#timer-start').addEventListener('click', ()=> {
      const m = parseInt(qs('#timer-min').value||0); t = m*60; if(!t) return; status.textContent = `Time left: ${t}s`; handle=setInterval(()=>{ t--; status.textContent = `Time left: ${t}s`; if(t<=0){ clearInterval(handle); playTone(880,0.3,'sine'); status.textContent='Time up!'; } }, 1000); playTone(720,0.06,'sine');
    });
    qs('#timer-stop').addEventListener('click', ()=>{ if(handle) clearInterval(handle); status.textContent='Stopped'; playTone(220,0.06,'sine'); });
  });

  // Alarm (simple beeper)
  openAlarm && openAlarm.addEventListener('click', () => {
    openModal(`
      <h3>Alarm</h3>
      <input id="alarm-min" type="number" min="0" placeholder="Minutes from now" style="width:140px;padding:8px">
      <div style="display:flex;gap:8px;margin-top:10px"><button id="alarm-set" class="tool-btn">Set Alarm</button></div>
      <div id="alarm-status" style="margin-top:12px;color:var(--muted)"></div>
    `);
    qs('#alarm-set').addEventListener('click', ()=> {
      const mins = parseInt(qs('#alarm-min').value||0); if(!mins){ qs('#alarm-status').textContent='Enter minutes'; return; }
      qs('#alarm-status').textContent = `Alarm set for ${mins} minute(s)`;
      setTimeout(()=> { playTone(880,0.8,'sine'); alert('Alarm'); }, mins*60*1000);
    });
  });

  // Weather (very simple offline: geolocation + free api blocked — we provide city input fallback)
  openWeather && openWeather.addEventListener('click', () => {
    openModal(`
      <h3>Weather (simple)</h3>
      <div id="weather-info" style="margin-top:10px;color:var(--muted)">Attempting to fetch local weather...</div>
      <div style="margin-top:10px"><input id="city-input" placeholder="Or enter a city" style="padding:8px"><button id="city-go" class="tool-btn">Go</button></div>
    `);
    const info = qs('#weather-info');
    function showSimple(data){ info.innerHTML = `<strong>${data.name}</strong><div>${data.temp}°C — ${data.desc}</div>`; }
    // Try geolocation (no external API guaranteed). We'll offer fallback form but cannot call external APIs without keys.
    if(navigator.geolocation){
      navigator.geolocation.getCurrentPosition(pos => {
        const lat = pos.coords.latitude.toFixed(2), lon = pos.coords.longitude.toFixed(2);
        // We cannot call a remote weather API reliably (no key). Show coords and ask for manual city if needed.
        info.innerHTML = `Location: ${lat}, ${lon} <div class="small-muted">Enter city for simple mock result</div>`;
      }, err => { info.textContent = 'Location blocked. Enter a city below.' });
    } else { info.textContent = 'Geolocation not available. Enter a city below.'; }
    qs('#city-go').addEventListener('click', ()=> {
      const city = qs('#city-input').value.trim()||'Unknown';
      // Provide a fake but reasonable-looking response (offline-friendly)
      showSimple({ name: city, temp: Math.floor(10 + Math.random()*18), desc: ['Sunny','Cloudy','Light rain'][Math.floor(Math.random()*3)] });
    });
  });

  // Notes
  openNotes && openNotes.addEventListener('click', () => {
    const saved = load('notes_content','');
    openModal(`<h3>Notes</h3><textarea id="notes-text" style="width:100%;height:220px;padding:10px;border-radius:8px;background:rgba(255,255,255,0.02);color:#fff">${saved}</textarea><div style="display:flex;gap:8px;margin-top:8px"><button id="notes-save" class="tool-btn">Save</button><button id="notes-clear" class="tool-btn">Clear</button></div>`);
    qs('#notes-save').addEventListener('click', ()=> { save('notes_content', qs('#notes-text').value); playTone(720,0.06,'sine'); });
    qs('#notes-clear').addEventListener('click', ()=> { qs('#notes-text').value=''; localStorage.removeItem('notes_content'); });
  });

  // --------- Modal close handler (outside) ----------
  modal && modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  // --------- Code screen logic ----------
  const CORRECT = 'sigma';
  codeBoxes[0].focus();

  codeBoxes.forEach((box, idx) => {
    box.addEventListener('input', () => {
      box.value = box.value.replace(/[^a-zA-Z]/g,'').slice(0,1);
      if (box.value && idx < codeBoxes.length -1) codeBoxes[idx+1].focus();
    });
    box.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !box.value && idx>0) codeBoxes[idx-1].focus();
      if (e.key === 'Enter') trySubmit();
    });
  });

  pasteBtn && pasteBtn.addEventListener('click', async () => {
    try { const txt = await navigator.clipboard.readText(); const t = txt.trim().toLowerCase().replace(/[^a-z]/g,'').slice(0,5); for(let i=0;i<5;i++) codeBoxes[i].value = t[i]||''; playTone(720,0.06,'triangle'); } catch(e){ playTone(180,0.06,'sawtooth'); }
  });
  clearBtn && clearBtn.addEventListener('click', ()=> { codeBoxes.forEach(b=>b.value=''); codeBoxes[0].focus(); playTone(180,0.04,'sine'); });
  enterBtn && enterBtn.addEventListener('click', trySubmit);

  function trySubmit(){
    const code = codeBoxes.map(b=>b.value||'').join('').toLowerCase();
    if (code !== CORRECT){
      statusLine.textContent = 'Incorrect code';
      statusLine.style.color = 'var(--danger)';
      codeRow.classList.add('shake');
      playTone(220,0.12,'sawtooth');
      setTimeout(()=>{ codeRow.classList.remove('shake'); codeBoxes.forEach(b=>b.value=''); codeBoxes[0].focus(); }, 450);
      return;
    }
    // success
    statusLine.textContent = 'Correct!';
    statusLine.style.color = 'var(--accent)';
    playTone(880,0.12,'sine');
    // show app screen
    codeScreen.style.transition = 'opacity .45s ease, transform .45s ease';
    codeScreen.style.opacity = '0';
    codeScreen.style.transform = 'translateY(-8px)';
    setTimeout(()=>{ codeScreen.classList.add('hidden'); appScreen.classList.remove('hidden'); urlInput.focus(); }, 480);
  }

  // --------- Launcher: open URL in iframe ----------
  goBtn && goBtn.addEventListener('click', () => {
    let url = urlInput.value.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    frame.src = url;
    // best-effort: send iframe volume setting
    try { frame.contentWindow.postMessage({type:'set-volume', volume: iframeVolume}, '*'); } catch(e){}
    playTone(660,0.06,'triangle');
  });

  // allow Enter key in URL input
  urlInput && urlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') goBtn.click(); });

  // --------- Persist & init UI values ----------
  applyVolumeSettingsToUI(); // set UI shown values

  // --------- Wire up loader volume inputs after DOM defined ----------
  if (masterVol) masterVol.value = Math.round(master*100);
  if (sfxVol) sfxVol.value = Math.round(sfx*100);
  if (frameVol) frameVol.value = Math.round(iframeVolume*100);

  // --------- cursor file input in side panel (deferred binding) ----------
  cursorFile && cursorFile.addEventListener('change', (ev) => {
    const f = ev.target.files && ev.target.files[0]; if(!f) return;
    const r = new FileReader();
    r.onload = () => { save('cursor_data', r.result); customCursor.src = r.result; customCursor.style.width = (cursorSize.value||48)+'px'; customCursor.classList.remove('hidden'); };
    r.readAsDataURL(f);
  });

  // --------- load saved cursor size */
  (function loadCursorSize(){
    const cs = load('cursor_size', 48); cursorSize.value = cs; cursorSizeVal.textContent = cs; customCursor.style.width = cs+'px';
  })();

  // --------- modal close by Escape ----------
  window.addEventListener('keydown', e => { if(e.key === 'Escape') { if(!modal.classList.contains('hidden')) closeModal(); else if(!sidePanel.classList.contains('open')){} } });

  // Small utility to set UI text values
  function applyVolumeSettingsToUI(){
    if(masterVal) masterVal.textContent = Math.round((load('master_vol', master))*100);
    if(sfxVal) sfxVal.textContent = Math.round((load('sfx_vol', sfx))*100);
    if(frameVal) frameVal.textContent = Math.round((load('frame_vol', iframeVolume))*100);
  }

  // --------- Save initial volumes into storage if not existent ----------
  save('master_vol', master);
  save('sfx_vol', sfx);
  save('frame_vol', iframeVolume);

  // expose small debug
  window.__app = { save, load };

})();
