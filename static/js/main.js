function getCurrentTheme() {
    return localStorage.getItem("theme") === "dark" ? "dark" : "light";
}

function applyTheme(theme) {
    const isDark = theme === "dark";
    document.body.classList.toggle("dark-mode", isDark);
}

function createActionDock() {
    const dock = document.createElement("div");
    dock.className = "action-dock";

    const themeButton = document.createElement("button");
    themeButton.id = "theme-toggle";
    themeButton.className = "dock-button icon-only";
    themeButton.type = "button";

    const homeButton = document.createElement("button");
    homeButton.id = "back-home";
    homeButton.className = "dock-button icon-only";
    homeButton.type = "button";
    homeButton.title = "Volver a inicio";
    homeButton.textContent = "⌂";

    const updateThemeButton = () => {
        const isDark = document.body.classList.contains("dark-mode");
        themeButton.textContent = isDark ? "☼" : "◐";
        themeButton.title = isDark ? "Activar tema claro" : "Activar tema oscuro";
    };

    themeButton.addEventListener("click", () => {
        const current = document.body.classList.contains("dark-mode") ? "dark" : "light";
        const next = current === "dark" ? "light" : "dark";
        applyTheme(next);
        localStorage.setItem("theme", next);
        updateThemeButton();
    });

    homeButton.addEventListener("click", () => {
        window.location.href = "/";
    });

    updateThemeButton();

    const isHomePage = document.body.classList.contains("home-page");
    if (isHomePage) {
        homeButton.style.display = "none";
    }

    dock.appendChild(themeButton);
    dock.appendChild(homeButton);
    document.body.appendChild(dock);
}

let totalTime = 5400;
let timerInterval;

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
}

function startTimerIfTestPage() {
    const isTestPage = document.body.classList.contains("test-page") && document.getElementById("test-form");
    if (!isTestPage) {
        return;
    }

    const rawLimit = Number(document.body.dataset.questionLimit || "65");
    const questionLimit = Number.isFinite(rawLimit) ? rawLimit : 65;
    if (questionLimit < 65) {
        return;
    }

    const timerElement = document.createElement("p");
    timerElement.id = "timer";
    timerElement.textContent = `Tiempo restante: ${formatTime(totalTime)}`;
    document.body.appendChild(timerElement);

    timerInterval = setInterval(() => {
        totalTime -= 1;
        timerElement.textContent = `Tiempo restante: ${formatTime(totalTime)}`;

        if (totalTime <= 0) {
            clearInterval(timerInterval);
            alert("Tiempo terminado. El test se enviara automaticamente.");
            if (typeof handleSubmit === "function") {
                handleSubmit();
            }
        }
    }, 1000);
}

function stopExamTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function setupHeaderShrinkOnScroll() {
    const header = document.querySelector("header");
    if (!header) {
        return;
    }

    const toggleShrink = () => {
        if (window.scrollY > 50) {
            header.classList.add("shrink");
        } else {
            header.classList.remove("shrink");
        }
    };

    window.addEventListener("scroll", toggleShrink);
    toggleShrink();
}

function setupHomeInteractions() {
    if (!document.body.classList.contains("home-page")) {
        return;
    }

    const quickForm = document.getElementById("quick-test-form");
    const quickRoute = document.getElementById("quick-route");
    if (quickForm && quickRoute) {
        quickForm.addEventListener("submit", event => {
            event.preventDefault();
            const route = quickRoute.value;
            if (!route) {
                return;
            }
            window.location.href = `/test/${route}?limit=10`;
        });
    }
}

window.stopExamTimer = stopExamTimer;

applyTheme(getCurrentTheme());
createActionDock();
startTimerIfTestPage();
setupHeaderShrinkOnScroll();
setupHomeInteractions();
