// Seleccionar el botón para cambiar de tema
const themeToggleButton = document.createElement("button");
themeToggleButton.id = "theme-toggle";
themeToggleButton.textContent = "🌙";

// Añadir el botón de cambio de tema al DOM
document.body.appendChild(themeToggleButton);

// Detectar el tema actual y aplicar el modo correspondiente
function toggleTheme() {
    document.body.classList.toggle("dark-mode");
    const isDarkMode = document.body.classList.contains("dark-mode");
    themeToggleButton.textContent = isDarkMode ? "🌞" : "🌙";
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
}

// Escuchar el clic en el botón de cambio de tema
themeToggleButton.addEventListener("click", toggleTheme);

// Aplicar el tema almacenado en localStorage al cargar la página
if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark-mode");
    themeToggleButton.textContent = "🌞";
}

// Crear el botón "Home"
const homeButton = document.createElement("button");
homeButton.id = "back-home";
homeButton.textContent = "🏠";
homeButton.title = "Volver a la página principal"; // Agrega un tooltip

// Establecer la funcionalidad del botón "Home"
homeButton.addEventListener("click", () => {
    window.location.href = "/"; // Cambia "/" por la URL principal si es necesario
});

// Añadir el botón "Home" al DOM
document.body.appendChild(homeButton);

// Temporizador para el test
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
