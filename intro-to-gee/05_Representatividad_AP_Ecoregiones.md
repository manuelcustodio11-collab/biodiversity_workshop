---
layout: page
title: 05_Representatividad_AP_Ecoregiones
parent: "Introducción a GEE"
nav_order: 6
---

## 05_Representatividad_AP_Ecoregiones

# Objetivos
Calcular dos indicadores de conservación dentro de un área de interés (AOI):

1. El porcentaje del territorio bajo alguna figura de protección (indicador vinculado a la Meta 3 — "30x30" — del Marco Mundial de Biodiversidad Kunming-Montreal).
2. La representatividad ecológica por ecorregión, para identificar vacíos de conservación.

## Datos

- **`WCMC/WDPA/current/polygons`** — Base de Datos Mundial de Áreas Protegidas (WDPA). <br>
Collection: `ee.FeatureCollection("WCMC/WDPA/current/polygons")`
- **`RESOLVE/ECOREGIONS/2017`** — Ecorregiones terrestres del mundo (Dinerstein et al., 2017).<br>
 Collection: `ee.FeatureCollection("RESOLVE/ECOREGIONS/2017")`
- **`FAO/GAUL_SIMPLIFIED_500m/2015/level0`** — Límites administrativos nacionales, pre-simplificados.<br>
 Collection: `ee.FeatureCollection("FAO/GAUL_SIMPLIFIED_500m/2015/level0")`

## Métodos

1. Rasterización de vectores
2. Cálculo del área de la geometría
3. Filtrado de datos

## Paso a paso
## Paso 1: Definir el área de interés (AOI) y parámetros generales

Se define el AOI —en este caso, un país (Colombia) tomado del dataset de límites administrativos— y los parámetros que controlan precisión y rendimiento del resto del script.

```javascript
var area = GAUL0.filter(
	ee.Filter.eq('ADM0_NAME', 'Colombia')
);

var geom = area.geometry();
var geomBounds = geom.bounds(1000);

Map.centerObject(area, 6);

var ESCALA = 300;
var MAXPIX = 1e13;
var TILESCALE = 16;
```

**Parámetros:**
- **`GAUL0.filter(ee.Filter.eq('ADM0_NAME', 'Colombia'))`**: Selecciona, dentro de la colección de países, el feature (o features) cuyo atributo `ADM0_NAME` sea exactamente `'Colombia'`. `ee.Filter.eq()` es un filtro de igualdad exacta: el texto debe coincidir letra por letra.
- **`area.geometry()`**: Extrae la geometría del país seleccionado. Si el filtro devolviera más de un feature, esta geometría sería la unión de todos ellos.
- **`geom.bounds(1000)`**: Calcula el rectángulo envolvente (bounding box) de la geometría. El argumento (`1000`) es el `maxError` en metros: la tolerancia permitida en el cálculo, que acelera la operación sin afectar el resultado (un rectángulo no tiene curvas que simplificar).
- **`Map.centerObject(area, 6)`**: Centra el mapa sobre el AOI. El segundo argumento (`6`) es el nivel de zoom inicial del visor (escala logarítmica de Google Maps: valores más altos acercan la vista).
- **`ESCALA`**: Resolución en metros usada por todas las `reduceRegion` del script (ver Sección 3). 300 m es apropiado para un análisis a nivel país; para un AOI más chico (un parque, un municipio) se puede bajar a 30–100 m sin afectar el rendimiento.
- **`MAXPIX` y `TILESCALE`**: Ver Sección 3. Se definen acá como variables porque se reutilizan en los Pasos 6 y 8.

## Paso 2: Construir una máscara ráster del AOI

Se convierte el contorno del país en una máscara binaria (imagen), que se usará más adelante para recortar otras imágenes por álgebra de bandas en vez de por geometría vectorial.

```javascript
var maskPais = ee.Image.constant(1).clip(geom).mask().rename('pais');
```

**Parámetros:**
- **`ee.Image.constant(1)`**: Crea una imagen con valor 1 en absolutamente todos los píxeles del planeta (una banda constante).
- **`.clip(geom)`**: Recorta esa imagen a la forma exacta del AOI: fuera del polígono, los píxeles quedan sin dato (masked).
- **`.mask()`**: Extrae únicamente la máscara resultante (1 = dentro del AOI, 0/sin dato = fuera), separada de los valores de la imagen. Esta máscara se puede aplicar luego a cualquier otra imagen con `updateMask()`.
- **`.rename('pais')`**: Asigna un nombre a la banda, útil para identificarla si se combina con otras bandas más adelante.

## Paso 3: Calcular el área total del AOI

El área administrativa del país se obtiene directamente de su geometría, sin necesidad de procesar ninguna imagen.

```javascript
var haTotal = ee.Number(geom.area({maxError: 1000})).divide(10000);
```

**Parámetros:**
- **`geom.area({maxError: 1000})`**: Calcula el área de la geometría en metros cuadrados. `maxError` (en metros) es la tolerancia de simplificación permitida durante el cálculo: cuanto mayor, más rápido el cómputo, a costa de una precisión ligeramente menor en geometrías con muchos vértices.
- **`ee.Number(...)`**: Convierte el resultado (que GEE entrega como un objeto genérico del lado del servidor) a un tipo `Number` explícito, necesario para poder operar con `.divide()` a continuación.
- **`.divide(10000)`**: Convierte de metros cuadrados a hectáreas (1 ha = 10 000 m²).

## Paso 4: Identificar las áreas protegidas que intersectan el AOI

Se seleccionan, de toda la WDPA mundial, los polígonos de áreas protegidas que tocan el territorio del AOI y que tienen un estatus legal vigente.

```javascript
var wdpa = WDPA
	.filterBounds(geom)
    .filter(ee.Filter.neq('STATUS', 'Proposed'));

print('Áreas protegidas encontradas:', wdpa.size());
```

**Parámetros:**
- **`WDPA.filterBounds(geom)`**: Conserva únicamente los polígonos de la WDPA cuya geometría intersecta (toca, total o parcialmente) el AOI. Es una prueba geométrica real, no una comparación de rectángulos envolventes.
- **`ee.Filter.neq('STATUS', 'Proposed')`**: Excluye los registros cuyo campo `STATUS` sea `'Proposed'` (propuestas de protección aún no formalizadas), para que el indicador refleje solo protección legalmente vigente.
- **`wdpa.size()`**: Cuenta cuántos polígonos cumplen ambos filtros. Este número incluye TODA la cobertura de protección relevante para el AOI (áreas grandes, reservas vecinas, zonas superpuestas), porque eso es exactamente lo que se necesita para construir el raster del Paso 5: cuánta superficie protegida hay dentro del territorio, sin importar cuántos polígonos individuales la componen.

## Paso 5: Rasterizar las áreas protegidas (vector → raster)

Se convierte la colección de polígonos protegidos en una imagen binaria (0/1) recortada al AOI, que es la que se usa en el resto del script para calcular áreas.

```javascript
var apImg = wdpa
	.map(function (f) {
    	return f.set('valor', 1);
	})
	.reduceToImage({
    	properties: ['valor'],
    	reducer: ee.Reducer.first()
	})
	.gt(0)
	.unmask(0)
	.updateMask(maskPais)
	.rename('ap');
```

**Parámetros:**
- **`.map(function(f){ return f.set('valor', 1); })`**: Recorre cada polígono de `wdpa` y le asigna la propiedad numérica `'valor'` = 1. Esta propiedad es la que se va a "pintar" en cada píxel al rasterizar.
- **`.reduceToImage({ properties: ['valor'], reducer: ee.Reducer.first() })`**: Convierte la colección de polígonos en una imagen: para cada píxel, toma el valor de la propiedad `'valor'` del primer polígono que lo cubre (`ee.Reducer.first()` define ese criterio de desempate cuando hay superposición).
- **`.gt(0)`**: Convierte la imagen a estrictamente binaria: 1 donde había algún polígono, 0/sin dato en el resto.
- **`.unmask(0)`**: Reemplaza los píxeles sin dato (fuera de cualquier polígono protegido) por un 0 explícito. Es necesario para que, más adelante, al sumar bandas (Paso 8), esos píxeles se contabilicen correctamente como "no protegido" en vez de quedar excluidos del cálculo.
- **`.updateMask(maskPais)`**: Aplica la máscara del AOI calculada en el Paso 2: cualquier píxel fuera del país queda sin dato, sin importar si estaba o no protegido.
- **`.rename('ap')`**: Nombra la banda resultante `'ap'`, para poder referenciarla sin ambigüedad al combinarla con otras bandas.

## Paso 6: Calcular el indicador global de protección (Meta 3 — 30x30)

Se suma el área protegida en hectáreas y se calcula el porcentaje del AOI bajo alguna figura de protección.

```javascript
var haAP = ee.Number(
    apImg.multiply(ee.Image.pixelArea())
    	.reduceRegion({
        	reducer: ee.Reducer.sum(),
        	geometry: geomBounds,
        	scale: ESCALA,
        	bestEffort: true,
        	tileScale: TILESCALE,
        	maxPixels: MAXPIX
    	}).values().get(0)
).divide(10000);

print('Área total (ha)', haTotal);
print('Área protegida (ha)', haAP);
print('% protegido', haAP.divide(haTotal).multiply(100));
```

**Parámetros:**
- **`apImg.multiply(ee.Image.pixelArea())`**: `ee.Image.pixelArea()` genera una imagen donde cada píxel contiene su propio área real en m² (varía levemente con la latitud). Al multiplicarla por `apImg` (0/1), el resultado es una imagen donde cada píxel protegido vale su área en m², y cada píxel no protegido vale 0.
- **`geometry: geomBounds`**: Se usa el rectángulo envolvente del AOI (no `geom`) como región del `reduceRegion`. Los parámetros `scale`, `bestEffort`, `tileScale` y `maxPixels` están explicados en la Sección 3.
- **`.values().get(0)`**: `reduceRegion()` devuelve un diccionario con una entrada por banda de la imagen (acá solo hay una). `.values()` extrae los valores del diccionario como una lista, y `.get(0)` toma el primero (y único).
- **`haAP.divide(haTotal).multiply(100)`**: Calcula el porcentaje del AOI que está protegido. Como `haAP` y `haTotal` son `ee.Number`, esta operación ocurre del lado del servidor de GEE, no en el navegador.

## Paso 7: Identificar las ecorregiones del AOI y preparar la banda de agrupación

Se seleccionan las ecorregiones presentes en el AOI y se rasteriza su identificador numérico, insumo necesario para el cálculo agrupado del paso siguiente.

```javascript
var eco = ECOREGIONES.filterBounds(geom);
print('Número de ecorregiones:', eco.size());

var ecoIdImg = eco
    .reduceToImage({
    	properties: ['ECO_ID'],
    	reducer: ee.Reducer.first()
	})
	.toInt()
	.rename('eco_id');
```

**Parámetros:**
- **`ECOREGIONES.filterBounds(geom)`**: Conserva solo las ecorregiones que intersectan el AOI (una ecorregión puede extenderse mucho más allá de un solo país).
- **`reduceToImage({ properties: ['ECO_ID'], ... })`**: Rasteriza el campo `ECO_ID` (numérico) en vez de `ECO_NAME` (texto), porque el reducer agrupado del Paso 8 necesita una banda numérica para poder agrupar valores por ella.
- **`.toInt()`**: Convierte la banda a números enteros, evitando que pequeñas diferencias de punto flotante generen grupos duplicados o inconsistentes en el Paso 8.

## Paso 8: Calcular la representatividad por ecorregión con una reducción agrupada

Se resuelve, en una sola operación sobre todo el AOI, cuánta área total y cuánta área protegida hay dentro de cada ecorregión.

```javascript
var stackImg = ee.Image.pixelArea().rename('total')
    .addBands(apImg.multiply(ee.Image.pixelArea()).rename('protegida'))
    .addBands(ecoIdImg)
	.updateMask(maskPais);

var groupedReducer = ee.Reducer.sum().repeat(2).group({
	groupField: 2,
	groupName: 'eco_id'
});

var statsRaw = stackImg.reduceRegion({
	reducer: groupedReducer,
	geometry: geomBounds,
	scale: ESCALA,
	bestEffort: true,
	tileScale: TILESCALE,
	maxPixels: MAXPIX
});

var grupos = ee.List(statsRaw.get('groups'));

var idToName = ee.Dictionary.fromLists(
    eco.aggregate_array('ECO_ID').map(function (id) {
    	return ee.Number(id).format();
	}),
    eco.aggregate_array('ECO_NAME')
);

var ecoStats = ee.FeatureCollection(grupos.map(function (g) {
	g = ee.Dictionary(g);
	var id = ee.Number(g.get('eco_id'));
	var sums = ee.List(g.get('sum'));
	var total = ee.Number(sums.get(0));
	var protegida = ee.Number(sums.get(1));
    var pct = ee.Algorithms.If(total.gt(0), protegida.divide(total).multiply(100), 0);

	return ee.Feature(null, {
    	eco_id: id,
    	ecorregion: idToName.get(id.format()),
    	ha_total: total.divide(10000),
    	ha_protegida: protegida.divide(10000),
    	pct_protegido: pct
    });
}));
```

**Parámetros:**
- **`stackImg`**: Combina en una sola imagen de 3 bandas todo lo necesario para el cálculo: `'total'` (área de cada píxel), `'protegida'` (área solo donde `apImg`=1) y `'eco_id'` (el identificador de ecorregión). El orden de las bandas importa: el reducer agrupado espera las bandas de datos primero y la banda de agrupación al final.
- **`ee.Reducer.sum().repeat(2)`**: Crea un reducer que suma valores, y `.repeat(2)` indica que debe aplicarse a 2 bandas de entrada en simultáneo (acá, `'total'` y `'protegida'`), devolviendo una suma para cada una.
- **`.group({ groupField: 2, groupName: 'eco_id' })`**: Envuelve el reducer anterior para que, en vez de una sola suma global, calcule una suma por cada valor distinto de la banda indicada en `groupField` (índice 2, correspondiente a `'eco_id'` dentro del stack). `groupName` define el nombre de la clave en el resultado.
- **`statsRaw.get('groups')`**: El resultado de un reducer agrupado es un diccionario con una clave `'groups'`, cuyo valor es una lista de diccionarios: uno por cada grupo encontrado, con la forma `{eco_id: <valor>, sum: [sumaTotal, sumaProtegida]}`.
- **`ee.Dictionary.fromLists(claves, valores)`**: Construye un diccionario del lado del servidor a partir de dos listas paralelas. Acá se usa para mapear cada `ECO_ID` a su `ECO_NAME` correspondiente, sin necesidad de traer datos al cliente antes de tiempo (`getInfo`).
- **`eco.aggregate_array('ECO_ID')`**: Extrae, como una lista, los valores de la propiedad `ECO_ID` de todos los features de `eco`. `.map(...)` los convierte a texto (`id.format()`) porque las claves de un `ee.Dictionary` deben ser strings.
- **`grupos.map(function(g){...})`**: Recorre la lista de grupos y reconstruye, por cada uno, un `ee.Feature` con las columnas finales: `eco_id`, `ecorregion` (nombre), `ha_total`, `ha_protegida` y `pct_protegido`.
- **`ee.Algorithms.If(total.gt(0), ..., 0)`**: Condicional evaluado del lado del servidor (no un `if` de JavaScript): es necesario porque `'total'` es un `ee.Number` cuyo valor real no existe hasta que el servidor lo calcula. Evita una división por cero si alguna ecorregión no tuviera área dentro del AOI.
- **`ee.Feature(null, {...})`**: Crea un registro tabular sin geometría (`null`), solo con las propiedades indicadas. El conjunto de estos features forma la `FeatureCollection` final `ecoStats`.

## Paso 9: Generar el gráfico de representatividad

Se construye un gráfico de barras que muestra, para cada ecorregión, el porcentaje protegido calculado en el paso anterior.

```javascript
var chart = ui.Chart.feature.byFeature(
	ecoStats,
	'ecorregion',
	'pct_protegido'
)
	.setChartType('BarChart')
	.setOptions({
    	title: '% protegido por ecorregión',
    	legend: { position: 'none' },
    	hAxis: { title: 'Ecorregión' },
    	vAxis: { title: '% protegido' }
	});

print(chart);
```

**Parámetros:**
- **`ui.Chart.feature.byFeature(collection, xProperty, yProperty)`**: Construye un gráfico donde cada feature de la colección (`ecoStats`) se convierte en una barra. El primer argumento es la `FeatureCollection` de origen; `xProperty` (`'ecorregion'`) es la propiedad que etiqueta el eje X; `yProperty` (`'pct_protegido'`) es la propiedad que define la altura de cada barra.
- **`.setChartType('BarChart')`**: Define el tipo de gráfico. Otros valores válidos incluyen `'ColumnChart'` (barras verticales agrupadas), `'LineChart'`, `'PieChart'`, `'ScatterChart'`, entre otros de la librería Google Charts sobre la que se apoya `ui.Chart`.
- **`title`**: Texto que aparece como título del gráfico, en la parte superior.
- **`legend: { position: 'none' }`**: Controla la leyenda del gráfico. `'none'` la oculta (apropiado cuando hay una sola serie de datos, como acá); otros valores posibles son `'right'`, `'top'`, `'bottom'`, `'in'`.
- **`hAxis: { title: 'Ecorregión' }`**: Configura el eje horizontal (X); `'title'` es el texto que se muestra como etiqueta de ese eje. Puede combinarse con otras propiedades como `'slantedText: true'` si las etiquetas son largas y se superponen.
- **`vAxis: { title: '% protegido' }`**: Configura el eje vertical (Y) de la misma forma; adicionalmente admite propiedades como `'minValue'` / `'maxValue'` para fijar el rango del eje.
- **`print(chart)`**: Envía el objeto gráfico a la consola del editor de GEE, donde se renderiza como un gráfico interactivo (permite pasar el mouse sobre las barras para ver el valor exacto).

## Paso 10: Visualizar las capas en el mapa

Se agregan tres capas al visor de GEE: las ecorregiones, el raster de áreas protegidas y el contorno del AOI, cada una con su propio estilo y visibilidad inicial.

```javascript
Map.addLayer(eco, { color: 'gray' }, 'Ecorregiones', false);

Map.addLayer(apImg.selfMask(), { palette: ['006400'] }, 'Áreas protegidas');

Map.addLayer(area, { color: 'red' }, 'Área de interés', false);
```

**Parámetros:**
- **`Map.addLayer(eeObject, visParams, name, shown)`**: Firma general de la función: `eeObject` es la capa a mostrar (una imagen o una colección de features); `visParams` define su estilo visual; `name` es el texto que aparece en el panel "Layers" del visor; `shown` (booleano) controla si la capa arranca visible (`true`, valor por defecto) u oculta (`false`).
- **`{ color: 'gray' }` / `{ color: 'red' }`**: Para `FeatureCollection`s, la propiedad `color` del objeto de estilo define el color de los bordes/relleno, usando un nombre de color CSS o un código hexadecimal (por ejemplo, `'FF0000'` equivale a `'red'`).
- **`{ palette: ['006400'] }`**: Para imágenes de una sola banda, `palette` define la rampa de color con la que se pintan los valores, de menor a mayor, como una lista de códigos hexadecimales. Con una imagen binaria (0/1) y un solo color en la paleta, todos los píxeles con valor 1 se pintan de ese color.
- **`apImg.selfMask()`**: Antes de visualizar, se enmascaran los píxeles con valor 0, para que en el mapa solo se dibujen (y por tanto solo ocupen memoria de renderizado) los píxeles efectivamente protegidos.
- **`false` (último argumento)**: En las capas "Ecorregiones" y "Área de interés", hace que esas capas se agreguen al mapa pero permanezcan ocultas hasta que el usuario las active manualmente desde el panel Layers — útil para no saturar la vista inicial con capas de referencia.

## Paso 11: Exportar los resultados

Los resultados finales se envían como una tarea de exportación a Google Drive, en vez de depender únicamente de los `print()` interactivos.

```javascript
Export.table.toDrive({
	collection: ecoStats,
	description: 'representatividad_ecorregion_colombia',
    fileFormat: 'CSV'
});

/*
Export.image.toDrive({
	image: apImg,
	description: 'areas_protegidas_colombia',
    region: geomBounds,
    scale: ESCALA,
    maxPixels: MAXPIX
});
*/
```

**Parámetros:**
- **`Export.table.toDrive({...})`**: Genera una tarea de exportación de una tabla (`FeatureCollection`) a Google Drive. La tarea queda pendiente en la pestaña "Tasks" del editor y debe iniciarse manualmente (botón "Run").
- **`collection`**: La `FeatureCollection` a exportar; acá, la tabla de representatividad por ecorregión.
- **`description`**: Nombre de la tarea (visible en la pestaña Tasks) y, por defecto, también el nombre del archivo de salida.
- **`fileFormat: 'CSV'`**: Formato del archivo tabular exportado. Otros valores válidos para tablas son `'SHP'` (Shapefile), `'GeoJSON'` y `'KML'` — estos dos últimos requieren que los features tengan geometría, lo cual no es el caso de `ecoStats` (son features con `geometry: null`).
- **`Export.image.toDrive({...})` (bloque comentado)**: Exporta una imagen (acá, el raster binario `apImg`) en vez de una tabla. `image` es la imagen a exportar; `region` define el área geográfica a exportar (se usa el rectángulo envolvente por la misma razón de rendimiento explicada en el Paso 1); `scale` y `maxPixels` cumplen el mismo rol que en `reduceRegion` (Sección 3).

**Código completo:** [https://code.earthengine.google.com/8b095709a0ed83a22be4416bdc523989](https://code.earthengine.google.com/8b095709a0ed83a22be4416bdc523989)







