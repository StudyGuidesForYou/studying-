const classCodeScreen = document.getElementById('class-code-screen');
const mainScreen = document.getElementById('main-screen');
const codeInputs = document.querySelectorAll('.code-input');
const classCodeButton = document.getElementById('class-code-button');
const codeMessage = document.getElementById('code-message');

const urlInput = document.getElementById('url-input');
const urlButton = document.getElementById('url-button');
const mainIframe = document.getElementById('main-iframe');

// Auto-focus code inputs with backspace support
codeInputs.forEach((input, idx) => {
  input.addEventListener('input', () => {
    if (input.value.length > 0 && idx < codeInputs.length - 1) codeInputs[idx + 1].focus();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && input.value === '' && idx > 0) codeInputs[idx - 1].focus();
  });
});

// Check class code
function checkClassCode() {
  let enteredCode = '';
  codeInputs.forEach(input => enteredCode += input.value);

  if (enteredCode.toLowerCase() === 'sigma') {
    codeMessage.textContent = '✅ Code accepted!';
    codeMessage.style.color = '#00ff00';

    // Fade out class code screen
    classCodeScreen.classList.add('fade');

    // Show main screen with scale-in animation
    setTimeout(() => {
      mainScreen.style.display = 'flex';
      mainScreen.classList.add('scale-in');
      setTimeout(() => {
        mainScreen.classList.add('visible');
      }, 50);
    }, 700);

  } else {
    codeMessage.textContent = '❌ Incorrect code!';
    codeMessage.style.color = '#ff4d4d';
    codeInputs.forEach(input => input.value = '');
    codeInputs[0].focus();
  }
}

// Event listeners
classCodeButton.addEventListener('click', checkClassCode);
codeInputs.forEach(input => input.addEventListener('keypress', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    checkClassCode();
  }
}));

// URL launcher
function launchURL() {
  let url = urlInput.value.trim();
  if (!url) return;
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  mainIframe.src = url;
  urlInput.value = '';
}

urlButton.addEventListener('click', launchURL);
urlInput.addEventListener('keypress', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    launchURL();
  }
});
