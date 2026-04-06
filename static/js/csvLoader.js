function loadTestQuestions(testName, questionLimit = 65) {
    fetch(`/get-data/${testName}?limit=${encodeURIComponent(questionLimit)}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();  // Primero obtenemos el texto de la respuesta
        })
        .then(text => {
            console.log("Respuesta en texto bruto:", text);  // Muestra la respuesta en bruto para verificar el contenido
            let data;
            try {
                data = JSON.parse(text);  // Intenta convertir el texto a JSON
            } catch (error) {
                console.error("Error al parsear JSON:", error);
                throw new Error("La respuesta no es un JSON válido");
            }

            // Verificar si `data` es un objeto JSON y si tiene la propiedad `error`
            if (data && typeof data === 'object' && 'error' in data) {
                console.error("Error en los datos:", data.error);
            } else {
                console.log("Preguntas cargadas:", data);
                displayQuestions(data, testName);  // Muestra las preguntas si no hay error
            }
        })
        .catch(error => {
            console.error("Error al cargar los datos:", error);
        });
}


// Función para analizar el CSV usando PapaParse
function parseCSV(data) {
    const results = Papa.parse(data, { delimiter: ",", header: true });
    return results.data;
}

// Función para seleccionar 65 preguntas aleatorias
function selectRandomQuestions(questions, number) {
    const shuffled = questions.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, number);
}

function displayQuestions(questions, testName) {
    if (!Array.isArray(questions) || questions.length === 0) {
        return;
    }

    const form = document.getElementById("test-form");
    const grid = document.getElementById("question-grid");
    const counter = document.getElementById("question-counter");
    const answeredCounter = document.getElementById("answered-counter");
    const progressFill = document.getElementById("progress-fill");
    const prevButton = document.getElementById("prev-question");
    const nextButton = document.getElementById("next-question");
    const markButton = document.getElementById("mark-question");
    const translateButton = document.getElementById("translate-es");

    const questionStates = questions.map(() => ({
        answered: false,
        marked: false,
        isCorrect: null
    }));

    const userAnswers = questions.map(() => []);

    const state = {
        testName,
        questions,
        originalQuestions: JSON.parse(JSON.stringify(questions)),
        translatedQuestions: null,
        language: "en",
        questionStates,
        userAnswers,
        currentIndex: 0,
        submitted: false
    };

    window.testState = state;

    function updateTranslateButtonLabel() {
        if (!translateButton) {
            return;
        }

        translateButton.textContent = state.language === "es" ? "Ver en inglés" : "Traducir al español";
    }

    function buildTranslatedQuestionsFromColumns() {
        return state.originalQuestions.map(question => {
            const translatedQuestion = { ...question };

            if (question.Pregunta_ES && question.Pregunta_ES !== "NaN") {
                translatedQuestion.Pregunta = question.Pregunta_ES;
            }

            ["A", "B", "C", "D", "E", "F"].forEach(option => {
                const esKey = `${option}_ES`;
                const esValue = question[esKey];
                if (!esValue || esValue === "NaN") {
                    return;
                }
                translatedQuestion[option] = esValue;
            });

            return translatedQuestion;
        });
    }

    function hasPretranslatedData() {
        return state.originalQuestions.some(q => q.Pregunta_ES && q.Pregunta_ES !== "NaN");
    }

    async function toggleSpanishTranslation() {
        if (!translateButton) {
            return;
        }

        saveCurrentAnswer();

        if (state.language === "es") {
            state.questions = JSON.parse(JSON.stringify(state.originalQuestions));
            state.language = "en";
            updateTranslateButtonLabel();
            renderCurrentQuestion();
            return;
        }

        if (!hasPretranslatedData()) {
            alert("Este test aun no tiene version pretraducida en datos.");
            return;
        }

        if (!state.translatedQuestions) {
            state.translatedQuestions = buildTranslatedQuestionsFromColumns();
        }

        state.questions = JSON.parse(JSON.stringify(state.translatedQuestions));
        state.language = "es";
        updateTranslateButtonLabel();
        renderCurrentQuestion();
    }

    function getSelectedAnswersFromDom() {
        return Array.from(form.querySelectorAll("input:checked")).map(input => input.value.trim());
    }

    function saveCurrentAnswer() {
        const selectedAnswers = getSelectedAnswersFromDom();
        const index = state.currentIndex;
        state.userAnswers[index] = selectedAnswers;
        state.questionStates[index].answered = selectedAnswers.length > 0;
    }

    function updateProgressCounters() {
        const total = state.questions.length;
        const answered = state.questionStates.filter(item => item.answered).length;
        counter.textContent = `Pregunta ${state.currentIndex + 1} de ${total}`;
        answeredCounter.textContent = `Respondidas: ${answered}`;
        progressFill.style.width = `${Math.round(((state.currentIndex + 1) / total) * 100)}%`;
    }

    function updateMarkButton() {
        const isMarked = state.questionStates[state.currentIndex].marked;
        markButton.textContent = isMarked ? "Quitar marca" : "Marcar para revisar";
        markButton.setAttribute("aria-pressed", isMarked ? "true" : "false");
    }

    function renderQuestionGrid() {
        grid.innerHTML = "";

        state.questions.forEach((_, index) => {
            const chip = document.createElement("button");
            chip.type = "button";
            chip.classList.add("question-chip");
            chip.textContent = `${index + 1}`;

            if (index === state.currentIndex) {
                chip.classList.add("current");
            }

            if (state.questionStates[index].answered) {
                chip.classList.add("answered");
            }

            if (state.questionStates[index].marked) {
                chip.classList.add("marked");
            }

            if (state.submitted) {
                if (state.questionStates[index].isCorrect === true) {
                    chip.classList.add("correct");
                } else if (state.questionStates[index].isCorrect === false) {
                    chip.classList.add("incorrect");
                }
            }

            chip.addEventListener("click", () => {
                saveCurrentAnswer();
                state.currentIndex = index;
                renderCurrentQuestion();
            });

            grid.appendChild(chip);
        });
    }

    function renderCurrentQuestion() {
        const index = state.currentIndex;
        const question = state.questions[index];
        const correctOptions = ["A", "B", "C", "D", "E", "F"].filter(option => question[`SPAN_${option}`] === 1);
        const isMultiple = correctOptions.length > 1 || question["MULTIPLE"] === 1;

        form.innerHTML = "";

        const questionContainer = document.createElement("div");
        questionContainer.classList.add("question", "question-single");
        questionContainer.dataset.index = `${index}`;
        questionContainer.dataset.isMultiple = isMultiple;

        const questionText = document.createElement("p");
        questionText.textContent = `${index + 1}. ${question["Pregunta"]}`;
        questionContainer.appendChild(questionText);

        ["A", "B", "C", "D", "E", "F"].forEach(option => {
            const responseText = question[option];
            if (!responseText || responseText === "NaN") {
                return;
            }

            const label = document.createElement("label");
            const input = document.createElement("input");
            const isSelected = state.userAnswers[index].includes(option);
            const isCorrectOption = correctOptions.includes(option);

            input.type = isMultiple ? "checkbox" : "radio";
            input.name = `question-${index}`;
            input.value = option;
            input.dataset.span = question[`SPAN_${option}`] || 0;

            if (isSelected) {
                input.checked = true;
            }

            if (state.submitted) {
                input.disabled = true;
            }

            input.addEventListener("change", () => {
                saveCurrentAnswer();
                renderQuestionGrid();
                updateProgressCounters();
            });

            label.appendChild(input);
            const answerText = document.createElement("span");
            answerText.classList.add("answer-text");
            answerText.textContent = `${option}. ${String(responseText).trim()}`;
            label.appendChild(answerText);

            if (state.submitted) {
                const badge = document.createElement("span");
                badge.classList.add("answer-feedback");

                if (isCorrectOption) {
                    label.classList.add("answer-correct");
                    badge.classList.add("correct");
                    badge.textContent = isSelected ? "¡CORRECTA!" : "CORRECTA";
                    label.appendChild(badge);
                } else if (isSelected) {
                    label.classList.add("answer-incorrect-selected");
                    badge.classList.add("incorrect");
                    badge.textContent = "INCORRECTA";
                    label.appendChild(badge);
                }
            }

            questionContainer.appendChild(label);
        });

        form.appendChild(questionContainer);

        prevButton.disabled = index === 0;
        nextButton.disabled = index === state.questions.length - 1;

        updateProgressCounters();
        updateMarkButton();
        renderQuestionGrid();
    }

    prevButton.addEventListener("click", () => {
        if (state.currentIndex === 0) {
            return;
        }
        saveCurrentAnswer();
        state.currentIndex -= 1;
        renderCurrentQuestion();
    });

    nextButton.addEventListener("click", () => {
        if (state.currentIndex >= state.questions.length - 1) {
            return;
        }
        saveCurrentAnswer();
        state.currentIndex += 1;
        renderCurrentQuestion();
    });

    markButton.addEventListener("click", () => {
        const currentState = state.questionStates[state.currentIndex];
        currentState.marked = !currentState.marked;
        updateMarkButton();
        renderQuestionGrid();
    });

    if (translateButton) {
        translateButton.disabled = !hasPretranslatedData();
        translateButton.addEventListener("click", toggleSpanishTranslation);
    }

    window.saveCurrentAnswer = saveCurrentAnswer;
    window.renderCurrentQuestion = renderCurrentQuestion;
    window.renderQuestionGrid = renderQuestionGrid;

    updateTranslateButtonLabel();
    renderCurrentQuestion();
}
