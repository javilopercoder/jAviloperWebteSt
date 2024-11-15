// Seleccionar el botón para cambiar de tema
const themeToggleButton = document.createElement("button");
themeToggleButton.id = "theme-toggle";
themeToggleButton.textContent = "Modo Oscuro";

// Añadir el botón al DOM
document.body.appendChild(themeToggleButton);

// Detectar el tema actual y aplicar el modo correspondiente
function toggleTheme() {
    document.body.classList.toggle("dark-mode");
    const isDarkMode = document.body.classList.contains("dark-mode");
    themeToggleButton.textContent = isDarkMode ? "Modo Claro" : "Modo Oscuro";
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
}

// Escuchar el clic en el botón
themeToggleButton.addEventListener("click", toggleTheme);

// Aplicar el tema almacenado en localStorage al cargar la página
if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark-mode");
    themeToggleButton.textContent = "Modo Claro";
}

let totalTime = 5400; // Tiempo total en segundos (90 minutos)
let timerInterval;

function startTimer() {
    const timerElement = document.createElement("p");
    timerElement.id = "timer";
    timerElement.textContent = `Tiempo restante: ${formatTime(totalTime)}`;
    document.body.prepend(timerElement);

    timerInterval = setInterval(() => {
        totalTime--;
        timerElement.textContent = `Tiempo restante: ${formatTime(totalTime)}`;

        if (totalTime <= 0) {
            clearInterval(timerInterval);
            alert("Tiempo terminado. El test se enviará automáticamente.");
            handleSubmit(); // Llamamos a la función de envío
        }
    }, 1000);
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
}

startTimer();

function addNavigationButtons(totalQuestions) {
    const form = document.getElementById("test-form");

    const prevButton = document.createElement("button");
    prevButton.textContent = "Anterior";
    prevButton.type = "button";
    prevButton.onclick = () => navigateQuestion(-1);
    prevButton.style.display = "none";
    form.appendChild(prevButton);

    const nextButton = document.createElement("button");
    nextButton.textContent = "Siguiente";
    nextButton.type = "button";
    nextButton.onclick = () => navigateQuestion(1);
    form.appendChild(nextButton);

    const submitButton = document.getElementById("submit-test");
    submitButton.style.display = "none";
}

function navigateQuestion(direction) {
    const questions = document.querySelectorAll(".question");
    questions[currentQuestionIndex].style.display = "none"; // Oculta la pregunta actual
    currentQuestionIndex += direction;
    questions[currentQuestionIndex].style.display = "block"; // Muestra la nueva pregunta

    // Mostrar u ocultar los botones de navegación según la posición
    document.querySelector("button:contains('Anterior')").style.display = currentQuestionIndex === 0 ? "none" : "inline-block";
    document.querySelector("button:contains('Siguiente')").style.display = currentQuestionIndex === questions.length - 1 ? "none" : "inline-block";
    document.getElementById("submit-test").style.display = currentQuestionIndex === questions.length - 1 ? "inline-block" : "none";
}

