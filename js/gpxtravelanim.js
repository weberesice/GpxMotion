/*globals L $*/

(function(){

var currentTimer = null;
var params;
var plan;
var currentMarkerIndex = 0;
var markers = [];
var polylines = [];
// used to add permanent steps markers
var beginMarkers = [];
var globalBounds;

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

String.format = function() {
    // The string containing the format items (e.g. "{0}")
    // will and always has to be the first argument.
    var theString = arguments[0];

    // start with the second argument (i = 1)
    for (var i = 1; i < arguments.length; i++) {
        // "gm" = RegEx options for Global search (more than one instance)
        // and for Multiline search
        var regEx = new RegExp("\\{" + (i - 1) + "\\}", "gm");
        theString = theString.replace(regEx, arguments[i]);
    }

    return theString;
}

function nextMarker(){
    if (currentMarkerIndex < markers.length){
        playButton.state('pause');

        // remove marker when it ends
        if (currentMarkerIndex > 0){
            markers[currentMarkerIndex-1].stop();
            map.removeLayer(markers[currentMarkerIndex-1]);
        }

        // add next marker pin at start point and get its time
        var timeout = plan[currentMarkerIndex]['time'];
        beginMarkers[currentMarkerIndex].addTo(map);

        //$(markers[currentMarkerIndex]._icon).show();

        // add the moving marker and start it
        map.addLayer(markers[currentMarkerIndex]);
        markers[currentMarkerIndex].start();

        // draw a line for current marker
        polylines[currentMarkerIndex].addTo(map);
        // zoom on current section
        map.fitBounds(polylines[currentMarkerIndex].getBounds(), {animate:true, padding: [100,100]});

        currentMarkerIndex++;

        // schedule next marker
        currentTimer = new Timer(function() {
            nextMarker();
        }, timeout);
    }
    else{
        // this is the end of the animation
        // we remove the last marker
        markers[currentMarkerIndex-1].stop();
        map.removeLayer(markers[currentMarkerIndex-1]);
        // add last pin marker
        beginMarkers[currentMarkerIndex].addTo(map);
        currentMarkerIndex = 0;
        currentTimer = null;

        playButton.state('play');
    }
}

function playPause(){
    if (markers[currentMarkerIndex-1].isPaused()){
        currentTimer.resume();
        markers[currentMarkerIndex-1].resume();
        playButton.state('pause');
    }
    else{
        currentTimer.pause();
        markers[currentMarkerIndex-1].pause();
        playButton.state('play');
    }
}

function reset(){
    // stop scheduler
    if (currentTimer !== null){
        currentTimer.pause();
        currentTimer = null;
    }

    // reset currentMarkerIndex
    currentMarkerIndex = 0;
    var i;
    // remove begin markers
    for (i=0; i < beginMarkers.length; i++){
        map.removeLayer(beginMarkers[i]);
    }

    // remove polylines
    for (i=0; i < polylines.length; i++){
        map.removeLayer(polylines[i]);
    }

    // remove moving markers
    for (i=0; i < markers.length; i++){
        markers[i].stop();
        map.removeLayer(markers[i]);
    }
    playButton.state('play');
}

function displayCompleteTravel(){
    for (var i=0; i<beginMarkers.length; i++){
        beginMarkers[i].addTo(map);
    }
    for (var i=0; i<polylines.length; i++){
        polylines[i].addTo(map);
    }
    // zoom on whole travel
    //map.fitBounds(globalBounds, {animate:true, padding: [100,100]});
    map.flyToBounds(globalBounds, {animate:true, padding: [100,100]});
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
        color : 'yellow'
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

var beginPinIcon = L.icon({
            iconUrl: 'images/pin.png',
            iconSize: [25, 39],
            iconAnchor: [5, 39],
            shadowUrl: null
        });
var endPinIcon = L.icon({
            iconUrl: 'images/pinred.png',
            iconSize: [25, 39],
            iconAnchor: [5, 39],
            shadowUrl: null
        });
var normalPinIcon = L.icon({
            iconUrl: 'images/pinblue.png',
            iconSize: [25, 39],
            iconAnchor: [5, 39],
            shadowUrl: null
        });

// map management
var map = L.map('map').setView([0, 0], 2);

L.control.mousePosition().addTo(map);
L.control.scale({metric: true, imperial: true, position:'topleft'}).addTo(map);
var legendText = '<h3>Line colors</h3><p style="font-size:18px;">'+
'<b style="color:blue;">plane</b><br/>'+
'<b style="color:green;">bike</b><br/>'+
'<b style="color:yellow;">foot</b><br/>'+
'<b style="color:purple;">car</b><br/>'+
'<b style="color:purple;">bus</b><br/>'+
'<b style="color:red;">train</b><br/>'+
'</p>'+
'<h3>Pins</h3>'+
'<p>'+
'<img src="images/pin.png"/>start<br/>'+
'<img src="images/pinblue.png"/>step<br/>'+
'<img src="images/pinred.png"/>end'+
'</p>';
var dialog = L.control.dialog({anchor: [110, 0], position: 'topleft', size: [90,500]})
    .setContent(legendText)
    .addTo(map);

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

var drawButton = L.easyButton({
	position: 'bottomright',
    states: [{
            stateName: 'draw',   // name the state
            icon:      'fa-eye',          // and define its properties
            title:     'Draw complete trip (g)', // like its title
            onClick: function(btn, map) {  // and its callback
				reset();
				displayCompleteTravel();
            }
        }]
});
drawButton.addTo(map);

var resetButton = L.easyButton({
	position: 'bottomright',
    states: [{
            stateName: 'reset',   // name the state
            icon:      'fa-eye-slash',          // and define its properties
            title:     'Reset (i)', // like its title
            onClick: function(btn, map) {  // and its callback
				reset();
            }
        }]
});
resetButton.addTo(map);

var playButton = L.easyButton({
	position: 'bottomright',
    states: [{
            stateName: 'play',   // name the state
            icon:      'fa-play-circle-o',          // and define its properties
            title:     'Play/Pause animation (spacebar)', // like its title
            onClick: function(btn, map) {  // and its callback
				if (currentMarkerIndex === 0){
					reset();
					nextMarker();
				}
				else{
					playPause();
				}
            }
        },{
            stateName: 'pause',   // name the state
            icon:      'fa-pause-circle-o',          // and define its properties
            title:     'Play/Pause animation (spacebar)', // like its title
            onClick: function(btn, map) {  // and its callback
				if (currentMarkerIndex === 0){
					reset();
					nextMarker();
				}
				else{
					playPause();
				}
            }
        }]
});
playButton.addTo(map);

// load gpx file with plan and build our markers, pins...
function main(){
    $.ajax('./track2.gpx').done(function(xml) {
        //console.log(toGeoJSON.gpx(xml).features[0].geometry.coordinates[0]);
        var desc = $(xml).find('gpx>metadata>desc').text();
        var jsondesc = $.parseJSON('{'+desc+'}');
        params = jsondesc;
        plan = params.plan;

        var table;
        var ll,mypoly;
        var marker;
        var iplan = 0;
        var planSection, thecoord;
        var iline = 0;
        var nblinesInserted;
        var geogpx = toGeoJSON.gpx(xml);
        var coords = [];
        var planNamesFromGpxTrk =[];

        // used in feature unit only
        // we get the number of features we want for each plan step
        var featureNumberPerStep = [];
        if (params.elementUnit === 'track'){
            for (var i=0; i<plan.length; i++){
                featureNumberPerStep.push(plan[i]['nbElements']);
                plan[i]['nbElements'] = 0;
                planNamesFromGpxTrk.push('');
            }
        }
        var iplancoord = 0;
        // concatenate all tracks/routes coordinates in one array
        // avoid waypoints
        for (var i=0; i<geogpx.features.length; i++){
            if (geogpx.features[i].geometry.type !== 'Point'){
                //alert(geogpx.features[i].geometry.type);
                var featureLength = 0;
                if (geogpx.features[i].geometry.type === 'MultiLineString'){
                    for(var j=0; j<geogpx.features[i].geometry.coordinates.length; j++){
                        coords = coords.concat(geogpx.features[i].geometry.coordinates[j]);
                        featureLength += geogpx.features[i].geometry.coordinates[j].length;
                    }
                }
                else{
                    coords = coords.concat(geogpx.features[i].geometry.coordinates);
                    featureLength = geogpx.features[i].geometry.coordinates.length;
                }
                // if we count the features, get the correct number of segments
                if (params.elementUnit === 'track' && iplancoord < plan.length){
                    plan[iplancoord]['nbElements'] += featureLength;
                    planNamesFromGpxTrk[iplancoord] += geogpx.features[i].properties.name + '; ';
                    featureNumberPerStep[iplancoord]--;
                    if (featureNumberPerStep[iplancoord] === 0){
                        planNamesFromGpxTrk[iplancoord] = planNamesFromGpxTrk[iplancoord].replace(/;\s$/g, '');
                        iplancoord++;
                    }
                }
            }
        }
        while (iplan < plan.length && iline < coords.length){
            planSection = plan[iplan];
            nblinesInserted = 0;
            table = [];
            while (nblinesInserted < planSection['nbElements']+1 && iline < coords.length){
                thecoord = coords[iline];
                ll = L.latLng(thecoord[1], thecoord[0]);
                //console.log('section '+iplan+' : '+thecoord[1]+' ; '+ thecoord[0]);
                table.push(ll);
                iline++;
                nblinesInserted++;
            }
            // if this is the last coord, there is nothing to link with after
            // else : we artificialy put the last point we took as the start of next section
            if (iline !== coords.length){
                iline--;
            }

            thevehicule = planSection['vehicule'];
            theicon = vehicule[thevehicule].icon;
            thecolor = vehicule[thevehicule].color;

            mypoly = L.polyline(table, {color:thecolor, weight:5});
            var polyTooltip = 'Step '+(iplan+1)+' => '+(iplan+2);
            polylines.push(mypoly);

            marker = L.Marker.movingMarker(mypoly.getLatLngs(), planSection['time'],{
                autostart: false,
                icon: theicon
            }
            );
            var pinIcon = normalPinIcon;
            if (iplan === 0){
                pinIcon = beginPinIcon;
            }
            var beginMarker = L.marker(table[0], {icon: pinIcon});
            // popup
            if (planSection.hasOwnProperty('beginTitle')){
                linkDest = planSection['beginDetailUrl'];
                title = planSection['beginTitle'];
                text = planSection['beginDescription'];
                photoUrl = planSection['beginPictureUrl'];
                if (!title){
                    title = '';
                    if (params.elementUnit === 'track'){
                        title += ' '+planNamesFromGpxTrk[iplan];
                    }
                }
                var popupString = '<h2 class="popupTitle">Step '+(iplan+1)+' : '+title+'</h2>';
                if (text){
                    popupString = popupString + '<p>'+text+'</p>';
                }
                if (photoUrl){
                    if (linkDest){
                        popupString = popupString + '<a href="' + linkDest +
                            '" target="_blank" title="Click to know more about \''+
                            title+'\'"><img class="popupPhoto" src="'+photoUrl+'"/></a>';
                    }
                    else{
                        popupString = popupString + '<img class="popupPhoto" src="'+photoUrl+'"/>';
                    }
                }
                if (linkDest){
                    popupString = popupString+ '<a href="' + linkDest + '" target="_blank">More about "'+title+'"</a>';
                }
                beginMarker.bindPopup(popupString);
                beginMarker.bindTooltip('Step '+(iplan+1)+' : '+title+'<br/>Click for details');

                // polyline tooltip
                if (title != ''){
                    if (iplan < plan.length-1){
                        if (plan[iplan+1].hasOwnProperty('beginTitle')){
                            if (plan[iplan+1]['beginTitle']){
                                polyTooltip += ' : '+title+' => '+plan[iplan+1]['beginTitle'];
                            }
                        }
                    }
                    else{
                        polyTooltip += ' : '+title+' => end';
                    }
                }
            }
            mypoly.bindTooltip(polyTooltip, {sticky:true});
            beginMarkers.push(beginMarker);

            markers.push(marker);

            iplan++;
        }

        // get the global bounds to zoom on the whole trip
        globalBounds = L.latLngBounds(polylines[0].getBounds().getSouthWest(), polylines[0].getBounds().getNorthEast());
        for (var i=0; i<polylines.length; i++){
            globalBounds.extend(polylines[i].getBounds());
        }

        // add last pin marker and tooltip
        var lastMarker = L.marker(table[table.length-1], {icon: endPinIcon});
        var lastTooltip = 'Step '+(iplan+1)+' (final)';
        var lastPopup = lastTooltip;
        if (iplan < plan.length && plan[iplan].hasOwnProperty('beginTitle')){
            lastTooltip = 'Step '+(iplan+1)+' (final) : '+plan[iplan]['beginTitle']+'<br/>Click for details';

            linkDest = plan[iplan]['beginDetailUrl'];
            title = plan[iplan]['beginTitle'];
            text = plan[iplan]['beginDescription'];
            photoUrl = plan[iplan]['beginPictureUrl'];
            if (!title){
                title = '';
                if (params.elementUnit === 'track'){
                    title += ' '+planNamesFromGpxTrk[iplan];
                }
            }
            lastPopup = '<h2 class="popupTitle">Step '+(iplan+1)+' (final) : '+title+'</h2>';
            if (text !== null){
                lastPopup = lastPopup + '<p>'+text+'</p>';
            }
            if (photoUrl !== null){
                if (linkDest !== null){
                    lastPopup = lastPopup + '<a href="' + linkDest +
                        '" target="_blank" title="Click to know more about \''+
                        title+'\'"><img class="popupPhoto" src="'+photoUrl+'"/></a>';
                }
                else{
                    lastPopup = lastPopup + '<img class="popupPhoto" src="'+photoUrl+'"/>';
                }
            }
            if (linkDest !== null){
                lastPopup = lastPopup+ '<a href="' + linkDest + '" target="_blank">More about "'+title+'"</a>';
            }
            lastMarker.bindPopup(lastPopup);
        }
        lastMarker.bindTooltip(lastTooltip);
        beginMarkers.push(lastMarker);
    });
}

$(function() {
    $('#global').click(function() {
        reset();
        displayCompleteTravel();
    });
    $('#reset').click(function() {
        reset();
    });
    $('#pause').click(function() {
        if (currentMarkerIndex === 0){
            reset();
            nextMarker();
        }
        else{
            playPause();
        }
    });

    function checkKey(e){
        e = e || window.event;
        var kc = e.keyCode;
        //console.log(kc);

        if (kc === 32){
            e.preventDefault();
            if (currentMarkerIndex === 0){
                reset();
                nextMarker();
            }
            else{
                playPause();
            }
        }
        if (kc === 73){
            e.preventDefault();
            reset();
        }
        if (kc === 71){
            e.preventDefault();
            reset();
            displayCompleteTravel();
        }
    }
    document.onkeydown = checkKey;

    main();

});
}());
