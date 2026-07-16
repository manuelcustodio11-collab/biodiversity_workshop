---
layout: page
title: 06_Stock_Perdida_Carbono
parent: "Introducción a GEE"
nav_order: 7
---
# 06_Stock_Perdida_Carbono

# Objetivos
Calcula para un área de interés (AOI), el stock de carbono forestal y estima cuánto de ese carbono se perdió por deforestación en un período reciente. Combina dos fuentes de carbono con distinto alcance (aéreo vs. aéreo+subterráneo) y un dataset independiente de cambio de cobertura forestal para detectar pérdida.
- Stock de carbono aéreo + subterráneo (un solo período de referencia, año 2010).
- Stock de carbono aéreo (con desagregación posible entre aéreo y subterráneo en la fuente).
- Carbono aéreo ubicado en píxeles donde hubo pérdida de bosque entre 2022 y 2024.

Nota importante de terminología: 'biomasa' y 'carbono' no son lo mismo. La biomasa es el peso seco de la vegetación; el carbono es, aproximadamente, el 47-50% de esa biomasa (factor de conversión estándar del IPCC). Ambos datasets usados en este script entregan directamente carbono (Mg C/ha), no biomasa cruda, aunque uno de ellos incluye la palabra 'biomass' en su nombre 

## Datos
1. WCMC/biomass_carbon_density/v1_0 — Carbono aéreo + subterráneo (WCMC): Dataset de UNEP-WCMC (Soto-Navarro et al., 2020) que reporta, para el año 2010, el carbono combinado de biomasa aérea y subterránea (ambos compartimentos sumados y convertidos a carbono con un factor 0.5) en una sola banda, 'carbon_tonnes_per_ha' (Mg C/ha). No tiene serie temporal: es una única imagen de referencia para circa 2010.
2. NASA/ORNL/biomass_carbon_density/v1 — Carbono aéreo y subterráneo por separado (ORNL): Dataset de NASA/ORNL (Spawn et al., 2020), también de referencia para 2010, pero con el carbono aéreo y subterráneo reportados en bandas separadas: 'agb' (aéreo) y 'bgb' (subterráneo), ambas en Mg C/ha. Este script usa únicamente la banda 'agb'.
3. UMD/hansen/global_forest_change_2024_v1_12 — Cambio de cobertura forestal (Hansen GFC): Serie de Hansen et al. (2013), actualizada anualmente. La banda 'lossyear' indica, píxel por píxel, el año en que ocurrió pérdida de cobertura forestal, codificado como número entero: 0 = sin pérdida, 1 = año 2001, 2 = año 2002, …, 24 = año 2024.
4. WCMC/WDPA/current/polygons y FAO/GAUL_SIMPLIFIED_500m/2015/level0 — Definición del AOI: Se usan para delimitar el área de interés: la WDPA para un área protegida puntual (por ejemplo, un parque nacional), o el límite administrativo nacional simplificado de la FAO para un país completo.

## Métodos:

## Paso a paso
## Paso 1: Definir el área de interés y cargar las capas de carbono

Se define el AOI, se prepara una máscara ráster para recortar las imágenes por álgebra de bandas, y se cargan las dos capas de carbono ya recortadas a esa máscara.

```javascript
var area = WDPA.filter(ee.Filter.eq('NAME', 'Chingaza'));
var ESCALA = 30;

// var area = GAUL0.filter(ee.Filter.eq('ADM0_NAME', 'Colombia'));
// var ESCALA = 300;

var geom = area.geometry();
var geomBounds = geom.bounds(1000);
Map.centerObject(area, 7);

var MAXPIX = 1e13;
var TILESCALE = 16;

var maskAOI = ee.Image.constant(1).clip(geom).mask().rename('aoi');

var carbonoWCMC = ABGB
	.first()
    .select('carbon_tonnes_per_ha')
	.updateMask(maskAOI);

var carbonoORNL = GABGB
	.first()
	.select('agb')
    .updateMask(maskAOI);
```
