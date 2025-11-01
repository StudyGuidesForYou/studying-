// ✅ Correct class code
const CORRECT_CODE = "SIGMA";

// Elements
const codeInputs = document.querySelectorAll(".digit");
const errorMsg = document.getElementById("code-error");
const codeScreen = document.getElementById("class-code-screen");
const mainPage = document.getElementById("main-page");
const settingsBtn = document.getElementById("settings-btn");
const settingsPanel = document.getElementById("settings-panel");
const settingsOverlay = document.getElementById("settings-overlay");

// Auto-move focus
codeInputs.forEach((input, index) => {
  input.addEventListener("input", () => {
    input.value = input.value.toUpperCase();
    if (input.value && index < 4) codeInputs[index + 1].focus();
    checkCode();
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Backspace" && index > 0 && !input.value) {
      codeInputs[index - 1].focus();
    }
  });
});

// ✅ Check class code
function checkCode() {
  let code = "";
  codeInputs.forEach(i => code += i.value);

  if (code.length === 5) {
    if (code === CORRECT_CODE) unlock();
    else {
      errorMsg.style.opacity = "1";
      setTimeout(() => errorMsg.style.opacity = "0", 1200);
      codeInputs.forEach(i => i.value = "");
      codeInputs[0].focus();
    }
  }
}

// ✅ Unlock the launcher page
function unlock() {
  codeScreen.style.opacity = "0";

  setTimeout(() => {
    codeScreen.style.display = "none";

    // ✅ Show launcher only AFTER unlock
    mainPage.style.display = "block";
    mainPage.style.pointerEvents = "auto";
    setTimeout(() => (mainPage.style.opacity = "1"), 20);

    // ✅ Show settings button
    settingsBtn.style.display = "block";
    setTimeout(() => settingsBtn.style.opacity = "1", 50);

  }, 600);
}

// ✅ Settings open/close
settingsBtn.addEventListener("click", toggleSettings);
settingsOverlay.addEventListener("click", toggleSettings);

function toggleSettings() {
  const open = settingsPanel.classList.toggle("open");
  settingsOverlay.style.display = open ? "block" : "none";

  setTimeout(() => {
    settingsOverlay.style.opacity = open ? "1" : "0";
  }, 10);
}

// ✅ URL Launcher
const goBtn = document.getElementById("go-btn");
const urlInput = document.getElementById("url-input");
const viewer = document.getElementById("viewer");

function openURL() {
  let url = urlInput.value.trim();
  if (!url.startsWith("http")) url = "https://" + url;
  viewer.src = url;
}

goBtn.addEventListener("click", openURL);
urlInput.addEventListener("keydown", e => {
  if (e.key === "Enter") openURL();
});


// ✅ Background Settings
document.getElementById("bg-color-picker").addEventListener("input", (e) => {
  document.body.style.background = e.target.value;
});

document.getElementById("bg-image-picker").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    document.body.style.background = `url('${reader.result}') center/cover`;
  };
  reader.readAsDataURL(file);
});

document.getElementById("bg-reset").addEventListener("click", () => {
  document.body.style.background = "linear-gradient(135deg, #0f1c39, #001d3d, #003566, #002a63)";
});


// ✅ DRAGGABLE WINDOWS + OPEN/CLOSE
function makeDraggable(win) {
  let offsetX, offsetY;

  win.querySelector(".window-header").addEventListener("mousedown", (e) => {
    offsetX = e.clientX - win.offsetLeft;
    offsetY = e.clientY - win.offsetTop;

    function move(e) {
      win.style.left = e.clientX - offsetX + "px";
      win.style.top = e.clientY - offsetY + "px";
    }

    function stop() {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", stop);
    }

    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", stop);
  });
}

["stopwatch", "timer", "alarm"].forEach((app) => {
  const win = document.getElementById(`${app}-window`);
  makeDraggable(win);

  document
    .querySelector(`[data-app="${app}"]`)
    .addEventListener("click", () => {
      win.style.display = "block";
    });
});

// ✅ Stopwatch
let swInterval = null;
let swTime = 0;

document.getElementById("sw-start").onclick = () => {
  if (swInterval) return;
  swInterval = setInterval(() => {
    swTime += 10;
    const minutes = String(Math.floor(swTime / 60000)).padStart(2, "0");
    const seconds = String(Math.floor((swTime % 60000) / 1000)).padStart(2, "0");
    const ms = String(Math.floor((swTime % 1000) / 10)).padStart(2, "0");
    document.getElementById("stopwatch-display").textContent =
      `${minutes}:${seconds}.${ms}`;
  }, 10);
};

document.getElementById("sw-stop").onclick = () => {
  clearInterval(swInterval);
  swInterval = null;
};

document.getElementById("sw-reset").onclick = () => {
  swTime = 0;
  document.getElementById("stopwatch-display").textContent = "00:00.00";
};


// ✅ Timer
let timerInterval = null;

document.getElementById("timer-start").onclick = () => {
  const minutes = parseInt(document.getElementById("timer-minutes").value);
  if (!minutes) return;

  let remaining = minutes * 60;

  timerInterval = setInterval(() => {
    if (remaining <= 0) {
      clearInterval(timerInterval);
      alert("Timer done!");
    }
    remaining--;
  }, 1000);
};

document.getElementById("timer-stop").onclick = () => {
  clearInterval(timerInterval);
};


// ✅ Alarm
document.getElementById("alarm-set").onclick = () => {
  const time = document.getElementById("alarm-time").value;
  if (!time) return;

  const [h, m] = time.split(":");
  const now = new Date();
  const alarm = new Date();

  alarm.setHours(h, m, 0, 0);

  if (alarm < now) alarm.setDate(alarm.getDate() + 1);

  const delay = alarm - now;

  setTimeout(() => {
    alert("Alarm ringing!");
  }, delay);
};
