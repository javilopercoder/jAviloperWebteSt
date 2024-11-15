function loadTestQuestions(testName) {
    fetch(`/get-data/${testName}`)
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
                displayQuestions(data);  // Muestra las preguntas si no hay error
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

function displayQuestions(questions) {
    const form = document.getElementById("test-form");

    questions.forEach((question, index) => {
        const questionContainer = document.createElement("div");
        questionContainer.classList.add("question");

        // Crear el array de respuestas correctas basado en SPAN_A a SPAN_F
        const correctAnswers = [];
        ["A", "B", "C", "D", "E", "F"].forEach(option => {
            if (question[`SPAN_${option}`] === 1) {
                correctAnswers.push(option);
            }
        });

        questionContainer.dataset.correctAnswer = JSON.stringify(correctAnswers);

        const questionText = document.createElement("p");
        questionText.textContent = `${index + 1}. ${question["Pregunta"]}`;
        questionContainer.appendChild(questionText);

        const isMultiple = question["MULTIPLE"] === 1;
        questionContainer.dataset.isMultiple = isMultiple;

        ["A", "B", "C", "D", "E", "F"].forEach(option => {
            const responseText = question[option];
            if (responseText && responseText !== "NaN") {
                const label = document.createElement("label");
                const input = document.createElement("input");

                input.type = isMultiple ? "checkbox" : "radio";
                input.name = `question-${index}`;
                input.value = option;

                const spanValue = question[`SPAN_${option}`];
                input.dataset.span = spanValue;

                label.appendChild(input);
                label.appendChild(document.createTextNode(`${option}. ${responseText.trim()} `));

                const spanElement = document.createElement("span");
                spanElement.textContent = `(${spanValue})`;
                label.appendChild(spanElement);

                questionContainer.appendChild(label);
                questionContainer.appendChild(document.createElement("br"));
            }
        });

        form.appendChild(questionContainer);

        // Ocultar los spans inmediatamente después de agregarlos al DOM
        questionContainer.querySelectorAll("span").forEach(span => {
            span.style.display = "none"; // Alternativamente: span.remove();
        });
    });
}
