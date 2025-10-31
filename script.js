/* High-quality, offline-first site JS
   - class-code gate (code 'sigma')
   - polished UI transitions / sounds (WebAudio)
   - games modal: TicTacToe + Notes (localStorage)
*/

(() => {
  /* ---------- helpers ---------- */
  const el = sel => document.querySelector(sel);
  const els = sel => Array.from(document.querySelectorAll(sel));
  const toast = txt => {
    const t = el('#toast');
    t.textContent = txt; t.classList.remove('hidden');
    setTimeout(()=>t.classList.add('hidden'), 1600);
  };
  const playTone = (freq = 440, time = 0.08, type='sine') => {
    try {
      const ctx = window.__audioCtx || (window.__audioCtx = new (window.AudioContext || window.webkitAudioContext)());
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.value = 0.0001;
      o.connect(g); g.connect(ctx.destination);
      const now = ctx.currentTime;
      g.gain.exponentialRampToValueAtTime(0.08, now + 0.005);
      o.start(now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + time);
      o.stop(now + time + 0.02);
    } catch(e){ /* audio not available */ }
  };

  /* ---------- class code logic ---------- */
  const CODE = 'sigma';
  const codeBoxes = els('.code-box');
  const submitBtn = el('#submit-btn');
  const statusLine = el('#status-line');
  const codeRow = el('#code-row');
  const enterCard = el('.enter-card');

  // focus first
  codeBoxes[0].focus();

  // auto-advance & backspace
  codeBoxes.forEach((box, i) => {
    box.addEventListener('input', e => {
      box.value = box.value.replace(/[^a-zA-Z]/g, '').slice(0,1);
      if (box.value && i < codeBoxes.length - 1) codeBoxes[i+1].focus();
      checkFull();
    });
    box.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !box.value && i > 0) {
        codeBoxes[i-1].focus();
      } else if (e.key === 'Enter') {
        checkFull(true);
      }
    });
  });

  // paste btn
  el('#paste-btn').addEventListener('click', async () => {
    try {
      const txt = (await navigator.clipboard.readText()).trim().slice(0,5);
      for (let i=0;i<5;i++) codeBoxes[i].value = txt[i] || '';
      codeBoxes[4].focus();
      playTone(720,0.06,'triangle');
      checkFull(true);
    } catch(e){
      toast('Clipboard failed');
    }
  });

  el('#clear-btn').addEventListener('click', () => {
    codeBoxes.forEach(b=>b.value=''); codeBoxes[0].focus();
  });

  // check code and animate
  function checkFull(force=false) {
    const code = codeBoxes.map(b=>b.value || '').join('').toLowerCase();
    statusLine.textContent = '';
    if (code.length < 5 && !force) return;
    if (code === CODE) {
      // success
      statusLine.textContent = 'Correct!';
      statusLine.style.color = 'var(--success)';
      playTone(880,0.12,'sine');
      enterCard.style.transform = 'translateY(-10px) scale(.98)';
      setTimeout(()=>enterCard.style.opacity=0, 260);
      setTimeout(()=>openGamesScreen(), 550);
    } else {
      // wrong—shake
      statusLine.textContent = 'Incorrect code';
      statusLine.style.color = 'var(--danger)';
      codeRow.classList.add('shake');
      playTone(180,0.12,'sawtooth');
      setTimeout(()=>codeRow.classList.remove('shake'), 420);
      // clear quickly
      setTimeout(()=>{ codeBoxes.forEach(b=>b.value=''); codeBoxes[0].focus(); }, 420);
    }
  }

  submitBtn.addEventListener('click', ()=>checkFull(true));

  /* ---------- transition to games ---------- */
  const codeScreen = el('#code-screen');
  const gamesScreen = el('#games-screen');
  function openGamesScreen(){
    // hide code, show games
    codeScreen.classList.add('hidden');
    gamesScreen.classList.remove('hidden');
    gamesScreen.animate([{opacity:0, transform:'translateY(8px)'},{opacity:1, transform:'translateY(0)'}],{duration:400,easing:'cubic-bezier(.2,.9,.3,1)'});
    playTone(600,0.08,'triangle');
  }

  // back button
  el('#back-btn').addEventListener('click', ()=> {
    gamesScreen.classList.add('hidden');
    codeScreen.classList.remove('hidden');
    codeBoxes.forEach(b=>b.value=''); codeBoxes[0].focus();
  });

  // reset data
  el('#reset-data').addEventListener('click', ()=> {
    localStorage.removeItem('ttt-score');
    localStorage.removeItem('notes-content');
    toast('Local data cleared');
    renderTttScore();
  });

  /* ---------- modal system ---------- */
  const modal = el('#modal');
  const modalBody = el('#modal-body');
  const closeModal = el('#close-modal');
  closeModal.addEventListener('click', ()=> closeModalFn());
  function openModal(html) {
    modalBody.innerHTML = html;
    modal.classList.remove('hidden');
    setTimeout(()=> modal.classList.add('visible'), 30);
  }
  function closeModalFn(){
    modal.classList.add('hidden');
    setTimeout(()=> modalBody.innerHTML='', 250);
  }

  // card click handlers
  els('.game-card').forEach(card => {
    card.querySelector('.play-btn').addEventListener('click', () => {
      const id = card.dataset.game;
      if (id === 'tictactoe') openTicTacToe();
      if (id === 'notes') openNotes();
    });
  });

  /* ---------- Tic-Tac-Toe (simple AI) ---------- */
  const TTT_SCORE_KEY = 'ttt-score';
  function loadTttScore(){ return JSON.parse(localStorage.getItem(TTT_SCORE_KEY) || '{"win":0,"lose":0,"draw":0}'); }
  function saveTttScore(s){ localStorage.setItem(TTT_SCORE_KEY, JSON.stringify(s)); }
  function renderTttScore(){
    const s = loadTttScore();
    el('#ttt-score').textContent = `W:${s.win} L:${s.lose} D:${s.draw}`;
  }
  renderTttScore();

  function openTicTacToe(){
    const html = `
      <h2>Tic-Tac-Toe</h2>
      <p>You're X — go first.</p>
      <div class="ttt-board" id="ttt-board"></div>
      <div class="ttt-controls">
        <button id="ttt-reset" class="ghost">Reset</button>
        <div id="ttt-msg" style="margin-left:auto;color:var(--muted)"></div>
      </div>
    `;
    openModal(html);
    initTtt();
  }

  function initTtt(){
    const boardEl = el('#ttt-board');
    boardEl.innerHTML = '';
    const cells = [];
    for(let i=0;i<9;i++){
      const c = document.createElement('div');
      c.className='ttt-cell';
      c.dataset.i = i;
      boardEl.appendChild(c);
      cells.push(c);
    }
    let state = Array(9).fill(null); // X or O
    let turn = 'X';
    let done = false;
    const msgEl = el('#ttt-msg');

    function checkWin(s){
      const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
      for(const [a,b,c] of wins){
        if (s[a] && s[a] === s[b] && s[a] === s[c]) return s[a];
      }
      if (s.every(Boolean)) return 'D';
      return null;
    }

    function aiMove(){
      // simple AI: win if possible, block if necessary, else random
      // try win
      for(let i=0;i<9;i++){
        if (!state[i]) {
          const copy = state.slice(); copy[i]='O';
          if (checkWin(copy) === 'O') return i;
        }
      }
      // block
      for(let i=0;i<9;i++){
        if (!state[i]) {
          const copy = state.slice(); copy[i]='X';
          if (checkWin(copy) === 'X') return i;
        }
      }
      // center
      if (!state[4]) return 4;
      // random corner
      const corners = [0,2,6,8].filter(i=>!state[i]);
      if (corners.length) return corners[Math.floor(Math.random()*corners.length)];
      const empties = state.map((v,i)=>v?null:i).filter(n=>n!==null);
      return empties[Math.floor(Math.random()*empties.length)];
    }

    function commit(i, player){
      if (done || state[i]) return;
      state[i] = player;
      cells[i].textContent = player;
      const w = checkWin(state);
      if (w) {
        done = true;
        let score = loadTttScore();
        if (w === 'X') { msgEl.textContent = 'You win!'; score.win++; playTone(880,0.12,'sine'); }
        else if (w === 'O') { msgEl.textContent = 'You lose'; score.lose++; playTone(140,0.12,'sawtooth'); }
        else { msgEl.textContent = 'Draw'; score.draw++; playTone(320,0.08,'triangle'); }
        saveTttScore(score);
        renderTttScore();
      } else {
        if (player === 'X') {
          // AI turn
          turn = 'O';
          setTimeout(()=> {
            const ai = aiMove();
            commit(ai,'O');
            turn = 'X';
          }, 300 + Math.random()*300);
        }
      }
    }

    // click handlers
    cells.forEach((c,i)=> c.addEventListener('click', ()=> {
      if (done) return;
      commit(i,'X');
    }));

    el('#ttt-reset').addEventListener('click', ()=> {
      state = Array(9).fill(null); cells.forEach(c=>c.textContent=''); done=false; msgEl.textContent=''; playTone(520,0.06,'sine');
    });
  }

  /* ---------- Notebook (local notes) ---------- */
  function openNotes(){
    const saved = localStorage.getItem('notes-content') || '';
    const html = `
      <h2>Notebook</h2>
      <textarea id="notes-area" style="width:100%;height:240px;border-radius:10px;padding:12px;background:rgba(0,0,0,0.08);border:1px solid rgba(255,255,255,0.03);color:#fff"></textarea>
      <div style="display:flex;gap:8px;margin-top:10px">
        <button id="notes-save" class="play-btn">Save</button>
        <button id="notes-clear" class="ghost">Clear</button>
        <small style="margin-left:auto;color:var(--muted)">Saved locally</small>
      </div>
    `;
    openModal(html);
    const ta = el('#notes-area'); ta.value = saved;
    el('#notes-save').addEventListener('click', ()=> {
      localStorage.setItem('notes-content', ta.value);
      toast('Saved locally');
      playTone(720,0.06,'sine');
    });
    el('#notes-clear').addEventListener('click', ()=> { ta.value=''; localStorage.removeItem('notes-content'); toast('Cleared'); });
  }

  /* ---------- small particle background (canvas) ---------- */
  (function particles(){
    const c = el('#bg-canvas'); if(!c) return;
    const ctx = c.getContext('2d');
    let w,h,parts = [];
    function resize(){ w = c.width = innerWidth; h = c.height = innerHeight; parts = []; for(let i=0;i<60;i++) parts.push({x:Math.random()*w,y:Math.random()*h,r:1+Math.random()*2,dx:(Math.random()-0.5)*0.6,dy:(Math.random()-0.5)*0.6}); }
    function frame(){
      ctx.clearRect(0,0,w,h);
      parts.forEach(p=>{
        p.x += p.dx; p.y += p.dy;
        if (p.x<0) p.x = w; if (p.x>w) p.x = 0;
        if (p.y<0) p.y = h; if (p.y>h) p.y = 0;
        ctx.beginPath();
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
      });
      requestAnimationFrame(frame);
    }
    window.addEventListener('resize', resize);
    resize(); frame();
  })();

})();
