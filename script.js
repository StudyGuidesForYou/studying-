const codeInputs = document.querySelectorAll(".code-input");
const enterCodeBtn = document.getElementById("enter-code");
const classScreen = document.getElementById("class-code-screen");
const dashScreen = document.getElementById("dashboard-screen");
const frameScreen = document.getElementById("iframe-screen");
const iframe = document.getElementById("game-frame");
const urlInput = document.getElementById("url-input");
const launchBtn = document.getElementById("launch-btn");
const gameBtns = document.querySelectorAll(".game-btn");

const CORRECT_CODE = "SIGMA";

// ✅ Auto-advance code boxes
codeInputs.forEach((box, index) => {
    box.addEventListener("input", () => {
        if (box.value.length === 1 && index < codeInputs.length - 1) {
            codeInputs[index + 1].focus();
        }
    });
});

// ✅ Code submission
enterCodeBtn.addEventListener("click", () => {
    let entered = "";
    codeInputs.forEach(box => entered += box.value.toUpperCase());

    if (entered === CORRECT_CODE) {
        classScreen.classList.add("hidden");
        dashScreen.classList.remove("hidden");
    }
});

// ✅ URL Launch
launchBtn.addEventListener("click", () => {
    openURL(urlInput.value);
});

urlInput.addEventListener("keydown", e => {
    if (e.key === "Enter") openURL(urlInput.value);
});

// ✅ Game buttons
gameBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        openURL(btn.dataset.url);
    });
});

// ✅ Open URL in iframe
function openURL(url) {
    if (!url.startsWith("http")) url = "https://" + url;

    dashScreen.classList.add("hidden");
    frameScreen.classList.remove("hidden");
    iframe.src = url;
}
