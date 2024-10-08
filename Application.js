//Sentinel-2 to AVIRIS-NG Hyperspectral Data for Alaska //
//Institute of Agriculture, Natural Resources and Extension, University of Alaska Fairbanks 
//Dr.Anushree Badola , abadola@alaska.edu
//Pallavi Prasana Kumar, pprasannakumar@alaska.edu
//Dr.Santosh k Panda , skpanda@alaska.edu

var map = ui.Map();
map.setCenter(-152, 64, 4);

var gaul = ee.FeatureCollection('FAO/GAUL/2015/level1');

// Filter to get only Alaska (using the GAUL_CODE or ADM1_NAME depending on how Alaska is defined in the dataset)
var alaska = gaul.filter(ee.Filter.eq('ADM1_NAME', 'Alaska'));

// Set visualization parameters with low transparency
var boundaryVisParams = {
  color: '#555fa5', 
  fillColor:'#FFFFFF00',
  width:2.0  
};

// Add the Alaska boundary to the map
map.addLayer(alaska.style(boundaryVisParams));



// Add controls for the user
var cloudPercentageSlider = ui.Slider({
  min: 0, max: 100, value: 10, step: 5,
  style: { 
    width: '200px',
    backgroundColor: '#D4F1F4',
    color:'grey'

    
  },
  disabled: true
});
var imageDropdown = ui.Select({
  items: [],
  style: { 
    width: '200px',
    backgroundColor: '#D4F1F4',
    color:'black'
    
    },
  disabled: true
});

var downloadLinkRaw = ui.Label({
      value:'Download Link for Sentinel Image will appear here',
      style:{
        color: 'grey',
        backgroundColor:'#D4F1F4'
        
      }
      });
var downloadLinkProcessed = ui.Label({
  value : 'Download Link Processed Image will appear here',
  style:{
        color: 'grey',
        backgroundColor:'#D4F1F4'
    
  }
  
  });


// Set up the click event to open the link
var codeLinkLabel = ui.Label({
  value: 'Access the Code',
  style: {
    fontWeight: 'bold',
    textDecoration: 'underline',
    color: 'blue',
    backgroundColor:'#D4F1F4'
  }
});

var StoryMap = ui.Label({
  value: 'Story Map',
  style: {
    fontWeight: 'bold',
    textDecoration: 'underline',
    color: 'blue',
    backgroundColor:'#D4F1F4'
  }
});

// Set the URL to open when the label is clicked
codeLinkLabel.setUrl('https://code.earthengine.google.com/77d95411867122f9a83e2d1b0c5001da');
StoryMap.setUrl('https://storymaps.arcgis.com/stories/41df03ea574444c98280a49351cf512a');

var panel = ui.Panel({
  widgets: [
    ui.Label({
      value: 'Sentinel-2 To AVIRIS-NG Hyperspectral for Alaska',
      style: {
        fontWeight: 'bold',
        fontSize: '20px',
        color: '#000C66',
        backgroundColor:'#D4F1F4'
      }
    }),
    ui.Label({
  value: 'Define your search area by drawing a rectangle on the map and select a date.',
  style: {
    fontWeight: 'bold',
    fontSize: '15px',
    color: 'grey',
    // margin: '10px 0',
    backgroundColor:'#D4F1F4'
  }
}),
    ui.Label({
      value: 'Max Cloud %:',
      style: {
        color: 'grey',
        backgroundColor:'#D4F1F4'
      }
    }),
    cloudPercentageSlider,
    ui.Label({
      value: 'Select Image Date:',
      style: {
        color: 'grey',
        backgroundColor:'#D4F1F4'
      }
    }),

    imageDropdown,
    downloadLinkRaw,
    downloadLinkProcessed,
    codeLinkLabel,
    StoryMap
  ],
  layout: ui.Panel.Layout.flow('vertical'),
  style: {
    stretch: 'vertical',
    width: '300px',
    padding: '20px',
    height: '400px',
    backgroundColor: '#D4F1F4'
  }
});

ui.root.widgets().add(panel);
var currentPopup;
var selectedImage;
var processedImage;

var title = ui.Label('Click on the image to inspect', {
  fontWeight: 'bold', 
  fontSize: '13px'
});

// map.remove(title);
var infoPanel;
var chart;


// Visualization selection UI elements

var label = ui.Label({
  value: 'Select Visualization to Download',
  style: {
    backgroundColor:'#D4F1F4',
    color: 'grey',
  }
});

// Create the checkboxes with styles
var checkbox2 = ui.Checkbox({
  label: 'RGB (B56, B36, B20)',
  value: false,
  style: {
    backgroundColor:'#D4F1F4',
    color: 'grey',
  }
});

var checkbox3 = ui.Checkbox({
  label: 'FCC (B96, B56, B36)',
  value: false,
  style: {
    backgroundColor:'#D4F1F4',
    color: 'grey',

  }
});


var downloadButton = ui.Button('Generate Download Links');



var existingLinks = [];


var alaskaBoundary = ee.FeatureCollection("TIGER/2018/States")
  .filter(ee.Filter.eq('NAME', 'Alaska'))
  .geometry();

// Function to create a 10km by 10km rectangle around the centroid of a drawn shape
function create10kmSquare(geom) {
  var center = geom.centroid(1).coordinates();
  var point = ee.Geometry.Point(center);
  var square = point.buffer(500).bounds();
  return square;
}



// Function to handle the drawing on the map
function onDraw(geometry) {
  var geom = ee.Geometry(geometry);
  var isInAlaska = alaskaBoundary.contains(geom, ee.ErrorMargin(1));

  if (!isInAlaska.getInfo()) {
    // Alert the user and return if the geometry is not in Alaska
    var alertPanel = ui.Panel([
      ui.Label('Please draw within the boundaries of Alaska.', {color: 'blue'})
    ]);
    map.add(alertPanel);
 
    ui.util.setTimeout(function() {
      map.remove(alertPanel);
    }, 2000);
    
    drawingTools.layers().remove(drawingTools.layers().get(0));
    drawingTools.addLayer([], 'AOI Layer', '#555fa5', true, false); 

    return;
  
  }
  


  
  var center = geom.centroid(1).coordinates().getInfo();

  // Create a fixed 10km by 10km square based on the centroid
  var fixedSquare = create10kmSquare(geom);

  // Clear the existing drawing from the map
  map.layers().reset();
  map.addLayer(ee.Image(), {}, 'Basemap');

  // Zoom the map to the 10km by 10km boundary
  map.centerObject(fixedSquare,7);

  // Define the date range
  var startDate = '2021-01-01';
  var endDate = ee.Date(Date.now()).format('YYYY-MM-dd').getInfo();

  // Function to filter Sentinel-2 images
  function filterSentinel(cloudPercentage) {
    return ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
      .filterDate(startDate, endDate)
      .filterBounds(fixedSquare)
      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', cloudPercentage))
        .filter(ee.Filter.or(
        ee.Filter.and(ee.Filter.calendarRange(6, 6, 'month'), ee.Filter.calendarRange(2021, 2022, 'year')),
        ee.Filter.and(ee.Filter.calendarRange(7, 7, 'month'), ee.Filter.calendarRange(2021, 2022, 'year')),
        ee.Filter.and(ee.Filter.calendarRange(8, 8, 'month'), ee.Filter.calendarRange(2021, 2022, 'year'))
      ))

      .select(['B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B8A', 'B11', 'B12']);
  }

  // Create an image collection for Sentinel-2 imagery
  var sentinel = filterSentinel(10);
  var dates = sentinel.aggregate_array('system:time_start')
    .map(function(date) { return ee.Date(date).format('YYYY-MM-dd'); })
    .getInfo();
  cloudPercentageSlider.setDisabled(false);
  imageDropdown.items().reset(dates);
  imageDropdown.setDisabled(false);

  cloudPercentageSlider.onChange(function(value) {
    sentinel = filterSentinel(value);
    dates = sentinel.aggregate_array('system:time_start')
      .map(function(date) { return ee.Date(date).format('YYYY-MM-dd'); })
      .getInfo();
    imageDropdown.items().reset(dates);
    if (dates.length > 0) {
      imageDropdown.setValue(dates[0]);
    }
    
  });

  imageDropdown.onChange(function(selectedDate) {
    if (dates.indexOf(selectedDate) === -1) {
      print('Selected date ' + selectedDate + ' is not available in the image collection.');
      return;
    }
    
    clearSelections();

    // Get the selected image
    var selectedIndex = dates.indexOf(selectedDate);
    selectedImage = ee.Image(sentinel.toList(sentinel.size()).get(selectedIndex)).clip(fixedSquare);
    drawingTools.stop();
    drawingTools.clear();
    var visParams = { bands: ['B5', 'B4', 'B3'], min: 294, max: 1486, gamma: 1.0 };
    map.layers().set(0, ui.Map.Layer(selectedImage, visParams, 'Sentinel Image'));
    map.centerObject(selectedImage.geometry(), 16);
    
    if (infoPanel) {
    // If it exists, remove it from the map and clear its widgets
    map.unlisten('click');
    infoPanel.remove(chart);
    map.remove(infoPanel);
    
    }  
    

  

    // Generate a download link for the raw image
    selectedImage.getDownloadURL({
      name: 'Sentinel_image_' + selectedDate,
      scale: 10,
      region: fixedSquare,
      fileFormat: 'GeoTIFF',
      filePerBand:false
    }, function(url) {
      downloadLinkRaw.setValue('Download Sentinel 2 Image');
      downloadLinkRaw.setUrl(url);
    });
    


    // Process the image using the defined hyperspectral transformation
    var RM = ee.Array([
      [271.4357292, 276.0540392, 641.7314258],
      [416.6690905, 284.7190359, 460.5821611],
      [137.4331121, 157.0889976, 485.3898625],
      [227.2903593, 159.4978491, 241.32303],
      [833.0933693, 397.087153, 241.4017774],
      [1376.36133, 640.5871346, 312.0164314],
      [6806.521915, 3258.296231, 1474.764934],
      [1667.967115, 812.3291795, 350.984336],
      [4035.305468, 1473.239757, 1834.324305],
      [3759.307037, 1265.71712, 2823.064498]
    ]);
    
    
    var RH = ee.Array ([
[20.50777036,	19.49829205, 42.73252616],
[20.23245798	,19.40035645, 43.723216],
[19.96568354,	19.19310547, 44.4797642],
[19.58119884,	19.00999449,45.08048961],
[19.22227821,	18.95401225,46.08568783],
[18.99821449,	18.93386363,	47.40173713],
[18.93782028,	19.00959455	,48.42025822],
[19.01101925,	19.22438467,	49.46191037],
[19.18076528,	19.5377147,	50.43393618],
[19.48087941,	19.94896255,	51.39997073],
[19.87959832,	20.4519366,	52.34570706],
[20.41845533,	21.11347899,	53.3217448],
[20.9744354	,21.80686062,	54.12708856],
[21.52338693,	22.49533233,54.89083368],
[22.07181745,	23.16537391,55.75027019],
[22.50694743,	23.70221466,56.52594702],
[22.87506643,	24.15738547,57.34197018],
[23.16865879,	24.53580575,	58.19222662],
[23.4330522	,24.90383791,	59.16679527],
[23.61889694,	25.18426469,	60.09372006],
[23.79063605,	25.43013649,	61.13025481],
[24.01832752,	25.71380016,	62.43773541],
[24.26854877,	26.02476563,	63.80824667],
[24.6923262	,26.50240857,	65.2782913],
[25.42391463,27.23751775,	66.80508199],
[26.72037549,	28.34737509,	68.51172377],
[28.7578961,	29.80644498,	70.18825285],
[32.07198566,	31.84188504,	71.99047715],
[37.2432089,	34.65632981,	73.8897996],
[44.52531701,	38.28304107,	75.96748321],
[52.96695428,	42.16249282,77.94031286],
[61.43133051,	45.86134747,	79.95198817],
[68.8942496,	49.03673876,	81.93220868],
[74.98226616,	51.63214615,	83.84670526],
[79.90074062,	53.8516194,	85.81071627],
[83.29472078,	55.53171968,	87.50200684],
[84.82302246,	56.56365747,	89.04897823],
[84.17966554,	56.80159865,	90.49364683],
[81.78020897,	56.39326452,	92.00050649],
[78.06785217,	55.38755697,	93.23911562],
[73.93195421,	54.14788413,	94.34307494],
[69.73983861,	52.80638081,	95.29658545],
[65.53306241,	51.41481555,	96.12024376],
[61.45834655,	50.08066967,	97.03428676],
[57.51012135,	48.70578419,	97.72199287],
[53.97538683,	47.4274723,	98.36392112],
[50.86813326,	46.23235728,	98.96564309],
[48.18292733,	45.13861387,	99.51711516],
[45.98192875,	44.26713154,	100.1900167],
[44.02035136,	43.4258599,	100.6442995],
[42.26353256,	42.64235799,	101.0625451],
[40.56221768,	41.83099253,	101.456201],
[38.81330649,	40.92846113,	101.8472611],
[36.98115365,	39.86935044,	102.2406911],
[35.12570303,	38.6797293,	102.8180685],
[33.1123318,	37.19901321,	103.2276228],
[31.13996537,	35.57927661,	103.6708322],
[29.4263401,	33.98943103,	104.148646],
[28.14424638,	32.59841858,	104.6507918],
[27.42946576,	31.5966283,	105.1869117],
[27.53501357,	31.33076785,	105.9287941],
[28.98555765,	32.273802,	106.5260814],
[33.44080462,	35.45159465,	107.1435517],
[43.69243464,	42.056268,	107.7692243],
[62.52611202,	52.69240091,	108.3991603],
[90.54609118,	66.71380412,	108.9966039],
[124.8891678,	82.37640375,	109.5285913],
[163.1162679,	98.67904402,	110.1806151],
[203.1706073,	114.8157132,	110.5733111],
[244.415172,	130.8108907,	110.8959349],
[286.0136018,	146.5252436,	111.145298],
[326.8702265,	161.8141713,	111.3139723],
[365.0466035,	176.0613888,	111.4135542],
[398.4897803,	188.4684699,	111.4289916],
[424.2695685,	198.0456889,	111.3620529],
[443.6818879,	205.5911615,	111.3950569],
[457.5963426,	211.2650004,	111.1850075],
[467.9371502,	215.8275647,	110.9330772],
[475.2900457,	219.4235325,	110.6484259],
[479.9735341,	222.0792295,	110.3529292],
[482.757373,	224.000561,	110.0539769],
[484.279993,	225.3752584,	109.7307815],
[485.126175,	226.4270008,	109.3920573],
[485.6895566,	227.3126281,	109.0447441],
[487.1654972,	228.6300264,	108.8457241],
[487.7481182,	229.5437886,	108.4374527],
[488.2123317,	230.4555736,	108.01169],
[488.607148,	231.3531653,	107.5487215],
[489.0118529,	232.2965841,	107.1114885],
[489.4730373,	233.2949058,	106.6820434],
[490.0316393,	234.3211768,	106.2585635],
[490.7060434,	235.3669328,	105.9121077],
[491.4711021,	236.4541395,	105.5727831],
[492.3831245,	237.4449311,	105.2696326],
[494.1051607,	238.8228382,	105.1784212],
[494.8971874,	239.7813663,	104.9709838],
[495.6833051,	240.6983526,	104.7276932],
[496.3654042,	241.5441886,	104.5148483],
[496.9408068,	242.3343109,	104.3688763],
[497.4565892,	243.0549283,	104.261923],
[497.8750167,	243.7295197,	104.1337329],
[498.1921278,	244.2982013,	104.0545973],
[498.4727288,	244.7692811,	103.9796452],
[498.5168825,	245.2086198,	103.9471326],
[498.3537235,	245.4645813,	103.8709209],
[497.9849997,	245.658958,	103.7867457],
[497.6019991,	245.8315763,	103.7647778],
[498.1032213,	246.4914448,	103.9304885],
[497.6611438,	246.4714577,	104.0393445],
[497.2755153,	246.4821721,	104.2600059],
[496.2039376,	246.2949337,	104.4209901],
[494.8723076,	245.7473833,	104.6524803],
[493.0697465,	244.7475602,	104.7882029],
[490.473095,	243.2206041,	105.0622093],
[487.6928342,	241.201459,	105.3216218],
[484.569717,	239.1642378,	105.6329633],
[482.5569965,	237.308223,	105.777024],
[482.7520836,	235.9512746,	105.9415633],
[482.6161391,	235.0588953,	106.1674594],
[483.0389783,	234.5859286,	106.3291423],
[483.065716,	234.6277438	,106.449817],
[483.3297851,	234.9570031,	106.6219709],
[484.5271378,	236.5245132	,106.9511145],
[487.4795031,	240.3105643	,107.5639107],
[490.9416708,	244.7463486	,108.1644737],
[493.9940788,	248.0069812,	108.6747746],
[494.8988527,	249.1967825	,108.7733426],
[495.7100047,	250.2677149,	108.8563776],
[496.5207613,	251.3382272,	108.9393614],
[497.3485086,	252.4070973,	109.0220091],
[498.1886751,	253.5167347,	109.1060221],
[498.9372708,	254.5654048,	109.1945589],
[499.7513471,	255.7831083,	109.3398821],
[500.5919275,	257.0013467,	109.5278459],
[501.3320758,	258.1388895,	109.7224698],
[501.9638095,	259.3079096,	109.9497824],
[502.4850372,	260.4681575,	110.1783993],
[502.9007588,	261.4291441,	110.391636],
[503.320598,	262.4007512,	110.6382671],
[503.7339933,	263.4037301,	110.9285814],
[504.0607556,	264.2312445,	111.2312931],
[504.2554224,264.9968503,	111.5620154],
[504.274945,	265.5359996,	111.8994843],
[504.2464373,	266.0331883,	112.2764883],
[504.0666665,	266.2885413,	112.6539745],
[503.7708857,	266.3323433,	113.0716744],
[503.2286622,	266.1430739,	113.5152831],
[502.2635727,	265.5167917,	113.9107907],
[501.0881834,	264.4634892,	114.3719265],
[499.4809394,	262.8662991,	114.871022],
[497.100095,	260.4426982,	115.3356422],
[494.1205391,	257.1587458,	115.7777063],
[490.5123759,	253.3119211,	116.2071752],
[486.2792989,	248.644122,	116.5894919],
[481.7203608,	243.6112798,	116.9608592],
[477.1584362,	238.6083462,	117.3482903],
[473.7383483,	234.2725279,	117.9566406],
[469.8726184,	230.0322098,	118.363994],
[466.4109821,	226.2658784,	118.6781025],
[463.4277274,	223.0387984,	118.9299094],
[461.2732324,	220.8660898,	119.2869134],
[459.6967178,	219.2850348,	119.6387818],
[458.6087311,	218.2050279,	119.9432911],
[457.9428812,	217.7105629,	120.2306568],
[457.5225641,	217.5754375,	120.5002408],
[457.4125269,	217.6266408,	120.6957244],
[457.7173968,	218.2421035,	120.9676539],
[458.2051979,	219.1552138,	121.2275258],
[458.8106334,	220.2260173,	121.4280288],
[459.5739425,	221.5367543,	121.6341187],
[460.4458262,	222.9475995,	121.8027533],
[461.4387328,	224.4663051,	121.9568911],
[462.4420273,	226.0131475,	122.1046671],
[463.4196502,	227.6348907,	122.2645169],
[464.3116213,	229.2212726,	122.3972822],
[465.255857,	230.882437,	122.5771095],
[466.0530602,	232.3648174,	122.7217176],
[466.5843783,	233.5286161,	122.7936837],
[466.9867704,	234.6548566,	122.9126625],
[467.2568285,	235.6609414,	123.0639789],
[467.3212678,	236.3711546,	123.2160318],
[467.0584873,	236.6402012,	123.2939872],
[466.5245063,	236.6013946,	123.3613831],
[465.7790442,	236.2897152,	123.4474927],
[464.7923898,	235.6949315,	123.5133649],
[463.591358,	234.829414,	123.561789],
[462.1391391,	233.6719108,	123.5313423],
[460.5865536,	232.4942127,	123.5252644],
[458.9292112,	231.1414172,	123.517852],
[457.1561284,	229.5840249,	123.387779],
[455.3309735,	228.012897,	123.1839918],
[453.4375088,	226.4752566,	122.9195273],
[451.5473692,	224.9230252,	122.592563],
[449.6550473,	223.259335,	122.1793955],
[447.6223422,	221.4491098,	121.7295484],
[445.1837404,	219.3490118,	121.1099646],
[442.1264635,	216.7017925,	120.3574769],
[438.5969716,	213.7632954,	119.509207],
[434.4162604,	210.5013703,	118.628482],
[429.4348234,	206.5936895,	117.8049863],
[422.5480934,	201.7078958,	116.9388372],
[413.5681949,	195.3189003,	116.106907],
[401.9264679,	187.4005682,	115.395232],
[385.9705362,	176.9877798,	114.8180404],
[365.4601107,	164.0069781,	114.4414539],
[338.9516153,	148.52672,	114.2127171],
[307.0746245,	130.2485048,	114.0654234],
[272.9505086,	112.8139872,	114.0806432],
[243.3387152,	99.5887188,	114.2304794],
[222.8787397,	90.49339941,	114.5026249],
[209.5439674,	84.42114027,	114.7994572],
[199.3791701,	79.62024134,	115.0669737],
[191.8110508,	75.50787588,	115.4244286],
[185.8152544,	72.25165909,	115.8049844],
[181.5253857,	69.98258758,	116.2082133],
[179.6657737,	68.6948676,	116.8980878],
[178.6067575,	67.63155685,	117.3077188],
[178.7576248,	67.05639549,	117.7194317],
[179.6735964,	67.0940693,	118.1611533],
[181.5456441,	67.35086525,	118.6021049],
[184.1700228,	67.84642677,	119.0483182],
[186.975604,	68.49775971,	119.4610347],
[190.0272485,	69.27257271,	119.8480164],
[193.5761868,	70.30715792,	120.3210942],
[197.2901138,	71.38490807,	120.7911287],
[201.1202514,	72.45726834,	121.2418602],
[205.0261995,	73.58324993,	121.6907313],
[208.9016256,	74.78532756,	122.136053],
[212.884138,	76.04579079,	122.5561764],
[216.8294925	,77.25556829,	122.9515449],
[220.8050722,	78.50254324,	123.3959085],
[224.7029834,	79.77289475,	123.8043579],
[228.4128946,	81.05837561,	124.2676545],
[232.0917243,	82.29671652,	124.6966244],
[235.9069245,	83.59645889,	125.0334654],
[239.824404,	85.00315553,	125.3476411],
[243.8021055,	86.51881109,	125.7133407],
[247.8074795,	88.00876729,	126.0940886],
[251.8534127,	89.54808938,	126.4238986],
[255.9122729,	91.20673269,	126.8141111],
[259.9539982,	92.85674243,	127.2183494],
[263.9853915,	94.5548457,	127.5386615],
[267.922647,	96.2233415,	127.8015631],
[271.7247142,	97.90681321,	128.0456936],
[275.6106759,	99.70062799,	128.3893898],
[279.4183235,	101.4193142,	128.7226805],
[283.1445367,	103.1379224,	129.0533132],
[286.6037604,	104.8121362,	129.343716],
[289.7794665,	106.3325515,	129.5979751],
[292.820766,	107.7868432,	129.8109355],
[295.6531067,	109.0793252,	130.0128685],
[298.3065012,	110.2668009,	130.2067735],
[301.1493894,	111.5263181,	130.5944249],
[303.1751314,	112.4522639,	130.7474294],
[304.9500348,	113.1879676,	130.8011017],
[306.5065377,	113.8247678,	130.9010445],
[307.8472314,	114.3112216,	131.024715],
[308.8438172,	114.5901802,	131.0534252],
[309.4398256,	114.6747067,	131.0519879],
[309.7497388,	114.5845229,	131.0082262],
[309.845902,	114.3627233,	131.0190872],
[309.6607991,	114.0293388,	131.0596797],
[309.0908219,	113.4930014,	131.0580331],
[308.3061482,	112.824282,	131.0371853],
[307.3485922,	112.0541374,	130.9813815],
[306.1634232,	111.238809,	130.9238015],
[304.7674116,	110.4090908,	130.8645917],
[303.1448837,	109.4853077,	130.7489998],
[301.3677309,	108.5114837,	130.5946021],
[299.5510085,	107.6014949,	130.4910607],
[297.6036109,	106.6338444,	130.3641639],
[295.707072,	105.7995527,	130.317791],
[293.6822859,	104.9246004,	130.19836],
[292.1186936,	104.1809034,	130.2029213],
[290.1366757,	103.3790144,	129.9911243],
[288.115882,	102.6723252,	129.882806],
[286.2502807,	102.0003888,	129.804952],
[284.3976273,	101.2915519,	129.6090048],
[282.7062344,	100.7319404,	129.3973108],
[281.067255,	100.3349501,	129.134827],
[279.7928956,	99.86705976,	129.0010086],
[278.8006921,	99.66200236,	128.9316677],
[277.7376899,	99.64581012,	128.6696699],
[276.7501753,	99.55883642,	128.279771],
[276.1150204,	99.60888679,	128.1195809],
[275.7633779,	99.78917133,	128.0895515],
[275.4526825,	99.97320004,	127.9741124],
[275.3525407,	100.1807614,	127.6870631],
[275.3317412,	100.8693171,	127.2014299],
[276.0812607,	101.7722762,	127.1543087],
[278.0443045,	102.9632258,	127.5553363],
[279.8815943,	104.6056279,	127.0600165],
[281.66277,	105.603153,	126.6492786],
[285.2635359,	108.4569396,	125.8793083],
[290.1648183	,112.112833,	125.2915117],
[296.900219	,117.42578,	125.7025072],
[304.4062961,	121.4243838,	125.6819046],
[311.9224893	,125.7353928,	125.0880109],
[320.7135384	,133.1234004,	123.7450599],
[331.4059138	,137.3364269,	123.2981],
[338.1485848	,142.9613623,	124.7172563],
[338.5499456, 143.6151127,	124.5510809],
[335.6435118,	139.3595025,	119.9996802],
[293.5704177,	123.0280063,	110.3807323],
[209.2280732,	88.36606789,	101.8000228],
[139.2205211,	51.08991076,	94.79220929],
[100.7899706,	38.94180591,	88.16271373],
[90.55159845,	29.17363409,	87.29219035],
[61.33785487,	16.25486944,	87.77624183],
[55.70356217,	21.75005124,	88.72077988],
[60.62394029,	27.69851962,	88.92151207],
[56.07839677,	23.28527396,	89.73923374],
[42.25046142,	27.19668938,	90.76993601],
[44.32429194,	26.02677964,	91.03756982],
[42.87931616,	25.49474207,	91.74695238],
[43.50694058,	29.11631987,	91.80177712],
[44.61152822,	28.95611062,	92.53130516],
[46.20852817,	29.21825338,	93.09203269],
[46.84975862,	29.27684059,	94.00892395],
[48.35424973,	30.33520148,	94.69915679],
[50.38673236,	31.32974047,	95.50375942],
[52.05315195,	31.96702131,	96.4157133],
[53.52883427,	32.50572269,	97.20297319],
[55.11067188,	33.23245238,	98.21565097],
[57.12147796,	33.90647633,	98.82027797],
[59.19915994,	34.11873353,	99.91936374],
[62.46416531,	34.52341879,	100.878291],
[66.70400274,	35.51400874,	101.8117609],
[71.54523442,	36.50717238,	102.7887082],
[76.82426646,	37.51406935,	103.5657646],
[81.05868958,	38.34585973,	104.5085053],
[84.74176863,	38.96840724,	105.4536752],
[87.84721469,	39.44724716,	106.4740141],
[90.24360703,	39.87349303,	107.3289449],
[92.21938872,	40.261177,	108.0348439],
[94.36344573,	40.44156876,	109.0239805],
[96.53052828,	40.56403955,	109.8105036],
[98.87770419,	40.64751411,	110.19678],
[101.5444774,	41.00184055,	111.121519],
[104.2340524,	41.31044623,	111.7255266],
[107.3699589,	41.44856132,	112.208306],
[110.5475511,	41.85082624,	112.6739152],
[113.3810271,	42.10497166,	113.1549217],
[115.7473143,	42.56858603,	113.2451713],
[118.4665759,	43.03905229,	113.6479969],
[120.9353174,	43.42785479,	113.9546779],
[123.2597463,	43.88131931,	114.1328165],
[125.444183,	44.12260018,	114.1339062],
[127.7371903,	44.64223734,	114.4417776],
[130.0659879,	45.15089128,	114.492411],
[132.400118,	45.81734981,	114.4719866],
[134.4112322,	46.37632289,	114.2984136],
[136.8330397,	46.78242345,	114.2785109],
[138.5407979,	47.13948422,	114.0408901],
[140.4849667,	47.68300216,	113.7063652],
[142.2438375,	48.55164144,	113.6290159],
[143.7660415,	48.96706814,	113.3145586],
[145.5725892,	49.5298305,	113.0219472],
[146.8224902,	49.87277141,	112.4969609],
[148.0444098,	50.30334114,	112.2281353],
[149.713519,	50.97742735,	112.0020906],
[151.3580697,	51.57292725,	111.6717256],
[152.8293892,	52.3168826,	111.7087359],
[153.9951655,	52.71986195,	111.3243295],
[155.2483443,	53.28212471,	111.0395654],
[156.5010603,	53.53515768,	110.6656669],
[157.4345225,	53.74880188,	110.4284005],
[158.3484179,	54.05672705,	110.2863065],
[159.227924,	54.43319915,	110.0620042],
[159.6050535,	54.32913866,	109.7865517],
[159.33168,	54.0148554,	109.5728817],
[159.1038594,	53.32366093,	109.231846],
[158.7269269,	52.8483957,	109.0369954],
[157.7391815,	52.04705777,	108.8535639],
[156.6201181,	51.34127661,	108.8979976],
[154.4422372,	50.36748037,	108.6269631],
[152.1903282,	49.50931511,	108.3276181],
[149.2482971,	48.26349618,	107.88067],
[145.5509983,	46.86399506,	107.4078897],
[143.5029011,	45.89686227,	107.447583],
[141.7008453,	44.90357452,	107.4571089],
[138.7791923,	43.93759724,	106.9517272],
[135.9046589,	42.92741201,	106.5003581],
[132.8304085,	41.57925713,	106.0883552],
[129.9458893,	40.74548016,	105.727857],
[127.3340315,	40.23906704,	105.5492502],
[124.9653143,	39.57404637,	104.971138],
[122.6525247,	38.94274076,	104.2131991],
[120.1334141,	38.27051625,	103.6244352],
[117.8714146,	37.71710493,	102.9259281],
[115.6511074,	37.20476543,	102.3595247],
[113.7573288,	36.92323742,	102.0315602],
[112.1571816,	36.77997302,	101.3322384],
[109.8917561,	35.96149581,	100.5676469],
[107.572099,	35.08561996,	99.87091364],
[106.0370603,	34.80510585,	99.21701178],
[104.7643795,	35.11222801,	98.69429017],
[102.7411893,	35.00053003,	98.07004876],
[100.2254106,	34.35966074,	97.4898708],
[98.15299694,	33.52451057,	96.73630228],
[96.71668913,	33.05800711,	95.92605048],
[94.35403465,	33.15769028,	95.47708805],
[91.01849979,	33.17318566,	95.07191384],
[88.46835749,	32.58121092,	94.79163547],
[86.68427797,	31.47006008,	94.30439462],
[84.99420491,	31.21537588,	93.49815945],
[82.19597841,	31.45598944,	92.95296697],
[78.96454978,	31.15804773,	92.11745621],
[77.49412629,	29.96144723,	91.48960725],
[76.47429568,	29.2385791,	90.88426548],
[73.71748133,	28.73575678,	90.43081482],
[70.93113903,	28.89931962,	89.8403499],
[67.54226009,	28.2476603,	89.26609531],
[65.7431848,	27.06747314,	88.60325624],
[62.84433591,	25.69331913,	88.23580713],
[59.92145335,	24.62492093,	88.34578275],
[58.44573322,	23.98895618,	87.6211659],
[59.96422402,	22.88095884,	86.2497016],
[60.22558386,	23.44945815,	84.39990036],
[55.49208022,	20.97500361,	83.80056401],
[49.55703377,	16.19044072,	84.63274205],
[42.68839237,	12.87547093,	84.25715957],
[41.47254116,	15.23907255,	83.3850648],
[42.45942214,	16.37549484,	80.64278038],
[21.55591061,	8.772965023,	40.95015625 ]
]);

    function processImage(selectedImage, RM, RH) {
      // Transpose the RM matrix
      var RM_t = RM.transpose();
      print('RM_t:', RM_t);
    
      // Convert the image to an array with the shape [height, width, bands]
      var arrayImage1D = selectedImage.toArray();
      var arrayImage2D = arrayImage1D.toArray(1);
      print('2D array image', arrayImage2D);
      
      // Perform dot product with RM_t
      var dp = ee.Image(RM_t).matrixMultiply(arrayImage2D);
      print('After multiplying with RM_t:', dp);
    
      // Perform dot product with inverse of RM_t * RM
      var RM_inv = ee.Array(RM_t.matrixMultiply(RM).matrixInverse());
      print('RM_inv:', RM_inv);
      dp = ee.Image(RM_inv).matrixMultiply(dp);
      print('After multiplying with RM_inv:', dp);
    
      // Perform dot product with RH
      dp = ee.Image(RH).matrixMultiply(dp);
      print('After multiplying with RH:', dp);
    
      // Generate new band names
      var shape = dp.arrayLength(0).reduceRegion({
        reducer: ee.Reducer.first(),
        geometry: selectedImage.geometry(),
        scale: 30,
        maxPixels: 1e9
      }).values().get(0);
      print('Shape:', shape);
    
      shape = ee.Number(shape);
      var bandNames = ee.List.sequence(0, shape.subtract(1)).map(function(i) {
        return ee.String('B').cat(ee.Number(i).int());
      });
      print('Band names:', bandNames);

      // Convert the processed array back to an image
          
      var projected = dp.arrayProject([0]);
      var flattened = projected.arrayFlatten([bandNames]);
      print('Projected:', projected);
      print('Flattened:', flattened);
  
  return flattened;
}
    var processedImage = processImage(selectedImage, RM, RH);
    var selected_fcc_img = processedImage.select(['B96', 'B56', 'B36']);
    var selected_rgb_img = processedImage.select(['B56', 'B36', 'B20']);

    
    
    
    
    var allBands = ['B4', 'B3', 'B2', 'B96', 'B56', 'B36', 'B20'];  
    var percentile = processedImage.select(allBands).reduceRegion({
  reducer: ee.Reducer.percentile([2, 98]),
  geometry: processedImage.geometry(),
  scale: 30,
  maxPixels: 1e9
}).getInfo();

    function createVisParams(bands) {
  var min = bands.map(function(band) { return percentile[band + '_p2']; });
  var max = bands.map(function(band) { return percentile[band + '_p98']; });
  return {
    bands: bands,
    min: min,
    max: max,
    gamma: 1.0
  };
}

// Create visualization parameters for different layers
    var processedVisParams = createVisParams(['B4', 'B3', 'B2']);
    var fccVisParams = createVisParams(['B96', 'B56', 'B36']);
    var rgbVisParams = createVisParams(['B56', 'B36', 'B20']);
    
    map.layers().set(1, ui.Map.Layer(processedImage, processedVisParams, 'Processed Image'));
    map.layers().set(2, ui.Map.Layer(processedImage, rgbVisParams, 'Processed RGB Image'));
    map.layers().set(3, ui.Map.Layer(processedImage, fccVisParams, 'Processed FCC Image'));
    
 
    
        
    function getDownloadUrl(image,fileName) {
      var url = image.getDownloadURL({
        name: fileName,
        scale: 10,
        region: fixedSquare,
        filePerBand: false,
        // format: 'GeoTIFF'
      });
      
      return url;
    }

    
    
    
    function addDownloadLinks() {
      // Remove existing download links
      existingLinks.forEach(function(link) {
        panel.remove(link);
      });
      existingLinks = [];

      if (checkbox2.getValue()) {
        var rgbFileName = 'RGB_Image_' + selectedDate;
        var rgbUrl = getDownloadUrl(selected_rgb_img,rgbFileName);
        var rgbLink = ui.Label({
          value: 'Download RGB Image',
          targetUrl: rgbUrl,
          style:{
           backgroundColor:'#D4F1F4',
           color:'grey'
          }
        });
        panel.add(rgbLink);
        existingLinks.push(rgbLink);
      }
      if (checkbox3.getValue()) {
        var fccFileName = 'FCC_Image_' + selectedDate;
        var fccUrl = getDownloadUrl(selected_fcc_img,fccFileName);
        var fccLink = ui.Label({
          value: 'Download FCC Image',
          targetUrl: fccUrl,
           style:{
           backgroundColor:'#D4F1F4',
           color:'grey'
          }
        });
        panel.add(fccLink);
        existingLinks.push(fccLink);
      }
    }

    // Add the UI elements to the panel if not already added
    var alreadyAdded = false;
    panel.widgets().forEach(function(widget) {
      if (widget === label) {
        alreadyAdded = true;
      }
    });

    if (!alreadyAdded) {
      panel.add(label);
      // panel.add(checkbox1);
      panel.add(checkbox2);
      panel.add(checkbox3);
      panel.add(downloadButton);
    } else {
      print('Visualization selection UI elements already added');
    }

    // Update download links
    downloadButton.onClick(addDownloadLinks);






    // Generate a download link for the processed image
    processedImage.getDownloadURL({
      name: 'Processed_image_' + selectedDate,
      scale: 10,
      filePerBand:false,
      region: fixedSquare,
      fileFormat: 'GeoTIFF'
    }, function(url) {
      downloadLinkProcessed.setValue('Download Processed Hyperspectral Image (425 Bands)');
      downloadLinkProcessed.setUrl(url);
      print(url)
    });

      var widgets = map.widgets();
      print(widgets);
      var titleExists = widgets.some(function(widget) {
        return widget.getValue && widget.getValue() === 'Inspector';
      });
      
      // Add the title if it doesn't exist
      if (!titleExists) {
        map.remove(title)
        map.add(title);
      }
      



    infoPanel = ui.Panel({style: {position: 'bottom-right'}});

// Create a function to update the inspector
    map.style().set('cursor', 'crosshair');
    function updateInspector(coords) {
      // Clear the panel
      // infoPanel.widgets().reset();  
      // Get pixel values at the clicked point
      var point = ee.Geometry.Point(coords.lon, coords.lat);
      print(point);
      var values = processedImage.reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: point,
        scale: 30,
        maxPixels: 1e9
      });

      
  // Add the pixel values to the panel and create a chart
      values.evaluate(function(result) {
      var bandNames = processedImage.bandNames().getInfo();
      var bandValues = bandNames.map(function(band) { return result[band]; });
      
      chart = ui.Chart.array.values(bandValues, 0, bandNames)
        .setChartType('LineChart')
        .setOptions({
          title: 'Spectral Signature',
          hAxis: {title: 'Band'},
          vAxis: {title: 'Reflectance'},
          lineWidth: 1,
          pointSize: 4
        });
      
      infoPanel.add(chart);
      if (!map.widgets().contains(infoPanel)) {
      map.add(infoPanel);
    }

  });
}


// Register a callback on the map to update the inspector when clicked
    map.onClick(function(coords) {
      infoPanel.widgets().reset();
      updateInspector(coords);
     
});

   
  });
}

// Clear selections and existing links
function clearSelections() {
  // checkbox1.setValue(false);
  checkbox2.setValue(false);
  checkbox3.setValue(false);

  existingLinks.forEach(function(link) {
    panel.remove(link);
  });
  existingLinks = [];
}
    




// Add drawing control for rectangles only
var drawingTools = map.drawingTools();
drawingTools.setDrawModes(['rectangle']);
drawingTools.setShape('rectangle');

// Set the drawing style for the rectangles
var style = {
  color: '#555fa5',
  fillColor: '#555fa5',
  fillOpacity: 0.15,  // Make the rectangle semi-transparent
  width: 1
};

drawingTools.onDraw(function(geometry) {
  onDraw(geometry);
  drawingTools.stop();
  drawingTools.setShape('rectangle', style);
});
drawingTools.setShape('rectangle', style);
drawingTools.addLayer([], 'AOI Layer', '#555fa5', true, false); 

var layout = ui.SplitPanel({
  firstPanel: panel,
  secondPanel: map,
  orientation: 'horizontal',
  style: {stretch: 'both'}
});


// Display the map
ui.root.widgets().reset([layout]);
