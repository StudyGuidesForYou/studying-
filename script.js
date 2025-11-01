// CLASS CODE AUTO-ADVANCE + CHECK
const chars = document.querySelectorAll(".code-char");
const classPage = document.getElementById("class-page");
const dash = document.getElementById("dashboard");
const submitBtn = document.getElementById("submit-code");
const error = document.getElementById("code-error");

chars.forEach((box, i) => {
  box.addEventListener("input", () => {
    if (box.value.length === 1 && i < chars.length - 1) {
      chars[i + 1].focus();
    }
  });
});

submitBtn.onclick = () => {
  let code = "";
  chars.forEach(c => code += c.value);

  if (code.toLowerCase() === "sigma") {
    classPage.style.display = "none";
    dash.style.display = "block";
  } else {
    error.textContent = "Incorrect code";
  }
};

// URL LAUNCHER
const launchBtn = document.getElementById("launch-btn");
const urlInput = document.getElementById("launch-url");
const iframe = document.getElementById("main-frame");

launchBtn.onclick = () => {
  launchURL();
};
urlInput.onkeydown = e => {
  if (e.key === "Enter") launchURL();
};

function launchURL() {
  let u = urlInput.value.trim();
  if (!u.startsWith("http")) u = "https://" + u;
  iframe.src = u;
}

// GAME BUTTONS LOAD URL
document.querySelectorAll(".game-btn").forEach(btn => {
  btn.onclick = () => {
    iframe.src = btn.dataset.url;
  };
});
