const codeInputs = document.querySelectorAll(".code-input");
const enterCodeBtn = document.getElementById("enter-code");
const classScreen = document.getElementById("class-code-screen");
const dashScreen = document.getElementById("dashboard-screen");
const iframe = document.getElementById("game-frame");
const urlInput = document.getElementById("url-input");
const launchBtn = document.getElementById("launch-btn");
const fullscreenBtn = document.getElementById("fullscreen-btn");
const fullscreenOverlay = document.getElementById("fullscreen-overlay");
const gameBtns = document.querySelectorAll(".game-btn");

const CORRECT_CODE = "SIGMA";

// ✅ Auto-advance code boxes with backward support
codeInputs.forEach((box, index) => {
    box.addEventListener("input", () => {
        if (box.value.length === 1 && index < codeInputs.length - 1) {
            codeInputs[index + 1].focus();
        }
    });

    box.addEventListener("keydown", e => {
        if (e.key === "Backspace" && box.value === "" && index > 0) {
            codeInputs[index - 1].focus();
        }
        if (e.key === "Enter") {
            submitCode();
        }
    });
});

// ✅ Code submission
enterCodeBtn.addEventListener("click", submitCode);
function submitCode() {
    let entered = "";
    codeInputs.forEach(box => entered += box.value.toUpperCase());

    if (entered === CORRECT_CODE) {
        classScreen.classList.add("hidden");
        dashScreen.classList.remove("hidden");
    } else {
        alert("Incorrect code!");
    }
}

// ✅ URL Launch
launchBtn.addEventListener("click", () => openURL(urlInput.value));
urlInput.addEventListener("keydown", e => { if (e.key === "Enter") openURL(urlInput.value); });

// ✅ Prebuilt game buttons
gameBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        const url = btn.dataset.url;
        urlInput.value = url;
        openURL(url);
    });
});

// ✅ Open URL in iframe
function openURL(url) {
    if (!url.startsWith("http")) url = "https://" + url;
    iframe.src = url;
}

// ✅ Fullscreen toggle (97% x 97%)
fullscreenBtn.addEventListener("click", () => {
    fullscreenOverlay.classList.remove("hidden");
    iframe.style.width = "97vw";
    iframe.style.height = "97vh";
});

fullscreenOverlay.addEventListener("click", () => {
    fullscreenOverlay.classList.add("hidden");
    iframe.style.width = "100%";
    iframe.style.height = "60vh"; // Default dashboard height
});
