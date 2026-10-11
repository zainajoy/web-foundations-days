// 1. Select the HTML elements
const noteText = document.querySelector("#note-text");
const charCount = document.querySelector("#char-count");
const wordCount = document.querySelector("#word-count");
const clearBtn = document.querySelector("#clear-btn");
const themeToggle = document.querySelector("#theme-toggle");

// 2. Update the character and word counters
function updateCounts() {
    const text = noteText.value;
    const characters = text.length;

    // Count words, ignoring extra spaces and empty text
    const trimmedText = text.trim();
    let words = 0;

    if (trimmedText.length > 0) {
        words = trimmedText.split(/\s+/).length;
    }

    // Update the displayed counters
    charCount.textContent = `${characters} / 200 characters`;
    wordCount.textContent = `${words} words`;

    // Reset old warning classes
    charCount.classList.remove("warning", "over");

    // Apply the correct character warning
    if (characters > 200) {
        charCount.classList.add("over");
    } else if (characters > 180) {
        charCount.classList.add("warning");
    }
}

// 3. Save the draft whenever the user types
noteText.addEventListener("input", function () {
    updateCounts();
    localStorage.setItem("day4-draft", noteText.value);
});

// 4. Clear the draft and reset the counters
function clearDraft() {
    noteText.value = "";
    localStorage.removeItem("day4-draft");
    updateCounts();
}

// Clear button
clearBtn.addEventListener("click", function () {
    clearDraft();
});

// Clear when Escape is pressed inside the textarea
noteText.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        clearDraft();
    }
});

// 5. Update the theme and button label
function updateThemeButton() {
    if (document.body.classList.contains("dark")) {
        themeToggle.textContent = "Light mode";
    } else {
        themeToggle.textContent = "Dark mode";
    }
}

// 6. Restore the saved theme when the page opens
const savedTheme = localStorage.getItem("day4-theme");

if (savedTheme === "dark") {
    document.body.classList.add("dark");
} else {
    document.body.classList.remove("dark");
}

updateThemeButton();

// 7. Toggle and save the theme preference
themeToggle.addEventListener("click", function () {
    document.body.classList.toggle("dark");

    if (document.body.classList.contains("dark")) {
        localStorage.setItem("day4-theme", "dark");
    } else {
        localStorage.setItem("day4-theme", "light");
    }

    updateThemeButton();
});

// 8. Restore the saved draft when the page opens
const savedDraft = localStorage.getItem("day4-draft");

if (savedDraft !== null) {
    noteText.value = savedDraft;
}

// 9. Set the correct initial counters
updateCounts();