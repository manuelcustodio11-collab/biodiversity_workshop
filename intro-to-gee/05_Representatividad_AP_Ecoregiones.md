---
layout: page
title: 05_Representatividad_AP_Ecoregiones
parent: intro-to-gee
nav_order: 1
---

# Objetivos
Calcular dos indicadores de conservación dentro de un área de interés (AOI):
1. El porcentaje del territorio bajo alguna figura de protección (indicador vinculado a la Meta 3 — "30x30" — del Marco Mundial de Biodiversidad Kunming-Montreal).
2. La representatividad ecológica por ecorregión, para identificar vacíos de conservación.


## Datos
- WCMC/WDPA/current/polygons — Base de Datos Mundial de Áreas Protegidas (WDPA).
Collection: ee.FeatureCollection("WCMC/WDPA/current/polygons") 
- RESOLVE/ECOREGIONS/2017 — Ecorregiones terrestres del mundo (Dinerstein et al., 2017).
Collection: ee.FeatureCollection("RESOLVE/ECOREGIONS/2017") 
- FAO/GAUL_SIMPLIFIED_500m/2015/level0 — Límites administrativos nacionales, pre-simplificados. 
Collection: ee.FeatureCollection("FAO/GAUL_SIMPLIFIED_500m/2015/level0") 

## Métodos
1. Rasterización de vectores
2. Calcula el área de la geometría
3. Filtrado de datos


## Paso a paso







