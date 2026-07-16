---
layout: page
title: 01_Visualización_imágen
parent: "Introducción a GEE"
nav_order: 2
---

# 01_Visualización_imágen

## Objectivos
1. Importar imágen desde el catalogo de datos
2. Visualizar en el mapa
3. Clasificar valores continuos

### Paso 1: Cargar conjunto de datos del Earth Catalog
En este ejercicio vamos a `importar` el modelo de elevación de 30 m de NASA SRTM. El [Data Catalog](https://developers.google.com/earth-engine/datasets) de Earth Engine es un repositorio público con cientos de conjuntos de datos geoespaciales listos para usar (imágenes satelitales, modelos de elevación, cobertura terrestre, clima, entre otros). Cada dataset tiene una página propia con su descripción, resolución, fechas disponibles, bandas, y — lo más importante — su **ID único**, que es lo que necesitamos para cargarlo en nuestro código.

Para encontrar el dataset SRTM, puede buscar "SRTM" directamente en la barra de búsqueda de la parte superior del Code Editor. Al hacer clic en el resultado, se abre una ventana con la documentación del dataset, incluyendo un botón `Import` que agrega automáticamente la imagen a su script como una variable.

<p align="center">
  <img src="images/intro-gee/fig8.png" width="600" style="margin: 10px 0;">
</p>


También podemos importar el dataset directamente escribiendo el código, en lugar de usar el botón `Import`. Esto nos da más control sobre el nombre de la variable y hace que el script sea más fácil de leer y compartir. Para esto, copiamos el ID del dataset que aparece en la página del catálogo (`USGS/SRTMGL1_003`) y lo usamos dentro de la función `ee.Image()`:

```javascript
var elevacion = ee.Image("USGS/SRTMGL1_003");
```

### Paso 2: Visualizar en el mapa
Una vez que tenemos el raster cargado, usamos la función `Map.addLayer()` para visualizar en el mapa. Toma como parámetros la imagen a mostrar, los parámetros de visualización (opcional) y un nombre de capa (string) que aparecerá en la lista de capas del mapa.

```javascript
Map.addLayer(elevacion,"","Elevacion");
```

### Paso 3: Clasificar valores con `.where()`
Se utiliza la función `.where()` para reasignar un nuevo valor a los píxeles que cumplan una condición. La condición se define con operadores de comparación como `.gt()` (greater than, "mayor que"), `.lt()` (menor que), o `.eq()` (igual a).

El siguiente código crea una imagen base de valor 0 con `ee.Image(0)`, y luego reclasifica los píxeles en distintas zonas de elevación: todos los píxeles con elevación mayor a 50 m toman el valor 50, los mayores a 150 m toman el valor 150, y así sucesivamente. El orden de las condiciones importa, ya que cada `.where()` se aplica sobre el resultado del anterior, sobrescribiendo los valores donde la condición se cumple.

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

Script "`01_Visualización_imágen`" del repositorio y la carpeta `day_1` o link directo:
[https://code.earthengine.google.com/fb060a9e239501ce553cbf9257b073fd?asset=projects%2Fee-paulapaz1101%2Fassets%2Fbiodiversity_workshop](https://code.earthengine.google.com/fb060a9e239501ce553cbf9257b073fd?asset=projects%2Fee-paulapaz1101%2Fassets%2Fbiodiversity_workshop)




