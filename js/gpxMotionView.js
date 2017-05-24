(function ($, OC) {
    'use strict';

    var gpxMotionView = {
        map: null,
        vehicule: null,
    }

    var border = true;
    var allStepTotalDistance = 0;
    var currentTimer = null;
    var params;
    var plan;
    var currentMarkerIndex = 0;
    var markers = [];
    var polylines = [];
    var drawPolylines = [];
    // used to add permanent steps markers
    var beginMarkers = [];
    var globalBounds;
    var ready = false;

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

    function long2tile(lon,zoom) { return (Math.floor((lon+180)/360*Math.pow(2,zoom))); }
    function lat2tile(lat,zoom)  { return (Math.floor((1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 *Math.pow(2,zoom))); }

    function formatDistance(d){
        if (d > 1000){
            return ((d/1000).toFixed(2)+'km');
        }
        else{
            return (parseInt(d)+'m');
        }
    }

    // add coordinates to the current snake line when marker moves
    function updateSnakeLine(e) {
        var ll = e.target.getLatLng();
        if (currentMarkerIndex > 0) {
            drawPolylines[currentMarkerIndex-1].eachLayer( function (l) {
                l.addLatLng(ll);
            });
        }
    }

    function nextMarker(){
        if (currentMarkerIndex < markers.length){
            gpxMotionView.playButton.state('pause');

            // remove marker when it ends
            if (currentMarkerIndex > 0){
                markers[currentMarkerIndex-1].stop();
                gpxMotionView.map.removeLayer(markers[currentMarkerIndex-1]);
                // add the line for the previous step
                gpxMotionView.map.addLayer(polylines[currentMarkerIndex-1]);
                // remove the partial drawing
                gpxMotionView.map.removeLayer(drawPolylines[currentMarkerIndex-1]);
                // reset the partial drawing
                drawPolylines[currentMarkerIndex-1].eachLayer( function (l) {
                    l.setLatLngs([]);
                });
            }

            // update current title
            $('div#summary').text(plan[currentMarkerIndex]['title']+
                ' (~'+formatDistance(plan[currentMarkerIndex]['totalDistance'])+
                    ' ; step '+(currentMarkerIndex+1)+'/'+markers.length+')');

            // add next marker pin at start point and get its time
            var timeout = plan[currentMarkerIndex]['time'];
            beginMarkers[currentMarkerIndex].addTo(gpxMotionView.map);

            //$(markers[currentMarkerIndex]._icon).show();

            // add the moving marker and start it
            gpxMotionView.map.addLayer(markers[currentMarkerIndex]);
            markers[currentMarkerIndex].start();

            // draw a line for current marker
            drawPolylines[currentMarkerIndex].addTo(gpxMotionView.map);
            drawPolylines[currentMarkerIndex].eachLayer(function (l){
                l.addLatLng(beginMarkers[currentMarkerIndex].getLatLng());
            });

            // preload tiles needed for next marker
            if (currentMarkerIndex+1 < markers.length){
                preloadTiles(polylines[currentMarkerIndex+1]);
            }

            // zoom on current section with 20% padding
            var b = polylines[currentMarkerIndex].getBounds().pad(0.2);
            gpxMotionView.map.fitBounds(b, {animate:true});

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
            gpxMotionView.map.removeLayer(markers[currentMarkerIndex-1]);
            // add the line for the last step
            gpxMotionView.map.addLayer(polylines[currentMarkerIndex-1]);
            // remove the partial drawing
            gpxMotionView.map.removeLayer(drawPolylines[currentMarkerIndex-1]);
            // reset the partial drawing
            drawPolylines[currentMarkerIndex-1].eachLayer( function (l) {
                l.setLatLngs([]);
            });
            // add last pin marker
            beginMarkers[currentMarkerIndex].addTo(gpxMotionView.map);
            currentMarkerIndex = 0;
            currentTimer = null;

            gpxMotionView.playButton.state('play');
        }
    }

    function playPause(){
        if (markers[currentMarkerIndex-1].isPaused()){
            currentTimer.resume();
            markers[currentMarkerIndex-1].resume();
            gpxMotionView.playButton.state('pause');
        }
        else{
            currentTimer.pause();
            markers[currentMarkerIndex-1].pause();
            gpxMotionView.playButton.state('play');
        }
    }

    function reset(){
        // empty title
        $('div#summary').text('');

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
            gpxMotionView.map.removeLayer(beginMarkers[i]);
        }

        // remove polylines
        for (i = 0; i < polylines.length; i++){
            gpxMotionView.map.removeLayer(polylines[i]);
        }
        // remove draw polylines
        for (i=0; i < drawPolylines.length; i++){
            gpxMotionView.map.removeLayer(drawPolylines[i]);
            drawPolylines[i].eachLayer( function (l) {
                l.setLatLngs([]);
            });
        }

        // remove moving markers
        for (i = 0; i < markers.length; i++){
            markers[i].stop();
            gpxMotionView.map.removeLayer(markers[i]);
        }
        gpxMotionView.playButton.state('play');
    }

    function displayCompleteTravel(){
        for (var i=0; i<beginMarkers.length; i++){
            beginMarkers[i].addTo(gpxMotionView.map);
        }
        for (var i = 0; i < polylines.length; i++){
            polylines[i].addTo(gpxMotionView.map);
        }
        // zoom on whole travel
        //map.fitBounds(globalBounds, {animate:true, padding: [100,100]});
        gpxMotionView.map.flyToBounds(globalBounds, {animate:true, padding: [100,100]});
    }

    function nextStep(){
        if (currentMarkerIndex === 0){
            return;
        }

        currentTimer.pause();
        window.clearTimeout(currentTimer);
        currentTimer = null;
        nextMarker();
    }

    function prevStep(){
        if (currentMarkerIndex === 0){
            return;
        }

        currentTimer.pause();
        window.clearTimeout(currentTimer);
        currentTimer = null;

        // remove current marker and polyline and begin marker
        if (currentMarkerIndex > 0){
            markers[currentMarkerIndex-1].stop();
            gpxMotionView.map.removeLayer(markers[currentMarkerIndex-1]);
            // in case it was added by nextStep
            gpxMotionView.map.removeLayer(polylines[currentMarkerIndex-1]);
            gpxMotionView.map.removeLayer(drawPolylines[currentMarkerIndex-1]);
            drawPolylines[currentMarkerIndex-1].eachLayer( function (l) {
                l.setLatLngs([]);
            });
            gpxMotionView.map.removeLayer(beginMarkers[currentMarkerIndex-1]);
            // remove the previous step
            if (currentMarkerIndex > 1){
                gpxMotionView.map.removeLayer(polylines[currentMarkerIndex-2]);
                gpxMotionView.map.removeLayer(drawPolylines[currentMarkerIndex-2]);
                drawPolylines[currentMarkerIndex-2].eachLayer( function (l) {
                    l.setLatLngs([]);
                });
            }
        }

        // rewind
        if (currentMarkerIndex <= 1){
            currentMarkerIndex = 0;
        }
        else{
            currentMarkerIndex -= 2;
        }

        nextMarker();
    }
    
    function load_map() {
        gpxMotionView.vehicule = {
            plane : {
                icon: L.divIcon({
                    className: 'marker-icon-plane',
                    iconAnchor: [20, 52]
                }),
                color : 'blue'
            },
            train : {
                icon: L.divIcon({
                    className: 'marker-icon-train',
                    iconAnchor: [20, 52]
                }),
                color : 'red'
            },
            bus : {
                icon: L.divIcon({
                    className: 'marker-icon-bus',
                    iconAnchor: [20, 52]
                }),
                color : 'purple'
            },
            hike : {
                icon: L.divIcon({
                    className: 'marker-icon-hike',
                    iconAnchor: [20, 52]
                }),
                color : 'yellow'
            },
            car : {
                icon: L.divIcon({
                    className: 'marker-icon-car',
                    iconAnchor: [20, 52]
                }),
                color : 'purple'
            },
            bike : {
                icon: L.divIcon({
                    className: 'marker-icon-bike',
                    iconAnchor: [20, 52]
                }),
                color : 'green'
            }
        }

        gpxMotionView.beginPinIcon = L.divIcon({
            className: 'marker-icon-pin',
            iconAnchor: [5, 39],
        });
        gpxMotionView.endPinIcon = L.divIcon({
            className: 'marker-icon-pinred',
            iconAnchor: [5, 39],
        });
        gpxMotionView.normalPinIcon = L.divIcon({
            className: 'marker-icon-pinblue',
            iconAnchor: [5, 39],
        });

        // map management
        gpxMotionView.map = L.map('map').setView([0, 0], 2);

        L.control.mousePosition().addTo(gpxMotionView.map);
        L.control.scale({metric: true, imperial: true, position:'topleft'}).addTo(gpxMotionView.map);
        var legendText = '<h3>Line colors</h3><div class="legendVehicules">'+
            '<div class="dialogicon" icon="plane">  </div><b style="color:blue;">  plane</b>'+
            '<div class="dialogicon" icon="bike"> </div>  <b style="color:green;"> bike</b>'+
            '<div class="dialogicon" icon="hike"> </div>  <b style="color:yellow;">foot</b>'+
            '<div class="dialogicon" icon="car">  </div>  <b style="color:purple;">car</b>'+
            '<div class="dialogicon" icon="bus">  </div>  <b style="color:purple;">bus</b>'+
            '<div class="dialogicon" icon="train"></div>  <b style="color:red;">   train</b>'+
            '</div>'+
            '<h3>Pins</h3>'+
            '<div class="legendPins">'+
            '<div icon="pin"></div><b>start</b>'+
            '<div icon="pinblue"></div><b>step</b>'+
            '<div icon="pinred"></div><b>end</b>'+
            '</div>';
        gpxMotionView.dialog = L.control.dialog({
            anchor: [110, 0],
            position: 'topleft',
            minSize: [30, 20],
            maxSize: [900, 900],
            size: [120, parseInt(gpxMotionView.map.getSize().y - 140)]
        })
            .setContent(legendText)
            .addTo(gpxMotionView.map);

        var summaryText = '<div id="summary"></div>';
        gpxMotionView.summaryDialog = L.control.dialog({
            anchor: [0, parseInt(gpxMotionView.map.getSize().x * 0.2)],
            position: 'topleft',
            minSize: [30, 20],
            maxSize: [900, 900],
            size: [parseInt(gpxMotionView.map.getSize().x * 0.6), 20]
        })
            .setContent(summaryText)
            .addTo(gpxMotionView.map);

        var osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        var osmAttribution = 'Map data &copy; 2013 <a href="http://openstreetmap'+
            '.org">OpenStreetMap</a> contributors';
        var osm = new L.TileLayer(osmUrl, {maxZoom: 18, attribution: osmAttribution});

        var osmfrUrl = 'https://a.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png';
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
        var default_layer = 'OpenStreetMap France';
        gpxMotionView.map.addLayer(baseLayers[default_layer]);
        L.control.layers(baseLayers, baseOverlays).addTo(gpxMotionView.map);

        var nextButton = L.easyButton({
            position: 'bottomright',
            states: [{
                stateName: 'next',   // name the state
                icon:      'fa-fast-forward',          // and define its properties
                title:     'Next step (n)', // like its title
                onClick: function(btn, map) {  // and its callback
                    nextStep();
                }
            }]
        });
        nextButton.addTo(gpxMotionView.map);

        gpxMotionView.prevButton = L.easyButton({
            position: 'bottomright',
            states: [{
                stateName: 'prev',   // name the state
                icon:      'fa-fast-backward',          // and define its properties
                title:     'Previous step (p)', // like its title
                onClick: function(btn, map) {  // and its callback
                    prevStep();
                }
            }]
        });
        gpxMotionView.prevButton.addTo(gpxMotionView.map);

        gpxMotionView.drawButton = L.easyButton({
            position: 'bottomright',
            states: [{
                stateName: 'draw',   // name the state
                icon:      'fa-eye',          // and define its properties
                title:     'Draw complete trip (g)', // like its title
                onClick: function(btn, map) {  // and its callback
                    if (ready){
                        reset();
                        displayCompleteTravel();
                    }
                }
            }]
        });
        gpxMotionView.drawButton.addTo(gpxMotionView.map);

        var resetButton = L.easyButton({
            position: 'bottomright',
            states: [{
                stateName: 'reset',   // name the state
                icon:      'fa-eye-slash',          // and define its properties
                title:     'Reset (i)', // like its title
                onClick: function(btn, map) {  // and its callback
                    if (ready){
                        reset();
                    }
                }
            }]
        });
        resetButton.addTo(gpxMotionView.map);

        gpxMotionView.playButton = L.easyButton({
            position: 'bottomright',
            states: [{
                stateName: 'play',   // name the state
                icon:      'fa-spinner',          // and define its properties
                //icon:      'fa-play-circle-o',          // and define its properties
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
        gpxMotionView.playButton.addTo(gpxMotionView.map);
        $('span.fa-spinner').addClass('fa-pulse');
        $('span.fa-spinner').parent().parent().prop("disabled",true);
    }

    function processXml(xml) {
        //console.log(toGeoJSON.gpx(xml).features[0].geometry.coordinates[0]);
        var gpxml = $.parseXML(xml.gpx);
        var desc = $(gpxml).find('gpx>metadata>desc').text();
        var jsondesc = $.parseJSON('{'+desc+'}');
        params = jsondesc;
        plan = params.plan;

        var table;
        var ll,mypoly, borderLine, featGroup;
        var emptyPoly, emptyBorderLine, drawFeatGroup;
        var popupString, linePopupString;
        var marker;
        var iplan = 0;
        var planSection, thecoord, thevehicule, theicon, thecolor;
        var linkDest, title, text, photoUrl, linePopupString, beginTitle;
        var popupString;
        var iline = 0;
        var nblinesInserted;
        var geogpx = toGeoJSON.gpx(gpxml);
        var coords = [];
        var planNamesFromGpxTrk =[];
        var pinSummaryContent = '';
        var lineSummaryContent = '';
        var totalTime = 0;

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
            theicon = gpxMotionView.vehicule[thevehicule].icon;
            thecolor = gpxMotionView.vehicule[thevehicule].color;

            // calculate approximate plan section total distance
            planSection['totalDistance'] = 0;
            for (var ii = 0; ii < table.length - 1; ii++){
                planSection['totalDistance'] += gpxMotionView.map.distance(table[ii], table[ii+1]);
            }
            allStepTotalDistance += planSection['totalDistance'];

            mypoly = L.polyline(table, {color:thecolor, weight:5});
            if (border){
                borderLine = L.polyline(table,
                    {opacity:1, weight: parseInt(5*1.6), color:'black'});
                featGroup = L.featureGroup([borderLine, mypoly]);
            }
            else{
                featGroup = L.featureGroup([mypoly]);
            }
            polylines.push(featGroup);

            // empty elements to be drawn progressively
            emptyPoly = L.polyline([], {color:thecolor, weight:5});
            emptyBorderLine = L.polyline([],
                {opacity:1, weight: parseInt(5*1.6), color:'black'});
            drawFeatGroup = L.featureGroup([emptyBorderLine, emptyPoly]);
            drawPolylines.push(drawFeatGroup);

            totalTime += planSection['time'];
            marker = L.Marker.movingMarker(mypoly.getLatLngs(), planSection['time'],{
                autostart: false,
                icon: theicon
            });
            marker.on('move', updateSnakeLine);
            var pinIcon = gpxMotionView.normalPinIcon;
            if (iplan === 0){
                pinIcon = gpxMotionView.beginPinIcon;
            }
            var beginMarker = L.marker(table[0], {icon: pinIcon});
            linePopupString = '';
            popupString = '';

            // popup for line
            if (planSection.hasOwnProperty('title')){
                linkDest = planSection['detailUrl'];
                title = planSection['title'];
                text = planSection['description'];
                photoUrl = planSection['pictureUrl'];
                if (!title){
                    title = '';
                    if (params.elementUnit === 'track'){
                        title += ' '+planNamesFromGpxTrk[iplan];
                    }
                }
                linePopupString = '<h2 class="popupTitle">Step '+(iplan+1)+' : '+title+'</h2>';
                if (text){
                    linePopupString = linePopupString + '<p>'+text+'</p>';
                }
                if (photoUrl){
                    if (linkDest){
                        linePopupString = linePopupString + '<a href="' + linkDest +
                            '" target="_blank" title="Click to know more about \''+
                            beginTitle+'\'"><img class="popupPhoto" src="'+photoUrl+'"/></a>';
                    }
                    else{
                        linePopupString = linePopupString + '<img class="popupPhoto" src="'+photoUrl+'"/>';
                    }
                }
                if (linkDest){
                    linePopupString = linePopupString+ '<a href="' + linkDest + '" target="_blank">More about "'+title+'"</a>';
                }

                featGroup.bindPopup(linePopupString);
                featGroup.bindTooltip('Step '+(iplan+1)+' : '+title+'<br/>Click for details', {sticky: true});
                lineSummaryContent += '<tr><td id="'+iplan+'">'+(iplan+1)+' : '+title+'</td></tr>';
            }
            else{
                lineSummaryContent += '<tr><td id="'+iplan+'">'+(iplan+1)+'</td></tr>';
            }
            // popup for begin pin
            if (planSection.hasOwnProperty('beginTitle')){
                linkDest = planSection['beginDetailUrl'];
                beginTitle = planSection['beginTitle'];
                text = planSection['beginDescription'];
                photoUrl = planSection['beginPictureUrl'];
                if (!beginTitle){
                    beginTitle = '';
                    if (params.elementUnit === 'track'){
                        beginTitle += ' '+planNamesFromGpxTrk[iplan];
                    }
                }
                popupString = '<h2 class="popupTitle">Step '+(iplan+1)+' : '+beginTitle+'</h2>';
                if (text){
                    popupString = popupString + '<p>'+text+'</p>';
                }
                if (photoUrl){
                    if (linkDest){
                        popupString = popupString + '<a href="' + linkDest +
                            '" target="_blank" title="Click to know more about \''+
                            beginTitle+'\'"><img class="popupPhoto" src="'+photoUrl+'"/></a>';
                    }
                    else{
                        popupString = popupString + '<img class="popupPhoto" src="'+photoUrl+'"/>';
                    }
                }
                if (linkDest){
                    popupString = popupString+ '<a href="' + linkDest + '" target="_blank">More about "'+beginTitle+'"</a>';
                }
                beginMarker.bindPopup(popupString);
                beginMarker.bindTooltip('Step '+(iplan+1)+' : '+beginTitle+'<br/>Click for details');
                pinSummaryContent += '<tr><td id="'+iplan+'">'+(iplan+1)+' : '+beginTitle+'</td></tr>';
            }
            else{
                beginMarkers.bindPopup(linePopupString);
                pinSummaryContent += '<tr><td id="'+iplan+'">'+(iplan+1)+'</td></tr>';
            }

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
        var lastMarker = L.marker(table[table.length-1], {icon: gpxMotionView.endPinIcon});
        var lastTooltip = 'Step '+(iplan+1)+' (final)';
        var lastPopup = lastTooltip;
        if (iplan < plan.length && plan[iplan].hasOwnProperty('beginTitle')){
            lastTooltip = 'Step '+(iplan+1)+' (final) : '+plan[iplan]['beginTitle']+'<br/>Click for details';

            linkDest = plan[iplan]['beginDetailUrl'];
            beginTitle = plan[iplan]['beginTitle'];
            text = plan[iplan]['beginDescription'];
            photoUrl = plan[iplan]['beginPictureUrl'];
            if (!beginTitle){
                beginTitle = '';
                if (params.elementUnit === 'track'){
                    beginTitle += ' '+planNamesFromGpxTrk[iplan];
                }
            }
            lastPopup = '<h2 class="popupTitle">Step '+(iplan+1)+' (final) : '+beginTitle+'</h2>';
            if (text !== null){
                lastPopup = lastPopup + '<p>'+text+'</p>';
            }
            if (photoUrl !== null){
                if (linkDest !== null){
                    lastPopup = lastPopup + '<a href="' + linkDest +
                        '" target="_blank" title="Click to know more about \''+
                        beginTitle+'\'"><img class="popupPhoto" src="'+photoUrl+'"/></a>';
                }
                else{
                    lastPopup = lastPopup + '<img class="popupPhoto" src="'+photoUrl+'"/>';
                }
            }
            if (linkDest !== null){
                lastPopup = lastPopup+ '<a href="' + linkDest + '" target="_blank">More about "'+beginTitle+'"</a>';
            }
            lastMarker.bindPopup(lastPopup);
        }
        lastMarker.bindTooltip(lastTooltip);
        beginMarkers.push(lastMarker);

        //$('#summary').html('<p><table id="pinSummaryTable">'+pinSummaryContent+'</table><br/><table id="lineSummaryTable">'+lineSummaryContent+'</table></p>');

        // stop loading animation
        $('span.fa-spinner').parent().parent().prop("disabled",false);
        $('span.fa-spinner').removeClass('fa-spinner fa-pulse').addClass('fa-play-circle-o');

        var totsec = Math.floor(totalTime/1000);
        var minutes = Math.floor(totsec/60);
        var remsec = totsec%60;
        $('div#summary').text('Ready to play !!! ('+minutes+' min '+remsec+' sec ; '+
            formatDistance(allStepTotalDistance)+')');
        ready = true;
    }

    function drawslider(ossz, meik){
        var slidertext=Math.round((meik*100)/ossz);
        document.getElementById("sliderbar").style.width=slidertext+'%';
        document.getElementById("slidertext").innerHTML='Loading '+slidertext+'%';
    }

    function updateDisplaySizes(){
        gpxMotionView.summaryDialog.setLocation([0, parseInt(gpxMotionView.map.getSize().x * 0.2)]);
        gpxMotionView.summaryDialog.setSize([parseInt(gpxMotionView.map.getSize().x * 0.6), 20]);

        gpxMotionView.dialog.setSize([120, parseInt(gpxMotionView.map.getSize().y - 140)]);
    }

    // preload tiles needed when a polyline is displayed
    function preloadTiles(poly){
        var bounds = poly.getBounds().pad(0.2);
        var zoom = gpxMotionView.map.getBoundsZoom(bounds);
        var east = bounds.getEast();
        var west = bounds.getWest();
        var north = bounds.getNorth();
        var south = bounds.getSouth();

        var dataEast = long2tile(east, zoom);
        var dataWest = long2tile(west, zoom);
        var dataNorth = lat2tile(north, zoom);
        var dataSouth = lat2tile(south, zoom);

        for(var y = dataNorth; y < dataSouth + 1; y++) {
            for(var x = dataWest; x < dataEast + 1; x++) {
                var url = 'https://a.tile.openstreetmap.fr/osmfr/' + zoom + '/' + x + '/' + y + '.png';
                var img=new Image();
                img.src=url;
            }
        }
    }

    // load gpx file with plan and build our markers, pins...
    function main(){
        var pathGet = getUrlParameter('path');
        var req = {
            path: pathGet
        }
        var url = OC.generateUrl('/apps/gpxmotion/getgpx');
        $('div#summary').html('<div id="slider">'+
            '<div id="sliderbar">'+
                '</div>'+
                '<div id="slidertext">'+
                '</div>'+
                '</div>');

        $.ajax({
            type: 'POST',
            async: true,
            url: url,
            data: req,
            xhr: function(){
                var xhr = new window.XMLHttpRequest();
                xhr.addEventListener("progress", function(evt) {
                    if (evt.lengthComputable) {
                        var percentComplete = evt.loaded / evt.total * 100;
                        drawslider(100, parseInt(percentComplete));
                    }
                }, false);

                return xhr;
            }
        }).done(processXml);
    }

    function getUrlParameter(sParam) {
        var sPageURL = window.location.search.substring(1);
        var sURLVariables = sPageURL.split('&');
        for (var i = 0; i < sURLVariables.length; i++)
        {
            var sParameterName = sURLVariables[i].split('=');
            if (sParameterName[0] === sParam)
            {
                return decodeURIComponent(sParameterName[1]);
            }
        }
    }

    $(document).ready(function() {
        load_map();
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
                if (ready){
                    if (currentMarkerIndex === 0){
                        reset();
                        nextMarker();
                    }
                    else{
                        playPause();
                    }
                }
            }
            if (kc === 78){
                e.preventDefault();
                nextStep();
            }
            if (kc === 80){
                e.preventDefault();
                prevStep();
            }
            if (kc === 73){
                e.preventDefault();
                if (ready){
                    reset();
                }
            }
            if (kc === 71){
                e.preventDefault();
                if (ready){
                    reset();
                    displayCompleteTravel();
                }
            }
        }
        document.onkeydown = checkKey;

        gpxMotionView.map.on('resize', updateDisplaySizes);

        main();

    });
}(jQuery, OC));
