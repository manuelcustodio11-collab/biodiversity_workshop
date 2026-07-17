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
<p align="center">
  <img src="images/intro-gee/fig11.png" width="600" style="margin: 10px 0;">
</p>
- Imágenes Landsat8 Collection 2, Nivel 2, collection: `LANDSAT/LC08/C02/T1_L2`
<p align="center">
  <img src="images/intro-gee/fig9.png" width="600" style="margin: 10px 0;">
</p>
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
> **Nota técnica:** `FAO/GAUL/2015/level0` contiene un feature por cada país del mundo. Al usar `level0` (en lugar de `level2`), cada país corresponde a un único polígono, lo que facilita operaciones posteriores como `Map.centerObject()`.

**Filtrar la colección de países para obtener Colombia**

Usar función `ee.Filter.eq()` dentro de `.filter()` para seleccionar únicamente el feature cuyo atributo `ADM0_NAME` sea igual a `'Colombia'`.

```javascript
var region = table.filter(
  ee.Filter.eq('ADM0_NAME', 'Colombia'));
```

**Centrar el mapa y visualizar la región**

Centrar el mapa sobre la geometría de `region` con `Map.centerObject()`, especificando el nivel de zoom (8) como segundo parámetro. Luego agregar la capa al mapa con `Map.addLayer()`.

```javascript
Map.centerObject(region.geometry(), 8);
Map.addLayer(region, {}, 'Colombia');
```
### Paso 2: Filtrar imágenes Landsat 8 por fecha y región.
**Filtrar la colección Landsat 8 por fecha y ubicación**

Aplicar `.filterDate()` para restringir la colección a un rango de fechas (`2016-01-01` a `2020-01-01`), y `.filterBounds()` para limitar las imágenes a aquellas que intersectan la geometría de `region` correspondiente al límite de Colombia.

```javascript
var filtrado = landsat8
  .filterDate('2016-01-01', '2020-01-01')
  .filterBounds(region);
```

**Revisar la colección filtrada**

Usar `print()` para desplegar en la consola los metadatos de la colección y verificar cuántas imágenes cumplen los criterios de filtrado.

```javascript
print('Colección Landsat 8', filtrado);
print('Número de imágenes', filtrado.size());
```

En el panel `Console`, revise el valor devuelto por `filtrado.size()` para conocer el total de imágenes disponibles antes de continuar.

### Paso 3: Generar una composición de mediana y recortarla a la región
Usar `.median()` sobre la colección filtrada para generar una única imagen compuesta, calculando el valor mediano de cada píxel a través de todas las imágenes disponibles en el rango de fechas especificado en Paso 2. Luego, usar `.clip()` para recortar el resultado a los límites de `region`.

```javascript
var mediana = filtrado.median();
var cortado = mediana.clip(region);
```
### Paso 4: Seleccionar las bandas de color visible
Usar `.select()` para extraer únicamente las bandas correspondientes al rojo (`SR_B4`), verde (`SR_B3`) y azul (`SR_B2`), necesarias para una visualización en color natural (RGB).

```javascript
var resultado = cortado.select('SR_B4', 'SR_B3', 'SR_B2');
Map.addLayer(resultado, {min: 7230, max: 15000}, 'Cortado');
```

> **Nota técnica:** Los valores `min` y `max` (7230–15000) ajustan el contraste de visualización según el rango de reflectancia de superficie (`SR`) característico del producto Collection 2, Nivel 2 de Landsat 8. Para conocer los nombres de las bandas de la colección observar en el Data Catalog -> BANDS. 
<p align="center">
  <img src="images/intro-gee/fig10.png" width="600" style="margin: 10px 0;">
</p>


### Paso 4: Filtrar imágenes por porcentaje de cobertura de nubes

Aplicar un filtro adicional sobre la colección `filtrado` usando `ee.Filter.lt()`, para conservar únicamente las imágenes cuyo atributo `CLOUD_COVER_LAND` sea menor a 20 (es decir, menos del 20% de nubes sobre tierra).

```javascript
var filtradoNubes = filtrado.filter(ee.Filter.lt('CLOUD_COVER_LAND',20));
print('Número de imágenes con filtro de nubes', filtradoNubes.size());
```

Comparar el resultado de `filtradoNubes.size()` con el de `filtrado.size()` para verificar cuántas imágenes fueron descartadas por el filtro de nubes.

**Generar y visualizar la composición filtrada por nubes**

Repetir el proceso de mediana, recorte y selección de bandas, esta vez sobre la colección `filtradoNubes`, y agregue el resultado al mapa como una nueva capa.

```javascript
var medianaNubes = filtradoNubes.median();
var cortadoNubes = medianaNubes.clip(region);
var resultado = cortadoNubes.select('SR_B4', 'SR_B3', 'SR_B2');
Map.addLayer(resultado, {min: 7230, max: 15000}, 'Cortado con filtro de nubes');
```

**Comparar resultados**

Use el panel `Layers` del mapa para alternar la visibilidad entre las capas `Cortado` y `Cortado con filtro de nubes`, y observe si el filtro de nubes mejora o no la calidad visual de la composición.

> **Nota:** Filtrar por menos del 20% de cobertura de nubes sobre tierra debería, en teoría, generar una mejor composición. Sin embargo, esto no siempre ocurre, ya que los algoritmos de enmascaramiento de nubes de Landsat no son 100% precisos en todos los casos.

**Actividad sugerida:**

- Revisar la cantidad de imágenes devueltas al filtrar con `lt` (menor que), así como los metadatos (`properties`) de algunas imágenes individuales dentro de la colección.
- Cambiar el filtro de `ee.Filter.lt()` a `ee.Filter.gt()` (mayor que) y observe cómo cambia la composición resultante al conservar únicamente las imágenes con **más** del 20% de cobertura de nubes.

### Código completo
Script "`02_Filtrar_imágenes_Landsat`" del repositorio y la carpeta `day_1` o link directo:
[https://code.earthengine.google.com/45446b456b63abfc2111b7e19cfc07bc?asset=projects%2Fee-paulapaz1101%2Fassets%2Fbiodiversity_workshop](https://code.earthengine.google.com/45446b456b63abfc2111b7e19cfc07bc?asset=projects%2Fee-paulapaz1101%2Fassets%2Fbiodiversity_workshop)
