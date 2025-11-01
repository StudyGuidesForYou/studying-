const codeInputs = document.querySelectorAll(".code-input");
const enterCodeBtn = document.getElementById("enter-code");
const classScreen = document.getElementById("class-code-screen");
const dashScreen = document.getElementById("dashboard-screen");
const iframe = document.getElementById("game-frame");
const urlInput = document.getElementById("url-input");
const launchBtn = document.getElementById("launch-btn");
const gameBtns = document.querySelectorAll(".game-btn");

const CORRECT_CODE = "SIGMA";

// ===== CLASS CODE INPUT =====
codeInputs.forEach((box, index) => {
    box.addEventListener("input", () => {
        if (box.value.length === 1 && index < codeInputs.length - 1) {
            codeInputs[index + 1].focus();
        }
    });

    box.addEventListener("keydown", (e) => {
        if (e.key === "Enter") submitCode();

        // Move back on Backspace
        if (e.key === "Backspace" && box.value === "" && index > 0) {
            codeInputs[index - 1].focus();
        }
    });
});

// Enter button click
enterCodeBtn.addEventListener("click", submitCode);

// Submit code
function submitCode() {
    let entered = "";
    codeInputs.forEach(box => entered += box.value.toUpperCase());

    if (entered === CORRECT_CODE) {
        classScreen.style.opacity = "0";
        setTimeout(() => {
            classScreen.classList.add("hidden");
            dashScreen.classList.remove("hidden");
            dashScreen.style.opacity = "1";
        }, 300);
    } else alert("Incorrect code!");
}

// ===== URL LAUNCH =====
launchBtn.addEventListener("click", () => openURL(urlInput.value));
urlInput.addEventListener("keydown", e => { if(e.key==="Enter") openURL(urlInput.value); });

// Prebuilt games
gameBtns.forEach(btn => {
    btn.addEventListener("click", () => openURL(btn.dataset.url));
});

function openURL(url){
    if(!url.startsWith("http")) url="https://"+url;
    iframe.src=url;
}
