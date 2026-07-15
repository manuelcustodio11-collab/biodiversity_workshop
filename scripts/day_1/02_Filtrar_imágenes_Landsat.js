/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var table = ee.FeatureCollection("FAO/GAUL/2015/level2"),
    landsat8 = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
////////////////////////////////////////////////////////////////////////////////
// Taller: Regional Biodiversity Workshop
// Autora: Google, modified: Wilpa
// Objetivo: Filtrar imágenes Landsat8 para área de país
////////////////////////////////////////////////////////////////////////////////

//
//1. Filtrar Colección de Features para seleccionar país de referencia: Colombia
var region = table.filter(
  ee.Filter.eq('ADM0_NAME', 'Colombia')
  );

Map.centerObject(region, 8);
Map.addLayer(region, {}, 'Colombia');

// 2. Crear una composición de imágenes Landsat 8 filtrando por fecha y región.
var filtrado = landsat8
  .filterDate('2016-01-01', '2020-01-01')
  .filterBounds(region);

print('Colección Landsat 8', filtrado);
print('Número de imágenes', filtrado.size());

//3. Crear una imágen a partir de la mediana de imágenes dsponibles, 
//y cortar para región. 
var mediana = filtrado.median();

var cortado = mediana.clip(region);

// 4. Seleccionar las bandas roja, verde y azul.
var resultado = cortado.select('SR_B4', 'SR_B3', 'SR_B2');
Map.addLayer(resultado, {min: 7230, max: 15000}, 'Cortado');


// 5. Filtrar las imágenes que contenga menos de 20% de nubes
var filtradoNubes = filtrado.filter(ee.Filter.lt('CLOUD_COVER_LAND',20));

print('Número de imágenes con filtro de nubes', filtradoNubes.size());

var medianaNubes = filtradoNubes.median();

var cortadoNubes = medianaNubes.clip(region);

var resultado = cortadoNubes.select('SR_B4', 'SR_B3', 'SR_B2');

// Filtrar por menos del 20% de cobertura de nubes sobre la tierra debería generar un mejor
// compuesto, pero no en este caso. Los algoritmos de enmascaramiento de nubes
// no son 100% correctos todo el tiempo.

//Actividad:
// - Mira la cantidad de imágenes que se devuelven al filtrar por lt (menor que)
// así como los metadatos de algunas de las imágenes.
// - Intente cambiar el filtro lt a gt y vea la composición.
Map.addLayer(resultado, {min: 7230, max: 15000}, 'Cortado con filtro de nubes');