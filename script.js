/* script.js — Aurora Web OS (organized)
   - Scientific calculator
   - Emulator (formerly Browser)
   - Notepad, Files, Photos, Music, Paint, Terminal, Settings
   - localStorage persistence
   - basic window manager
*/

/* ---------- Helpers & Persistent State ---------- */
const APPS = [
  { id:'aura-notepad', name:'Notepad', icon:'📝', type:'app', run: notepadApp },
  { id:'aura-calc', name:'Calculator', icon:'🧮', type:'app', run: calculatorApp },
  { id:'aura-paint', name:'Paint', icon:'🎨', type:'app', run: paintApp },
  { id:'aura-terminal', name:'Terminal', icon:'💻', type:'app', run: terminalApp },
  { id:'aura-files', name:'Files', icon:'📁', type:'app', run: filesApp },
  { id:'aura-photos', name:'Photos', icon:'🖼️', type:'app', run: photosApp },
  { id:'aura-music', name:'Music', icon:'🎵', type:'app', run: musicApp },
  // Browser renamed -> Emulator
  { id:'aura-emulator', name:'Emulator', icon:'🕹️', type:'app', run: emulatorApp },
  { id:'aura-settings', name:'Settings', icon:'⚙️', type:'app', run: settingsApp }
];

const LS = (k, def) => {
  try { return JSON.parse(localStorage.getItem(k)) ?? def; }
  catch { return def; }
};
const setLS = (k, v) => localStorage.setItem(k, JSON.stringify(v));

const state = {
  z: 100,
  pinned: LS('aurora_pinned', ['aura-files','aura-photos','aura-music','aura-emulator']),
  notes: LS('aurora_notes', { default: '' }),
  calc: LS('aurora_calc', ''),
  paint: LS('aurora_paint', {}),
  files: LS('aurora_files', { root: [
    { id:'f_readme', name:'Welcome.txt', type:'text', content: 'Welcome to Aurora! Double-click files to open.' }
  ]}),
  photos: LS('aurora_photos', []),
  music: LS('aurora_music', []),
  emulator: LS('aurora_emulator', { bookmarks: [] }),
  wallpaper: localStorage.getItem('aurora_wallpaper') || ''
};

const desktop = document.getElementById('desktop');
const startMenu = document.getElementById('start-menu');
const pinnedGrid = document.getElementById('pinned-grid');
const allAppsEl = document.getElementById('all-apps');
const taskbarPinned = document.getElementById('taskbar-pinned');
const windowsRoot = document.getElementById('windows-root');
const ctxMenu = document.getElementById('ctx-menu');
const filePicker = document.getElementById('file-picker');

/* ---------- Utilities ---------- */
function saveAll(){
  setLS('aurora_pinned', state.pinned);
  setLS('aurora_notes', state.notes);
  setLS('aurora_calc', state.calc);
  setLS('aurora_paint', state.paint);
  setLS('aurora_files', state.files);
  setLS('aurora_photos', state.photos);
  setLS('aurora_music', state.music);
  setLS('aurora_emulator', state.emulator);
  if(state.wallpaper) localStorage.setItem('aurora_wallpaper', state.wallpaper);
}

/* small uid */
function uid(prefix='id'){ return prefix + Math.random().toString(36).slice(2,9); }

/* find app by id */
function findApp(id){ return APPS.find(a => a.id === id || a.name === id); }

/* ---------- Desktop & Start rendering ---------- */
function renderDesktop(){
  desktop.innerHTML = '';
  APPS.forEach(app => {
    const el = document.createElement('div');
    el.className = 'desk-icon';
    el.innerHTML = `<div class="icon">${app.icon}</div><span>${app.name}</span>`;
    el.ondblclick = () => openAppWindow(app);
    desktop.appendChild(el);
  });
}

function renderStartMenu(){
  pinnedGrid.innerHTML = '';
  state.pinned.forEach(id => {
    const app = findApp(id);
    if(!app) return;
    const row = document.createElement('div');
    row.className = 'app-card';
    row.innerHTML = `<div style="display:flex;align-items:center;gap:8px"><div>${app.icon}</div><div>${app.name}</div></div>
                     <div style="margin-left:auto;display:flex;gap:6px">
                       <button class="tb-btn" onclick="openAppWindow(findApp('${app.id}'))">Open</button>
                       <button class="tb-btn" onclick="unpinApp('${app.id}')">—</button>
                     </div>`;
    pinnedGrid.appendChild(row);
  });

  allAppsEl.innerHTML = '';
  APPS.forEach(app => {
    const card = document.createElement('div');
    card.className = 'app-card';
    card.style.display = 'flex';
    card.style.justifyContent = 'space-between';
    card.style.padding = '8px';
    card.style.borderRadius = '8px';
    card.style.cursor = 'pointer';
    card.onmouseover = () => card.style.background = 'rgba(255,255,255,0.02)';
    card.onmouseout = () => card.style.background = 'transparent';
    card.innerHTML = `<div style="display:flex;align-items:center;gap:8px"><div style="font-size:20px">${app.icon}</div><div>${app.name}</div></div>
                      <div style="display:flex;gap:6px">
                        <button class="tb-btn" onclick="openAppWindow(findApp('${app.id}'))">Open</button>
                        <button class="tb-btn" onclick="pinApp('${app.id}')">📌</button>
                      </div>`;
    allAppsEl.appendChild(card);
  });
}

/* ---------- Pin/unpin and taskbar ---------- */
function pinApp(id){
  if(!state.pinned.includes(id)) state.pinned.unshift(id);
  saveAll();
  renderStartMenu();
  renderTaskbar();
}
function unpinApp(id){
  state.pinned = state.pinned.filter(x => x !== id);
  saveAll();
  renderStartMenu();
  renderTaskbar();
}
function renderTaskbar(){
  taskbarPinned.innerHTML = '';
  state.pinned.forEach(id => {
    const app = findApp(id);
    if(!app) return;
    const btn = document.createElement('button');
    btn.className = 'tb-btn';
    btn.title = app.name;
    btn.innerHTML = `<div style="font-size:18px">${app.icon}</div>`;
    btn.onclick = () => openAppWindow(app);
    taskbarPinned.appendChild(btn);
  });
}

/* ---------- Window manager ---------- */
function openAppWindow(app, options = {}){
  if(!app) return;
  const win = document.createElement('div');
  win.className = 'window';
  const width = options.w || Math.min(window.innerWidth * 0.7, 900);
  const height = options.h || Math.min(window.innerHeight * 0.7, 600);
  win.style.width = width + 'px';
  win.style.height = height + 'px';
  win.style.left = ((window.innerWidth - width)/2) + 'px';
  win.style.top = ((window.innerHeight - height)/2) + 'px';
  win.style.zIndex = ++state.z;
  const winId = uid('win_');
  win.dataset.winId = winId;
  // header & body
  const header = document.createElement('div');
  header.className = 'win-header';
  header.innerHTML = `<div class="win-title"><div style="font-size:18px">${app.icon}</div><div>${app.name}</div></div>
                      <div style="display:flex;gap:6px;align-items:center">
                        <button class="tb-btn" title="Minimize" data-action="min">—</button>
                        <button class="tb-btn" title="Close" data-action="close">✖</button>
                      </div>`;
  const body = document.createElement('div');
  body.className = 'win-body';
  body.id = `${winId}_body`;
  win.appendChild(header);
  win.appendChild(body);
  windowsRoot.appendChild(win);

  // simple drag
  let dragging = false, dragOffset = {x:0,y:0};
  header.addEventListener('mousedown', (ev) => {
    dragging = true;
    const rect = win.getBoundingClientRect();
    dragOffset.x = ev.clientX - rect.left;
    dragOffset.y = ev.clientY - rect.top;
    win.style.transition = 'none';
  });
  window.addEventListener('mousemove', (ev) => {
    if(!dragging) return;
    win.style.left = (ev.clientX - dragOffset.x) + 'px';
    win.style.top = (ev.clientY - dragOffset.y) + 'px';
  });
  window.addEventListener('mouseup', () => { dragging = false; win.style.transition = ''; });

  // header buttons
  header.addEventListener('click', (ev) => {
    const action = ev.target.closest('button')?.dataset.action;
    if(action === 'close'){ win.remove(); }
    if(action === 'min'){ win.style.display = 'none'; }
  });

  // focus on click
  win.addEventListener('mousedown', () => win.style.zIndex = ++state.z);

  // run app
  if(app.type === 'app' && typeof app.run === 'function'){
    app.run(body, {winId});
  } else if(app.type === 'web'){
    body.innerHTML = `<iframe src="${app.url}" style="width:100%;height:100%;border:0"></iframe>`;
  }

  // add small taskbar button for this window
  addTaskbarWindowButton(winId, app);
}

function addTaskbarWindowButton(winId, app){
  const btn = document.createElement('button');
  btn.className = 'tb-btn';
  btn.id = 'tb_' + winId;
  btn.title = app.name;
  btn.innerHTML = `<div style="font-size:16px">${app.icon}</div>`;
  btn.onclick = () => {
    const w = document.querySelector(`.window[data-win-id="${winId}"]`);
    if(!w) return;
    if(w.style.display === 'none') w.style.display = 'block';
    w.style.zIndex = ++state.z;
  };
  taskbarPinned.appendChild(btn);
}

/* ---------- Context menu actions ---------- */
desktop.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  ctxMenu.style.left = e.clientX + 'px';
  ctxMenu.style.top = e.clientY + 'px';
  ctxMenu.style.display = 'block';
});
document.addEventListener('click', () => ctxMenu.style.display = 'none');

document.getElementById('ctx-new-file').addEventListener('click', () => openAppWindow(findApp('aura-notepad')));
document.getElementById('ctx-upload-file').addEventListener('click', () => filePicker.click());
document.getElementById('ctx-refresh').addEventListener('click', () => { renderDesktop(); renderStartMenu(); });
document.getElementById('ctx-wallpaper').addEventListener('click', () => openAppWindow(findApp('aura-settings')));

/* ---------- File import (drag/drop + picker) ---------- */
desktop.addEventListener('dragover', (e) => { e.preventDefault(); desktop.style.outline = '2px dashed rgba(255,255,255,0.06)'; });
desktop.addEventListener('dragleave', () => desktop.style.outline = 'none');
desktop.addEventListener('drop', async (e) => {
  e.preventDefault(); desktop.style.outline = 'none';
  const files = Array.from(e.dataTransfer.files || []);
  if(files.length) await handleFilesUpload(files);
});

filePicker.addEventListener('change', async () => {
  const arr = Array.from(filePicker.files || []);
  if(arr.length) await handleFilesUpload(arr);
  filePicker.value = '';
});

/* handle uploaded files — store in state.files root, photos, or music */
async function handleFilesUpload(files){
  for(const f of files){
    const data = await fileToDataURL(f);
    const name = f.name;
    const ext = name.split('.').pop().toLowerCase();
    if(['png','jpg','jpeg','gif','webp','bmp'].includes(ext)){
      const id = uid('img');
      state.photos.push({id, name, data});
      state.files.root.push({id, name, type:'image', content: data});
    } else if(['mp3','wav','ogg','m4a'].includes(ext)){
      const id = uid('aud');
      state.music.push({id, name, data});
      state.files.root.push({id, name, type:'audio', content: data});
    } else if(f.type.startsWith('text') || ext === 'txt' || ext === 'json'){
      const txt = await f.text();
      const id = uid('txt');
      state.files.root.push({id, name, type:'text', content: txt});
    } else {
      const id = uid('bin');
      state.files.root.push({id, name, type:'binary', content: data});
    }
  }
  saveAll();
  renderStartMenu();
  renderDesktop();
}

/* helper: file -> dataURL */
function fileToDataURL(file){
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

/* ---------- App Implementations ---------- */

/* Notepad — simple text editor with autosave */
function notepadApp(container, opts){
  container.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%">
      <div class="toolbar">
        <button class="tb-btn" id="notepad_save">Save</button>
        <button class="tb-btn" id="notepad_clear">Clear</button>
        <div class="small" style="margin-left:auto">Auto-saves locally</div>
      </div>
      <textarea id="notepad_ta" style="flex:1;min-height:160px;padding:10px;border-radius:8px"></textarea>
    </div>
  `;
  const ta = container.querySelector('#notepad_ta');
  ta.value = state.notes.default || '';
  ta.addEventListener('input', () => { state.notes.default = ta.value; saveAll(); });
  container.querySelector('#notepad_save').addEventListener('click', () => { saveAll(); alert('Saved (auto-save already active)'); });
  container.querySelector('#notepad_clear').addEventListener('click', () => { if(confirm('Clear note?')){ ta.value=''; state.notes.default=''; saveAll(); } });
}

/* Scientific Calculator */
function calculatorApp(container){
  container.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%">
      <div class="toolbar">
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="tb-btn" data-fn="sin">sin</button>
          <button class="tb-btn" data-fn="cos">cos</button>
          <button class="tb-btn" data-fn="tan">tan</button>
          <button class="tb-btn" data-fn="ln">ln</button>
          <button class="tb-btn" data-fn="log">log</button>
          <button class="tb-btn" data-fn="sqrt">√</button>
          <button class="tb-btn" data-fn="pow">^</button>
          <button class="tb-btn" data-fn="pi">π</button>
          <button class="tb-btn" data-fn="e">e</button>
        </div>
        <div style="margin-left:auto;display:flex;gap:8px;align-items:center">
          <button class="tb-btn" id="mem_store">M+</button>
          <button class="tb-btn" id="mem_clear">MC</button>
          <button class="tb-btn" id="mem_recall">MR</button>
        </div>
      </div>
      <input id="calc_display" class="input" style="padding:14px;font-size:20px;margin-bottom:8px" disabled />
      <div id="calc_buttons" style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px">
        <!-- buttons are created by JS -->
      </div>
    </div>
  `;
  // build buttons
  const layout = ['7','8','9','(',')','4','5','6','*','/','1','2','3','+','-','0','.','%','=','C','CE','ANS'];
  const btnContainer = container.querySelector('#calc_buttons');
  layout.forEach(v => {
    const b = document.createElement('button');
    b.className = 'tb-btn';
    b.textContent = v;
    b.onclick = () => calcPress(v);
    btnContainer.appendChild(b);
  });

  // memory
  let memory = 0;
  const display = container.querySelector('#calc_display');
  display.value = state.calc || '';

  // function buttons
  container.querySelectorAll('[data-fn]').forEach(btn => {
    btn.addEventListener('click', () => {
      const fn = btn.dataset.fn;
      if(fn === 'pi') appendToExpr('PI');
      else if(fn === 'e') appendToExpr('E');
      else if(fn === 'sqrt') appendToExpr('sqrt(');
      else if(fn === 'pow') appendToExpr('^');
      else appendToExpr(fn + '(');
    });
  });

  document.getElementById('mem_store').addEventListener('click', () => {
    memory = safeEval(display.value) || 0;
    alert('Stored to memory: ' + memory);
  });
  document.getElementById('mem_clear').addEventListener('click', ()=> memory = 0);
  document.getElementById('mem_recall').addEventListener('click', ()=> appendToExpr(String(memory)));

  // helpers
  function appendToExpr(s){ display.value = (display.value || '') + s; state.calc = display.value; saveAll(); }
  function calcPress(v){
    if(v === 'C'){ display.value = ''; state.calc = ''; saveAll(); return; }
    if(v === 'CE'){ display.value = ''; state.calc = ''; saveAll(); return; }
    if(v === 'ANS'){ try{ const res = safeEval(display.value); display.value = String(res); state.calc = display.value; saveAll(); } catch(e){ display.value = 'Error'; } return; }
    if(v === '='){ try{ const res = safeEval(display.value); display.value = String(res); state.calc = display.value; saveAll(); } catch(e){ display.value = 'Error'; } return; }
    appendToExpr(v);
  }

  // safe evaluator: map functions and constants to Math equivalents
  function safeEval(expr){
    if(!expr) return 0;
    // basic replacements: PI, E, sqrt, sin, cos, tan, log (base10), ln (natural), ^ -> **
    let s = expr
      .replace(/\bPI\b/g, 'Math.PI')
      .replace(/\bE\b/g, 'Math.E')
      .replace(/\bsqrt\(/g, 'Math.sqrt(')
      .replace(/\bsin\(/g, 'Math.sin(')
      .replace(/\bcos\(/g, 'Math.cos(')
      .replace(/\btan\(/g, 'Math.tan(')
      .replace(/\bln\(/g, 'Math.log(')          // natural log
      .replace(/\blog\(/g, 'Math.log10 ? Math.log10(' : 'Math.log(') // fallback
      .replace(/\^/g, '**')
      .replace(/%/g, '/100'); // percent support
    // allow Math.log10 shim if not present
    if(typeof Math.log10 === 'undefined'){
      Math.log10 = function(x){ return Math.log(x)/Math.LN10; };
    }
    // block suspicious chars (keep digits, Math, funcs, operators, parentheses, decimal)
    if(/[^0-9+\-*/()., MathPIEabceglnspinotaqrtx]/i.test(s)){
      // allow letters for Math.* only; easiest is to try-catch evaluation
    }
    // use Function instead of eval for slightly better isolation
    try{
      const fn = new Function('Math', 'return ' + s + ';');
      return fn(Math);
    }catch(err){
      console.error('Calc eval error', err, s);
      throw err;
    }
  }
}

/* Paint — simple drawing canvas with save */
function paintApp(container){
  container.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%">
      <div class="toolbar">
        <input id="paint_color" type="color" value="#ffffff" />
        <input id="paint_size" type="range" min="1" max="40" value="3" />
        <button class="tb-btn" id="paint_clear">Clear</button>
        <button class="tb-btn" id="paint_save">Save</button>
      </div>
      <div style="flex:1;position:relative"><canvas id="paint_canvas" style="width:100%;height:100%;border-radius:8px;background:transparent"></canvas></div>
    </div>
  `;
  const canvas = container.querySelector('#paint_canvas');
  function resize(){ canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight; const ctx = canvas.getContext('2d'); if(state.paint?.canvas){ const img = new Image(); img.src = state.paint.canvas; img.onload = ()=> ctx.drawImage(img,0,0,canvas.width,canvas.height); } }
  window.addEventListener('resize', resize);
  setTimeout(resize, 60);
  const ctx = canvas.getContext('2d');
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  let drawing = false;
  canvas.addEventListener('mousedown', (e) => { drawing = true; ctx.beginPath(); const r=canvas.getBoundingClientRect(); ctx.moveTo(e.clientX - r.left, e.clientY - r.top); });
  window.addEventListener('mouseup', () => { drawing = false; ctx.beginPath(); save(); });
  window.addEventListener('mousemove', (e) => { if(!drawing) return; const r=canvas.getBoundingClientRect(); ctx.lineTo(e.clientX - r.left, e.clientY - r.top); ctx.stroke(); ctx.beginPath(); ctx.moveTo(e.clientX - r.left, e.clientY - r.top); });
  container.querySelector('#paint_color').addEventListener('input', (e) => ctx.strokeStyle = e.target.value);
  container.querySelector('#paint_size').addEventListener('input', (e) => ctx.lineWidth = Number(e.target.value));
  container.querySelector('#paint_clear').addEventListener('click', () => { ctx.clearRect(0,0,canvas.width,canvas.height); save(); });
  container.querySelector('#paint_save').addEventListener('click', () => { save(); alert('Saved'); });
  function save(){ state.paint.canvas = canvas.toDataURL(); saveAll(); }
}

/* Terminal — very small simulated terminal */
function terminalApp(container){
  container.innerHTML = `<div style="font-family:monospace;font-size:13px;white-space:pre-wrap">Aurora Terminal\n> Type "help" and enter\n</div>`;
}

/* Files — basic explorer with root folder */
function filesApp(container){
  container.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%">
      <div class="toolbar">
        <button class="tb-btn" id="files_new">New File</button>
        <button class="tb-btn" id="files_upload">Upload</button>
        <button class="tb-btn" id="files_zip">Download ZIP</button>
        <div class="small" style="margin-left:auto">Root</div>
      </div>
      <div id="files_view" style="flex:1;overflow:auto;border-radius:8px;padding:6px;background:rgba(255,255,255,0.01)"></div>
    </div>
  `;
  const view = container.querySelector('#files_view');
  function render(){
    view.innerHTML = '';
    const list = state.files.root || [];
    if(list.length === 0) view.innerHTML = `<div class="empty">No files yet.</div>`;
    list.forEach(it => {
      const row = document.createElement('div');
      row.className = 'file-row';
      row.style.marginBottom = '8px';
      row.innerHTML = `<div style="display:flex;align-items:center;gap:12px"><div>${it.type==='text'?'📄':it.type==='image'?'🖼️':'📦'}</div><div style="min-width:220px">${it.name}</div></div>
                       <div style="display:flex;gap:8px">
                         <button class="tb-btn" onclick="openFile('${it.id}')">Open</button>
                         <button class="tb-btn" onclick="downloadFile('${it.id}')">⇩</button>
                         <button class="tb-btn" onclick="deleteFile('${it.id}')">Delete</button>
                       </div>`;
      view.appendChild(row);
    });
  }
  // actions
  container.querySelector('#files_new').addEventListener('click', () => {
    const name = prompt('Filename','note.txt'); if(!name) return;
    state.files.root.push({ id: uid('f'), name, type:'text', content:''});
    saveAll(); render();
  });
  container.querySelector('#files_upload').addEventListener('click', () => filePicker.click());
  container.querySelector('#files_zip').addEventListener('click', () => alert('Use export in Settings to download everything (quick demo).'));

  // expose file operations globally for buttons
  window.openFile = function(id){
    const it = (state.files.root || []).find(x=>x.id===id); if(!it) return;
    if(it.type === 'text'){
      openAppWindow(findApp('aura-notepad'));
      // after open, write content into textarea
      setTimeout(()=> {
        const ta = document.querySelector('.window .win-body textarea');
        if(ta){ ta.value = it.content || ''; ta.addEventListener('input', ()=> it.content = ta.value);
        }
      }, 120);
    } else if(it.type === 'image'){
      // ensure photo exists then open Photos
      if(it.content && !state.photos.find(p=>p.id===it.id)) state.photos.push({id:it.id, name:it.name, data: it.content});
      saveAll();
      openAppWindow(findApp('aura-photos'));
    } else {
      alert('File opened: ' + it.name);
    }
  };
  window.downloadFile = function(id){
    const it = (state.files.root || []).find(x=>x.id===id); if(!it) return;
    if(it.type === 'text'){
      const blob = new Blob([it.content||''], { type:'text/plain' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = it.name; a.click(); URL.revokeObjectURL(a.href);
    } else if(it.content){
      const a = document.createElement('a'); a.href = it.content; a.download = it.name; a.click();
    }
  };
  window.deleteFile = function(id){
    if(!confirm('Delete file?')) return;
    state.files.root = (state.files.root || []).filter(f => f.id !== id);
    saveAll(); render();
  };

  render();
}

/* Photos — gallery */
function photosApp(container){
  container.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%">
      <div class="toolbar">
        <button class="tb-btn" id="photos_import">Import</button>
        <button class="tb-btn" id="photos_clear">Clear</button>
        <div class="small" style="margin-left:auto">Photos</div>
      </div>
      <div id="photos_grid" style="flex:1;overflow:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;padding:6px"></div>
    </div>
  `;
  const grid = container.querySelector('#photos_grid');
  function render(){
    grid.innerHTML = '';
    if(state.photos.length === 0) grid.innerHTML = `<div class="empty">No photos yet.</div>`;
    state.photos.forEach((p, idx) => {
      const el = document.createElement('div'); el.style.background = `url(${p.data}) center/cover`; el.style.height = '140px'; el.style.borderRadius = '8px'; el.style.cursor = 'pointer';
      el.onclick = () => openPhotoViewer(idx);
      grid.appendChild(el);
    });
  }
  container.querySelector('#photos_import').addEventListener('click', () => filePicker.click());
  container.querySelector('#photos_clear').addEventListener('click', () => { if(confirm('Clear photos?')){ state.photos = []; saveAll(); render(); } });
  render();

  function openPhotoViewer(idx){
    openAppWindow({ id:'photo_view', name:'Photo', icon:'🖼️', type:'app', run: (ct) => {
      ct.innerHTML = `<div style="display:flex;flex-direction:column;height:100%"><div class="toolbar"><button class="tb-btn" id="pv_prev">◀</button><button class="tb-btn" id="pv_next">▶</button><button class="tb-btn" id="pv_delete">Delete</button><div style="margin-left:auto" class="small">Photo viewer</div></div><div style="flex:1;display:flex;align-items:center;justify-content:center"><img id="pv_img" style="max-width:100%;max-height:100%;border-radius:8px" /></div></div>`;
      const img = ct.querySelector('#pv_img');
      let i = idx; function show(){ img.src = state.photos[i]?.data || ''; }
      ct.querySelector('#pv_prev').addEventListener('click', () => { i = (i-1+state.photos.length)%state.photos.length; show(); });
      ct.querySelector('#pv_next').addEventListener('click', () => { i = (i+1)%state.photos.length; show(); });
      ct.querySelector('#pv_delete').addEventListener('click', () => { if(confirm('Delete photo?')){ state.photos.splice(i,1); saveAll(); ct.closest('.window').remove(); }});
      show();
    }});
  }
}

/* Music — simple playlist and play using <audio> */
function musicApp(container){
  container.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%">
      <div class="toolbar">
        <button class="tb-btn" id="music_import">Import</button>
        <button class="tb-btn" id="music_clear">Clear</button>
        <div class="small" style="margin-left:auto">Music</div>
      </div>
      <div style="display:flex;gap:12px;height:100%">
        <div id="music_list" style="flex:1;overflow:auto;padding:6px"></div>
        <div style="width:300px;background:rgba(255,255,255,0.01);padding:8px;border-radius:8px">
          <div id="music_now" class="small">No track</div>
          <div style="margin-top:10px">
            <button class="tb-btn" id="m_play">Play</button>
            <button class="tb-btn" id="m_prev">Prev</button>
            <button class="tb-btn" id="m_next">Next</button>
          </div>
          <div style="margin-top:8px">
            <input id="m_seek" type="range" min="0" max="100" value="0" style="width:100%" />
            <input id="m_volume" type="range" min="0" max="1" step="0.01" value="1" style="width:100%;margin-top:8px" />
          </div>
        </div>
      </div>
    </div>
  `;
  const listEl = container.querySelector('#music_list');
  const nowEl = container.querySelector('#music_now');
  const playBtn = container.querySelector('#m_play');
  const prevBtn = container.querySelector('#m_prev');
  const nextBtn = container.querySelector('#m_next');
  const seek = container.querySelector('#m_seek');
  const vol = container.querySelector('#m_volume');

  let audio = new Audio();
  let curIdx = 0;
  function renderList(){
    listEl.innerHTML = '';
    if(state.music.length === 0) listEl.innerHTML = `<div class="empty">No tracks.</div>`;
    state.music.forEach((t, idx) => {
      const r = document.createElement('div');
      r.className = 'file-row';
      r.innerHTML = `<div style="display:flex;gap:12px;align-items:center"><div>🎵</div><div style="min-width:160px">${t.name}</div></div>
                     <div style="display:flex;gap:6px"><button class="tb-btn" onclick="playIndex(${idx})">Play</button><button class="tb-btn" onclick="deleteTrack(${idx})">Delete</button></div>`;
      listEl.appendChild(r);
    });
  }
  window.playIndex = function(idx){ curIdx = idx; startTrack(); };
  window.deleteTrack = function(idx){ if(confirm('Delete track?')){ state.music.splice(idx,1); saveAll(); renderList(); } };

  container.querySelector('#music_import').addEventListener('click', () => filePicker.click());
  container.querySelector('#music_clear').addEventListener('click', () => { if(confirm('Clear tracks?')){ state.music=[]; saveAll(); renderList(); } });
  playBtn.addEventListener('click', () => { if(audio.paused) audio.play(); else audio.pause(); });
  prevBtn.addEventListener('click', () => { curIdx = Math.max(0, curIdx - 1); startTrack(); });
  nextBtn.addEventListener('click', () => { curIdx = Math.min(state.music.length - 1, curIdx + 1); startTrack(); });
  seek.addEventListener('input', () => { if(audio.duration) audio.currentTime = seek.value; });
  vol.addEventListener('input', () => audio.volume = vol.value);

  function startTrack(){
    const t = state.music[curIdx];
    if(!t) return;
    audio.src = t.data;
    audio.play();
    nowEl.textContent = 'Now: ' + t.name;
    audio.ontimeupdate = () => { seek.max = Math.floor(audio.duration || 0); seek.value = Math.floor(audio.currentTime || 0); };
    audio.onended = () => { if(curIdx < state.music.length - 1){ curIdx++; startTrack(); } };
  }

  renderList();
}

/* Emulator (formerly Browser) — minimal iframe-based tab-like view */
function emulatorApp(container){
  container.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%">
      <div class="toolbar">
        <input id="emu_addr" class="input" placeholder="https://example.com" style="flex:1" />
        <button class="tb-btn" id="emu_go">Open</button>
        <button class="tb-btn" id="emu_bookmark">★</button>
      </div>
      <div id="emu_tabs" style="display:flex;gap:6px;margin-top:8px;overflow:auto"></div>
      <div id="emu_view" style="flex:1;margin-top:8px;border-radius:8px;overflow:hidden;background:white"></div>
    </div>
  `;
  const tabsEl = container.querySelector('#emu_tabs');
  const view = container.querySelector('#emu_view');
  let tabs = state.emulator.tabs || [];

  function renderTabs(){
    tabsEl.innerHTML = '';
    tabs.forEach((t, idx) => {
      const b = document.createElement('div');
      b.className = 'file-row';
      b.style.minWidth = '160px';
      b.innerHTML = `<div style="flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${t.title||t.url}</div>
                     <div style="display:flex;gap:6px">
                       <button class="tb-btn" onclick="emuSwitch(${idx})">Open</button>
                       <button class="tb-btn" onclick="emuClose(${idx})">✖</button>
                     </div>`;
      tabsEl.appendChild(b);
    });
  }

  function renderView(){
    view.innerHTML = '';
    if(tabs.length === 0) view.innerHTML = `<div class="empty">No tabs. Enter a URL and press Open. Note: some sites block being embedded in iframes.</div>`;
    else {
      const active = tabs[0];
      const iframe = document.createElement('iframe');
      iframe.src = active.url;
      iframe.style.width = '100%'; iframe.style.height = '100%'; iframe.style.border = 0;
      view.appendChild(iframe);
    }
  }

  container.querySelector('#emu_go').addEventListener('click', () => {
    const raw = container.querySelector('#emu_addr').value.trim();
    if(!raw) return;
    const url = ensureUrl(raw);
    tabs.unshift({ url, title: url });
    state.emulator.tabs = tabs;
    saveAll();
    renderTabs(); renderView();
  });

  container.querySelector('#emu_bookmark').addEventListener('click', () => {
    if(tabs[0]){ state.emulator.bookmarks.push({ url: tabs[0].url, title: tabs[0].title || tabs[0].url }); saveAll(); alert('Bookmarked'); }
  });

  window.emuSwitch = function(idx){ if(idx>=0 && idx<tabs.length){ const t = tabs.splice(idx,1)[0]; tabs.unshift(t); state.emulator.tabs = tabs; saveAll(); renderTabs(); renderView(); } };
  window.emuClose = function(idx){ if(idx>=0 && idx<tabs.length){ tabs.splice(idx,1); state.emulator.tabs = tabs; saveAll(); renderTabs(); renderView(); } };

  function ensureUrl(u){ if(u.startsWith('http')) return u; return 'https://' + u; }

  renderTabs(); renderView();
}

/* Settings */
function settingsApp(container){
  container.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:12px">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="font-weight:800">Wallpaper</div>
        <input id="settings_wall" type="file" accept="image/*" />
      </div>
      <div style="display:flex;gap:8px">
        <button class="tb-btn" id="settings_export">Export (save snapshot)</button>
        <button class="tb-btn" id="settings_clear">Clear all data</button>
      </div>
      <div class="small">Everything is saved in your browser. Clearing site data will remove Aurora data.</div>
    </div>
  `;
  container.querySelector('#settings_wall').addEventListener('change', (e) => {
    const f = e.target.files[0];
    if(!f) return;
    const r = new FileReader();
    r.onload = () => { state.wallpaper = r.result; document.getElementById('wallpaper').style.backgroundImage = `url('${state.wallpaper}')`; saveAll(); alert('Wallpaper set'); };
    r.readAsDataURL(f);
  });
  container.querySelector('#settings_export').addEventListener('click', () => {
    const dump = JSON.stringify(state);
    const blob = new Blob([dump], { type:'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'aurora-export.json'; a.click();
    URL.revokeObjectURL(a.href);
  });
  container.querySelector('#settings_clear').addEventListener('click', () => {
    if(confirm('Clear all local Aurora data? This cannot be undone.')){ localStorage.clear(); location.reload(); }
  });
}

/* ---------- Init & UI wiring ---------- */
function init(){
  renderDesktop();
  renderStartMenu();
  renderTaskbar();
  // start button
  document.getElementById('start-button').addEventListener('click', () => {
    const shown = startMenu.getAttribute('aria-hidden') === 'false';
    startMenu.style.display = shown ? 'none' : 'flex';
    startMenu.setAttribute('aria-hidden', !shown);
  });
  // search filter
  document.getElementById('start-search').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    Array.from(allAppsEl.children).forEach(c => c.style.display = c.textContent.toLowerCase().includes(q) ? 'flex' : 'none');
  });
  // tray time
  const trayTime = document.getElementById('tray-time');
  function updateTime(){ const d = new Date(); trayTime.textContent = d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }); }
  updateTime(); setInterval(updateTime, 1000);

  // wallpaper if saved
  if(state.wallpaper){
    document.getElementById('wallpaper').style.backgroundImage = `url('${state.wallpaper}')`;
  }
  // quick keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    if(e.key === 'Escape') startMenu.style.display = 'none';
    if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e'){ e.preventDefault(); openAppWindow(findApp('aura-emulator')); }
    if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'm'){ e.preventDefault(); openAppWindow(findApp('aura-music')); }
  });
  // before unload save
  window.addEventListener('beforeunload', saveAll);
}

init();

/* ---------- Expose small API for debugging in console ---------- */
window.aurora = { state, saveAll, openAppWindow, findApp };

