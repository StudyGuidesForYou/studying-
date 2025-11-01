// Elements
const codeScreen = document.getElementById("class-code-screen");
const dashScreen = document.getElementById("dashboard-screen");
const codeInputs = document.querySelectorAll(".code-input");
const enterBtn = document.getElementById("enter-btn");

const warning = document.getElementById("redirect-warning");
const redirectText = document.getElementById("redirect-text");
const continueBtn = document.getElementById("continue-btn");
const cancelBtn = document.getElementById("cancel-btn");

const iframe = document.getElementById("game-frame");

let pendingURL = null;

// Auto move to next box
codeInputs.forEach((input, index) => {
  input.addEventListener("input", () => {
    if (input.value && index < codeInputs.length - 1) {
      codeInputs[index + 1].focus();
    }
  });
});

// Enter button
enterBtn.onclick = () => {
  codeScreen.classList.add("hidden");
  dashScreen.classList.remove("hidden");
};

// Game buttons
document.querySelectorAll(".game-btn").forEach(btn => {
  btn.addEventListener("click", () => askRedirect(btn.dataset.url));
});

// Custom launcher
document.getElementById("launch-btn").onclick = () => {
  const url = document.getElementById("custom-url").value.trim();
  if (url) askRedirect(url);
};

// Show redirect warning
function askRedirect(url) {
  pendingURL = url;
  redirectText.innerText = `You are about to be redirected to: ${url}`;
  warning.classList.remove("hidden");
}

// Continue to site
continueBtn.onclick = () => {
  warning.classList.add("hidden");
  dashScreen.classList.add("hidden");
  iframe.classList.remove("hidden");
  iframe.src = pendingURL;
};

// Cancel
cancelBtn.onclick = () => {
  warning.classList.add("hidden");
  pendingURL = null;
};
