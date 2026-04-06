import argparse
import json
import os
import pickle
import time
from pathlib import Path
from urllib.parse import quote
from urllib.request import urlopen
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock

import pandas as pd

CACHE_PATH_DEFAULT = "data/translation_cache_es.json"
TEXT_COLUMNS = ["Pregunta", "A", "B", "C", "D", "E", "F"]
ES_COLUMNS_MAP = {
    "Pregunta": "Pregunta_ES",
    "A": "A_ES",
    "B": "B_ES",
    "C": "C_ES",
    "D": "D_ES",
    "E": "E_ES",
    "F": "F_ES",
}


def load_cache(cache_path):
    if not os.path.exists(cache_path):
        return {}
    try:
        with open(cache_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, dict):
            return data
    except Exception:
        pass
    return {}


def save_cache(cache_path, cache):
    with open(cache_path, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)


def translate_text_to_spanish(text, cache, sleep_ms=0):
    if text is None:
        return None

    text = str(text).strip()
    if text == "":
        return ""

    cache_key = f"es::{text}"
    if cache_key in cache:
        return cache[cache_key]

    encoded_text = quote(text)
    url = (
        "https://translate.googleapis.com/translate_a/single"
        f"?client=gtx&sl=auto&tl=es&dt=t&q={encoded_text}"
    )

    try:
        with urlopen(url, timeout=12) as response:
            payload = response.read().decode("utf-8")
            parsed = json.loads(payload)
            translated = "".join(part[0] for part in parsed[0] if part and part[0])
            if not translated:
                translated = text
    except Exception:
        translated = text

    cache[cache_key] = translated
    if sleep_ms > 0:
        time.sleep(sleep_ms / 1000)
    return translated


def ensure_translations(unique_texts, cache, sleep_ms=0, workers=8):
    cache_lock = Lock()

    pending = [text for text in unique_texts if f"es::{text}" not in cache]
    if not pending:
        return

    print(f"Textos nuevos por traducir: {len(pending)}")

    def worker(text):
        encoded_text = quote(text)
        url = (
            "https://translate.googleapis.com/translate_a/single"
            f"?client=gtx&sl=auto&tl=es&dt=t&q={encoded_text}"
        )

        try:
            with urlopen(url, timeout=12) as response:
                payload = response.read().decode("utf-8")
                parsed = json.loads(payload)
                translated = "".join(part[0] for part in parsed[0] if part and part[0])
                if not translated:
                    translated = text
        except Exception:
            translated = text

        if sleep_ms > 0:
            time.sleep(sleep_ms / 1000)

        return text, translated

    completed = 0
    with ThreadPoolExecutor(max_workers=max(1, workers)) as executor:
        futures = [executor.submit(worker, text) for text in pending]

        for future in as_completed(futures):
            text, translated = future.result()
            with cache_lock:
                cache[f"es::{text}"] = translated
            completed += 1
            if completed % 200 == 0:
                print(f"  Traducidos {completed}/{len(pending)}")


def build_unique_texts(df):
    unique_texts = []
    seen = set()

    for col in TEXT_COLUMNS:
        if col not in df.columns:
            continue
        for value in df[col].tolist():
            if pd.isna(value):
                continue
            text = str(value).strip()
            if not text or text in seen:
                continue
            seen.add(text)
            unique_texts.append(text)

    return unique_texts


def pretranslate_file(input_path, output_path, cache, sleep_ms=0, workers=8):
    print(f"Procesando: {input_path}")

    with open(input_path, "rb") as f:
        df = pickle.load(f)

    if not isinstance(df, pd.DataFrame):
        raise ValueError(f"El archivo no contiene un DataFrame: {input_path}")

    unique_texts = build_unique_texts(df)
    print(f"Textos unicos a traducir: {len(unique_texts)}")

    ensure_translations(unique_texts, cache, sleep_ms=sleep_ms, workers=workers)

    out_df = df.copy()

    for source_col, es_col in ES_COLUMNS_MAP.items():
        if source_col in out_df.columns:
            out_df[es_col] = out_df[source_col].apply(
                lambda v: None if pd.isna(v) else cache.get(f"es::{str(v).strip()}", str(v))
            )

    with open(output_path, "wb") as f:
        pickle.dump(out_df, f)

    print(f"Generado: {output_path}")


def main():
    parser = argparse.ArgumentParser(
        description="Genera versiones *_es.pkl con columnas pretraducidas al español."
    )
    parser.add_argument(
        "--data-dir",
        default="data",
        help="Directorio donde estan los .pkl del banco de preguntas",
    )
    parser.add_argument(
        "--test-name",
        default=None,
        help="Nombre de test sin extension, por ejemplo cloud_practitioner_C02",
    )
    parser.add_argument(
        "--cache-path",
        default=CACHE_PATH_DEFAULT,
        help="Archivo JSON para cache de traducciones",
    )
    parser.add_argument(
        "--sleep-ms",
        type=int,
        default=0,
        help="Pausa entre peticiones de traduccion para evitar bloqueos",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=8,
        help="Numero de peticiones concurrentes de traduccion",
    )

    args = parser.parse_args()
    data_dir = Path(args.data_dir)

    if not data_dir.exists():
        raise FileNotFoundError(f"No existe el directorio: {data_dir}")

    cache = load_cache(args.cache_path)

    if args.test_name:
        candidates = [data_dir / f"{args.test_name}.pkl"]
    else:
        candidates = [p for p in data_dir.glob("*.pkl") if not p.name.endswith("_es.pkl")]

    for input_file in candidates:
        if not input_file.exists():
            print(f"No existe: {input_file}")
            continue

        output_file = input_file.with_name(f"{input_file.stem}_es.pkl")
        pretranslate_file(
            str(input_file),
            str(output_file),
            cache,
            sleep_ms=args.sleep_ms,
            workers=args.workers,
        )
        save_cache(args.cache_path, cache)

    save_cache(args.cache_path, cache)
    print("Proceso completado.")


if __name__ == "__main__":
    main()
