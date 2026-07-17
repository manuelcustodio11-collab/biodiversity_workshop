---
layout: page
title: 01_Visualización_imágen
parent: "Introducción a GEE"
nav_order: 2
---

# 01_Visualización_imágen
## Objetivos
1. Importar imágen desde el catalogo de datos
2. Visualizar en el mapa
3. Clasificar valores continuos

## Datos
- SRTM , collection: `ee.Image("USGS/SRTMGL1_003")`

## Método
- Emplear función `.where()`
- Uso de operadores de comparación `.gt()` (greater than, "mayor que").

## Paso a paso

### Paso 1: Cargar conjunto de datos del Earth Catalog
En este ejercicio vamos a `importar` el modelo de elevación de 30 m de NASA SRTM desde el [Data Catalog](https://developers.google.com/earth-engine/datasets) de Earth Engine Cada dataset tiene una página propia con su descripción, resolución, fechas disponibles, bandas, y su **ID único**, que es lo que necesitamos para cargarlo en nuestro código.

Para encontrar el dataset SRTM, puede buscar "SRTM" directamente en la barra de búsqueda de la parte superior del Code Editor. Al hacer clic en el resultado, se abre una ventana con la documentación del dataset, incluyendo un botón `Import` que agrega automáticamente la imagen a su script como una variable.
<p align="center">
  <img src="{{ '/images/intro-gee/fig8.png' | relative_url }}" width="400" style="margin: 10px 0;">
</p>

También podemos importar el dataset directamente escribiendo el código, en lugar de usar el botón `Import`. Esto nos da más control sobre el nombre de la variable y hace que el script sea más fácil de leer y compartir. Para esto, copiamos el ID del dataset que aparece en la página del catálogo (`USGS/SRTMGL1_003`) y lo usamos dentro de la función `ee.Image()`:

```javascript
var elevacion = ee.Image("USGS/SRTMGL1_003");
```

### Paso 2: Visualizar en el mapa
Utilizar la función `Map.addLayer()` para visualizar el objeto `Image` en el mapa. La función tiene tres parámetros la imagen a visualizar, un objeto de parámetros de visualización (opcional, aquí se deja vacío `""`), y un nombre de capa (string) que identificará la capa en el panel `Layers`.

```javascript
Map.addLayer(elevacion,"","Elevacion");
```

### Paso 3: Clasificar valores con `.where()`
Crear una imagen base de valor constante 0 usando `ee.Image(0)`. Sobre esta imagen, aplicar la función `.where(condición, valor)` de forma encadenada para reasignar valores a los píxeles que cumplan cada condición de altitud, definida con el operador `.gt()` (greater than, "mayor que"). (Existen otros operadores de comparación como `.lt()` (menor que), o `.eq()` (igual a)). Esto reclasificará los pixeles en distintas zonas de elevación: todos los píxeles con elevación mayor a 50 m toman el valor 50, los mayores a 150 m toman el valor 150, y así sucesivamente. El orden de las condiciones importa, ya que cada `.where()` se aplica sobre el resultado del anterior, sobrescribiendo los valores donde la condición se cumple.

Finalmente emplea la función `.updateMask(elevacion.gt(0))`para enmascarar (oculta) los píxeles donde la elevación original es menor o igual a 0, típicamente correspondientes a cuerpos de agua o áreas sin datos válidos.

```javascript
var zonas = ee.Image(0)
    .where(elevacion.gt(50), 50)
    .where(elevacion.gt(150), 150)
    .where(elevacion.gt(200), 200)
    .updateMask(elevacion.gt(0));
```

Finalmente utilizar la función `Map.addLayer()` para visualizar en el mapa el nuevo raster de elevación clasificado. Los parámetros de visualización corresponden, nombre de variable raster clasificado, parámetros de visualización, nombre de la capa.
```javascript
Map.addLayer(zonas, 
              {min: 0, max: 200, palette: ["blue", "green", "yellow", "red"]},
              "Elevación clasificada");
```

### Código completo
Script "`01_Visualización_imágen`" del repositorio y la carpeta `day_1` o link directo:
[https://code.earthengine.google.com/fb060a9e239501ce553cbf9257b073fd?asset=projects%2Fee-paulapaz1101%2Fassets%2Fbiodiversity_workshop](https://code.earthengine.google.com/fb060a9e239501ce553cbf9257b073fd?asset=projects%2Fee-paulapaz1101%2Fassets%2Fbiodiversity_workshop)




