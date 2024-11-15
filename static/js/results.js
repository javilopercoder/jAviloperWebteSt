// Registrar el tiempo de inicio
let startTime = new Date();

function handleSubmit() {
    const form = document.getElementById("test-form");
    const questions = Array.from(form.querySelectorAll(".question"));
    let correctAnswersCount = 0;
    let totalQuestions = questions.length;

    questions.forEach((questionContainer, index) => {
        const isMultiple = questionContainer.dataset.isMultiple === "true";
        const inputs = Array.from(questionContainer.querySelectorAll("input"));
        const selectedOptions = inputs.filter(input => input.checked).map(input => input.value.trim());

        // Obtener las respuestas correctas a partir de los inputs con data-span="1"
        const correctAnswersArray = inputs.filter(input => input.dataset.span === "1").map(input => input.value.trim());

        console.log(`Pregunta ${index + 1}:`);
        console.log("Respuestas correctas:", correctAnswersArray);
        console.log("Respuestas seleccionadas:", selectedOptions);

        let isCorrect;

        if (isMultiple) {
            // Evaluar preguntas de selección múltiple
            const allCorrectSelected = correctAnswersArray.every(answer => selectedOptions.includes(answer));
            const noIncorrectSelected = selectedOptions.every(answer => correctAnswersArray.includes(answer));
            isCorrect = allCorrectSelected && noIncorrectSelected;
        } else {
            // Evaluar preguntas de selección única
            isCorrect = selectedOptions.length === 1 && correctAnswersArray.includes(selectedOptions[0]);
        }

        // Crear el elemento de resultado
        const resultElement = document.createElement("p");
        resultElement.textContent = `Pregunta ${index + 1}: `;
        if (isCorrect) {
            correctAnswersCount++;
            resultElement.textContent += "¡CORRECTO!";
            resultElement.classList.add("correct");
        } else {
            resultElement.textContent += `¡INCORRECTO!`;
            resultElement.classList.add("incorrect");
        }
        questionContainer.appendChild(resultElement);

        // Estilizar cada opción
        inputs.forEach(input => {
            const label = input.parentElement;
            const answerValue = input.value.trim();
            const spanIndicator = input.dataset.span;

            label.querySelectorAll("span.feedback").forEach(span => span.remove());

            if (spanIndicator === "1" && input.checked) {
                label.style.color = "green";
                label.insertAdjacentHTML('beforeend', '<span class="feedback"> ¡CORRECTO!</span>');
            } else if (input.checked && spanIndicator !== "1") {
                label.style.color = "red";
                label.insertAdjacentHTML('beforeend', '<span class="feedback"> INCORRECTO</span>');
            } else if (spanIndicator === "1") {
                label.style.color = "green";
            } else {
                label.style.color = "";
            }
        });
    });

    // Calcular el porcentaje de aciertos
    const percentage = Math.round((correctAnswersCount / totalQuestions) * 100);

    // Calcular el tiempo transcurrido
    const endTime = new Date();
    const timeSpent = Math.floor((endTime - startTime) / 1000);
    const minutes = Math.floor(timeSpent / 60);
    const seconds = timeSpent % 60;
    const timeMessage = `Tiempo empleado: ${minutes} minutos y ${seconds} segundos`;

    // Mostrar resultados generales
    const resultsContainer = document.createElement("div");
    resultsContainer.classList.add("results");
    resultsContainer.innerHTML = `<p>Aciertos: ${correctAnswersCount} de ${totalQuestions} (${percentage}%)</p><p>${timeMessage}</p>`;
    form.appendChild(resultsContainer);
}

// Escuchar evento de envío
document.getElementById("submit-test").addEventListener("click", handleSubmit);
