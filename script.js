// --- CLASS CODE ---
const classCodeScreen = document.getElementById('class-code-screen');
const mainScreen = document.getElementById('main-screen');
const codeInputs = document.querySelectorAll('.code-input');
const classCodeButton = document.getElementById('class-code-button');
const codeMessage = document.getElementById('code-message');

// --- URL LAUNCHER ---
const urlInput = document.getElementById('url-input');
const urlButton = document.getElementById('url-button');
const mainIframe = document.getElementById('main-iframe');

// --- SETTINGS ---
const settingsButton = document.getElementById('settings-button');
const settingsPanel = document.getElementById('settings-panel');
const gradientColorPicker = document.getElementById('gradient-color');
const bgSelect = document.getElementById('bg-select');

// --- GAME BUTTONS ---
const gameButtons = document.querySelectorAll('.game-button');

// --- SETTINGS PANEL TOGGLE ---
settingsButton.addEventListener('click', () => {
  settingsPanel.classList.toggle('open');
});

// --- CLASS CODE INPUTS ---
codeInputs.forEach((input, idx) => {
  input.addEventListener('input', () => {
    if(input.value.length>0 && idx < codeInputs.length-1) codeInputs[idx+1].focus();
  });
  input.addEventListener('keydown', e=>{
    if(e.key==='Backspace' && input.value==='' && idx>0) codeInputs[idx-1].focus();
  });
});

// --- CHECK CLASS CODE ---
function checkClassCode() {
  let code = '';
  codeInputs.forEach(i=>code+=i.value);
  if(code.toLowerCase()==='sigma'){
    codeMessage.textContent='✅ Code accepted!';
    classCodeScreen.style.opacity=0;
    setTimeout(()=>{
      classCodeScreen.style.display='none';
      mainScreen.style.display='flex';
      settingsButton.style.display='block';
      mainScreen.style.opacity=1;
      urlInput.focus();
    },500);
  } else {
    codeMessage.textContent='❌ Incorrect code!';
    codeInputs.forEach(i=>i.value='');
    codeInputs[0].focus();
  }
}

classCodeButton.addEventListener('click', checkClassCode);
codeInputs.forEach(i=>i.addEventListener('keypress', e=>{
  if(e.key==='Enter'){ e.preventDefault(); checkClassCode(); }
}));

// --- LAUNCH URL ---
function launchURL(){
  let url = urlInput.value.trim();
  if(!url) return;
  if(!/^https?:\/\//i.test(url)) url='https://'+url;
  mainIframe.src=url;
  urlInput.value='';
}

urlButton.addEventListener('click', launchURL);
urlInput.addEventListener('keypress', e=>{
  if(e.key==='Enter'){ e.preventDefault(); launchURL(); }
});

// --- SETTINGS PANEL FUNCTIONALITY ---
gradientColorPicker.addEventListener('input',()=>{
  document.body.style.background = gradientColorPicker.value;
});
bgSelect.addEventListener('change',()=>{
  const val = bgSelect.value;
  if(val){
    document.body.style.backgroundImage=`url('./images/${val}')`;
    document.body.style.backgroundSize='cover';
    document.body.style.backgroundBlendMode='overlay';
  } else document.body.style.backgroundImage='';
});

// --- GAME BUTTONS ---
gameButtons.forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const url=btn.getAttribute('data-url');
    urlInput.value=url;
    launchURL();
  });
});

// --- IFRAME REDIRECT WARNING ---
mainIframe.addEventListener('load', ()=>{
  try{
    const iframeWindow = mainIframe.contentWindow;
    iframeWindow.open = function(url,name,specs){
      const proceed = confirm(`⚠️ The page inside the iframe is trying to open a new window:\n${url}\nDo you want to proceed?`);
      if(proceed) return window.open(url,name,specs);
      else return null;
    }
  }catch(e){
    console.log('Redirect override not available for cross-origin iframe');
  }
});
