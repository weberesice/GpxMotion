(function ($, OC) {
    'use strict';

    var colors = [
        'MediumPurple', 'Maroon', 'Lime', 'Khaki',
        'orange', 'Indigo', 'brown', 'Chartreuse',
        'Crimson', 'DeepPink', 'Gold'
    ];
    var lastColorUsed = -1;

    var gpxMotionView = {
        map: null,
        vehicule: null,
        currentAjax: null,
        currentFilePath: '',
        summaryText: '',
    }

    var border = true;
    var allSectionTotalDistance = 0;
    var currentTimer = null;
    var params;
    var plan;
    var currentMarkerIndex = 0;
    var markers = [];
    var polylines = [];
    var drawPolylines = [];
    // used to add permanent sections markers
    var beginMarkers = [];
    var globalBounds;
    var currentTime;
    var minBeginTime, maxEndTime;
    var ready = false;

    function basename(str) {
        var base = new String(str).substring(str.lastIndexOf('/') + 1);
        if (base.lastIndexOf(".") !== -1) {
            base = base.substring(0, base.lastIndexOf("."));
        }
        return base;
    }

    function endsWith(str, suffix) {
        return str.indexOf(suffix, str.length - suffix.length) !== -1;
    }

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

    function long2tile(lon,zoom) {
        return (Math.floor((lon + 180) / 360 * Math.pow(2, zoom)));
    }
    function lat2tile(lat,zoom) {
        return (Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom)));
    }

    function formatDistance(d) {
        if (d > 1000) {
            return ((d / 1000).toFixed(2) + 'km');
        }
        else {
            return (parseInt(d) + 'm');
        }
    }

    // add coordinates to the current snake line when marker moves
    function updateSnakeLine(e) {
        var ll = e.target.getLatLng();
        var markerIndex = e.target.gpxMotionIndex;
        if (currentMarkerIndex > 0) {
            drawPolylines[markerIndex].eachLayer( function (l) {
                l.addLatLng(ll);
            });
            if (params.proportionalTime === 'true' && (! plan[markerIndex].missingTime)) {
                var time = e.target._currentLine[0].time;
                if (params.synchroSections === 'true' && params.simultaneousSections === 'true') {
                    if (time) {
                        if (currentTime.diff(time) < 0) {
                            $('div#timediv').html(time.format('HH:mm:ss'));
                            currentTime = time;
                        }
                    }
                }
                else if (params.synchroSections !== 'true' && params.simultaneousSections !== 'true') {
                    if (time) {
                        $('div#timediv').html(time.format('HH:mm:ss'));
                    }
                }
            }
        }
    }

    function simultaneousDraw() {
        gpxMotionView.playButton.state('pause');
        if (params.synchroSections === 'true') {
            gpxMotionView.timeDialog.open();
            currentTime = minBeginTime;
            $('div#summary').text(t('gpxmotion', 'All sections synchronized') + ' (' + markers.length + ')');
        }
        else {
            $('div#summary').text(t('gpxmotion', 'All sections') + ' (' + markers.length + ')');
        }

        var timeout;
        var maxTime = 0;
        var i;
        // create and launch markers
        for (i = 0; i < markers.length; i++) {
            // add marker pin at start point and get its time
            timeout = plan[i].time;
            if (timeout > maxTime) {
                maxTime = timeout;
            }
            //beginMarkers[i].addTo(gpxMotionView.map);

            // add the moving marker and start it
            gpxMotionView.map.addLayer(markers[i]);
            markers[i].start();

            // draw a line for current marker
            drawPolylines[i].addTo(gpxMotionView.map);
            drawPolylines[i].eachLayer(function (l){
                l.addLatLng(beginMarkers[i].getLatLng());
            });
        }
        currentMarkerIndex++;

        if ($('#zoomcheck').is(':checked')) {
            // zoom on all sections with 20% padding
            var b = polylines[0].getBounds();
            for (var i = 1; i < markers.length; i++) {
                b.extend(polylines[i].getBounds());
            }
            gpxMotionView.map.fitBounds(b.pad(0.2), {animate:true});
        }

        if (params.synchroSections === 'true') {
            maxTime = 20000;
        }
        // schedule call to end
        currentTimer = new Timer(function() {
            endSimultaneousDraw();
        }, maxTime);
    }

    function endSimultaneousDraw() {
        var i;
        if (params.synchroSections === 'true') {
            gpxMotionView.timeDialog.close();
        }
        for (i = 0; i < markers.length; i++) {
            markers[i].stop();
            gpxMotionView.map.removeLayer(markers[i]);
            // add the entire line
            gpxMotionView.map.addLayer(polylines[i]);
            // remove the partial drawing
            gpxMotionView.map.removeLayer(drawPolylines[i]);
            // reset the partial drawing
            drawPolylines[i].eachLayer( function (l) {
                l.setLatLngs([]);
            });
        }
        currentMarkerIndex = 0;
        gpxMotionView.playButton.state('play');
        if ($('#loopcheck').is(':checked')) {
            reset();
            nextMarker();
        }
    }

    function nextMarker() {
        if (params.simultaneousSections === 'true') {
            if (currentMarkerIndex === 0) {
                simultaneousDraw();
            }
            else {
                endSimultaneousDraw();
            }
            return;
        }
        if (currentMarkerIndex < markers.length) {
            // show time if we can
            if (params.proportionalTime === 'true') {
                if (plan[currentMarkerIndex].missingTime) {
                    gpxMotionView.timeDialog.close();
                }
                else {
                    gpxMotionView.timeDialog.open();
                }
            }
            gpxMotionView.playButton.state('pause');

            // remove marker when it ends
            if (currentMarkerIndex > 0) {
                markers[currentMarkerIndex-1].stop();
                gpxMotionView.map.removeLayer(markers[currentMarkerIndex-1]);
                // add the line for the previous Section
                gpxMotionView.map.addLayer(polylines[currentMarkerIndex-1]);
                // remove the partial drawing
                gpxMotionView.map.removeLayer(drawPolylines[currentMarkerIndex-1]);
                // reset the partial drawing
                drawPolylines[currentMarkerIndex-1].eachLayer( function (l) {
                    l.setLatLngs([]);
                });
            }

            // update current title
            $('div#summary').text((plan[currentMarkerIndex].title || t('gpxmotion', 'no title'))+
                ' (~'+formatDistance(plan[currentMarkerIndex].totalDistance) +
                    ' ; ' + t('gpxmotion', 'Section') +
                    ' ' + (currentMarkerIndex+1) + '/' + markers.length + ')');

            // add next marker pin at start point and get its time
            var timeout = plan[currentMarkerIndex].time;
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
            if (currentMarkerIndex+1 < markers.length) {
                preloadTiles(polylines[currentMarkerIndex+1]);
            }

            // zoom on current section with 20% padding
            var b = polylines[currentMarkerIndex].getBounds().pad(0.2);
            if ($('#zoomcheck').is(':checked')) {
                gpxMotionView.map.fitBounds(b, {animate:true});
            }

            currentMarkerIndex++;

            // schedule next marker
            currentTimer = new Timer(function() {
                nextMarker();
            }, timeout);
        }
        else {
            // this is the end of the animation
            // we remove the last marker
            markers[currentMarkerIndex-1].stop();
            gpxMotionView.map.removeLayer(markers[currentMarkerIndex-1]);
            // add the line for the last Section
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

            if ($('#loopcheck').is(':checked')) {
                reset();
                nextMarker();
            }
            else {
                reset();
                displayCompleteTravel();
                // hide time if this is the end
                if (params.proportionalTime === 'true') {
                    gpxMotionView.timeDialog.close();
                }
            }
        }
    }

    function oneMarkerIsPaused() {
        var i;
        for (i = 0; i < markers.length; i++) {
            if (markers[i].isPaused()) {
                return true;
            }
        }
        return false;
    }

    function playPause() {
        if (params.simultaneousSections === 'true') {
            var i;
            if (oneMarkerIsPaused()) {
                currentTimer.resume();
                for (i = 0; i < markers.length; i++) {
                    markers[i].resume();
                }
                gpxMotionView.playButton.state('pause');
            }
            else {
                currentTimer.pause();
                for (i = 0; i < markers.length; i++) {
                    markers[i].pause();
                }
                gpxMotionView.playButton.state('play');
            }
        }
        else {
            if (markers[currentMarkerIndex-1].isPaused()) {
                currentTimer.resume();
                markers[currentMarkerIndex-1].resume();
                gpxMotionView.playButton.state('pause');
            }
            else {
                currentTimer.pause();
                markers[currentMarkerIndex-1].pause();
                gpxMotionView.playButton.state('play');
            }
        }
    }

    function reset() {
        // empty title
        $('div#summary').text('');

        // stop scheduler
        if (currentTimer !== null) {
            currentTimer.pause();
            currentTimer = null;
        }

        // reset currentMarkerIndex
        currentMarkerIndex = 0;
        var i;
        // remove begin markers
        for (i = 0; i < beginMarkers.length; i++) {
            gpxMotionView.map.removeLayer(beginMarkers[i]);
        }

        // remove polylines
        for (i = 0; i < polylines.length; i++) {
            gpxMotionView.map.removeLayer(polylines[i]);
        }
        // remove moving markers
        for (i = 0; i < markers.length; i++) {
            markers[i].stop();
            gpxMotionView.map.removeLayer(markers[i]);
        }
        // remove draw polylines
        for (i = 0; i < drawPolylines.length; i++) {
            gpxMotionView.map.removeLayer(drawPolylines[i]);
            drawPolylines[i].eachLayer( function (l) {
                l.setLatLngs([]);
            });
        }

        gpxMotionView.playButton.state('play');
    }

    function displayCompleteTravel() {
        var i;
        $('div#summary').text(gpxMotionView.summaryText);
        if (params.simultaneousSections !== 'true') {
            for (i = 0; i < beginMarkers.length; i++) {
                beginMarkers[i].addTo(gpxMotionView.map);
            }
        }
        for (i = 0; i < polylines.length; i++) {
            polylines[i].addTo(gpxMotionView.map);
        }
        // zoom on whole travel
        //map.fitBounds(globalBounds, {animate:true, padding: [100,100]});
        gpxMotionView.map.flyToBounds(globalBounds, {animate:true, padding: [100,100]});
    }

    function nextSection() {
        if (currentMarkerIndex === 0) {
            return;
        }

        currentTimer.pause();
        window.clearTimeout(currentTimer);
        currentTimer = null;
        nextMarker();
    }

    function prevSection() {
        if (currentMarkerIndex === 0) {
            return;
        }

        currentTimer.pause();
        window.clearTimeout(currentTimer);
        currentTimer = null;

        if (params.simultaneousSections === 'true') {
            endSimultaneousDraw();
            reset();
            nextMarker();
            return;
        }

        // remove current marker and polyline and begin marker
        if (currentMarkerIndex > 0) {
            markers[currentMarkerIndex-1].stop();
            gpxMotionView.map.removeLayer(markers[currentMarkerIndex-1]);
            // in case it was added by nextSection
            gpxMotionView.map.removeLayer(polylines[currentMarkerIndex-1]);
            gpxMotionView.map.removeLayer(drawPolylines[currentMarkerIndex-1]);
            drawPolylines[currentMarkerIndex-1].eachLayer( function (l) {
                l.setLatLngs([]);
            });
            gpxMotionView.map.removeLayer(beginMarkers[currentMarkerIndex-1]);
            // remove the previous Section
            if (currentMarkerIndex > 1) {
                gpxMotionView.map.removeLayer(polylines[currentMarkerIndex-2]);
                gpxMotionView.map.removeLayer(drawPolylines[currentMarkerIndex-2]);
                drawPolylines[currentMarkerIndex-2].eachLayer( function (l) {
                    l.setLatLngs([]);
                });
            }
        }

        // rewind
        if (currentMarkerIndex <= 1) {
            currentMarkerIndex = 0;
        }
        else {
            currentMarkerIndex -= 2;
        }

        nextMarker();
    }
    
    function load_map() {
        gpxMotionView.vehicule = {
            'no vehicle' : {
                icon: L.divIcon({
                    iconSize: [4, 4],
                    className: 'invisible-icon'
                }),
                color : 'orange'
            },
            plane : {
                icon: L.divIcon({
                    className: 'marker-icon-plane',
                    iconAnchor: [20, 52]
                }),
                color : 'purple'
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
                color : 'cyan'
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
                color : 'blue'
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
        var legendText =
            '<h3>' + t('gpxmotion', 'Options') + '</h3>' +
            '<div id="optiondiv">' +
            '<label for="loopcheck">' + t('gpxmotion', 'loop') + '</label>' +
            '<input type="checkbox" id="loopcheck"/>' +
            '<label for="zoomcheck">' + t('gpxmotion', 'autozoom') + '</label>' +
            '<input type="checkbox" id="zoomcheck" checked/>' +
            '</div>' +
            '<h3>' + t('gpxmotion', 'Legend') + '</h3><div class="legendVehicules">' +
            '<div class="dialogicon" icon="plane">  </div><b style="color:purple;">  ' + t('gpxmotion', 'plane') + '</b>' +
            '<div class="dialogicon" icon="bike"> </div>  <b style="color:green;"> ' + t('gpxmotion', 'bike') + '</b>' +
            '<div class="dialogicon" icon="hike"> </div>  <b style="color:yellow;">' + t('gpxmotion', 'foot') + '</b>' +
            '<div class="dialogicon" icon="car">  </div>  <b style="color:blue;">' + t('gpxmotion', 'car') + '</b>' +
            '<div class="dialogicon" icon="bus">  </div>  <b style="color:cyan;">' + t('gpxmotion', 'bus') + '</b>' +
            '<div class="dialogicon" icon="train"></div>  <b style="color:red;">   ' + t('gpxmotion', 'train') + '</b>' +
            '</div>' +
            '<h3>' + t('gpxmotion', 'Pins') + '</h3>' +
            '<div class="legendPins">' +
            '<div icon="pin"></div><p>' + t('gpxmotion', 'start') + '</p>' +
            '<div icon="pinblue"></div><p>' + t('gpxmotion', 'step') + '</p>' +
            '<div icon="pinred"></div><p>' + t('gpxmotion', 'end') + '</p>' +
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

        var timeDialogText = '<div id="timediv"></div>';
        gpxMotionView.timeDialog = L.control.dialog({
            anchor: [-25, 130],
            position: 'bottomleft',
            minSize: [30, 20],
            maxSize: [900, 900],
            size: [200, 20]
        })
            .setContent(timeDialogText)
            .addTo(gpxMotionView.map);
        gpxMotionView.timeDialog.close();
        $('div#timediv').parent().parent().parent().css('opacity', '0.6');

        ////////////////// TILE LAYERS

        // change meta to send referrer
        // usefull for IGN tiles authentication !
        $('meta[name=referrer]').attr('content', 'origin');

        var layer = getUrlParameter('layer');
        var default_layer = 'OpenStreetMap';
        if (typeof layer !== 'undefined') {
            default_layer = decodeURIComponent(layer);
        }

        var baseLayers = {};

        // add base layers
        $('#basetileservers li[type=tile]').each(function() {
            var sname = $(this).attr('name');
            var surl = $(this).attr('url');
            var minz = parseInt($(this).attr('minzoom'));
            var maxz = parseInt($(this).attr('maxzoom'));
            var sattrib = $(this).attr('attribution');
            var stransparent = ($(this).attr('transparent') === 'true');
            var sopacity = $(this).attr('opacity');
            if (typeof sopacity !== typeof undefined && sopacity !== false && sopacity !== '') {
                sopacity = parseFloat(sopacity);
            }
            else {
                sopacity = 1;
            }
            baseLayers[sname] = new L.TileLayer(surl, {minZoom: minz, maxZoom: maxz, attribution: sattrib, opacity: sopacity, transparent: stransparent});
        });
        $('#basetileservers li[type=tilewms]').each(function() {
            var sname = $(this).attr('name');
            var surl = $(this).attr('url');
            var slayers = $(this).attr('layers') || '';
            var sversion = $(this).attr('version') || '1.1.1';
            var stransparent = ($(this).attr('transparent') === 'true');
            var sformat = $(this).attr('format') || 'image/png';
            var sopacity = $(this).attr('opacity');
            if (typeof sopacity !== typeof undefined && sopacity !== false && sopacity !== '') {
                sopacity = parseFloat(sopacity);
            }
            else {
                sopacity = 1;
            }
            var sattrib = $(this).attr('attribution') || '';
            baseLayers[sname] = new L.tileLayer.wms(surl, {layers: slayers, version: sversion, transparent: stransparent, opacity: sopacity, format: sformat, attribution: sattrib});
        });
        // add custom layers
        $('#tileserverlist li').each(function() {
            var sname = $(this).attr('servername');
            var surl = $(this).attr('url');
            var sminzoom = $(this).attr('minzoom') || '1';
            var smaxzoom = $(this).attr('maxzoom') || '20';
            var sattrib = $(this).attr('attribution') || '';
            baseLayers[sname] = new L.TileLayer(surl,
                    {minZoom: sminzoom, maxZoom: smaxzoom, attribution: sattrib});
        });
        $('#tilewmsserverlist li').each(function() {
            var sname = $(this).attr('servername');
            var surl = $(this).attr('url');
            var sminzoom = $(this).attr('minzoom') || '1';
            var smaxzoom = $(this).attr('maxzoom') || '20';
            var slayers = $(this).attr('layers') || '';
            var sversion = $(this).attr('version') || '1.1.1';
            var sformat = $(this).attr('format') || 'image/png';
            var sattrib = $(this).attr('attribution') || '';
            baseLayers[sname] = new L.tileLayer.wms(surl,
                    {format: sformat, version: sversion, layers: slayers, minZoom: sminzoom, maxZoom: smaxzoom, attribution: sattrib});
        });
        gpxMotionView.baseLayers = baseLayers;

        var baseOverlays = {};

        // add base overlays
        $('#basetileservers li[type=overlay]').each(function() {
            var sname = $(this).attr('name');
            var surl = $(this).attr('url');
            var minz = parseInt($(this).attr('minzoom'));
            var maxz = parseInt($(this).attr('maxzoom'));
            var sattrib = $(this).attr('attribution');
            var stransparent = ($(this).attr('transparent') === 'true');
            var sopacity = $(this).attr('opacity');
            if (typeof sopacity !== typeof undefined && sopacity !== false && sopacity !== '') {
                sopacity = parseFloat(sopacity);
            }
            else {
                sopacity = 0.4;
            }
            baseOverlays[sname] = new L.TileLayer(surl, {minZoom: minz, maxZoom: maxz, attribution: sattrib, opacity: sopacity, transparent: stransparent});
        });
        $('#basetileservers li[type=overlaywms]').each(function() {
            var sname = $(this).attr('name');
            var surl = $(this).attr('url');
            var slayers = $(this).attr('layers') || '';
            var sversion = $(this).attr('version') || '1.1.1';
            var stransparent = ($(this).attr('transparent') === 'true');
            var sopacity = $(this).attr('opacity');
            if (typeof sopacity !== typeof undefined && sopacity !== false && sopacity !== '') {
                sopacity = parseFloat(sopacity);
            }
            else {
                sopacity = 0.4;
            }
            var sformat = $(this).attr('format') || 'image/png';
            var sattrib = $(this).attr('attribution') || '';
            baseOverlays[sname] = new L.tileLayer.wms(surl, {layers: slayers, version: sversion, transparent: stransparent, opacity: sopacity, format: sformat, attribution: sattrib});
        });
        // add custom overlays
        $('#overlayserverlist li').each(function() {
            var sname = $(this).attr('servername');
            var surl = $(this).attr('url');
            var sminzoom = $(this).attr('minzoom') || '1';
            var smaxzoom = $(this).attr('maxzoom') || '20';
            var stransparent = ($(this).attr('transparent') === 'true');
            var sopacity = $(this).attr('opacity');
            if (typeof sopacity !== typeof undefined && sopacity !== false && sopacity !== '') {
                sopacity = parseFloat(sopacity);
            }
            else {
                sopacity = 0.4;
            }
            var sattrib = $(this).attr('attribution') || '';
            baseOverlays[sname] = new L.TileLayer(surl,
                    {minZoom: sminzoom, maxZoom: smaxzoom, transparent: stransparent, opcacity: sopacity, attribution: sattrib});
        });
        $('#overlaywmsserverlist li').each(function() {
            var sname = $(this).attr('servername');
            var surl = $(this).attr('url');
            var sminzoom = $(this).attr('minzoom') || '1';
            var smaxzoom = $(this).attr('maxzoom') || '20';
            var slayers = $(this).attr('layers') || '';
            var sversion = $(this).attr('version') || '1.1.1';
            var sformat = $(this).attr('format') || 'image/png';
            var stransparent = ($(this).attr('transparent') === 'true');
            var sopacity = $(this).attr('opacity');
            if (typeof sopacity !== typeof undefined && sopacity !== false && sopacity !== '') {
                sopacity = parseFloat(sopacity);
            }
            else {
                sopacity = 0.4;
            }
            var sattrib = $(this).attr('attribution') || '';
            baseOverlays[sname] = new L.tileLayer.wms(surl, {layers: slayers, version: sversion, transparent: stransparent, opacity: sopacity, format: sformat, attribution: sattrib, minZoom: sminzoom, maxZoom: smaxzoom});
        });
        gpxMotionView.overlayLayers = baseOverlays;

        if (! baseLayers.hasOwnProperty(default_layer)) {
            default_layer = 'OpenStreetMap';
        }
        gpxMotionView.map.addLayer(baseLayers[default_layer]);

        gpxMotionView.activeLayers = L.control.activeLayers(baseLayers, baseOverlays);
        gpxMotionView.activeLayers.addTo(gpxMotionView.map);

        //////// BUTTONS

        if (isPreviewPage()) {
            gpxMotionView.closeButton = L.easyButton({
                position: 'topright',
                states: [{
                    stateName: 'prev',
                    icon:      'fa-close',
                    title:     'Close preview',
                    onClick: function(btn, map) {
                        window.close();
                    }
                }]
            });
            gpxMotionView.closeButton.addTo(gpxMotionView.map);
        }

        if (!isPublicPage()) {
            gpxMotionView.editButton = L.easyButton({
                position: 'topright',
                states: [{
                    stateName: 'prev',
                    icon:      'fa-pencil',
                    title:     t('gpxmotion', 'Edit current file'),
                    onClick: function(btn, map) {
                        var url = OC.generateUrl('apps/gpxmotion/?path={filepath}',{'filepath': gpxMotionView.currentFilePath});
                        window.location.href = url;
                    }
                }]
            });
            gpxMotionView.editButton.addTo(gpxMotionView.map);

            gpxMotionView.shareButton = L.easyButton({
                position: 'bottomright',
                states: [{
                    stateName: 'prev',
                    icon:      'fa-share-alt',
                    title:     t('gpxmotion', 'Share current file'),
                    onClick: function(btn, map) {
                        var title = t('gpxmotion', 'Public link to') + ' motion file : ' + gpxMotionView.currentFilePath;
                        var ajaxurl = OC.generateUrl('/apps/gpxmotion/isFileShareable');
                        var req = {
                            trackpath: gpxMotionView.currentFilePath
                        };
                        var filename;
                        $.ajax({
                            type: 'POST',
                            url: ajaxurl,
                            data: req,
                            async: true
                        }).done(function (response) {
                            var isShareable = response.response;
                            var token = response.token;
                            var path = response.path;
                            var filename = response.filename;
                            var txt, url, urlparams;

                            if (isShareable) {
                                txt = '<i class="fa fa-check-circle" style="color:green;" aria-hidden="true"></i> ';
                                url = OC.generateUrl('/apps/gpxmotion/publicview?');
                                var activeLayerName = gpxMotionView.activeLayers.getActiveBaseLayer().name;
                                urlparams = {
                                    token: token,
                                    layer: encodeURIComponent(activeLayerName),
                                    autoplay: 1
                                };
                                Object.assign(urlparams, getOptionValues());
                                if (path && filename) {
                                    urlparams.path = path;
                                    urlparams.filename = filename;
                                }
                                url = url + $.param(urlparams);
                                url = window.location.origin + url;
                            }
                            else{
                                txt = '<i class="fa fa-times-circle" style="color:red;" aria-hidden="true"></i> ';
                                txt = txt + t('gpxmotion', 'This public link will work only if "{title}" or one of its parent folder is shared in "files" app by public link without password', {title: name});
                            }

                            if (url !== '') {
                                //for (optionName in optionValues) {
                                //    url = url + '&' + optionName + '=' + optionValues[optionName];
                                //}
                                $('#linkinput').val(url);
                            }
                            else {
                                $('#linkinput').val('');
                            }

                            // fill the fields, show the dialog
                            $('#linklabel').html(txt);
                            $('#linkdialog').dialog({
                                title: title,
                                closeText: 'show',
                                width: 400
                            });
                            $('#linkinput').select();
                        });
                    }
                }]
            });
            gpxMotionView.shareButton.addTo(gpxMotionView.map);

            gpxMotionView.loadButton = L.easyButton({
                position: 'bottomright',
                states: [{
                    stateName: 'prev',
                    icon:      'fa-folder-open-o',
                    title:     t('gpxmotion', 'Load file'),
                    onClick: function(btn, map) {
                        if (gpxMotionView.currentAjax !== null) {
                            gpxMotionView.currentAjax.abort();
                        }
                        OC.dialogs.filepicker(
                            t('gpxmotion', 'Load file (gpx)'),
                            function(targetPath) {
                                main(targetPath);
                            },
                            false,
                            null,
                            true
                        );
                    }
                }]
            });
            gpxMotionView.loadButton.addTo(gpxMotionView.map);
        }

        var nextButton = L.easyButton({
            position: 'bottomright',
            states: [{
                stateName: 'next',
                icon:      'fa-fast-forward',
                title:     t('gpxmotion', 'Next section (n)'),
                onClick: function(btn, map) {
                    nextSection();
                }
            }]
        });
        nextButton.addTo(gpxMotionView.map);

        gpxMotionView.prevButton = L.easyButton({
            position: 'bottomright',
            states: [{
                stateName: 'prev',
                icon:      'fa-fast-backward',
                title:     t('gpxmotion', 'Previous section (p)'),
                onClick: function(btn, map) {
                    prevSection();
                }
            }]
        });
        gpxMotionView.prevButton.addTo(gpxMotionView.map);

        gpxMotionView.drawButton = L.easyButton({
            position: 'bottomright',
            states: [{
                stateName: 'draw',
                icon:      'fa-eye',
                title:     t('gpxmotion', 'Draw complete trip (g)'),
                onClick: function(btn, map) {
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
                stateName: 'reset',
                icon:      'fa-eye-slash',
                title:     t('gpxmotion', 'Reset (i)'),
                onClick: function(btn, map) {
                    if (ready){
                        reset();
                        $('div#summary').text(gpxMotionView.summaryText);
                    }
                }
            }]
        });
        resetButton.addTo(gpxMotionView.map);

        gpxMotionView.playButton = L.easyButton({
            position: 'bottomright',
            states: [{
                stateName: 'play',
                //icon:      'fa-spinner',
                icon:      'fa-play-circle-o',
                title:     t('gpxmotion', 'Play/Pause animation (spacebar)'),
                onClick: function(btn, map) {
                    if (currentMarkerIndex === 0){
                        reset();
                        nextMarker();
                    }
                    else{
                        playPause();
                    }
                }
            },{
                stateName: 'pause',
                icon:      'fa-pause-circle-o',
                title:     t('gpxmotion', 'Play/Pause animation (spacebar)'),
                onClick: function(btn, map) {
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
        $('span.fa-play-circle-o').parent().parent().prop('disabled', true);
    }

    function getOptionValues() {
        var res = {
            autozoom: 0,
            loop: 0
        };
        if ($('#loopcheck').is(':checked')) {
            res.loop = 1;
        }
        if ($('#zoomcheck').is(':checked')) {
            res.autozoom = 1;
        }

        return res;
    }

    function showEmptyMessage() {
        OC.dialogs.alert(t('gpxmotion', 'No animation data found in the GPX file'),
                         t('gpxmotion', 'Load error'));
        $('span.fa-spinner').removeClass('fa-spinner fa-pulse').addClass('fa-play-circle-o');
        $('div#summary').text(t('gpxmotion', 'Load error'));
    }

    function processXml(xml) {
        var jsondesc;
        var defaultPlan = '[';
        for (var i = 0; i < 20; i++) {
            defaultPlan = defaultPlan +
            '     {' +
            '          "nbElements": 1,' +
            '          "vehicule": "no vehicle",' +
            '          "time": 10000,' +
            '          "title": null,' +
            '          "description": null,' +
            '          "pictureUrl": null,' +
            '          "detailUrl": null,' +
            '          "beginTitle": null,' +
            '          "beginDescription": null,' +
            '          "beginPictureUrl": null,' +
            '          "beginDetailUrl": null' +
            '},';
        }
        defaultPlan = defaultPlan.replace(/,$/,'') + ']';
        var defaultDesc =
            '{"elementUnit": "track",' +
            '"proportionalTime": "true",' +
            '"simultaneousSections": "false",' +
            '"plan": ' + defaultPlan +
            '}';
        if (xml.gpx === '') {
            showEmptyMessage();
            return;
        }
        var gpxml = $.parseXML(xml.gpx);
        var desc = $(gpxml).find('gpx>metadata>desc').text();
        // if there is no desc at all, we take the default one
        if (desc === '') {
            jsondesc = $.parseJSON(defaultDesc);
        }
        else {
            jsondesc = $.parseJSON(desc);
        }
        plan = jsondesc.plan;
        // if the plan is empty, we take the default one
        if (!plan || plan.length === 0) {
            jsondesc.plan = $.parseJSON(defaultPlan);
            plan = jsondesc.plan;
        }
        params = jsondesc;

        var i, j, lat, lon, name, time, table, timetable;
        var time1, time2;
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
        var coords = [];
        var planNamesFromGpxTrk = [];
        var pinSummaryContent = '';
        var lineSummaryContent = '';
        var totalTime = 0;
        minBeginTime = null;
        maxEndTime = null;

        // used in feature unit only
        // we get the number of features we want for each plan Section
        var featureNumberPerSection = [];
        if (params.elementUnit === 'track') {
            for (i = 0; i < plan.length; i++) {
                featureNumberPerSection.push(plan[i].nbElements);
                plan[i].nbElements = 0;
                planNamesFromGpxTrk.push('');
            }
        }
        var iplancoord = 0;
        // concatenate all tracks/routes coordinates in one array
        // avoid waypoints
        $(gpxml).find('trk, rte').each(function() {
            var featureLength = 0;
            name = $(this).find('>name').text();

            // find minimum first point time
            var firstPoint = $(this).find('trkpt, rtept').first();
            time = moment(firstPoint.find('time').text().replace(' ', 'T'));
            if (minBeginTime === null) {
                minBeginTime = time;
            }
            else {
                if (time.diff(minBeginTime) < 0) {
                    minBeginTime = time;
                }
            }
            var lastPoint = $(this).find('trkpt, rtept').last();
            time = moment(lastPoint.find('time').text().replace(' ', 'T'));
            if (maxEndTime === null) {
                maxEndTime = time;
            }
            else {
                if (time.diff(maxEndTime) > 0) {
                    maxEndTime = time;
                }
            }

            $(this).find('trkpt, rtept').each(function() {
                lat = $(this).attr('lat');
                lon = $(this).attr('lon');
                time = moment($(this).find('time').text().replace(' ', 'T'));
                coords.push([lat, lon, time]);
                featureLength++;
            });

            // if we count the features, get the correct number of segments
            if (params.elementUnit === 'track' && iplancoord < plan.length) {
                plan[iplancoord].nbElements += featureLength;
                planNamesFromGpxTrk[iplancoord] += name + '; ';
                featureNumberPerSection[iplancoord]--;
                if (featureNumberPerSection[iplancoord] === 0) {
                    planNamesFromGpxTrk[iplancoord] = planNamesFromGpxTrk[iplancoord].replace(/;\s$/g, '');
                    iplancoord++;
                }
            }
        });
        // check missing times in each plan section
        var cpt = 0;
        for (i = 0; i < plan.length; i++) {
            plan[i].missingTime = false;
            for (j = 0; j < plan[i].nbElements; j++) {
                if (! coords[cpt][2].isValid()) {
                    plan[i].missingTime = true;
                }
                cpt++;
            }
        }
        while (iplan < plan.length && iline < coords.length) {
            planSection = plan[iplan];
            nblinesInserted = 0;
            table = [];
            timetable = [];
            if (params.synchroSections && params.synchroSections === 'true' && !planSection.missingTime) {
                i = nblinesInserted;
                j = iline;
                time1 = minBeginTime;
                time2 = coords[j+1][2];
                var diff = time2.diff(time1);
                if (diff < 0) {
                    timetable.push(0);
                }
                else {
                    timetable.push(time2.diff(time1));
                }
                i++;
                j++;
                while (i < planSection.nbElements - 2 && j < coords.length - 2) {
                    time1 = coords[j][2];
                    time2 = coords[j+1][2];
                    var diff = time2.diff(time1);
                    if (diff < 0) {
                        timetable.push(0);
                    }
                    else {
                        timetable.push(time2.diff(time1));
                    }
                    i++;
                    j++;
                }
                time1 = coords[j][2];
                time2 = maxEndTime;
                var diff = time2.diff(time1);
                if (diff < 0) {
                    timetable.push(0);
                }
                else {
                    timetable.push(time2.diff(time1));
                }
                i++;
                j++;
                // make the time fit the section time
                var sumTimes = maxEndTime.diff(minBeginTime);
                time = 20000;
                var ratio = time/sumTimes;
                for (i = 0; i < timetable.length; i++) {
                    timetable[i] = ratio * timetable[i];
                }
            }
            // get the times if the option is on and there is no missing time
            else if (params.proportionalTime && params.proportionalTime === 'true' && !planSection.missingTime) {
                i = nblinesInserted;
                j = iline;
                while (i < planSection.nbElements - 1 && j < coords.length - 1) {
                    time1 = coords[j][2];
                    time2 = coords[j+1][2];
                    var diff = time2.diff(time1);
                    if (diff < 0) {
                        timetable.push(0);
                    }
                    else {
                        timetable.push(time2.diff(time1));
                    }
                    i++;
                    j++;
                }
                // make the time fit the section time
                var sumTimes = timetable.reduce(function(previousValue, currentValue){
                    return currentValue + previousValue;
                });
                time = planSection.time;
                var ratio = time/sumTimes;
                for (i = 0; i < timetable.length; i++) {
                    timetable[i] = ratio * timetable[i];
                }
            }
            else {
                timetable = planSection.time;
            }
            // get the coords
            while (nblinesInserted < planSection.nbElements && iline < coords.length) {
                thecoord = coords[iline];
                ll = L.latLng(thecoord[0], thecoord[1]);
                ll.time = thecoord[2];
                table.push(ll);
                iline++;
                nblinesInserted++;
            }
            if (params.synchroSections && params.synchroSections === 'true') {
                table[0].time = minBeginTime;
                table[table.length - 1].time = maxEndTime;
            }

            thevehicule = planSection.vehicule;
            theicon = gpxMotionView.vehicule[thevehicule].icon;
            if (thevehicule === 'no vehicle') {
                thecolor = colors[++lastColorUsed % colors.length];
            }
            else {
                thecolor = gpxMotionView.vehicule[thevehicule].color;
            }

            // calculate approximate plan section total distance
            planSection.totalDistance = 0;
            for (var ii = 0; ii < table.length - 1; ii++) {
                planSection.totalDistance += gpxMotionView.map.distance(table[ii], table[ii+1]);
            }
            allSectionTotalDistance += planSection.totalDistance;

            mypoly = L.polyline(table, {color:thecolor, weight:5, opacity: 0.6});
            if (border) {
                borderLine = L.polyline(table,
                    {opacity:0.6, weight: parseInt(5 * 1.6), color:'white'});
                featGroup = L.featureGroup([borderLine, mypoly]);
            }
            else {
                featGroup = L.featureGroup([mypoly]);
            }
            featGroup.on('mouseover', function(e) {
                e.target.bringToFront();
            });
            polylines.push(featGroup);

            // empty elements to be drawn progressively
            emptyPoly = L.polyline([], {color: thecolor, weight: 5, opacity: 0.6});
            emptyBorderLine = L.polyline([],
                {opacity: 0.6, weight: parseInt(5 * 1.6), color: 'white'});
            drawFeatGroup = L.featureGroup([emptyBorderLine, emptyPoly]);
            drawPolylines.push(drawFeatGroup);

            totalTime += planSection.time;
            marker = L.Marker.movingMarker(mypoly.getLatLngs(), timetable,{
                autostart: false,
                icon: theicon
            });
            marker.gpxMotionIndex = iplan;
            marker.on('move', updateSnakeLine);
            var pinIcon = gpxMotionView.normalPinIcon;
            if (iplan === 0) {
                pinIcon = gpxMotionView.beginPinIcon;
            }
            var beginMarker = L.marker(table[0], {icon: pinIcon});
            linePopupString = '';
            popupString = '';

            // popup for line
            if (planSection.hasOwnProperty('title')) {
                linkDest = planSection.detailUrl;
                title = planSection.title;
                text = planSection.description;
                photoUrl = planSection.pictureUrl;
                if (!title) {
                    title = '';
                    if (params.elementUnit === 'track') {
                        title += ' ' + planNamesFromGpxTrk[iplan];
                        planSection.title = title;
                    }
                }
                linePopupString = '<h2 class="popupTitle">' + t('gpxmotion', 'Section') + ' ' + (iplan+1) + ' : ' + title + '</h2>';
                if (text) {
                    linePopupString = linePopupString + '<p>' + text + '</p>';
                }
                if (photoUrl) {
                    if (linkDest) {
                        linePopupString = linePopupString + '<a href="' + linkDest +
                            '" target="_blank" title="' + t('gpxmotion', 'More about') + ' \'' +
                            title +'\'"><img class="popupPhoto" src="' + photoUrl + '"/></a>';
                    }
                    else {
                        linePopupString = linePopupString + '<img class="popupPhoto" src="' + photoUrl + '"/>';
                    }
                }
                if (linkDest) {
                    linePopupString = linePopupString+ '<a href="' + linkDest + '" target="_blank">' +
                                      t('gpxmotion', 'More about') + ' "' + title + '"</a>';
                }

                featGroup.bindPopup(linePopupString);
                featGroup.bindTooltip(t('gpxmotion', 'Section') + ' ' + (iplan+1) + ' : ' +
                                      title + '<br/>' + t('gpxmotion', 'Click for more details'),
                                      {sticky: true});
                drawFeatGroup.bindPopup(linePopupString);
                drawFeatGroup.bindTooltip(t('gpxmotion', 'Section') + ' ' + (iplan+1) + ' : ' +
                                          title + '<br/>' + t('gpxmotion', 'Click for more details'),
                                          {sticky: true});
                marker.bindPopup(linePopupString);
                marker.bindTooltip(t('gpxmotion', 'Section') + ' ' + (iplan+1) + ' : ' +
                                   title + '<br/>' + t('gpxmotion', 'Click for more details'),
                                   {sticky: true});
                lineSummaryContent += '<tr><td id="' + iplan + '">' + (iplan+1) + ' : ' + title + '</td></tr>';
            }
            else {
                lineSummaryContent += '<tr><td id="' + iplan + '">' + (iplan+1) + '</td></tr>';
            }
            // popup for begin pin
            if (planSection.hasOwnProperty('beginTitle')) {
                linkDest = planSection.beginDetailUrl;
                beginTitle = planSection.beginTitle;
                text = planSection.beginDescription;
                photoUrl = planSection.beginPictureUrl;
                if (!beginTitle) {
                    beginTitle = '';
                    if (params.elementUnit === 'track'){
                        beginTitle += ' '+planNamesFromGpxTrk[iplan];
                    }
                }
                popupString = '<h2 class="popupTitle">' + t('gpxmotion', 'Step') + ' '+ iplan + ' : ' + beginTitle + '</h2>';
                if (text) {
                    popupString = popupString + '<p>' + text + '</p>';
                }
                if (photoUrl) {
                    if (linkDest) {
                        popupString = popupString + '<a href="' + linkDest +
                            '" target="_blank" title="' + t('gpxmotion', 'More about') + ' \''+
                            beginTitle + '\'"><img class="popupPhoto" src="' + photoUrl + '"/></a>';
                    }
                    else {
                        popupString = popupString + '<img class="popupPhoto" src="'+photoUrl+'"/>';
                    }
                }
                if (linkDest) {
                    popupString = popupString+ '<a href="' + linkDest + '" target="_blank">' +
                                  t('gpxmotion', 'More about') + ' "'+beginTitle+'"</a>';
                }
                beginMarker.bindPopup(popupString);
                beginMarker.bindTooltip(t('gpxmotion', 'Step') + ' ' + iplan +
                                        ' : '+beginTitle+'<br/>' +
                                        t('gpxmotion', 'Click for more details'));
                pinSummaryContent += '<tr><td id="' + iplan + '">' +
                                     iplan + ' : ' + beginTitle + '</td></tr>';
            }
            else {
                beginMarkers.bindPopup(linePopupString);
                pinSummaryContent += '<tr><td id="'+iplan+'">' + iplan + '</td></tr>';
            }

            beginMarkers.push(beginMarker);

            markers.push(marker);

            iplan++;
        }

        // get the global bounds to zoom on the whole trip
        globalBounds = L.latLngBounds(polylines[0].getBounds().getSouthWest(), polylines[0].getBounds().getNorthEast());
        for (i = 0; i < polylines.length; i++) {
            globalBounds.extend(polylines[i].getBounds());
        }

        // add last pin marker and tooltip
        var lastMarker = L.marker(table[table.length-1], {icon: gpxMotionView.endPinIcon});
        var lastTooltip = t('gpxmotion', 'Step') + ' '+ iplan + ' (final)';
        var lastPopup = lastTooltip;
        if (iplan < plan.length && plan[iplan].hasOwnProperty('beginTitle')) {
            lastTooltip = t('gpxmotion', 'Step') + ' ' + iplan + ' (final) : ' +
                          plan[iplan].beginTitle + '<br/>' + t('gpxmotion', 'Click for more details');

            linkDest = plan[iplan].beginDetailUrl;
            beginTitle = plan[iplan].beginTitle;
            text = plan[iplan].beginDescription;
            photoUrl = plan[iplan].beginPictureUrl;
            if (!beginTitle) {
                beginTitle = '';
                if (params.elementUnit === 'track') {
                    beginTitle += ' ' + planNamesFromGpxTrk[iplan];
                }
            }
            lastPopup = '<h2 class="popupTitle">' + t('gpxmotion', 'Step') + ' ' +
                        iplan + ' (' + t('gpxmotion', 'final') +
                        ') : ' + beginTitle + '</h2>';
            if (text) {
                lastPopup = lastPopup + '<p>' + text + '</p>';
            }
            if (photoUrl) {
                if (linkDest) {
                    lastPopup = lastPopup + '<a href="' + linkDest +
                        '" target="_blank" title="' + t('gpxmotion', 'More about') + ' \'' +
                        beginTitle + '\'"><img class="popupPhoto" src="' + photoUrl + '"/></a>';
                }
                else {
                    lastPopup = lastPopup + '<img class="popupPhoto" src="'+photoUrl+'"/>';
                }
            }
            if (linkDest) {
                lastPopup = lastPopup + '<a href="' + linkDest + '" target="_blank">' +
                            t('gpxmotion', 'More about') + ' "' + beginTitle + '"</a>';
            }
            lastMarker.bindPopup(lastPopup);
        }
        lastMarker.bindTooltip(lastTooltip);
        beginMarkers.push(lastMarker);

        // stop loading animation
        $('span.fa-spinner').parent().parent().prop('disabled', false);
        $('span.fa-spinner').removeClass('fa-spinner fa-pulse').addClass('fa-play-circle-o');

        if (params.synchroSections === 'true') {
            var totsec = Math.floor(20000 / 1000);
        }
        else if (params.simultaneousSections === 'true'){
            var maxTime = 0;
            for (var x = 0; x < markers.length; x++) {
                if (plan[x].time > maxTime) {
                    maxTime = plan[x].time;
                }
            }
            var totsec = Math.floor(maxTime / 1000);
        }
        else {
            var totsec = Math.floor(totalTime / 1000);
        }
        var minutes = Math.floor(totsec / 60);
        var remsec = totsec % 60;
        gpxMotionView.summaryText = t('gpxmotion', 'Ready to play') +
                                    ' !!! (' + minutes + ' min ' + remsec +' sec ; ' +
                                    formatDistance(allSectionTotalDistance) + ')'
        $('div#summary').text(gpxMotionView.summaryText);
        ready = true;
        // AUTOPLAY
        if (getUrlParameter('autoplay') === '1') {
            nextMarker();
        }
        else {
            displayCompleteTravel();
        }
    }

    function drawslider(ossz, meik) {
        var slidertext=Math.round((meik * 100) / ossz);
        document.getElementById("sliderbar").style.width = slidertext + '%';
        document.getElementById("slidertext").innerHTML = 'Loading ' + slidertext + '%';
    }

    function updateDisplaySizes() {
        gpxMotionView.summaryDialog.setLocation([0, parseInt(gpxMotionView.map.getSize().x * 0.2)]);
        gpxMotionView.summaryDialog.setSize([parseInt(gpxMotionView.map.getSize().x * 0.6), 20]);

        gpxMotionView.dialog.setSize([120, parseInt(gpxMotionView.map.getSize().y - 140)]);
    }

    // preload tiles needed when a polyline is displayed
    function preloadTiles(poly) {
        var url, img, x, y;
        var currentTileUrl = gpxMotionView.activeLayers.getActiveBaseLayer().layer._url.replace('{s}', 'a');
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

        try {
            for(y = dataNorth; y < dataSouth + 1; y++) {
                for(x = dataWest; x < dataEast + 1; x++) {
                    url = currentTileUrl.replace('{z}', zoom).replace('{x}', x).replace('{y}', y);
                    img = new Image();
                    img.src = url;
                }
            }
        }
        catch(err) {
        }
    }

    function clearMap(m) {
        var i, e;
        for(i in m._layers) {
            if (m._layers[i] instanceof L.Marker || m._layers[i] instanceof L.Polyline) {
                try {
                    m.removeLayer(m._layers[i]);
                }
                catch(e) {
                    console.log('problem with ' + e + m._layers[i]);
                }
            }
        }
    }

    function clearAll() {
        clearMap(gpxMotionView.map);
        allSectionTotalDistance = 0;
        currentTimer = null;
        params;
        plan;
        currentMarkerIndex = 0;
        markers = [];
        polylines = [];
        drawPolylines = [];
        beginMarkers = [];
        globalBounds = null;
        ready = false;
        gpxMotionView.map.setView([0, 0], 2);
    }

    function restoreOptionsFromURL() {
        var zoom = getUrlParameter('autozoom');
        if (zoom === '1') {
            $('#zoomcheck').prop('checked', true);
        }
        if (zoom === '0') {
            $('#zoomcheck').prop('checked', false);
        }
        var loop = getUrlParameter('loop');
        if (loop === '1') {
            $('#loopcheck').prop('checked', true);
        }
        if (loop === '0') {
            $('#loopcheck').prop('checked', false);
        }
    }

    // load gpx file with plan and build our markers, pins...
    function main(path='') {
        if (isPublicPage()) {
            restoreOptionsFromURL();
        }
        clearAll();
        var req;
        // public file or preview
        if (isPublicPage()) {
            var gpxtxt = $('#publicgpx').html();
            gpxtxt = $('<div/>').html(gpxtxt).text();
            var xml = {
                gpx: gpxtxt
            };
            $('span.fa-play-circle-o').removeClass('fa-play-circle-o').addClass('fa-spinner').addClass('fa-pulse');
            $('span.fa-spinner').parent().parent().prop('disabled', true);
            processXml(xml);
        }
        // normal file
        else {
            if (path === '') {
                var pathGet = getUrlParameter('path');
                if (pathGet) {
                    req = {
                        path: pathGet
                    }
                }
                // this is not a public link, not a preview and there is no file to load
                // probably just the view page displayed
                else {
                    $('div#summary').text(t('gpxmotion', 'Load a file to display an animation'));
                    return;
                }
            }
            else {
                req = {
                    path: path
                }
                document.title = 'GpxMotion - view - ' + basename(path);
                window.history.pushState({'html': '', 'pageTitle': ''},'', 'view?path='+encodeURIComponent(path));
            }
            gpxMotionView.currentFilePath = req.path;
            $('span.fa-play-circle-o').removeClass('fa-play-circle-o').addClass('fa-spinner').addClass('fa-pulse');
            $('span.fa-spinner').parent().parent().prop('disabled', true);
            var url = OC.generateUrl('/apps/gpxmotion/getgpx');
            $('div#summary').html(
                '<div id="slider">' +
                '<div id="sliderbar">' +
                '</div>' +
                '<div id="slidertext">' +
                '</div>' +
                '</div>'
            );

            gpxMotionView.currentAjax = $.ajax({
                type: 'POST',
                async: true,
                url: url,
                data: req,
                xhr: function() {
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
    }

    function getUrlParameter(sParam) {
        var sPageURL = window.location.search.substring(1);
        var sURLVariables = sPageURL.split('&');
        for (var i = 0; i < sURLVariables.length; i++) {
            var sParameterName = sURLVariables[i].split('=');
            if (sParameterName[0] === sParam) {
                return decodeURIComponent(sParameterName[1]);
            }
        }
    }

    function isPublicPage() {
        return ($('#publicgpx').html() !== '');
    }

    function isPreviewPage() {
        return (endsWith(window.location.href, '/preview'));
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

        function checkKey(e) {
            e = e || window.event;
            var kc = e.keyCode;
            //console.log(kc);

            if (kc === 32) {
                e.preventDefault();
                if (ready) {
                    if (currentMarkerIndex === 0) {
                        reset();
                        nextMarker();
                    }
                    else {
                        playPause();
                    }
                }
            }
            if (kc === 78) {
                e.preventDefault();
                nextSection();
            }
            if (kc === 80) {
                e.preventDefault();
                prevSection();
            }
            if (kc === 73) {
                e.preventDefault();
                if (ready) {
                    reset();
                    $('div#summary').text(gpxMotionView.summaryText);
                }
            }
            if (kc === 71) {
                e.preventDefault();
                if (ready) {
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
