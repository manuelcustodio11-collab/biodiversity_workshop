---
layout: page
title: 00_Introduccion_Satellite_Embedding
parent: "Introducción a Embedding"
nav_order: 1
---

## 00_Introduccion_Satellite_Embedding

# ¿Qué es el dataset Satellite Embedding?

En julio de 2025, Google presentó en Earth Engine el dataset **Satellite Embedding** (`GOOGLE/SATELLITE_EMBEDDING/V1/ANNUAL`), generado con **AlphaEarth Foundations**, un modelo geoespacial de Google DeepMind. En vez de entregar bandas espectrales tradicionales (rojo, verde, infrarrojo, etc.), este dataset entrega, para cada píxel de 10 m y cada año desde 2017, un **vector numérico de 64 valores** que resume las condiciones de esa porción de terreno en ese año.

Ese resumen no sale de una sola fuente satelital: el modelo fue entrenado combinando imágenes ópticas y térmicas de Sentinel-2 y Landsat, radar Sentinel-1 (que atraviesa nubes), altura del dosel (GEDI), un modelo global de elevación, variables climáticas, y otras fuentes geoespaciales, incluyendo texto descriptivo asociado a cada ubicación. El resultado es lo que Google llama un "embedding": una representación compacta pero rica en información, pensada para usarse directamente en los clasificadores y algoritmos de Earth Engine, sin pasos previos de corrección atmosférica, enmascarado de nubes o cálculo de índices espectrales.

Un detalle conceptual importante: las 64 bandas de un embedding no son medidas físicas directas (no hay una banda "roja" o una banda "de humedad"). Son coordenadas dentro de un espacio matemático de 64 dimensiones, aprendidas por el modelo. Por eso no tiene mucho sentido interpretar una banda individual de forma aislada; lo que sí tiene sentido, y es la base de casi todo lo que hacemos con este dataset, es **comparar vectores completos entre sí**.

# ¿Por qué nos interesa para este proyecto?

Un pipeline de monitoreo de biodiversidad y bosque alineado al Marco Mundial de Biodiversidad Kunming-Montreal suele combinar datasets especializados: Hansen Global Forest Change para deforestación, WorldCover/Dynamic World para cobertura, WDPA y ecorregiones RESOLVE para representatividad de áreas protegidas, MODIS y Sentinel-2 para productividad, entre otros. Cada uno de esos productos está optimizado para detectar **un tipo específico** de cambio o condición.

Satellite Embedding no reemplaza a ninguno de esos productos especializados, pero cumple un rol distinto y complementario: al resumir múltiples fuentes en un solo vector por píxel, permite detectar **cualquier tipo de cambio en la superficie** —no solo tala rasa, también degradación gradual, cambios en cuerpos de agua, expansión urbana, o transformaciones que un solo índice no capturaría— con un único cálculo relativamente simple: comparar el vector de un año contra el vector de otro año.

Esto es exactamente lo que se explora en los dos scripts de la serie de taller:

- **[01_Change_Detection_Embeddings](./01_Change_Detection_Embeddings.md)**, que detecta pérdida de bosque comparando embeddings de dos años, restringiendo la búsqueda a una máscara de bosque para distinguir pérdida de ganancia, y valida el resultado contra Hansen GFC.
- El script de representatividad de áreas protegidas y ecorregiones (Meta 3 — 30x30), que usa un enfoque distinto (WDPA + RESOLVE) pero se beneficia del mismo principio de trabajar con datasets ya listos para análisis a escala país.

En ambos casos, la validación cruzada contra un producto especializado (Hansen) es clave: los embeddings son potentes para detectar que "algo cambió", pero no explican por sí solos qué tipo de cambio fue. Combinarlos con productos temáticos permite aprovechar lo mejor de los dos mundos: la sensibilidad amplia de los embeddings y la interpretabilidad de un producto especializado.

# Cómo funciona la comparación entre años

Cada vector de embedding está normalizado a longitud 1 (es un vector unitario). Esto tiene una consecuencia práctica muy útil: comparar dos vectores del mismo píxel en dos años distintos se reduce a multiplicarlos componente a componente y sumar los 64 resultados (el producto punto), lo que equivale matemáticamente al **coseno del ángulo** entre ambos vectores.

- Un valor cercano a **1.0** significa que los dos vectores son casi idénticos: el píxel se mantuvo estable entre esos dos años.
- Un valor cercano a **0.0** significa que los vectores son muy distintos: el píxel cambió de forma sustancial, sin que el cálculo diga todavía *qué tipo* de cambio fue.

Como cada embedding anual resume un año completo de observaciones, también incorpora dinámica estacional (fenología de la vegetación, ciclos de cultivo, nieve estacional), así que un umbral de similitud demasiado estricto puede confundir variabilidad normal dentro del año con cambio real —de ahí la importancia de ajustar el umbral revisando el histograma y comparando visualmente contra imágenes Sentinel-2, como se hace en el script de detección de cambios.

# Otros usos posibles del dataset

Más allá de la comparación año a año que usamos en el taller, el dataset habilita otros flujos de trabajo que pueden ser relevantes para líneas futuras del proyecto:

- **Búsqueda por similitud**: dado un punto de referencia (por ejemplo, un relicto de bosque bien conservado), encontrar automáticamente otras zonas con condiciones de superficie similares dentro del país o la región.
- **Clustering no supervisado**: agrupar píxeles en categorías sin necesidad de datos etiquetados previamente, útil para explorar patrones de paisaje antes de invertir en un mapeo temático completo.
- **Clasificación supervisada con pocas muestras**: entrenar clasificadores (kNN, Random Forest) usando embeddings en lugar de bandas espectrales crudas, lo que en la práctica reduce bastante la cantidad de puntos de entrenamiento necesarios para lograr buena precisión — un punto a favor cuando el trabajo de campo o la fotointerpretación son limitados.
- **Regresión**: estimar variables continuas (por ejemplo, biomasa aérea) a partir de los embeddings y un conjunto de puntos de referencia con medición real.

Estos casos de uso no están implementados todavía en este pipeline, pero quedan como posibles próximos pasos si el enfoque de detección de cambios muestra buenos resultados de validación.

# Recursos para profundizar

- Dataset en el catálogo de Earth Engine: [`GOOGLE/SATELLITE_EMBEDDING/V1/ANNUAL`](https://developers.google.com/earth-engine/datasets/catalog/GOOGLE_SATELLITE_EMBEDDING_V1_ANNUAL)
- Artículo original de introducción del dataset (Google Earth, en inglés): [AI-powered pixels: Introducing Google's Satellite Embedding dataset](https://medium.com/google-earth/ai-powered-pixels-introducing-googles-satellite-embedding-dataset-31744c1f4650)
- Demo interactiva de búsqueda por similitud: [goo.gle/satellite-embedding-similarity-demo](http://goo.gle/satellite-embedding-similarity-demo)
- Serie de tutoriales oficiales de Earth Engine sobre el dataset: introducción, búsqueda por similitud, clasificación no supervisada, clasificación supervisada (mapeo de manglares) y regresión (biomasa aérea) — disponibles en [developers.google.com/earth-engine/tutorials/community](https://developers.google.com/earth-engine/tutorials/community).
