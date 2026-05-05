#!/usr/bin/env python3
"""
Concatena todos los archivos .pkl en `json_a_csv_pickle/` en un único DataFrame,
normaliza columnas, elimina duplicados por texto de pregunta y guarda
`combined.csv` y `combined.pkl` en la misma carpeta.
"""

from pathlib import Path
import pandas as pd

DIR = Path(__file__).resolve().parent
pkl_files = sorted(DIR.glob('*.pkl'))

frames = []
for p in pkl_files:
    if p.name in ('combined.pkl',):
        continue
    try:
        df = pd.read_pickle(p)
        print(f'Loaded {p.name} ({len(df)} rows)')
        frames.append(df)
    except Exception as e:
        print(f'Error loading {p.name}: {e}')

if not frames:
    print('No PKL files encontrados para combinar.')
    raise SystemExit(1)

combined = pd.concat(frames, ignore_index=True, sort=False)

# Normalizar columnas esperadas
cols_req = ['Pregunta'] + [c for c in ['A','B','C','D','E','F']] + [f'SPAN_{c}' for c in ['A','B','C','D','E','F']] + ['MULTIPLE']
for c in cols_req:
    if c not in combined.columns:
        if c.startswith('SPAN_') or c == 'MULTIPLE':
            combined[c] = 0
        else:
            combined[c] = None

combined = combined[cols_req]

# Eliminar duplicados basados en texto de pregunta (trim)
combined['Pregunta'] = combined['Pregunta'].astype(str).str.strip()
before = len(combined)
combined = combined.drop_duplicates(subset=['Pregunta']).reset_index(drop=True)
after = len(combined)
print(f'Filas combinadas: {before} -> únicas: {after}')

csv_out = DIR / 'combined.csv'
pkl_out = DIR / 'combined.pkl'
combined.to_csv(csv_out, index=False, encoding='utf-8')
combined.to_pickle(pkl_out)
print(f'Wrote {csv_out} and {pkl_out}')
