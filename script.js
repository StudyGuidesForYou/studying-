const codeInputs = document.querySelectorAll(".code-input");
const enterCodeBtn = document.getElementById("enter-code");
const classScreen = document.getElementById("class-code-screen");
const dashScreen = document.getElementById("dashboard-screen");
const iframe = document.getElementById("game-frame");
const urlInput = document.getElementById("url-input");
const launchBtn = document.getElementById("launch-btn");
const gameBtns = document.querySelectorAll(".game-btn");

const CORRECT_CODE = "SIGMA";

// ✅ Auto-move focus
codeInputs.forEach((box, index) => {
    box.addEventListener("input", () => {
        if (box.value.length === 1 && index < codeInputs.length - 1) {
            codeInputs[index + 1].focus();
        }
    });
});

// ✅ Submit code and fade transition
enterCodeBtn.addEventListener("click", () => {
    let entered = "";
    codeInputs.forEach(box => entered += box.value.toUpperCase());

    if (entered === CORRECT_CODE) {
        // fade OUT class screen
        classScreen.style.opacity = "0";
        setTimeout(() => {
            classScreen.classList.add("hidden");

            // fade IN dashboard
            dashScreen.classList.remove("hidden");
            dashScreen.style.opacity = "1";
        }, 350);
    }
});

// ✅ Launch URL
launchBtn.addEventListener("click", () => openURL(urlInput.value));
urlInput.addEventListener("keydown", e => {
    if (e.key === "Enter") openURL(urlInput.value);
});

// ✅ Game buttons → open URL
gameBtns.forEach(btn => {
    btn.addEventListener("click", () => openURL(btn.dataset.url));
});

// ✅ Load URL in iframe
function openURL(url) {
    if (!url.startsWith("http")) url = "https://" + url;
    iframe.src = url;
}
