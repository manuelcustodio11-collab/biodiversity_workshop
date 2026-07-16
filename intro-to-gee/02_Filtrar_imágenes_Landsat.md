---
layout: page
title: 02_Filtrar_imágenes_Landsat
parent: "Introducción a GEE"
nav_order: 3
---
# 01_Visualización_imágen
## Objetivo
1. Filtrar una colección de imágenes Landsat8 .
2. Generar una composición de mediana para Colombia.
3. Comparar el resultado con y sin un filtro de cobertura de nubes.


## Datos
- Límites administrativos, nivel pais (level0) FAO, collection: `FAO/GAUL/2015/level0`
- Imágenes Landsat8 Collection 2, Nivel 2, collection: `LANDSAT/LC08/C02/T1_L2`

## Método
- Emplear función `.where()`
- Uso de operadores de comparación `.gt()` (greater than, "mayor que"), `.lt()` (menor que), o `.eq()` (igual a).

## Paso a paso

### Paso 1: Cargar conjunto de datos desde el Data Catalog
Importar la colección de límites administrativos (`FAO/GAUL/2015/level0`, nivel país) y la colección de imágenes Landsat 8 Collection 2, Nivel 2 (`LANDSAT/LC08/C02/T1_L2`), usando funciones `ee.FeatureCollection()` y `ee.ImageCollection()` respectivamente.

```javascript
var table = ee.FeatureCollection("FAO/GAUL/2015/level0");
var landsat8 = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2");
```



