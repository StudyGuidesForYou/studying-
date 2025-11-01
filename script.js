const classCodeScreen = document.getElementById('class-code-screen');
const mainScreen = document.getElementById('main-screen');
const codeInputs = document.querySelectorAll('.code-input');
const classCodeButton = document.getElementById('class-code-button');
const codeMessage = document.getElementById('code-message');

const urlInput = document.getElementById('url-input');
const urlButton = document.getElementById('url-button');
const mainIframe = document.getElementById('main-iframe');

// Auto-focus code inputs
codeInputs.forEach((input, idx) => {
  input.addEventListener('input', () => {
    if (input.value.length>0 && idx<codeInputs.length-1) codeInputs[idx+1].focus();
  });
  input.addEventListener('keydown', e=>{
    if(e.key==='Backspace' && input.value==='' && idx>0) codeInputs[idx-1].focus();
  });
});

// Class code validation
function checkClassCode() {
  let code='';
  codeInputs.forEach(i=>code+=i.value);
  if(code.toLowerCase()==='sigma'){
    codeMessage.textContent='✅ Code accepted!';
    classCodeScreen.style.transition='opacity 0.5s ease';
    classCodeScreen.style.opacity=0;
    setTimeout(()=>{
      classCodeScreen.style.display='none';
      mainScreen.style.display='flex';
      setTimeout(()=>mainScreen.style.opacity=1,50);
      urlInput.focus();
    },500);
  } else {
    codeMessage.textContent='❌ Incorrect code!';
    codeInputs.forEach(i=>i.value='');
    codeInputs[0].focus();
  }
}

classCodeButton.addEventListener('click', checkClassCode);
codeInputs.forEach(input=>input.addEventListener('keypress',e=>{
  if(e.key==='Enter'){e.preventDefault(); checkClassCode();}
}));

// Launch URL
function launchURL(){
  let url=urlInput.value.trim();
  if(!url) return;
  if(!/^https?:\/\//i.test(url)) url='https://'+url;
  mainIframe.src=url;
  urlInput.value='';
}

urlButton.addEventListener('click', launchURL);
urlInput.addEventListener('keypress', e=>{
  if(e.key==='Enter'){ e.preventDefault(); launchURL(); }
});
