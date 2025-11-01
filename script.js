const codeInputs = document.querySelectorAll(".code-input");
const enterCodeBtn = document.getElementById("enter-code");
const classScreen = document.getElementById("class-code-screen");
const dashScreen = document.getElementById("dashboard-screen");
const iframe = document.getElementById("game-frame");
const iframePlaceholder = document.getElementById("iframe-placeholder");
const urlInput = document.getElementById("url-input");
const launchBtn = document.getElementById("launch-btn");
const gameBtns = document.querySelectorAll(".game-btn");

const CORRECT_CODE = "SIGMA";

// Auto-advance code boxes
codeInputs.forEach((box, index) => {
    box.addEventListener("input", () => {
        if (box.value.length === 1 && index < codeInputs.length - 1) {
            codeInputs[index + 1].focus();
        }
    });
});

// Code submission
enterCodeBtn.addEventListener("click", () => {
    let entered = "";
    codeInputs.forEach(box => entered += box.value.toUpperCase());

    if (entered === CORRECT_CODE) {
        classScreen.style.opacity = "0";
        setTimeout(() => {
            classScreen.classList.add("hidden");
            dashScreen.classList.remove("hidden");
            dashScreen.style.opacity = "1";
        }, 350);
    }
});

// URL launch
launchBtn.addEventListener("click", () => openURL(urlInput.value));
urlInput.addEventListener("keydown", e => { if (e.key === "Enter") openURL(urlInput.value); });

// Game buttons
gameBtns.forEach(btn => btn.addEventListener("click", () => openURL(btn.dataset.url)));

// Open URL in iframe
function openURL(url) {
    if (!url.startsWith("http")) url = "https://" + url;
    iframe.src = url;
    iframePlaceholder.style.display = "none";
}

// Make iframe scale dynamically
function resizeIframe() {
    const iframeHolder = document.querySelector(".iframe-holder");
    iframeHolder.style.width = window.innerWidth * 0.95 + "px";
    iframeHolder.style.height = window.innerHeight * 0.9 + "px";
}
window.addEventListener("resize", resizeIframe);
resizeIframe();
