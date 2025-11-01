// Auto-advance through code boxes
const boxes = document.querySelectorAll(".code");

boxes.forEach((box, index) => {
    box.addEventListener("input", () => {
        if (box.value.length === 1 && index < boxes.length - 1) {
            boxes[index + 1].focus();
        }
    });

    box.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && box.value === "" && index > 0) {
            boxes[index - 1].focus();
        }
    });
});

document.getElementById("openBtn").addEventListener("click", () => {
    const code =
        document.getElementById("code1").value +
        document.getElementById("code2").value +
        document.getElementById("code3").value +
        document.getElementById("code4").value +
        document.getElementById("code5").value;

    const textValue = document.getElementById("longInput").value;

    document.getElementById("result").innerText =
        `Code: ${code} | Text: ${textValue}`;
});
