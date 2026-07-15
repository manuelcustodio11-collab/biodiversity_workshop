// ////////////////////////////////////////////////////////////////////////////////
// // Taller: Regional Biodiversity Workshop
// // Autor: Google
// // Objectivo: Crear zonas de cada 50m de elevación desde SRTM.
// ////////////////////////////////////////////////////////////////////////////////

//1. Cargar el conjunto de datos SRTMGL global
var elevacion = ee.Image("USGS/SRTMGL1_003");

//2. Visualizar en el mapa
Map.addLayer(elevacion,"","Elevacion");

//3. Filtrar la imágen cada 50, creando zonas de cada 50 m de elevación. 
var zonas = ee.Image(0)
    .where(elevacion.gt(50), 50)
    .where(elevacion.gt(150), 150)
    .where(elevacion.gt(200), 200)
    .updateMask(elevacion.gt(0));

//4. Visualizar zonas en el mapa
Map.addLayer(zonas, 
              {min: 0, max: 200, palette: ["blue", "green", "yellow", "red"]},
              "Elevación clasificada");