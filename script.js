const loginBox = document.getElementById("login-box");
const viewer = document.getElementById("viewer");
const iframe = document.getElementById("game-frame");

const enterBtn = document.getElementById("enter-btn");
const input = document.getElementById("code-input");

const closeBtn = document.getElementById("close-iframe");
const fullscreenBtn = document.getElementById("fullscreen-toggle");

let exitArea = null;

/* -------------------------
   LOAD PREBUILT GAMES
-------------------------- */
document.querySelectorAll(".game-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    openViewer(btn.dataset.url);
  });
});

/* -------------------------
   ENTER CODE BUTTON
-------------------------- */
enterBtn.addEventListener("click", () => {
  openViewer(input.value.trim());
});

/* -------------------------
   OPEN IFRAME VIEWER
-------------------------- */
function openViewer(url) {
  if (!url) return;

  iframe.src = url;
  loginBox.classList.add("hidden");
  viewer.classList.remove("hidden");
}

/* -------------------------
   CLOSE IFRAME
-------------------------- */
closeBtn.addEventListener("click", () => {
  viewer.classList.add("hidden");
  loginBox.classList.remove("hidden");
  iframe.src = "";
  removeFullscreen();
});

/* -------------------------
   FULLSCREEN TOGGLE
-------------------------- */
fullscreenBtn.addEventListener("click", () => {
  if (viewer.classList.contains("fullscreen")) {
    removeFullscreen();
  } else {
    applyFullscreen();
  }
});

function applyFullscreen() {
  viewer.classList.add("fullscreen");

  exitArea = document.createElement("div");
  exitArea.id = "exit-area";
  document.body.appendChild(exitArea);

  exitArea.addEventListener("click", removeFullscreen);
}

function removeFullscreen() {
  viewer.classList.remove("fullscreen");

  if (exitArea) {
    exitArea.remove();
    exitArea = null;
  }
}
