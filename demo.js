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
        //if (currentMarkerIndex > 0){
        //    map.removeLayer(markers[currentMarkerIndex-1]);
        //}
        console.log('i start marker '+currentMarkerIndex);
        var timeout = plan[currentMarkerIndex][2];
        beginMarkers[currentMarkerIndex].addTo(map);

        //$(markers[currentMarkerIndex]._icon).show();
        map.addLayer(markers[currentMarkerIndex]);
        markers[currentMarkerIndex].start();

        polylines[currentMarkerIndex].addTo(map);
        map.fitBounds(polylines[currentMarkerIndex].getBounds());

        currentMarkerIndex++;

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
    bike : {
        icon: L.icon({
            iconUrl: 'marker-bike-green-shadowed.png',
            iconSize: [25, 39],
            iconAnchor: [12, 39],
            shadowUrl: null
        }),
        color : 'red'
    },
    bus : {
        icon: L.icon({
            iconUrl: 'marker-icon.png',
            iconSize: [25, 39],
            iconAnchor: [12, 39],
            shadowUrl: null
        }),
        color : 'blue'
    }
}



var map = L.map('map').setView([0, 0], 2);
L.control.scale({metric: true, imperial: true, position:'topleft'}).addTo(map);

var tilelayer = L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
})

tilelayer.addTo(map);

var currentMarkerIndex = 0;
var markers = [];
var polylines = [];
// used to add permanent steps markers
var beginMarkers = [];
var plan = [
    [1, 'bike', 4000],
    [6, 'bus', 4000],
    [20, 'bike', 3000]
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
              var beginMarker = L.marker(table[0]);
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
