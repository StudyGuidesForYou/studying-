// =============== CONFIG =============== //
const CORRECT_CODE = "SIGMA";   // <-- YOU CAN CHANGE THIS ANY TIME

// =============== DOM =============== //
const codeScreen = document.getElementById("class-code-screen");
const codeInput = document.getElementById("class-code-input");
const codeBtn = document.getElementById("class-code-btn");
const codeError = document.getElementById("class-code-error");

const launcher = document.getElementById("launcher");
const iframe = document.getElementById("iframe");
const launchBtn = document.getElementById("launch-btn");
const urlInput = document.getElementById("url-input");

const settings = document.getElementById("settings");
const settingsBtn = document.getElementById("settings-btn");
const closeSettings = document.getElementById("close-settings");

const cursorApply = document.getElementById("cursor-apply");
const cursorUrlInput = document.getElementById("cursor-url");
const cursorImg = document.getElementById("custom-cursor");

const bgApply = document.getElementById("bg-apply");
const bgUrlInput = document.getElementById("bg-url");

const particlesToggle = document.getElementById("particles-toggle");
const particlesCanvas = document.getElementById("particles");
const ctx = particlesCanvas.getContext("2d");

// =============== CLASS CODE LOGIN =============== //
function checkClassCode() {
  const value = codeInput.value.trim().toUpperCase();

  if (value === CORRECT_CODE) {
    codeScreen.classList.add("hidden");
    launcher.classList.remove("hidden");
    codeError.textContent = "";
  } else {
    codeError.textContent = "Incorrect code.";
  }
}

codeBtn.addEventListener("click", checkClassCode);
codeInput.addEventListener("keydown", e => {
  if (e.key === "Enter") checkClassCode();
});

// =============== URL LAUNCHER =============== //
launchBtn.addEventListener("click", () => {
  let url = urlInput.value.trim();

  if (!url.startsWith("http")) {
    url = "https://" + url;
  }

  iframe.src = url;
});

// =============== SETTINGS TOGGLE =============== //
settingsBtn.addEventListener("click", () => {
  settings.classList.remove("hidden");
});

closeSettings.addEventListener("click", () => {
  settings.classList.add("hidden");
});

// =============== CUSTOM CURSOR =============== //
cursorApply.addEventListener("click", () => {
  const url = cursorUrlInput.value.trim();
  if (!url) return;

  cursorImg.src = url;
  cursorImg.classList.remove("hidden");

  document.body.style.cursor = "none";

  document.addEventListener("mousemove", e => {
    cursorImg.style.left = e.pageX + "px";
    cursorImg.style.top = e.pageY + "px";
  });
});

// =============== BACKGROUND IMAGE =============== //
bgApply.addEventListener("click", () => {
  const url = bgUrlInput.value.trim();
  if (!url) return;

  document.body.style.backgroundImage = `url(${url})`;
  document.body.style.backgroundSize = "cover";
  document.body.style.backgroundPosition = "center";
});

// =============== PARTICLES =============== //
let particles = [];
let particlesOn = true;

function resizeCanvas() {
  particlesCanvas.width = window.innerWidth;
  particlesCanvas.height = window.innerHeight;
}
resizeCanvas();

window.addEventListener("resize", resizeCanvas);

function createParticles() {
  particles = [];
  for (let i = 0; i < 60; i++) {
    particles.push({
      x: Math.random() * particlesCanvas.width,
      y: Math.random() * particlesCanvas.height,
      size: Math.random() * 3 + 1,
      speed: Math.random() * 0.6 + 0.2
    });
  }
}

function drawParticles() {
  ctx.clearRect(0, 0, particlesCanvas.width, particlesCanvas.height);

  particles.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(130,180,255,0.6)";
    ctx.fill();

    p.y += p.speed;
    if (p.y > particlesCanvas.height) {
      p.y = -10;
      p.x = Math.random() * particlesCanvas.width;
    }
  });

  if (particlesOn) requestAnimationFrame(drawParticles);
}

createParticles();
drawParticles();

particlesToggle.addEventListener("change", () => {
  particlesOn = particlesToggle.value === "on";

  if (particlesOn) drawParticles();
});
