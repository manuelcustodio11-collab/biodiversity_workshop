/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var WDPA = ee.FeatureCollection("WCMC/WDPA/current/polygons"),
    ECOREGIONES = ee.FeatureCollection("RESOLVE/ECOREGIONS/2017"),
    GAUL0 = ee.FeatureCollection("FAO/GAUL_SIMPLIFIED_500m/2015/level0");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
// Taller: Regional Biodiversity Workshop
// Autor: Wilpa.
// Objetivo: identificar % protegido del territorio y por ecorregión (representatividad).
// Asset: WCMC/WDPA/current/polygons + RESOLVE/ECOREGIONS/2017
////////////////////////////////////////////////////////////////////////////////

//--------------------------------------------------------------
// 1. Definir área de interés
//--------------------------------------------------------------
// Parque Nacional Chingaza
/*var area = WDPA.filter(
    ee.Filter.eq('NAME', 'Chingaza')
);*/

//Pais
var area = GAUL0.filter(
    ee.Filter.eq('ADM0_NAME', 'Colombia')
);

var geom = area.geometry();

// Rectángulo envolvente del AOI. Es la geometría que se le pasa a reduceRegion:
// GEE calcula la intersección tesela-geometría de forma casi instantánea contra
// un rectángulo, mientras que contra un polígono de miles de vértices ese mismo
// paso puede tardar minutos por tesela.
var geomBounds = geom.bounds(1000);

Map.centerObject(area, 6);

// Para país, 100 m puede representar >1e10 píxeles en el área completa.
// 300 m mantiene una precisión adecuada para un indicador nacional y reduce
// drásticamente el volumen de datos a procesar. Ajustar según el nivel
// administrativo (departamento/municipio pueden bajar a 100 m sin problema).
var ESCALA = 300;
var MAXPIX = 1e13;
// tileScale máximo permitido por la API; reparte cada reduceRegion en más
// teselas de menor tamaño, evitando errores de memoria ("user memory limit").
var TILESCALE = 16;


//--------------------------------------------------------------
// 2. Máscara ráster del país (pieza clave del rendimiento)
//--------------------------------------------------------------
// En vez de recortar cada imagen con el polígono complejo (geom) dentro de
// reduceRegion, se rasteriza UNA sola vez el contorno del país como máscara
// binaria. El recorte "real" a la forma del país se hace luego por álgebra
// de imágenes (updateMask), que GEE paraleliza de forma muy eficiente por
// tesela, a diferencia de la intersección vector-vector.
var maskPais = ee.Image.constant(1).clip(geom).mask().rename('pais');


//--------------------------------------------------------------
// 3. Área total del AOI (por geometría, sin tocar píxeles)
//--------------------------------------------------------------
// El área administrativa de un país/departamento se obtiene directamente de
// su geometría vectorial. Es exacta y no requiere ninguna reduceRegion:
// se elimina por completo la reduceRegion más costosa de la versión original
// (la que sumaba pixelArea() sobre la imagen 'territorio' de todo el país).
var haTotal = ee.Number(geom.area({maxError: 1000})).divide(10000);


//--------------------------------------------------------------
// 4. Áreas protegidas dentro del AOI
//--------------------------------------------------------------
var wdpa = WDPA
    .filterBounds(geom)
    .filter(ee.Filter.neq('STATUS', 'Proposed'));

print('Áreas protegidas encontradas:', wdpa.size());


//--------------------------------------------------------------
// 5. Raster de áreas protegidas, recortado con máscara (no con vector)
//--------------------------------------------------------------
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
    // Recorte al país mediante la máscara ráster ya calculada (rápido),
    // en vez de usar 'geom' (el polígono complejo) como región de reduceRegion.
    .updateMask(maskPais)
    .rename('ap');


//--------------------------------------------------------------
// 6. Indicador global (Meta 3 - 30x30)
//--------------------------------------------------------------
var haAP = ee.Number(
    apImg.multiply(ee.Image.pixelArea())
        .reduceRegion({
            reducer: ee.Reducer.sum(),
            // Se reduce sobre el RECTÁNGULO envolvente, no sobre 'geom'.
            geometry: geomBounds,
            scale: ESCALA,
            bestEffort: true,
            tileScale: TILESCALE,
            maxPixels: MAXPIX
        }).values().get(0)
).divide(10000);

print('==============================');
print('META 3 - 30x30');
print('==============================');
print('Área total (ha)', haTotal);
print('Área protegida (ha)', haAP);
print('% protegido', haAP.divide(haTotal).multiply(100));


//--------------------------------------------------------------
// 7. Ecorregiones dentro del AOI
//--------------------------------------------------------------
var eco = ECOREGIONES.filterBounds(geom);

print('Número de ecorregiones:', eco.size());

// Rasteriza el identificador numérico de cada ecorregión (ECO_ID). Esta banda
// es la que luego se usa como CAMPO DE AGRUPACIÓN en la reduceRegion agrupada
// (paso 8), reemplazando el .map() + reduceRegion por ecorregión del script
// original.
var ecoIdImg = eco
    .reduceToImage({
        properties: ['ECO_ID'],
        reducer: ee.Reducer.first()
    })
    .toInt()
    .rename('eco_id');


//--------------------------------------------------------------
// 8. Representatividad por ecorregión: UNA sola reduceRegion agrupada
//--------------------------------------------------------------
// Imagen de 3 bandas: [total (m²), protegida (m²), eco_id (agrupador)],
// ya recortada al país mediante la máscara ráster.
// IMPORTANTE sobre el orden de bandas: ee.Reducer.group() exige que las
// bandas "de datos" (las que alimentan al reducer base, aquí sum().repeat(2))
// vayan PRIMERO, y la banda usada para agrupar vaya AL FINAL. Invertir este
// orden produce el error "Group input must come after weighted inputs".
var stackImg = ee.Image.pixelArea().rename('total')
    .addBands(apImg.multiply(ee.Image.pixelArea()).rename('protegida'))
    .addBands(ecoIdImg)
    .updateMask(maskPais);

// ee.Reducer.sum().repeat(2): aplica 'sum' a las 2 bandas de valor (total,
// protegida), que son las bandas 0 y 1 del stack. .group({groupField:2, ...}):
// agrupa esos resultados según la banda 2 (eco_id, la última). Con esto, GEE
// resuelve en una sola pasada por el país lo que antes requería una
// reduceRegion por cada ecorregión.
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

// 'groups' es una lista de diccionarios: {eco_id: <valor>, sum: [totalSum, protSum]}
var grupos = ee.List(statsRaw.get('groups'));

// Diccionario ECO_ID -> ECO_NAME, construido del lado del servidor (sin
// getInfo intermedios) a partir de la misma colección de ecorregiones.
var idToName = ee.Dictionary.fromLists(
    eco.aggregate_array('ECO_ID').map(function (id) {
        return ee.Number(id).format();
    }),
    eco.aggregate_array('ECO_NAME')
);

// Se reconstruye una FeatureCollection tabular equivalente a 'ecoStats' del
// script original, pero calculada en una sola reduceRegion en vez de N.
var ecoStats = ee.FeatureCollection(grupos.map(function (g) {

    g = ee.Dictionary(g);

    var id = ee.Number(g.get('eco_id'));
    var sums = ee.List(g.get('sum'));
    var total = ee.Number(sums.get(0));
    var protegida = ee.Number(sums.get(1));

    var pct = ee.Algorithms.If(
        total.gt(0),
        protegida.divide(total).multiply(100),
        0
    );

    return ee.Feature(null, {
        eco_id: id,
        ecorregion: idToName.get(id.format()),
        ha_total: total.divide(10000),
        ha_protegida: protegida.divide(10000),
        pct_protegido: pct
    });

}));

print('Representatividad por ecorregión');
print(ecoStats);


//--------------------------------------------------------------
// 9. Gráfico de barras
//--------------------------------------------------------------
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


//--------------------------------------------------------------
// 10. Visualización en el mapa
//--------------------------------------------------------------
Map.addLayer(eco, { color: 'gray' }, 'Ecorregiones', false);

Map.addLayer(apImg.selfMask(), { palette: ['006400'] }, 'Áreas protegidas');

Map.addLayer(area, { color: 'red' }, 'Área de interés', false);


//--------------------------------------------------------------
// 11. Exportación de resultados
//--------------------------------------------------------------
// IMPORTANTE a escala país: además de estas optimizaciones, se recomienda
// correr los resultados finales como Export (Tasks), no con print(). Las
// Export Tasks corren en el backend batch de GEE, con límites de tiempo y
// memoria muchísimo más altos que el entorno interactivo del editor.
Export.table.toDrive({
    collection: ecoStats,
    description: 'representatividad_ecorregion_colombia',
    fileFormat: 'CSV'
});


// Además de la tabla, se puede exportar el raster de áreas protegidas:
Export.image.toDrive({
    image: apImg,
    description: 'areas_protegidas_colombia',
    region: geomBounds,
    scale: ESCALA,
    maxPixels: MAXPIX
});