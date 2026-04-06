from flask import Flask, render_template, jsonify, request
import pickle
import os
import pandas as pd
from urllib.parse import quote
from urllib.request import urlopen
import json

app = Flask(__name__)
translation_cache = {}


def translate_text_to_spanish(text):
    if text is None:
        return None

    text = str(text).strip()
    if text == "":
        return ""

    cache_key = f"es::{text}"
    if cache_key in translation_cache:
        return translation_cache[cache_key]

    try:
        encoded_text = quote(text)
        url = (
            "https://translate.googleapis.com/translate_a/single"
            f"?client=gtx&sl=auto&tl=es&dt=t&q={encoded_text}"
        )

        with urlopen(url, timeout=8) as response:
            payload = response.read().decode("utf-8")
            parsed = json.loads(payload)
            translated = "".join(part[0] for part in parsed[0] if part and part[0])

        if not translated:
            translated = text
    except Exception:
        translated = text

    translation_cache[cache_key] = translated
    return translated


def sanitize_for_json(value):
    if isinstance(value, dict):
        return {k: sanitize_for_json(v) for k, v in value.items()}

    if isinstance(value, list):
        return [sanitize_for_json(item) for item in value]

    try:
        if pd.isna(value):
            return None
    except TypeError:
        pass

    return value


def get_es_path_for_test(test_name):
    return f"data/{test_name}_es.pkl"


def attach_spanish_columns(test_name, sampled_df):
    es_path = get_es_path_for_test(test_name)
    if not os.path.exists(es_path):
        return sampled_df

    try:
        with open(es_path, "rb") as pkl_file:
            es_df = pickle.load(pkl_file)
    except Exception as e:
        print(f"No se pudo cargar el archivo ES {es_path}: {e}")
        return sampled_df

    expected_es_columns = ["Pregunta_ES", "A_ES", "B_ES", "C_ES", "D_ES", "E_ES", "F_ES"]
    missing = [col for col in expected_es_columns if col not in es_df.columns]
    if missing:
        print(f"Archivo ES sin columnas esperadas {missing}: {es_path}")
        return sampled_df

    # Mantiene alineacion por indice para no romper el muestreo aleatorio ya elegido.
    es_subset = es_df.loc[sampled_df.index, expected_es_columns]
    return sampled_df.join(es_subset)


# Ruta para la página principal
@app.route('/')
def index():
    return render_template('index.html')


def get_question_limit(raw_limit, default=65):
    try:
        parsed = int(raw_limit)
        return max(1, min(parsed, 65))
    except (TypeError, ValueError):
        return default


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
        question_limit = get_question_limit(request.args.get('limit'), default=65)
        return render_template(
            'test_template.html',
            test_name=test_name,
            question_limit=question_limit
        )
    else:
        return "Test not found", 404


@app.route('/get-data/<test_name>', methods=['GET'])
def get_data(test_name):
    pkl_path = f"data/{test_name}.pkl"
    question_limit = get_question_limit(request.args.get('limit'), default=65)
    print(f"Intentando cargar el archivo: {pkl_path}")

    if os.path.exists(pkl_path):
        try:
            with open(pkl_path, "rb") as pkl_file:
                test_data_df = pickle.load(pkl_file)

                # Reemplaza NaN con None para JSON válido
                test_data_df = test_data_df.astype(object).where(
                    pd.notna(test_data_df), None)

                # Selecciona aleatoriamente n preguntas sin repetición (maximo 65)
                if len(test_data_df) > question_limit:
                    test_data_df = test_data_df.sample(n=question_limit, random_state=None)
                else:
                    print(
                        "El número de preguntas es menor o igual al limite, se enviarán todas las preguntas."
                    )

                # Si existe dataset pretraducido, añade columnas *_ES para cambio de idioma instantaneo.
                test_data_df = attach_spanish_columns(test_name, test_data_df)

                # Convierte el DataFrame a un diccionario JSON serializable
                test_data = sanitize_for_json(test_data_df.to_dict(orient="records"))
                test_preview = test_data[:5] if isinstance(test_data, list) else []
                print(f"Datos JSON enviados para {test_name}: {test_preview}"
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
                test_data_df = test_data_df.astype(object).where(
                    pd.notna(test_data_df), None)

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


@app.route('/translate-to-es', methods=['POST'])
def translate_to_es():
    data = request.get_json(silent=True) or {}
    texts = data.get("texts", [])

    if not isinstance(texts, list):
        return jsonify({"error": "Invalid payload: texts must be a list"}), 400

    if len(texts) == 0:
        return jsonify({"translations": {}})

    if len(texts) > 1200:
        return jsonify({"error": "Too many texts in one request"}), 400

    translations = {}
    for raw_text in texts:
        if raw_text is None:
            continue
        text = str(raw_text)
        translations[text] = translate_text_to_spanish(text)

    return jsonify({"translations": translations})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
