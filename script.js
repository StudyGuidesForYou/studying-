// ===== DOM =====
const codeInputs = document.querySelectorAll(".code-input");
const enterCodeBtn = document.getElementById("enter-code");
const classScreen = document.getElementById("class-code-screen");
const dashScreen = document.getElementById("dashboard-screen");
const iframe = document.getElementById("game-frame");
const urlInput = document.getElementById("url-input");
const launchBtn = document.getElementById("launch-btn");
const fullscreenBtn = document.getElementById("fullscreen-btn");
const gameBtns = document.querySelectorAll(".game-btn");

// Try to get or create overlay (safe if HTML missing it)
let fullscreenOverlay = document.getElementById("fullscreen-overlay");
if (!fullscreenOverlay) {
    fullscreenOverlay = document.createElement("div");
    fullscreenOverlay.id = "fullscreen-overlay";
    fullscreenOverlay.classList.add("hidden");
    document.body.appendChild(fullscreenOverlay);
}

const CORRECT_CODE = "SIGMA";

// ===== Class code inputs (auto-advance, backspace, enter) =====
codeInputs.forEach((box, index) => {
    box.addEventListener("input", () => {
        // ensure only first character stays
        if (box.value.length > 1) box.value = box.value[0];
        if (box.value.length === 1 && index < codeInputs.length - 1) {
            codeInputs[index + 1].focus();
        }
    });

    box.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && box.value === "" && index > 0) {
            codeInputs[index - 1].focus();
        }
        if (e.key === "Enter") submitCode();
    });
});

enterCodeBtn.addEventListener("click", submitCode);

function submitCode() {
    let entered = "";
    codeInputs.forEach(box => entered += (box.value || "").toUpperCase());
    if (entered === CORRECT_CODE) {
        classScreen.classList.add("hidden");
        dashScreen.classList.remove("hidden");
        // focus URL input for convenience
        setTimeout(()=> urlInput?.focus(), 200);
    } else {
        // gentle feedback (not intrusive)
        flashInputs();
    }
}

function flashInputs() {
    codeInputs.forEach(i => i.animate(
        [{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }],
        { duration: 240, iterations: 1 }
    ));
}

// ===== URL / Games launch =====
function openURL(url) {
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    iframe.src = url;
}
launchBtn?.addEventListener("click", () => openURL(urlInput.value));
urlInput?.addEventListener("keydown", e => { if (e.key === "Enter") openURL(urlInput.value); });

gameBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        const url = btn.dataset.url;
        urlInput.value = url;
        openURL(url);
    });
});

// ===== Fullscreen (97% x 97%) =====
// We'll toggle a class on the iframe (#game-frame.fullscreen) and show overlay.
// Keep track of whether we're fullscreen, and preserve page state.
let isCustomFullscreen = false;

// store original inline styles (if any) so we can restore
let originalStyle = { width: iframe.style.width || "", height: iframe.style.height || "", position: iframe.style.position || "", top: iframe.style.top || "", left: iframe.style.left || "", zIndex: iframe.style.zIndex || "" };

function enterFakeFullscreen() {
    if (isCustomFullscreen) return;
    isCustomFullscreen = true;

    // preserve original style values (in case they were set inline)
    originalStyle = {
        width: iframe.style.width || "",
        height: iframe.style.height || "",
        position: iframe.style.position || "",
        top: iframe.style.top || "",
        left: iframe.style.left || "",
        zIndex: iframe.style.zIndex || ""
    };

    // add class for CSS-based fullscreen (97% x 97%)
    iframe.classList.add("fullscreen");

    // show overlay
    fullscreenOverlay.classList.remove("hidden");
    fullscreenOverlay.classList.add("visible");

    // update button label
    if (fullscreenBtn) fullscreenBtn.textContent = "Exit Fullscreen";

    // prevent body scrolling while 'fullscreen'
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
}

function exitFakeFullscreen() {
    if (!isCustomFullscreen) return;
    isCustomFullscreen = false;

    // remove class
    iframe.classList.remove("fullscreen");

    // hide overlay
    fullscreenOverlay.classList.add("hidden");
    fullscreenOverlay.classList.remove("visible");

    // restore original inline styles (if any)
    iframe.style.width = originalStyle.width;
    iframe.style.height = originalStyle.height;
    iframe.style.position = originalStyle.position;
    iframe.style.top = originalStyle.top;
    iframe.style.left = originalStyle.left;
    iframe.style.zIndex = originalStyle.zIndex;

    // update button label
    if (fullscreenBtn) fullscreenBtn.textContent = "Fullscreen";

    // restore page scrolling
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
}

// Toggle handler
fullscreenBtn?.addEventListener("click", () => {
    if (!isCustomFullscreen) enterFakeFullscreen();
    else exitFakeFullscreen();
});

// Clicking overlay exits fullscreen
fullscreenOverlay.addEventListener("click", () => {
    exitFakeFullscreen();
});

// Pressing Escape exits fullscreen
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isCustomFullscreen) exitFakeFullscreen();
});

// If the iframe navigates to a new page that tries to steal focus, ensure overlay stays on top
// (no-op if same-origin navigation prevents script access)
iframe.addEventListener("load", () => {
    if (isCustomFullscreen) {
        // re-assert overlay and class in case styles were affected
        iframe.classList.add("fullscreen");
        fullscreenOverlay.classList.remove("hidden");
        fullscreenOverlay.classList.add("visible");
    }
});

// Safety: if user resizes window while fullscreen, keep iframe within bounds
window.addEventListener("resize", () => {
    if (isCustomFullscreen) {
        // nothing complex needed — CSS handles 97vw/97vh; this just ensures overlay covers
        fullscreenOverlay.style.display = "";
    }
});
