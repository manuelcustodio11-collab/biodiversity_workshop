/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var geometry = 
    /* color: #d63000 */
    /* displayProperties: [
      {
        "type": "rectangle"
      }
    ] */
    ee.Geometry.Polygon(
        [[[-72.65123060500474, 1.936828065818687],
          [-72.65123060500474, 1.4357955266763072],
          [-72.03462293898912, 1.4357955266763072],
          [-72.03462293898912, 1.936828065818687]]], null, false);
/***** End of imports. If edited, may not auto-convert in the playground. *****/
// Tutorial: Regression with Satellite Embedding - 
// Estimating Above-Ground Biomass (AGB)Mapping Mangroves
// ****************************************************

// Use the satellite basemap
Map.setOptions('SATELLITE');

// Select a region
// ****************************************************

// Draw a polygon to define the region
// Save it as the variable 'geometry'
Map.centerObject(geometry);

// Select a time-period
// ****************************************************

var startDate = ee.Date.fromYMD(2022, 1, 1);
var endDate = startDate.advance(1, 'year');

// Prepare the Satellite Embedding dataset
// ****************************************************

var embeddings = ee.ImageCollection('GOOGLE/SATELLITE_EMBEDDING/V1/ANNUAL');

var embeddingsFiltered = embeddings
  .filter(ee.Filter.date(startDate, endDate))
  .filter(ee.Filter.bounds(geometry));

// Extract the projection of the first band of the first image
var embeddingsProjection = ee.Image(embeddingsFiltered.first()).select(0).projection();

// Set the projection of the mosaic to the extracted projection
var embeddingsImage = embeddingsFiltered.mosaic()
  .setDefaultProjection(embeddingsProjection);

Map.addLayer(embeddingsImage,'' , 'embeddingsImage', false);

// Prepare the GEDI L4A Mosaic
// ****************************************************

// GEDI L4A Raster Aboveground Biomass Density
// These are point observations that will be used as ground-truth
// and the predicted variable in the regression model
var gedi = ee.ImageCollection('LARSE/GEDI/GEDI04_A_002_MONTHLY');
// Function to select the highest quality GEDI data
var qualityMask = function(image) {
  return image.updateMask(image.select('l4_quality_flag').eq(1))
      .updateMask(image.select('degrade_flag').eq(0));
};

// Function to mask unreliable GEDI measurements
// with a relative standard error > 50% 
// agbd_se / agbd > 0.5
var errorMask = function(image) {
  var relative_se = image.select('agbd_se')
    .divide(image.select('agbd'));
  return image.updateMask(relative_se.lte(0.5));
};

// Function to mask GEDI measurements on slopes > 30%

var slopeMask = function(image) {
  // Use Copernicus GLO-30 DEM for calculating slope
  var glo30 = ee.ImageCollection('COPERNICUS/DEM/GLO30');
  
  var glo30Filtered = glo30
    .filter(ee.Filter.bounds(geometry))
    .select('DEM');
  
  // Extract the projection
  var demProj = glo30Filtered.first().select(0).projection();
  
  // The dataset consists of individual images
  // Create a mosaic and set the projection
  var elevation = glo30Filtered.mosaic().rename('dem')
    .setDefaultProjection(demProj);
  
  // Compute the slope
  var slope = ee.Terrain.slope(elevation);

  return image.updateMask(slope.lt(30));
};

var gediFiltered = gedi
  .filter(ee.Filter.date(startDate, endDate))
  .filter(ee.Filter.bounds(geometry));

var gediProjection = ee.Image(gediFiltered.first())
  .select('agbd').projection();

var gediProcessed = gediFiltered
  .map(qualityMask)
  .map(errorMask)
  .map(slopeMask);

var gediMosaic = gediProcessed.mosaic()
  .select('agbd').setDefaultProjection(gediProjection);
  
  
// Visualize the GEDI Mosaic
var gediVis = {
  min: 0,
  max: 200,
  palette: ['#edf8fb','#b2e2e2','#66c2a4','#2ca25f','#006d2c'],
  bands: ['agbd']
};

//Verifica en el mapa disponibilidad de datos GEDI para AOI
Map.addLayer(gediMosaic, gediVis, 'GEDI L4A (Filtered)', true);
  
// Resample and Aggregate Inputs
// ****************************************************

// GEDI measurements have horizontal accuracy of +/- 9 m
// This is problematic when matching the GEDI AGB values
// to satellite embedding pixels.
// To overcome this, we resample and aggregate all input
// images to a larger pixel-grid.

// Choose the grid size and projection
var gridScale = 100;
var gridProjection = ee.Projection('EPSG:3857')
  .atScale(gridScale);

// Create a stacked image with predictor and predicted variables
var stacked = embeddingsImage.addBands(gediMosaic);

//  Set the resampling mode
var stacked = stacked.resample('bilinear');

// Aggregate pixels with 'mean' statistics
var stackedResampled = stacked
  .reduceResolution({
    reducer: ee.Reducer.mean(),
    maxPixels: 1024
  })
  .reproject({
    crs: gridProjection
});

// As larger GEDI pixels contain masked original
// pixels, it has a transparency mask.
// We update the mask to remove the transparency
var stackedResampled = stackedResampled
  .updateMask(stackedResampled.mask().gt(0));

// Replace this with your asset folder
// The folder must exist before exporting
var exportFolder = 'projects/ee-paulapaz1101/assets/biodiversity_workshop/GEODATA/satellite_embedding/'; 
var mosaicExportImage = 'gedi_mosaic';
var mosaicExportImagePath = exportFolder + mosaicExportImage;

Export.image.toAsset({
  image: stackedResampled.clip(geometry),
  description: 'GEDI_Mosaic_Export',
  assetId: mosaicExportImagePath,
  region: geometry,
  scale: gridScale,
  maxPixels: 1e10
});

// Wait for the export to complete and continue with
// the exported mosaic from here onwards.
// Use the exported asset
var stackedResampled = ee.Image(mosaicExportImagePath);

// Extract Training Features
// ****************************************************

var predictors = embeddingsImage.bandNames();
var predicted = gediMosaic.bandNames().get(0);
print('predictors', predictors);
print('predicted', predicted);

var predictorImage = stackedResampled.select(predictors);
var predictedImage = stackedResampled.select([predicted]);

// Our GEDI image is mostly masked and contain values
// at only a small subset of pixels
// If we used sample() it will return mostly empty values
// To overcome this, we create a class-band from the GEDI
// mask and use stratifiedSampling() to ensure we sample from
// the non-masked areas.

var classMask = predictedImage.mask().toInt().rename('class');

var numSamples = 1000;

// We set classPoints to [0, numSamples]
// This will give us 0 points for class 0 (masked areas)
// and numSample points for class 1 (non-masked areas)
var training = stackedResampled.addBands(classMask)
  .stratifiedSample({
    numPoints: numSamples,
    classBand: 'class',
    region: geometry,
    scale: gridScale,
    classValues: [0, 1],
    classPoints: [0, numSamples],  
    dropNulls: true,
    tileScale: 16,
});

print('Number of Features Extracted', training.size());
print('Sample Training Feature', training.first());


// Train a Regression Model
// ****************************************************

// Use the RandomForest classifier and set the 
// output mode to REGRESSION
var model = ee.Classifier.smileRandomForest(50)
  .setOutputMode('REGRESSION')
  .train({
    features: training,
    classProperty: predicted,
    inputProperties: predictors
  });

// Get model's predictions for training samples
var predicted = training.classify({
  classifier: model,
  outputName: 'agbd_predicted'
});

// Calculate RMSE
var calculateRmse = function(input) {
    var observed = ee.Array(
      input.aggregate_array('agbd'));
    var predicted = ee.Array(
      input.aggregate_array('agbd_predicted'));
    var rmse = observed.subtract(predicted).pow(2)
      .reduce('mean', [0]).sqrt().get([0]);
    return rmse;
};
var rmse = calculateRmse(predicted);
print('RMSE', rmse);

// Create a plot of observed vs. predicted values
var chart = ui.Chart.feature.byFeature({
  features: predicted.select(['agbd', 'agbd_predicted']),
  xProperty: 'agbd',
  yProperties: ['agbd_predicted'],
}).setChartType('ScatterChart')
  .setOptions({
    title: 'Aboveground Biomass Density (Mg/Ha)',
    dataOpacity: 0.8,
    hAxis: {'title': 'Observed'},
    vAxis: {'title': 'Predicted'},
    legend: {position: 'right'},
    series: {
      0: {
        visibleInLegend: false,
        color: '#525252',
        pointSize: 3,
        pointShape: 'triangle',
      },
    },
    trendlines: {
      0: {
        type: 'linear', 
        color: 'black', 
        lineWidth: 1,
        pointSize: 0,
        labelInLegend: 'Linear Fit',
        visibleInLegend: true,
        showR2: true
      }
    },
    chartArea: {left: 100, bottom:100},

});
print(chart);

// Generate Predictions for Unknown Values
// ****************************************************

// Once the model is trained, we can use .classify()
// to run the model against all pixels of the image

// We set the band name of the output image as 'agbd'
var predictedImage = stackedResampled.classify({
  classifier: model,
  outputName: 'agbd'
});
// Export the image with predicted values
// ****************************************************

// Replace this with your asset folder
// The folder must exist before exporting
var exportFolder = 'projects/ee-paulapaz1101/assets/biodiversity_workshop/GEODATA/satellite_embedding/';
var predictedExportImage = 'predicted_agbd';
var predictedExportImagePath = exportFolder + predictedExportImage;

Export.image.toAsset({
  image: predictedImage.clip(geometry),
  description: 'Predicted_Image_Export',
  assetId: predictedExportImagePath,
  region: geometry,
  scale: gridScale,
  maxPixels: 1e10
});

// Wait for the export to complete.
// Visualize the exported image.
var predictedImage = ee.Image(predictedExportImagePath);

// Visualize the image
var gediVis = {
  min: 0,
  max: 200,
  palette: ['#edf8fb','#b2e2e2','#66c2a4','#2ca25f','#006d2c'],
  bands: ['agbd']
};
  
Map.addLayer(predictedImage, gediVis, 'Predicted AGBD');


// Estimate Total Biomass
// ****************************************************

// GEDI data is processed only for certain landcovers
// from Plant Functional Types (PFT) classification
// https://doi.org/10.1029/2022EA002516

// Here we use ESA WorldCover v200 product to
// select landcovers representing vegetated areas
var worldcover = ee.ImageCollection('ESA/WorldCover/v200').first();

// Aggregate pixels to the same grid as other dataset
// with 'mode' value. 
// i.e. The landcover with highest occurrence within the grid
var worldcoverResampled = worldcover
  .reduceResolution({
    reducer: ee.Reducer.mode(),
    maxPixels: 1024
  })
  .reproject({
    crs: gridProjection
});

// Select grids for the following classes
// | Class Name | Value |
// | Forests    | 10    | 
// | Shrubland  | 20    |
// | Grassland  | 30    |
// | Cropland   | 40    |
// | Mangroves  | 95    |
var landCoverMask = worldcoverResampled.eq(10)
    .or(worldcoverResampled.eq(20))
    .or(worldcoverResampled.eq(30))
    .or(worldcoverResampled.eq(40))
    .or(worldcoverResampled.eq(95));

var predictedImageMasked = predictedImage
  .updateMask(landCoverMask);
Map.addLayer(predictedImageMasked, gediVis, 'Predicted AGBD (Masked)');
  
// Calculate Total AGB
// ****************************************************

// The units of GEDI AGBD values is Megagrams/Hectares
// To get the Total AGB, we multiply each pixel with its
// area in Hectares
var pixelAreaHa = ee.Image.pixelArea().divide(10000);
var predictedAgb = predictedImageMasked.multiply(pixelAreaHa);

var stats = predictedAgb.reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: geometry,
  scale: gridScale,
  maxPixels: 1e10,
  tileScale: 16
});

// Result is a dictionary with key for each band
var totalAgb = stats.getNumber('agbd');

print('Total AGB (Mg)', totalAgb);