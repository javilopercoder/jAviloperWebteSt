#!/usr/bin/env python3
"""
Convierte JSON de la carpeta `json/` a CSV y PKL con el esquema estándar esperado por la app.
Salida en: json_a_csv_pickle/{basename}.csv y {basename}.pkl

Soporta dos formatos detectados en el workspace:
- Formato A: {'preguntas': [ { 'pregunta': ..., 'respuestas': [ { 'opcion':'a', 'texto':..., 'correcta': bool }, ... ] }, ... ] }
- Formato B: {'preguntas': [ { 'numero':..., 'pregunta':..., 'respuestas': { 'respuesta_a': {'text': 'A. ...', 'correct': bool}, ... }, 'respuestas_correctas': ['A','C'] }, ... ] }

Genera columnas: Pregunta, A..F, SPAN_A..SPAN_F (1 o 0), MULTIPLE (1/0).
"""

import json
from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
JSON_DIR = ROOT / 'json'
OUT_DIR = ROOT / 'json_a_csv_pickle'
OUT_DIR.mkdir(parents=True, exist_ok=True)

def load_json(path: Path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def normalize_text(s):
    if s is None:
        return None
    return str(s).strip()

def parse_format_a(item):
    pregunta = normalize_text(item.get('pregunta'))
    options = {c: None for c in ['A','B','C','D','E','F']}
    spans = {f'SPAN_{c}': 0 for c in ['A','B','C','D','E','F']}
    respuestas = item.get('respuestas') or []
    for resp in respuestas:
        opt = str(resp.get('opcion') or '').strip()
        if not opt:
            continue
        letter = opt.upper()
        if letter in options:
            options[letter] = normalize_text(resp.get('texto'))
            spans[f'SPAN_{letter}'] = 1 if resp.get('correcta') else 0
    multiple = 1 if sum(spans.values()) > 1 else 0
    row = {'Pregunta': pregunta, **options, **spans, 'MULTIPLE': multiple}
    return row

def parse_format_b(item):
    pregunta = normalize_text(item.get('pregunta'))
    options = {c: None for c in ['A','B','C','D','E','F']}
    spans = {f'SPAN_{c}': 0 for c in ['A','B','C','D','E','F']}

    respuestas = item.get('respuestas') or {}
    for key, val in respuestas.items():
        if not key.lower().startswith('respuesta_'):
            continue
        letter = key.rsplit('_', 1)[-1].upper()
        if len(letter) == 1 and letter.isalpha():
            text = val.get('text') if isinstance(val, dict) else val
            if text:
                t = normalize_text(text)
                # remove leading 'A. ' or 'A.' if present
                if len(t) > 2 and t[0].isalpha() and t[1] in '. ':
                    t = t[2:].strip()
                options[letter] = t
            if isinstance(val, dict) and val.get('correct'):
                spans[f'SPAN_{letter}'] = 1

    rc = item.get('respuestas_correctas') or []
    if rc:
        for k in spans:
            spans[k] = 0
        for letter in rc:
            letter = str(letter).strip().upper()
            if letter in ['A','B','C','D','E','F']:
                spans[f'SPAN_{letter}'] = 1

    multiple = 1 if sum(spans.values()) > 1 else 0
    row = {'Pregunta': pregunta, **options, **spans, 'MULTIPLE': multiple}
    return row

def detect_format(data):
    preguntas = data.get('preguntas') or []
    if not preguntas:
        return None
    first = preguntas[0]
    if isinstance(first.get('respuestas'), list):
        return 'A'
    if isinstance(first.get('respuestas'), dict):
        return 'B'
    return None

def convert_file(path: Path):
    print(f'Procesando {path.name}')
    data = load_json(path)
    fmt = detect_format(data)
    if fmt is None:
        print(f'  Formato no reconocido para {path.name}, se omite.')
        return
    rows = []
    preguntas = data.get('preguntas') or []
    for item in preguntas:
        if fmt == 'A':
            row = parse_format_a(item)
        else:
            row = parse_format_b(item)
        rows.append(row)

    df = pd.DataFrame(rows)

    cols = ['Pregunta'] + [c for c in ['A','B','C','D','E','F']] + [f'SPAN_{c}' for c in ['A','B','C','D','E','F']] + ['MULTIPLE']
    for c in cols:
        if c not in df.columns:
            if c == 'Pregunta':
                df[c] = None
            elif c == 'MULTIPLE' or c.startswith('SPAN_'):
                df[c] = 0
            else:
                df[c] = None
    df = df[cols]

    base = path.stem.replace(' ', '_')
    csv_out = OUT_DIR / f"{base}.csv"
    pkl_out = OUT_DIR / f"{base}.pkl"
    df.to_csv(csv_out, index=False, encoding='utf-8')
    df.to_pickle(pkl_out)
    print(f'  Guardado CSV: {csv_out}')
    print(f'  Guardado PKL: {pkl_out}')

def main():
    files = list(JSON_DIR.glob('*.json'))
    if len(files) == 0:
        print('No se encontraron JSON en la carpeta json/.')
        return
    for f in files:
        try:
            convert_file(f)
        except Exception as e:
            print(f'Error procesando {f.name}: {e}')

if __name__ == '__main__':
    main()
