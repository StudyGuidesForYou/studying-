// =========================
// CONFIG
// =========================
const CLASS_CODE = "SIGMA"; // <-- Change this if you want

// =========================
// DOM ELEMENTS
// =========================
const classScreen = document.getElementById("class-code-screen");
const classInput = document.getElementById("class-code-input");
const classBtn = document.getElementById("class-code-btn");
const classError = document.getElementById("class-code-error");

const launcher = document.getElementById("launcher");
const iframe = document.getElementById("iframe");
const urlInput = document.getElementById("url-input");
const launchBtn = document.getElementById("launch-btn");

const settingsPanel = document.getElementById("settings-panel");
const settingsBtn = document.getElementById("settings-btn");
const closeSettings = document.getElementById("close-settings");

const cursorUrl = document.getElementById("cursor-url");
const cursorApply = document.getElementById("cursor-apply");
const cursorImg = document.getElementById("custom-cursor");

const bgUrl = document.getElementById("bg-url");
const bgApply = document.getElementById("bg-apply");

const particlesCanvas = document.getElementById("particles");
const particlesCtx = particlesCanvas.getContext("2d");
const particlesToggle = document.getElementById("particles-toggle");

// =========================
// CLASS CODE LOGIN
// =========================
function checkCode() {
  if (classInput.value.trim().toUpperCase() === CLASS_CODE) {
    classScreen.classList.add("hidden");
    launcher.classList.remove("hidden");
  } else {
    classError.textContent = "Incorrect code.";
  }
}

classBtn.addEventListener("click", checkCode);
classInput.addEventListener("keydown", e => {
  if (e.key === "Enter") checkCode();
});

// =========================
// URL LAUNCHER
// =========================
launchBtn.addEventListener("click", () => {
  let url = urlInput.value.trim();
  if (!url.startsWith("http")) url = "https://" + url;
  iframe.src = url;
});

// =========================
// SETTINGS PANEL
// =========================
settingsBtn.addEventListener("click", () => {
  settingsPanel.classList.remove("hidden");
});

closeSettings.addEventListener("click", () => {
  settingsPanel.classList.add("hidden");
});

// =========================
// CUSTOM CURSOR
// =========================
cursorApply.addEventListener("click", () => {
  const url = cursorUrl.value.trim();
  if (!url) return;

  cursorImg.src = url;
  cursorImg.classList.remove("hidden");
  document.body.style.cursor = "none";

  document.addEventListener("mousemove", e => {
    cursorImg.style.left = e.pageX + "px";
    cursorImg.style.top = e.pageY + "px";
  });
});

// =========================
// BACKGROUND IMAGE
// =========================
bgApply.addEventListener("click", () => {
  const url = bgUrl.value.trim();
  if (!url) return;

  document.body.style.backgroundImage = `url(${url})`;
  document.body.style.backgroundSize = "cover";
  document.body.style.backgroundPosition = "center";
});

// =========================
// PARTICLES ENGINE
// =========================
let particles = [];
let enabled = true;

function resizeCanvas() {
  particlesCanvas.width = window.innerWidth;
  particlesCanvas.height = window.innerHeight;
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

function makeParticles() {
  particles = [];
  for (let i = 0; i < 60; i++) {
    particles.push({
      x: Math.random() * particlesCanvas.width,
      y: Math.random() * particlesCanvas.height,
      size: Math.random() * 3 + 1,
      speed: Math.random() * 0.6 + 0.3
    });
  }
}

function draw() {
  if (!enabled) return;

  particlesCtx.clearRect(0, 0, particlesCanvas.width, particlesCanvas.height);

  particles.forEach(p => {
    particlesCtx.beginPath();
    particlesCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    particlesCtx.fillStyle = "rgba(130,180,255,0.6)";
    particlesCtx.fill();

    p.y += p.speed;
    if (p.y > particlesCanvas.height) {
      p.y = -5;
      p.x = Math.random() * particlesCanvas.width;
    }
  });

  requestAnimationFrame(draw);
}

makeParticles();
draw();

particlesToggle.addEventListener("change", () => {
  enabled = particlesToggle.value === "on";
  if (enabled) draw();
});
