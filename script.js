const codeInputs = document.querySelectorAll(".code-input");
const enterCodeBtn = document.getElementById("enter-code");
const classScreen = document.getElementById("class-code-screen");
const dashScreen = document.getElementById("dashboard-screen");
const iframeContainer = document.getElementById("iframe-container");
const iframe = document.getElementById("game-frame");
const urlInput = document.getElementById("url-input");
const launchBtn = document.getElementById("launch-btn");
const fullscreenBtn = document.getElementById("fullscreen-btn");
const gameBtns = document.querySelectorAll(".game-btn");

const CORRECT_CODE = "SIGMA";

let isFullscreen = false;

// ✅ Auto move forward/backward in code boxes
codeInputs.forEach((box, i) => {
    box.addEventListener("input", () => {
        if (box.value && i < codeInputs.length - 1) {
            codeInputs[i + 1].focus();
        }
    });

    box.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && !box.value && i > 0) {
            codeInputs[i - 1].focus();
        }
        if (e.key === "Enter") enterCodeBtn.click();
    });
});

// ✅ Enter class code
enterCodeBtn.addEventListener("click", () => {
    let entered = "";
    codeInputs.forEach(b => entered += b.value.toUpperCase());

    if (entered === CORRECT_CODE) {
        classScreen.classList.add("hidden");
        dashScreen.classList.remove("hidden");
    }
});

// ✅ Launch button
launchBtn.addEventListener("click", () => openURL(urlInput.value));
urlInput.addEventListener("keydown", e => {
    if (e.key === "Enter") openURL(urlInput.value);
});

// ✅ Prebuilt games
gameBtns.forEach(btn => {
    btn.addEventListener("click", () => openURL(btn.dataset.url));
});

// ✅ Open URL
function openURL(url) {
    if (!url.startsWith("http")) url = "https://" + url;
    iframe.src = url;
}

// ✅ FULLSCREEN TOGGLE — FIXED
fullscreenBtn.addEventListener("click", () => {
    isFullscreen = !isFullscreen;
    iframeContainer.classList.toggle("fullscreen", isFullscreen);
});
