# 🌐 AWS Certification Practice Tests 📝

Aplicación web para practicar exámenes de certificación AWS con experiencia de test real: navegación por pregunta, seguimiento visual del progreso, marcadores para revisión y corrección detallada.

Demo: [Practice Tests](https://javiloperwebtest.onrender.com)

## ✨ Qué ofrece el proyecto

- Banco de preguntas para varias certificaciones AWS.
- Flujo de examen pregunta a pregunta (sin scroll infinito).
- Panel numerado con estado por pregunta: actual, respondida y marcada para revisar.
- Corrección visual al finalizar: aciertos y errores por pregunta y por opción.
- Copia completa del examen corregido para analizar respuestas en herramientas externas.
- Soporte EN/ES mediante datasets pretraducidos, con cambio de idioma instantáneo.
- Diseño responsive orientado a móvil.

## 🧰 Stack

- Backend: Flask + pandas
- Frontend: HTML, CSS y JavaScript vanilla
- Datos: bancos en formato PKL
- Despliegue: Render

## 🚀 Uso local rápido

```bash
python app.py
```

Abrir en navegador: `http://localhost:8080`

## 🗂️ Datos y mantenimiento

Los bancos principales se almacenan en `data/*.pkl`.

Si se incorporan nuevos PKL, conviene generar su versión en español para mantener traducción instantánea y evitar latencia en tiempo real.

### 🔁 Pretraducción de nuevos bancos

El script genera archivos `*_es.pkl` con columnas `Pregunta_ES`, `A_ES` ... `F_ES`.

Ejecutar para todos:

```bash
python scripts/pretranslate_pkl_to_es.py --data-dir data --sleep-ms 0 --workers 8
```

Ejecutar para un test concreto:

```bash
python scripts/pretranslate_pkl_to_es.py --data-dir data --test-name cloud_practitioner_C02 --sleep-ms 0 --workers 8
```

Si un test no tiene su `*_es.pkl`, el botón de traducción se desactiva automáticamente para ese banco.

## ⚠️ Disclaimer

- Proyecto educativo no afiliado ni respaldado por Amazon.
- Nombres de certificaciones y marcas usados solo como referencia.
- Recomendado complementar con material oficial de AWS.

## 🤝 Contribuciones

Si detectas errores o quieres proponer mejoras, puedes abrir un issue o compartir feedback.

🌟 Gracias por pasarte por el proyecto. Cualquier idea para mejorarlo es bienvenida.
