// ✅ Correct class code:
const CORRECT_CODE = "SIGMA"; // Change this if you want

const inputs = document.querySelectorAll(".digit");
const errorMsg = document.getElementById("code-error");
const codeScreen = document.getElementById("class-code-screen");
const mainPage = document.getElementById("main-page");

// Auto-focus movement
inputs.forEach((input, index) => {
  input.addEventListener("input", () => {
    input.value = input.value.toUpperCase();

    if (input.value.length === 1 && index < inputs.length - 1) {
      inputs[index + 1].focus();
    }

    checkCode();
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Backspace" && index > 0 && input.value === "") {
      inputs[index - 1].focus();
    }
  });
});

function checkCode() {
  let code = "";
  inputs.forEach(i => code += i.value);

  if (code.length === 5) {
    if (code === CORRECT_CODE) {
      unlock();
    } else {
      errorMsg.style.opacity = "1";
      setTimeout(() => errorMsg.style.opacity = "0", 1200);
      inputs.forEach(i => i.value = "");
      inputs[0].focus();
    }
  }
}

// ✅ Fade away + show main page
function unlock() {
  codeScreen.style.opacity = "0";

  setTimeout(() => {
    codeScreen.style.display = "none";
    mainPage.style.display = "block";
    setTimeout(() => {
      mainPage.style.opacity = "1";
      document.getElementById("url-input").focus();
    }, 20);
  }, 500);
}

// ✅ URL Launcher
const goBtn = document.getElementById("go-btn");
const urlInput = document.getElementById("url-input");
const viewer = document.getElementById("viewer");

function openURL() {
  let url = urlInput.value.trim();

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url;
  }

  viewer.src = url;
}

goBtn.addEventListener("click", openURL);

urlInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    openURL();
  }
});
