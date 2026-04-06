// Registrar el tiempo de inicio
let startTime = new Date();

function buildExamReviewText(state) {
    const lines = [];
    lines.push(`Resumen del examen: ${state.testName}`);
    lines.push("");

    state.questions.forEach((question, index) => {
        const selectedOptions = state.userAnswers[index] || [];
        const correctAnswers = ["A", "B", "C", "D", "E", "F"].filter(option => question[`SPAN_${option}`] === 1);
        const status = state.questionStates[index].isCorrect ? "CORRECTA" : "INCORRECTA";

        lines.push(`Pregunta ${index + 1}: ${question.Pregunta}`);

        ["A", "B", "C", "D", "E", "F"].forEach(option => {
            const optionText = question[option];
            if (!optionText || optionText === "NaN") {
                return;
            }

            const tags = [];
            if (correctAnswers.includes(option)) {
                tags.push("CORRECTA");
            }
            if (selectedOptions.includes(option)) {
                tags.push("TU RESPUESTA");
            }

            const tagText = tags.length > 0 ? ` [${tags.join(" | ")}]` : "";
            lines.push(`${option}. ${optionText}${tagText}`);
        });

        lines.push(`Resultado: ${status}`);
        lines.push(`Tu respuesta: ${selectedOptions.length > 0 ? selectedOptions.join(", ") : "Sin responder"}`);
        lines.push(`Respuesta correcta: ${correctAnswers.join(", ")}`);
        lines.push("");
    });

    return lines.join("\n");
}

async function copyTextToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return;
    }

    const tempArea = document.createElement("textarea");
    tempArea.value = text;
    tempArea.style.position = "fixed";
    tempArea.style.opacity = "0";
    document.body.appendChild(tempArea);
    tempArea.focus();
    tempArea.select();
    document.execCommand("copy");
    tempArea.remove();
}

async function handleCopyAllQuestions() {
    const state = window.testState;
    if (!state || !state.submitted) {
        alert("Primero termina el examen para poder copiar el resumen.");
        return;
    }

    try {
        const text = buildExamReviewText(state);
        await copyTextToClipboard(text);
        alert("Resumen copiado al portapapeles.");
    } catch (error) {
        console.error("No se pudo copiar al portapapeles:", error);
        alert("No se pudo copiar automaticamente. Reintenta.");
    }
}

function handleSubmit() {
    const state = window.testState;

    if (!state) {
        return;
    }

    if (typeof window.saveCurrentAnswer === "function") {
        window.saveCurrentAnswer();
    }

    const totalQuestions = state.questions.length;
    const unanswered = state.questionStates.filter(item => !item.answered).length;

    if (!state.submitted && unanswered > 0) {
        const shouldContinue = window.confirm(`Hay ${unanswered} preguntas sin responder. ¿Quieres enviar igualmente?`);
        if (!shouldContinue) {
            return;
        }
    }

    if (typeof window.stopExamTimer === "function") {
        window.stopExamTimer();
    }

    state.submitted = true;

    let correctAnswersCount = 0;
    state.questions.forEach((question, index) => {
        const selectedOptions = state.userAnswers[index] || [];
        const correctAnswersArray = ["A", "B", "C", "D", "E", "F"].filter(option => question[`SPAN_${option}`] === 1);
        const isMultiple = correctAnswersArray.length > 1 || question["MULTIPLE"] === 1;

        let isCorrect;

        if (isMultiple) {
            const allCorrectSelected = correctAnswersArray.every(answer => selectedOptions.includes(answer));
            const noIncorrectSelected = selectedOptions.every(answer => correctAnswersArray.includes(answer));
            isCorrect = allCorrectSelected && noIncorrectSelected;
        } else {
            isCorrect = selectedOptions.length === 1 && correctAnswersArray.includes(selectedOptions[0]);
        }

        if (isCorrect) {
            correctAnswersCount++;
        }

        state.questionStates[index].isCorrect = isCorrect;
    });

    const percentage = Math.round((correctAnswersCount / totalQuestions) * 100);

    const endTime = new Date();
    const timeSpent = Math.floor((endTime - startTime) / 1000);
    const minutes = Math.floor(timeSpent / 60);
    const seconds = timeSpent % 60;
    const timeMessage = `Tiempo empleado: ${minutes} minutos y ${seconds} segundos`;

    const resultContainer = document.getElementById("result-container");
    resultContainer.style.display = "block";
    resultContainer.className = "results";
    resultContainer.innerHTML = `<p>Aciertos: ${correctAnswersCount} de ${totalQuestions} (${percentage}%)</p><p>${timeMessage}</p>`;

    const copyButton = document.getElementById("copy-all-qa");
    const submitButton = document.getElementById("submit-test");

    if (submitButton) {
        submitButton.style.display = "none";
    }

    if (copyButton) {
        copyButton.style.display = "inline-flex";
    }

    if (typeof window.renderQuestionGrid === "function") {
        window.renderQuestionGrid();
    }

    if (typeof window.renderCurrentQuestion === "function") {
        window.renderCurrentQuestion();
    }
}

// Escuchar evento de envío
document.getElementById("submit-test").addEventListener("click", handleSubmit);

const copyAllButton = document.getElementById("copy-all-qa");
if (copyAllButton) {
    copyAllButton.addEventListener("click", handleCopyAllQuestions);
}
