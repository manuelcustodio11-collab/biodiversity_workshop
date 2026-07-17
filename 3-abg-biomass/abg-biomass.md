---
layout: page
title: "Introducción a ABG Biomass"
permalink: /3-abg-biomass
has_children: true
nav_order: 2
---



# Introducción a GEE

## Objetivo 
Navegar en la interfaz de Google Earth Engine (GEE), explorar conjuntos de datos globales disponibles en el Data Catalog, recortar esos conjuntos de datos para un área de interés (ROI) de su país, analizar el riesgo del ecosistema y calcular una serie de indicadores de biodiversidad.

## Set-up
1. [Instrucciones rápidas para iniciar en GEE](https://developers.google.com/earth-engine/guides/quickstart_javascript?hl=es-419) Un proyecto de Google Cloud registrado para Earth Engine:.
2. [Libro GEE](https://www.eefabook.org/) Teledetección Basada en la Nube con Google Earth Engine: Fundamentos y Aplicaciones".

# Qué es Google Earth Engine?
“Una plataforma de escala planetária para datos y análisis geoespaciales”.

Google Earth Engine combina un catálogo de varios petabytes de imágenes satelitales y conjuntos de datos geoespaciales con capacidades de análisis a escala planetaria. Los científicos, investigadores y desarrolladores usan Earth Engine para detectar cambios, mapear tendencias y cuantificar diferencias en la superficie de la Tierra. Earth Engine ahora está disponible para uso comercial y sigue siendo gratuito para uso académico y de investigación.

La infraestructura de procesamiento paraleliza automáticamente el análisis en muchos procesadores en muchas computadoras en los centros de datos de Google. Eso resulta en reducción de los tiempos de procesamiento en órdenes de magnitud mediante el uso de potencia informática distribuida y basada en la nube. Además los datos están todos centralizados en la nube.

<p align="center">
  <img src="images/intro-gee/fig1.png" width="600" style="margin: 10px 0;">
</p>

# Conjunto de datos
El archivo de datos públicos de Earth Engine incluye más de cuarenta años de imágenes históricas y conjuntos de datos científicos, actualizados y ampliados diariamente.

<p align="center">
  <img src="images/intro-gee/fig2.png" width="600" style="margin: 10px 0;">
</p>
- Más de 800 conjuntos de datos públicos
- Más de 70 petabytes de datos
- Más de 100 conjuntos de datos agregados anualmente
- 1+ PB de datos nuevos cada mes (esos números están siempre siendo actualizados)

Tipos de datos:
- Imágenes de diferentes satélites
- Datos geofísicos (topografía, hidrología)
- Uso y cobertura de la tierra
- Clima y tiempo
- Datos vectoriales (Cuencas, red de transporte, etc)

Para explorar todos los conjuntos de datos:
https://developers.google.com/earth-engine/datasets
https://developers.google.com/earth-engine/datasets/catalog

<p align="center">
  <img src="images/intro-gee/fig3.png" width="600" style="margin: 10px 0;">
</p>


## Interfaz

El Editor de código (Code Editor) es un entorno de desarrollo integrado para la API JavaScript de Earth Engine. Ofrece una manera fácil de escribir, depurar, ejecutar y administrar código. Una vez que haya seguido la documentación de Google sobre el registro de una cuenta de Earth Engine, debe seguir la documentación para abrir el [Code Editor](https://code.earthengine.google.com/). Cuando visite por primera vez el Editor de código, verá una pantalla como la que se muestra abajo.

<p align="center">
  <img src="images/intro-gee/fig5.png" width="600" style="margin: 10px 0;">
</p>

El menú de la izquierda consta de tres pestañas: `Scripts`, `Docs`, `Assets`: En la sección `Scripts` tienes todo tu código almacenado y organizado en repositorios, carpetas, subcarpetas y archivos. Puede organizar sus scripts por proyecto y también puede compartir permisos de acceso o edición con otros usuarios de GEE. `Docs` es la [Documentación del API](https://developers.google.com/earth-engine/) con funciones y sus explicaciones. En `Assets` puedes almacenar y organizar archivos que carga desde su computadora o que descarga de GEE. En el centro, encontrará el editor de código basado en la web donde puede insertar su código JavaScript sin ninguna instalación previa de software. Con el botón `Apps`, puede desarrollar pequeñas aplicaciones automatizadas para procesar y visualizar datos de una manera e interfaz más fáciles de usar, mientras que el botón `Run` ejecuta el código. A la derecha, tenemos tres paneles principales: `Inspector`, `Console` y `Tasks`. En la zona `Console` podemos ver errores de código o valores impresos, esto nos permite depurar nuestro script. Veremos la funcionalidad de estos a medida que realicemos los próximos ejercicios.

<p align="center">
  <img src="images/intro-gee/fig7.png" width="600" style="margin: 10px 0;">
</p>
## Datos a emplear en las sesiones prácticas
1. Imágenes Landsat-8, Sentinel-2
2. Linea base para análisis de riesgo de ecosistemas:
- Tipología de ecosistemas, fuente: IUCN (Level 3) - Global
- Pérdida y ganancia de bosque , fuente: Hansen - Global
- Aboveground Biomass, fuente:- Global
- Ecoregiones, fuente: Global

## Repositorio GEE
[https://code.earthengine.google.com/?accept_repo=users/paulapaz1101/biodiversity_workshop](https://code.earthengine.google.com/?accept_repo=users/paulapaz1101/biodiversity_workshop)


## Nota: 
El contenido de esta sesión ha sido adaptada o tomada del libro EEFA, capítulo F1, https://www.eefabook.org/