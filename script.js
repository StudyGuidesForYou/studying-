// DOM refs
const codeInputs = Array.from(document.querySelectorAll(".code-input"));
const enterBtn = document.getElementById("enter-code");
const classScreen = document.getElementById("class-screen");
const dashboard = document.getElementById("dashboard");
const dashContent = document.querySelector(".dash-content");
const urlInput = document.getElementById("url-input");
const launchBtn = document.getElementById("launch-btn");
const fullscreenBtn = document.getElementById("fullscreen-btn");
const iframeContainer = document.getElementById("iframe-container");
const iframe = document.getElementById("game-frame");
const gameBtns = Array.from(document.querySelectorAll(".game-btn"));

const CORRECT = "SIGMA";

// ---- class code inputs: forward, backspace, enter ----
codeInputs.forEach((inp, i) => {
  inp.addEventListener("input", e => {
    // only keep first char
    if (inp.value.length > 1) inp.value = inp.value[0];
    if (inp.value && i < codeInputs.length - 1) codeInputs[i+1].focus();
  });

  inp.addEventListener("keydown", e => {
    if (e.key === "Backspace") {
      if (!inp.value && i > 0) {
        codeInputs[i-1].focus();
      }
    }
    if (e.key === "Enter") {
      submitCode();
    }
  });
});

// submit
enterBtn.addEventListener("click", submitCode);
function submitCode() {
  const code = codeInputs.map(i => (i.value || "").toUpperCase()).join("");
  if (code === CORRECT) {
    classScreen.classList.add("hidden");
    dashboard.classList.remove("hidden");
    // focus url
    setTimeout(()=> urlInput.focus(), 220);
  } else {
    // gentle shake feedback
    codeInputs.forEach(i => i.animate([{transform:'translateX(0)'},{transform:'translateX(-6px)'},{transform:'translateX(6px)'},{transform:'translateX(0)'}],{duration:220}));
  }
}

// ---- open URL in iframe ----
function openURL(raw){
  if (!raw) return;
  let url = raw.trim();
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  iframe.src = url;
}
launchBtn.addEventListener("click", ()=> openURL(urlInput.value));
urlInput.addEventListener("keydown", e => { if (e.key === "Enter") openURL(urlInput.value); });

// game buttons
gameBtns.forEach(b => b.addEventListener("click", () => {
  const url = b.dataset.url;
  if (!url) return;
  urlInput.value = url;
  openURL(url);
}));

// ---- fullscreen toggle (button or Esc) ----
let isFs = false;
fullscreenBtn.addEventListener("click", toggleFS);
function toggleFS(){
  isFs = !isFs;
  iframeContainer.classList.toggle("fullscreen", isFs);
  fullscreenBtn.textContent = isFs ? "Exit Fullscreen" : "Fullscreen";
  // prevent page scroll when in FS
  document.documentElement.style.overflow = isFs ? "hidden" : "";
  document.body.style.overflow = isFs ? "hidden" : "";
}
// only Esc and button toggle; clicking outside does NOT exit
document.addEventListener("keydown", e=>{
  if (e.key === "Escape" && isFs) toggleFS();
});

// ensure fullscreen keeps correct z-index if iframe reloads
iframe.addEventListener("load", ()=>{
  if (isFs) iframeContainer.classList.add("fullscreen");
});
