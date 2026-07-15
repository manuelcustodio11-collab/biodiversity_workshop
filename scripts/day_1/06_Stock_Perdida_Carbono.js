/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var WDPA = ee.FeatureCollection("WCMC/WDPA/current/polygons"),
    ECOREGIONES = ee.FeatureCollection("RESOLVE/ECOREGIONS/2017"),
    ABGB = ee.ImageCollection("WCMC/biomass_carbon_density/v1_0"),
    GABGB = ee.ImageCollection("NASA/ORNL/biomass_carbon_density/v1"),
    GAUL0 = ee.FeatureCollection("FAO/GAUL_SIMPLIFIED_500m/2015/level0");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
////////////////////////////////////////////////////////////////////////////////
// Taller: Regional Biodiversity Workshop
// Autor: Wilpa.
// Objetivo: identificar el stock de carbono y el carbono perdido por deforestación.
// Asset: WCMC/biomass_carbon_density/v1_0 + NASA/ORNL/biomass_carbon_density/v1
////////////////////////////////////////////////////////////////////////////////

//--------------------------------------------------------------
// 1. Definir área de interés — elegir UNA de las dos opciones
//--------------------------------------------------------------

// --- OPCIÓN A: un área protegida puntual (ej. Chingaza) ---
// var area = WDPA.filter(ee.Filter.eq('NAME', 'Chingaza'));
// var ESCALA = 30;

//--- OPCIÓN B: un país completo (ej. Colombia) ---
//Comentar la línea de arriba y descomentar estas dos:
var area = GAUL0.filter(ee.Filter.eq('ADM0_NAME', 'Colombia'));
var ESCALA = 300;

var geom = area.geometry();
var geomBounds = geom.bounds(1000);
Map.centerObject(area, 7);

var MAXPIX = 1e13;
var TILESCALE = 16;

// Máscara ráster del AOI: el recorte de las imágenes se hace por álgebra
// (updateMask), no con .clip(geom) sobre el polígono completo, para que el
// costo no dependa de la complejidad geométrica del AOI (mismo patrón que
// el script de áreas protegidas).
var maskAOI = ee.Image.constant(1).clip(geom).mask().rename('aoi');


// ---------- DATOS DE CARBONO ----------

// Carbono total (aéreo + subterráneo) — WCMC, banda 'carbon_tonnes_per_ha',
// en Mg C / ha.
var carbonoWCMC = ABGB
    .first()
    .select('carbon_tonnes_per_ha')
    .updateMask(maskAOI);

// Carbono aéreo — NASA/ORNL, banda 'agb', en Mg C / ha.
var carbonoORNL = GABGB
    .first()
    .select('agb')
    .updateMask(maskAOI);


//--------------------------------------------------------------
// 2. Función: stock total en toneladas (Mg), a partir de una densidad Mg C/ha
//--------------------------------------------------------------
// Mg C/ha * área(ha) -> Mg C totales. pixelArea() da m² -> /10000 a ha.
function stockTotalMg(imgMgHa) {
    var perPix = imgMgHa.multiply(ee.Image.pixelArea()).divide(10000);
    return ee.Number(
        perPix.reduceRegion({
            reducer: ee.Reducer.sum(),
            geometry: geomBounds,
            scale: ESCALA,
            bestEffort: true,
            tileScale: TILESCALE,
            maxPixels: MAXPIX
        }).values().get(0)
    );
}


//--------------------------------------------------------------
// 3. Reporte de carbono
//--------------------------------------------------------------
print('=== CARBONO ===');

print('Carbono medio, aéreo + subterráneo (Mg C/ha) — WCMC:',
    carbonoWCMC.reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: geomBounds,
        scale: ESCALA,
        bestEffort: true,
        tileScale: TILESCALE,
        maxPixels: MAXPIX
    }));

print('Stock total de carbono, aéreo + subterráneo (Mg C) — WCMC:',
    stockTotalMg(carbonoWCMC));

print('Stock total de carbono aéreo (Mg C) — ORNL:',
    stockTotalMg(carbonoORNL));


//--------------------------------------------------------------
// 4. Carbono en riesgo por deforestación (Hansen GFC 2022-2024)
//--------------------------------------------------------------
var gfc = ee.Image('UMD/hansen/global_forest_change_2024_v1_12');

var perdida = gfc.select('lossyear').gte(22).and(gfc.select('lossyear').lte(24));

var carbonoPerdido = carbonoORNL.updateMask(perdida);

print('Carbono perdido por deforestación 2022-2024 (Mg C) — ORNL:',
    stockTotalMg(carbonoPerdido.unmask(0)));


//--------------------------------------------------------------
// 5. Visualización en el mapa
//--------------------------------------------------------------
Map.addLayer(carbonoORNL,
    { min: 0, max: 150, palette: ['#ffffcc', '#41ab5d', '#005a32'] },
    'Carbono aéreo (Mg C/ha) — ORNL');

Map.addLayer(carbonoPerdido,
    { min: 0, max: 150, palette: ['#fee5d9', '#de2d26'] },
    'Carbono aéreo perdido 2022-2024');

Map.addLayer(area, { color: 'red' }, 'Área de interés', false);


//--------------------------------------------------------------
// 6. Exportar resultados
//--------------------------------------------------------------
/*
Export.image.toDrive({
    image: carbonoORNL,
    description: 'carbono_aereo_aoi',
    region: geomBounds,
    scale: ESCALA,
    maxPixels: MAXPIX
});
*/