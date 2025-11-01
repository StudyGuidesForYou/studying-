// CLASS CODE SCREEN
const classCodeScreen = document.getElementById('class-code-screen');
const mainScreen = document.getElementById('main-screen');
const codeInputs = document.querySelectorAll('.code-input');
const classCodeButton = document.getElementById('class-code-button');
const codeMessage = document.getElementById('code-message');

// URL LAUNCHER
const urlInput = document.getElementById('url-input');
const urlButton = document.getElementById('url-button');
const mainIframe = document.getElementById('main-iframe');

// SETTINGS PANEL
const settingsButton = document.getElementById('settings-button');
const settingsPanel = document.getElementById('settings-panel');
const mainColorPicker = document.getElementById('main-color');
const gradientColorPicker = document.getElementById('gradient-color');
const bgImageInput = document.getElementById('bg-image');

// Toggle settings panel
settingsButton.addEventListener('click', () => {
  settingsPanel.classList.toggle('open');
});

// Auto-focus for code inputs
codeInputs.forEach((input, idx) => {
  input.addEventListener('input', () => {
    if(input.value.length > 0 && idx < codeInputs.length-1) codeInputs[idx+1].focus();
  });
  input.addEventListener('keydown', e => {
    if(e.key === 'Backspace' && input.value === '' && idx > 0) codeInputs[idx-1].focus();
  });
});

// CHECK CLASS CODE
function checkClassCode() {
  let code = '';
  codeInputs.forEach(i => code += i.value);
  if(code.toLowerCase() === 'sigma'){
    codeMessage.textContent = '✅ Code accepted!';
    classCodeScreen.style.opacity = 0;
    setTimeout(()=>{
      classCodeScreen.style.display = 'none';
      mainScreen.style.display = 'flex';
      settingsButton.style.display = 'block'; // show settings button
      setTimeout(()=>mainScreen.style.opacity=1,50);
      urlInput.focus();
    },500);
  } else {
    codeMessage.textContent = '❌ Incorrect code!';
    codeInputs.forEach(i=>i.value='');
    codeInputs[0].focus();
  }
}

// EVENTS
classCodeButton.addEventListener('click', checkClassCode);
codeInputs.forEach(input=>{
  input.addEventListener('keypress', e=>{
    if(e.key==='Enter'){ e.preventDefault(); checkClassCode(); }
  });
});

// LAUNCH URL
function launchURL(){
  let url = urlInput.value.trim();
  if(!url) return;
  if(!/^https?:\/\//i.test(url)) url='https://'+url;
  mainIframe.src = url;
  urlInput.value='';
}

urlButton.addEventListener('click', launchURL);
urlInput.addEventListener('keypress', e=>{
  if(e.key==='Enter'){ e.preventDefault(); launchURL(); }
});

// SETTINGS PANEL FUNCTIONALITY
mainColorPicker.addEventListener('input', () => {
  document.getElementById('aurora-bg').style.backgroundColor = mainColorPicker.value;
});

gradientColorPicker.addEventListener('input', () => {
  document.getElementById('aurora-bg').style.background = `linear-gradient(135deg, ${gradientColorPicker.value}, #12324a)`;
});

bgImageInput.addEventListener('change', () => {
  document.getElementById('aurora-bg').style.backgroundImage = `url(${bgImageInput.value})`;
});
