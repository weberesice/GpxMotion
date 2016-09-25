/*globals L $*/

(function(){

var currentTimer;

function Timer(callback, delay) {
    var timerId, start, remaining = delay;

    this.pause = function() {
        window.clearTimeout(timerId);
        remaining -= new Date() - start;
    };

    this.resume = function() {
        start = new Date();
        window.clearTimeout(timerId);
        timerId = window.setTimeout(callback, remaining);
    };

    this.resume();
}

function nextMarker(){
    if (currentMarkerIndex < markers.length){

        // remove marker when it ends
        if (currentMarkerIndex > 0){
            map.removeLayer(markers[currentMarkerIndex-1]);
        }

        // add next marker pin at start point and get its time
        var timeout = plan[currentMarkerIndex][2];
        beginMarkers[currentMarkerIndex].addTo(map);

        //$(markers[currentMarkerIndex]._icon).show();

        // add the moving marker and start it
        map.addLayer(markers[currentMarkerIndex]);
        markers[currentMarkerIndex].start();

        // draw a line for current marker
        polylines[currentMarkerIndex].addTo(map);
        // zoom on current section
        map.fitBounds(polylines[currentMarkerIndex].getBounds(), {animate:true});

        currentMarkerIndex++;

        // schedule next marker
        currentTimer = new Timer(function() {
            nextMarker();
        }, timeout);
    }
}

function playPause(){
    if (markers[currentMarkerIndex-1].isPaused()){
        currentTimer.resume();
        markers[currentMarkerIndex-1].resume();
    }
    else{
        currentTimer.pause();
        markers[currentMarkerIndex-1].pause();
    }
}


var vehicule = {
    plane : {
        icon: L.icon({
            iconUrl: 'images/plane2.png',
            iconSize: [40, 52],
            iconAnchor: [20, 52],
            shadowUrl: null
        }),
        color : 'blue'
    },
    train : {
        icon: L.icon({
            iconUrl: 'images/train2.png',
            iconSize: [40, 52],
            iconAnchor: [20, 52],
            shadowUrl: null
        }),
        color : 'red'
    },
    bus : {
        icon: L.icon({
            iconUrl: 'images/bus2.png',
            iconSize: [40, 52],
            iconAnchor: [20, 52],
            shadowUrl: null
        }),
        color : 'purple'
    },
    hike : {
        icon: L.icon({
            iconUrl: 'images/hike2.png',
            iconSize: [40, 52],
            iconAnchor: [20, 52],
            shadowUrl: null
        }),
        color : 'brown'
    },
    car : {
        icon: L.icon({
            iconUrl: 'images/car2.png',
            iconSize: [40, 52],
            iconAnchor: [20, 52],
            shadowUrl: null
        }),
        color : 'purple'
    },
    bike : {
        icon: L.icon({
            iconUrl: 'images/bike2.png',
            iconSize: [40, 52],
            iconAnchor: [20, 52],
            shadowUrl: null
        }),
        color : 'green'
    }
}

var pinIcon = L.icon({
            iconUrl: 'images/pin.png',
            iconSize: [25, 39],
            iconAnchor: [5, 39],
            shadowUrl: null
        });



var map = L.map('map').setView([0, 0], 2);
L.control.scale({metric: true, imperial: true, position:'topleft'}).addTo(map);

  var osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  var osmAttribution = 'Map data &copy; 2013 <a href="http://openstreetmap'+
                       '.org">OpenStreetMap</a> contributors';
  var osm = new L.TileLayer(osmUrl, {maxZoom: 18, attribution: osmAttribution});

  var osmfrUrl = 'http://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png';
  var osmfr = new L.TileLayer(osmfrUrl,
              {maxZoom: 20, attribution: osmAttribution});
  var osmfr2 = new L.TileLayer(osmfrUrl,
               {minZoom: 0, maxZoom: 13, attribution: osmAttribution});

  var openmapsurferUrl = 'http://openmapsurfer.uni-hd.de/tiles/roads/'+
                         'x={x}&y={y}&z={z}';
  var openmapsurferAttribution = 'Imagery from <a href="http://giscience.uni'+
  '-hd.de/">GIScience Research Group @ University of Heidelberg</a> &mdash; '+
  'Map data &copy; <a href="http://www.openstreetmap.org/copyright">'+
  'OpenStreetMap</a>';
  var openmapsurfer = new L.TileLayer(openmapsurferUrl,
                      {maxZoom: 18, attribution: openmapsurferAttribution});

  var transportUrl = 'http://a.tile2.opencyclemap.org/transport/{z}/{x}/{y}.'+
                     'png';
  var transport = new L.TileLayer(transportUrl,
                  {maxZoom: 18, attribution: osmAttribution});

  var pisteUrl = 'http://tiles.openpistemap.org/nocontours/{z}/{x}/{y}.png';
  var piste = new L.TileLayer(pisteUrl,
              {maxZoom: 18, attribution: osmAttribution});

  var hikebikeUrl = 'http://toolserver.org/tiles/hikebike/{z}/{x}/{y}.png';
  var hikebike = new L.TileLayer(hikebikeUrl,
                 {maxZoom: 18, attribution: osmAttribution});

  var osmCycleUrl = 'http://{s}.tile.opencyclemap.org/cycle/{z}/{x}/{y}.png';
  var osmCycleAttrib = '&copy; <a href="http://www.opencyclemap.org">'+
  'OpenCycleMap</a>, &copy; <a href="http://www.openstreetmap.org/copyright">'+
  'OpenStreetMap</a>';
  var osmCycle = new L.TileLayer(osmCycleUrl,
                 {maxZoom: 18, attribution: osmCycleAttrib});

  var darkUrl = 'http://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png';
  var darkAttrib = '&copy; Map tiles by CartoDB, under CC BY 3.0. Data by'+
                   ' OpenStreetMap, under ODbL.';
  var dark = new L.TileLayer(darkUrl, {maxZoom: 18, attribution: darkAttrib});

  var esriTopoUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World'+
                    '_Topo_Map/MapServer/tile/{z}/{y}/{x}';
  var esriTopoAttrib = 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, '+
  'TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ord'+
  'nance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User'+
  ' Community';
  var esriTopo = new L.TileLayer(esriTopoUrl,
                 {maxZoom: 18, attribution: esriTopoAttrib});

  var esriAerialUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services'+
                      '/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  var esriAerialAttrib = 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, '+
  'USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the'+
  ' GIS User Community';
  var esriAerial = new L.TileLayer(esriAerialUrl,
                   {maxZoom: 18, attribution: esriAerialAttrib});

  var tonerUrl = 'http://{s}.tile.stamen.com/toner/{z}/{x}/{y}.jpg';
  var stamenAttribution = '<a href="http://leafletjs.com" title="A JS library'+
  ' for interactive maps">Leaflet</a> | © Map tiles by <a href="http://stamen'+
  '.com">Stamen Design</a>, under <a href="http://creativecommons.org/license'+
  's/by/3.0">CC BY 3.0</a>, Data by <a href="http://openstreetmap.org">OpenSt'+
  'reetMap</a>, under <a href="http://creativecommons.org/licenses/by-sa/3.0"'+
  '>CC BY SA</a>.';
  var toner = new L.TileLayer(tonerUrl,
              {maxZoom: 18, attribution: stamenAttribution});

  var watercolorUrl = 'http://{s}.tile.stamen.com/watercolor/{z}/{x}/{y}.jpg';
  var watercolor = new L.TileLayer(watercolorUrl,
                   {maxZoom: 18, attribution: stamenAttribution});

  var routeUrl = 'http://{s}.tile.openstreetmap.fr/route500/{z}/{x}/{y}.png';
  var routeAttrib = '&copy, Tiles © <a href="http://www.openstreetmap.fr">O'+
  'penStreetMap France</a>';
  var route = new L.TileLayer(routeUrl,
              {minZoom: 1, maxZoom: 20, attribution: routeAttrib});

  var baseLayers = {
        'OpenStreetMap': osm,
        'OpenCycleMap': osmCycle,
        'OpenMapSurfer Roads': openmapsurfer,
        'Hike & bike': hikebike,
        'OSM Transport': transport,
        'ESRI Aerial': esriAerial,
        'ESRI Topo with relief': esriTopo,
        'Dark' : dark,
        'Toner' : toner,
        'Watercolor' : watercolor,
        'OpenStreetMap France': osmfr
  };

  var baseOverlays = {
      'OsmFr Route500': route,
      'OpenPisteMap Relief':
        L.tileLayer('http://tiles2.openpistemap.org/landshaded/{z}/{x}/{y}.png',
                    {
                    attribution: '&copy, Tiles © <a href="http://www.o'+
                    'penstreetmap.fr">OpenStreetMap France</a>',
                    minZoom: 1,
                    maxZoom: 15
                    }
        ),
      'OpenPisteMap pistes' : piste
  };
default_layer = 'OpenStreetMap France';
map.addLayer(baseLayers[default_layer]);
L.control.layers(baseLayers, baseOverlays).addTo(map);

var currentMarkerIndex = 0;
var markers = [];
var polylines = [];
// used to add permanent steps markers
var beginMarkers = [];
var plan = [
    [1, 'plane', 3000],
    [2, 'bus', 6000],
    [2, 'hike', 6000],
    [2, 'car', 6000],
    [2, 'train', 6000],
    [20, 'bike', 6000]
];

  $.ajax('./test.gpx').done(function(xml) {
          //console.log(toGeoJSON.gpx(xml).features[0].geometry.coordinates[0]);
          var table;
		  var ll,mypoly;
          var marker;
          var iplan = 0;
          var planSection, thecoord;
          var iline = 0;
          var nblinesInserted;
          var coords = toGeoJSON.gpx(xml).features[0].geometry.coordinates;
          while (iplan < plan.length && iline < coords.length){
              planSection = plan[iplan];
              nblinesInserted = 0;
              table = [];
              while (nblinesInserted < planSection[0]+1 && iline < coords.length){
                  //for (i=0; i< coords.length; i++){
                  thecoord = coords[iline];
                  ll = L.latLng(thecoord[1], thecoord[0]);
                  console.log('section '+iplan+' : '+thecoord[1]+' ; '+ thecoord[0]);
                  table.push(ll);
                  iline++;
                  nblinesInserted++;
              }
              iline--;

              thevehicule = planSection[1];
              theicon = vehicule[thevehicule].icon;
              thecolor = vehicule[thevehicule].color;

              mypoly = L.polyline(table, {color:thecolor});
              polylines.push(mypoly);

              marker = L.Marker.movingMarker(mypoly.getLatLngs(), planSection[2],{
                  autostart: false,
                  icon: theicon
                  }
              );
              var beginMarker = L.marker(table[0], {icon: pinIcon});
              beginMarkers.push(beginMarker);

              //map.addLayer(marker);
              //if (iplan !== 0){
              //    $(marker._icon).hide();
              //}
              markers.push(marker);

              iplan++;
          }

      //});

  });

 $(function() {
  $('#pause').click(function() {
      if (currentMarkerIndex === 0){
          nextMarker();
      }
      else{
          playPause();
      }
  });
  $('#start').click(function() {
    console.log('start');
    //$.each(markers, function(i, marker) {
      //marker.start();
    //});

    nextMarker();

    $(this).hide();

	//setTimeout(function() {
	//	// Stop the animation
	//	marker.setIcon(otherIcon);
	//}, 2000);


  });
  function checkKey(e){
	  e = e || window.event;
	  var kc = e.keyCode;
	  console.log(kc);

	  if (kc === 32){
          if (currentMarkerIndex === 0){
              nextMarker();
          }
          else{
              playPause();
          }
	  }
	  if (kc === 161 || kc === 223){
	  }
	  if (kc === 60 || kc === 220){
		  e.preventDefault();
	  }
  }
  document.onkeydown = checkKey;

 });
}());
