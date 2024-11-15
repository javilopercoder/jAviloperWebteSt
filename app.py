from flask import Flask, render_template, jsonify, request
import pickle
import os
import pandas as pd

app = Flask(__name__)


# Ruta para la página principal
@app.route('/')
def index():
    return render_template('index.html')


@app.route('/test/<test_name>')
def test(test_name):
    # Comprueba si el test_name existe en el archivo .pkl antes de renderizar la plantilla
    valid_tests = [
        'advanced_networking_C01', 'cloud_practitioner_C02',
        'data_engineer_C01', 'developer_C02', 'devOps', 'security',
        'solutions_architect_associate_C03',
        'solutions_architect_professional_C02', 'sysOps'
    ]

    if test_name in valid_tests:
        return render_template('test_template.html', test_name=test_name)
    else:
        return "Test not found", 404


@app.route('/get-data/<test_name>', methods=['GET'])
def get_data(test_name):
    pkl_path = f"data/{test_name}.pkl"
    print(f"Intentando cargar el archivo: {pkl_path}")

    if os.path.exists(pkl_path):
        try:
            with open(pkl_path, "rb") as pkl_file:
                test_data_df = pickle.load(pkl_file)

                # Reemplaza NaN con None para JSON válido
                test_data_df = test_data_df.applymap(lambda x: None
                                                     if pd.isna(x) else x)

                # Selecciona aleatoriamente 65 preguntas sin repetición
                if len(test_data_df) > 65:
                    test_data_df = test_data_df.sample(n=65, random_state=None)
                else:
                    print(
                        "El número de preguntas es menor o igual a 65, se enviarán todas las preguntas."
                    )

                # Convierte el DataFrame a un diccionario JSON serializable
                test_data = test_data_df.to_dict(orient="records")
                print(f"Datos JSON enviados para {test_name}: {test_data[:5]}"
                      )  # Muestra una muestra en consola

                return jsonify(test_data)
        except Exception as e:
            print(f"Error al cargar el archivo {pkl_path}: {e}")
            return jsonify({"error": "Error al cargar el archivo"}), 500
    else:
        print(f"Archivo {pkl_path} no encontrado.")
        return jsonify({"error": "Test not found"}), 404


@app.route('/submit-test', methods=['POST'])
def submit_test():
    # Obtener datos de la solicitud POST
    data = request.get_json()
    test_name = data.get("test_name")
    user_answers = data.get(
        "answers")  # Diccionario con respuestas del usuario

    pkl_path = f"data/{test_name}.pkl"
    print(f"Procesando envío para: {pkl_path}")

    if os.path.exists(pkl_path):
        try:
            with open(pkl_path, "rb") as pkl_file:
                test_data_df = pickle.load(pkl_file)

                # Reemplaza NaN con None para JSON válido
                test_data_df = test_data_df.applymap(lambda x: None
                                                     if pd.isna(x) else x)

                # Procesar las respuestas
                correct_count = 0
                total_questions = len(user_answers)
                detailed_feedback = []

                for idx, answer in enumerate(user_answers):
                    question = test_data_df.iloc[idx]
                    correct_options = [
                        option for option in ["A", "B", "C", "D", "E", "F"]
                        if question[f"SPAN_{option}"] == 1
                    ]

                    # Compara respuestas del usuario con respuestas correctas
                    if set(answer) == set(correct_options):
                        correct_count += 1
                        feedback = {
                            "question": question["Pregunta"],
                            "result": "CORRECTO"
                        }
                    else:
                        feedback = {
                            "question": question["Pregunta"],
                            "result": "INCORRECTO",
                            "correct_answers": correct_options
                        }
                    detailed_feedback.append(feedback)

                # Calcular porcentaje de aciertos
                score_percentage = (correct_count / total_questions) * 100
                result = {
                    "correct_count": correct_count,
                    "total_questions": total_questions,
                    "score_percentage": score_percentage,
                    "feedback": detailed_feedback
                }

                return jsonify(result)
        except Exception as e:
            print(f"Error al procesar el archivo {pkl_path}: {e}")
            return jsonify({"error": "Error al procesar el archivo"}), 500
    else:
        return jsonify({"error": "Test not found"}), 404


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
