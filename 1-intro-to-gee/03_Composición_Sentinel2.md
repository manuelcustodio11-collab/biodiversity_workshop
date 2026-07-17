---
layout: page
title: 03_Composición_Sentinel2
parent: "Introducción a GEE"
nav_order: 4
---

# 03_Composición_Sentinel2
## Objetivo
1. Definir un área de interés usando límites administrativos (FAO GAUL).
2. Filtrar, enmascarar nubes y calcular índices espectrales sobre una colección Sentinel-2.
3. Generar distintos tipos de composición (mediana, mosaico de calidad) y exportarlos.

## Datos
- Límites administrativos, nivel pais (level0) FAO, collection: `FAO/GAUL/2015/level0`
<p align="center">
  <img src="{{ '/images/intro-gee/fig11.png' | relative_url }}" width="600" style="margin: 10px 0;">
</p>

- Imágenes Sentinel-2, Nivel 2A (reflectancia de superficie), collection: `COPERNICUS/S2_SR`
<p align="center">
  <img src="{{ '/images/intro-gee/fig12.png' | relative_url }}" width="600" style="margin: 10px 0;">
</p>

## Método
- Enmascaramiento de nubes mediante la banda de calidad `QA60` y operadores de bits (`bitwiseAnd`).
- Cálculo de índices espectrales normalizados con `normalizedDifference()`.
- Aplicación de funciones a toda una colección mediante `.map()`.
- Composición de la serie temporal con `.median()` y `.qualityMosaic()`.
- Exportación de resultados a Google Drive y como GEE Asset.

## Paso a paso

### Paso 1: Definir el área de interés
Importar la colección de límites administrativos a nivel país y filtrarla con `ee.Filter.eq()` para obtener el feature de Colombia.

```javascript
var limites = ee.FeatureCollection('FAO/GAUL/2015/level0');
var area = limites.filter(
  ee.Filter.eq('ADM0_NAME', 'Colombia')
);
```

### Centrar el mapa y visualizar el área

```javascript
Map.centerObject(area, 9);
Map.addLayer(area, {}, 'Área de Interés', false);
```

### Paso 2: Cargar y filtrar la colección Sentinel-2

Cargar `COPERNICUS/S2_SR_HARMONIZED` y filtrarla por ubicación (`.filterBounds()`), fecha (`.filterDate()`) y porcentaje de nubes (`ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20)`).

```javascript
var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED');

var s2filtrado = s2.filterBounds(area)
                   .filterDate('2025-01-01', '2026-01-01')
                   .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20));

print('Número de imágenes filtradas', s2filtrado.size());
```

> ** Nota técnica:** Vigencia de la banda `QA60` según el rango de fechas**
> - **Antes del 25 de enero de 2022:** `QA60` funciona normalmente.
> - **Entre el 25 de enero de 2022 y el 28 de febrero de 2024:** la banda `QA60` estuvo vacía (siempre en 0, "sin nubes"), incluso en escenas totalmente nubladas. Esto no genera un error de código, sino resultados incorrectos.
> - **Desde el 28 de febrero de 2024:** Google reconstruyó `QA60` de forma retroactiva a partir de otra banda (`MSK_CLASSI`), por lo que volvió a ser confiable para todo el historial de datos.
>
> **Recomendación:** para nuevos análisis, especialmente si trabaja con fechas recientes o no está seguro del rango temporal, considerar usar el dataset [`COPERNICUS/S2_CLOUD_PROBABILITY`](https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_S2_CLOUD_PROBABILITY) (basado en el algoritmo *s2cloudless*) en lugar de `QA60`, ya que es más robusto y no depende de estos cambios de procesamiento histórico de ESA.

### OPCIONAL: Verificar que las imágenes contengan la banda `QA60`
Antes de aplicar la función de enmascaramiento, filtrar la colección para conservar únicamente las imágenes que efectivamente contienen la banda `QA60`, usando `ee.Filter.listContains()`.

```javascript
s2filtrado = s2filtrado.filter(
  ee.Filter.listContains('system:band_names', 'QA60')
);
```

### Paso 3: Preprocesamiento de series temporales (Enmascaramiento de nubes y cálculo de índices)

### Crear la función de enmascaramiento de nubes (`QA60`)
La banda de calidad `QA60` proporciona información sobre la ocurrencia de nubes y otros aspectos de calidad de imagen.
La información se almacena en bits y usamos la función `bitWiseAnd` para extraerlo.


```javascript
function mascaraNubesS2(imagen) {
  var qa = imagen.select('QA60');

  var bitmaskNubes = 1 << 10;
  var bitmaskCirrus = 1 << 11;

  var mascara = qa.bitwiseAnd(bitmaskNubes).eq(0)
      .and(qa.bitwiseAnd(bitmaskCirrus).eq(0));
  
  var bandas = imagen.select('B.').divide(10000);
  
  return imagen.addBands(bandas, null, true).updateMask(mascara);
}
```

### Funcion para calcular índices
<!-- NDVI: (NIR-Red)/(NIR+Red)
LSWI: (NIR-SWIR1)/(NIR+SWIR1)
NDMI: (SWIR2-Red)/(SWIR2+Red) -->

| Índice | Fórmula |
|---|---|
| **NDVI** | (NIR − Red) / (NIR + Red) |
| **LSWI** | (NIR − SWIR1) / (NIR + SWIR1) |
| **NDMI** | (SWIR2 − Red) / (SWIR2 + Red) |

Utilizamos la función de GEE `normalizedDifference`

```javascript
function calcularIndices(imagen){
  var ndvi = imagen.normalizedDifference(['B8', 'B4']).rename('ndvi');
  var lswi = imagen.normalizedDifference(['B8', 'B11']).rename('lswi');
  var ndmi = imagen.normalizedDifference(['B12', 'B3']).rename('ndmi');
  var mndwi = imagen.normalizedDifference(['B3', 'B11']).rename('mndwi');
  
  return ee.Image.cat([imagen, ndvi, lswi, ndmi, mndwi]);
}
```

Aplicar funciones de pre procesamiento a las imágenes en la colección.
```javascript
var s2preProcesado = s2filtrado.map(mascaraNubesS2)
                               .map(calcularIndices);

print(s2preProcesado.first());
```

### Paso 4: Visualizar las primeras imágenes no procesadas y preprocesadas
```javascript
var primeraNoProcesada = s2filtrado.first();

var paramVisNoProcesada = {
  bands: ['B4', 'B3', 'B2'],
  min: -100,
  max: 1800
};

Map.addLayer(primeraNoProcesada, 
             paramVisNoProcesada, 
             'Primera Imagen No Procesada');

var primeraPreProcesada = s2preProcesado.first();

var paramVisPreProcesada = {
  bands: ['B4', 'B3', 'B2'],
  min: 0.0,
  max: 0.18
};

Map.addLayer(primeraPreProcesada, 
             paramVisPreProcesada, 
             'Primera Imagen Preprocesada');
```

### Paso5: Crear una composición
Utilizar las siguientes funciones para comparar diferentes agregaciones:`.min()`; `.max()`; `.mean()`; `.median()`

```javascript
var composicion = s2preProcesado.median().clip(area);
Map.addLayer(composicion, paramVisPreProcesada, 'Composición Preprocesada');
```

### Generar un mosaico de calidad basado en la imagen más reciente
```javascript
var mosaicoMasReciente = s2preProcesado.map(function(imagen) {
  return imagen.addBands(
    ee.Image(ee.Number(imagen.get('system:time_start')))
    .rename('tiempo')).toFloat();
  
}).qualityMosaic('tiempo');

Map.addLayer(mosaicoMasReciente, paramVisPreProcesada, 'Mosaico Más Reciente');
```

### Paso 6: Exportar la composición a Google Drive y GEE Asset

Exportar a Google Drive.
```javascript
Exportar para Google Drive.
Export.image.toDrive({
  image: composicion.toFloat(),
  description: 'composicionMedianaSentinel2_1921',
  fileNamePrefix: 'composicionMedianaSentinel2_1921',
  region: area,
  scale: 10,
  maxPixels: 1e13
});

Exportar como un GEE Asset.
Export.image.toAsset({
  image: composicion,
  description: 'composicionMedianaSentinel2_1921',
  assetId: 'projects/ee-paulapaz1101/assets/biodiversity_workshop/GEODATA/composicionMedianaSentinel2', //! ACTUALIZAR A RUTA PROPIA
  region: area,
  scale: 10,
  maxPixels: 1e13
});
```

> **Nota técnica:** Recuerda actualizar el `assetId` con la ruta de tu propio proyecto de Earth Engine antes de ejecutar la exportación.

**Ejecutar las exportaciones**

Ir al panel `Tasks` y presionar `Run` sobre cada tarea de exportación generada.

