/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var ABG = ee.ImageCollection("WCMC/biomass_carbon_density/v1_0"),
    WDPA = ee.FeatureCollection("WCMC/WDPA/current/polygons"),
    WDOECM = ee.FeatureCollection("WCMC/WDOECM/current/polygons"),
    GlobalEcosystemTypology = ee.FeatureCollection("IUCN/GlobalEcosystemTypology/current"),
    Drivers_LossForest = ee.Image("projects/landandcarbon/assets/wri_gdm_drivers_forest_loss_1km/v1_3_2001_2025"),
    TMF_JRC = ee.Image("JRC/GFC2020/V3"),
    GFC_Hansen = ee.Image("UMD/hansen/global_forest_change_2025_v1_13"),
    GHM_TNC = ee.ImageCollection("TNC/HM/v3/90m_s");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
// ////////////////////////////////////////////////////////////////////////////////
// // Taller: Regional Biodiversity Workshop
// // Autora: Wilpa
// // Objetivo: Calcular área de ecosistemas interceptados con área de interés (Parque Nacional)
// //           comparar resultados mapa de ecosistema IUCN , mapa de ecosistema Colombia
// ////////////////////////////////////////////////////////////////////////////////

// =========================================================================
// 1. DEFINIR ZONA DE ESTUDIO (ROI) - ÁREA PROTEGIDA
// =========================================================================
var WDPA= ee.FeatureCollection("WCMC/WDPA/current/polygons")
var roi = WDPA.filter(
  ee.Filter.eq('NAME', 'Chingaza'));
Map.centerObject(roi, 10);
Map.addLayer(roi, {color: 'green', opacity: 0.5}, 'Áreas Protegidas Seleccionadas');

// =========================================================================
// 2. PROCESAMIENTO: MAPA GLOBAL DE LA IUCN
// =========================================================================
// Cargar la FeatureCollection oficial de la IUCN
var typologyFC = ee.FeatureCollection("IUCN/GlobalEcosystemTypology/current");

// Filtrar los ecosistemas que intersectan espacialmente con tu ROI
var ecoEnROI = typologyFC.filterBounds(roi);

// Calcular el área interceptada para cada ecosistema
//La siguiente función aplica a todos los polígonos (features) de la colección de ecosistemas.
//a.intersecta el mapa de ecosistemas con tu ROI
//b.  calcula el área  en m2
//c.convierte a hectáreas
//output: feature con campo EFG_Code y Area_Ha
var parchesAreas = ecoEnROI.map(function(feature) {
  var interseccion = feature.geometry().intersection(roi, ee.ErrorMargin(1));
  var areaM2 = interseccion.area(ee.ErrorMargin(1)); // ErrorMargin optimiza la tolerancia a 1 metro
  var areaHa = ee.Number(areaM2).divide(10000);
  
  return ee.Feature(null, {
    'EFG_Code': feature.get('efg_code'),
    'Area_Ha': areaHa
  });
}).filter(ee.Filter.gt('Area_Ha', 0.1)); //filtra polígonos  <- a 0.1 ha considerados errores causados por bordes.


// Obtener la lista de códigos únicos de ecosistemas presentes en tu ROI
var codigosUnicos = parchesAreas.aggregate_array('EFG_Code').distinct();

// Usar función .map sobre los códigos únicos para sumar las áreas de sus parches por EFG_Code
var statsUnificadas = ee.FeatureCollection(codigosUnicos.map(function(codigo) {
  // Filtrar todos los features que pertenecen a este código específico
  var parchesDelCodigo = parchesAreas.filter(ee.Filter.eq('EFG_Code', codigo));
  // Sumar las áreas de todos esos parches por EFG_Code
  var areaTotalHa = parchesDelCodigo.aggregate_sum('Area_Ha');
  // Retornar un único feature por ecosistema con su área total
  return ee.Feature(null, {
    'EFG_Code': codigo,
    'Area_Total_Ha': areaTotalHa
  });
}));

// //Exportar al Google Drive tabla con cálculo de área de ecosistema en ROI
// Export.table.toDrive({
//   collection: statsUnificadas,
//   description: 'Estadisticas_IUCN_Unificadas_ROI',
//   fileFormat: 'CSV',
//   selectors: ['EFG_Code', 'Area_Total_Ha']
// });

// =========================================================================
// 3. OPCIONAL: PROCESAMIENTO MAPA DE ECOSISTEMAS DE COLOMBIA 
//Calcular el área de ecosistema en AOI
// =========================================================================
// Cargar el asset nacional indicado
var colMapFC = ee.FeatureCollection("projects/ee-paulapaz1101/assets/biodiversity_workshop/GEODATA/ecosystem_map_COL");

// Filtrar para Chingaza
var ecoEnROI_COL = colMapFC.filterBounds(roi);

// Calcular áreas por features usando el campo 'ecos_gener'
var parchesAreas_COL = ecoEnROI_COL.map(function(feature) {
  var interseccion = feature.geometry().intersection(roi, ee.ErrorMargin(1));
  var areaM2 = interseccion.area(ee.ErrorMargin(1));
  var areaHa = ee.Number(areaM2).divide(10000);
  
  return ee.Feature(null, {
    'Ecos_Gener': feature.get('ecos_gener'), // Usamos de ecosistemas
    'Area_Ha': areaHa
  });
}).filter(ee.Filter.gt('Area_Ha', 0.1)); // Filtro para eliminar polígonos con áreas <=0.1

// Obtener la lista única de ecosistemas presentes
var nombresUnicos_COL = parchesAreas_COL.aggregate_array('Ecos_Gener').distinct();

// Unificar y sumar áreas por tipo de ecosistema nacional ('Ecos_Gener')
var statsUnificadas_COL = ee.FeatureCollection(nombresUnicos_COL.map(function(nombreEcosistema) {
  var parchesDelEcosistema = parchesAreas_COL.filter(ee.Filter.eq('Ecos_Gener', nombreEcosistema));
  var areaTotalHa = parchesDelEcosistema.aggregate_sum('Area_Ha');
  
  return ee.Feature(null, {
    'Ecos_Gener': nombreEcosistema,
    'Area_Total_Ha': areaTotalHa
  });
}));

// Exportar Mapa de Colombia
Export.table.toDrive({
  collection: statsUnificadas_COL,
  description: 'Chingaza_Estadisticas_Mapa_Colombia',
  fileFormat: 'CSV',
  selectors: ['Ecos_Gener', 'Area_Total_Ha']
});

// OPCIONAL visual: Mostrar los ecosistemas nacionales en el mapa
Map.addLayer(ecoEnROI_COL, {}, 'Mapa de Ecosistemas Colombia (Chingaza)', false);