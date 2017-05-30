(function ($, OC) {
    'use strict';

    var gpxmotion = {
        map: null,
        vehicule: null,
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

    function load_map() {
        // change meta to send referrer
        // usefull for IGN tiles authentication !
        $('meta[name=referrer]').attr('content', 'origin');

        var layer = getUrlParameter('layer');
        var default_layer = 'OpenStreetMap';
        if (typeof layer !== 'undefined') {
            default_layer = decodeURIComponent(layer);
        }

        var osmfr2 = new L.TileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', {
            minZoom: 0,
            maxZoom: 13,
            attribution: 'Map data &copy; 2013 <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
        });

        var baseLayers = {};

        // add base layers
        $('#basetileservers li[type=tile]').each(function() {
            var sname = $(this).attr('name');
            var surl = $(this).attr('url');
            var minz = parseInt($(this).attr('minzoom'));
            var maxz = parseInt($(this).attr('maxzoom'));
            var sattrib = $(this).attr('attribution');
            baseLayers[sname] = new L.TileLayer(surl, {minZoom: minz, maxZoom: maxz, attribution: sattrib});
        });
        // add custom layers
        $('#tileserverlist li').each(function() {
            var sname = $(this).attr('name');
            var surl = $(this).attr('title');
            baseLayers[sname] = new L.TileLayer(surl,
                    {maxZoom: 18, attribution: 'custom tile server'});
        });
        gpxmotion.baseLayers = baseLayers;

        var baseOverlays = {};

        // add base overlays
        $('#basetileservers li[type=overlay]').each(function() {
            var sname = $(this).attr('name');
            var surl = $(this).attr('url');
            var minz = parseInt($(this).attr('minzoom'));
            var maxz = parseInt($(this).attr('maxzoom'));
            var sattrib = $(this).attr('attribution');
            baseOverlays[sname] = new L.TileLayer(surl, {minZoom: minz, maxZoom: maxz, attribution: sattrib});
        });
        // add custom overlays
        $('#overlayserverlist li').each(function() {
            var sname = $(this).attr('name');
            var surl = $(this).attr('title');
            baseOverlays[sname] = new L.TileLayer(surl,
                    {maxZoom: 18, attribution: 'custom overlay server'});
        });
        gpxmotion.overlayLayers = baseOverlays;

        gpxmotion.map = new L.Map('map', {
            zoomControl: true,
        });

        L.control.scale({metric: true, imperial: true, position: 'topleft'})
        .addTo(gpxmotion.map);

        L.control.mousePosition().addTo(gpxmotion.map);
        L.control.sidebar('sidebar').addTo(gpxmotion.map);

        gpxmotion.map.setView(new L.LatLng(27, 5), 3);

        if (! baseLayers.hasOwnProperty(default_layer)) {
            default_layer = 'OpenStreetMap';
        }
        gpxmotion.map.addLayer(baseLayers[default_layer]);

        gpxmotion.activeLayers = L.control.activeLayers(baseLayers, baseOverlays);
        gpxmotion.activeLayers.addTo(gpxmotion.map);

        gpxmotion.map.on('baselayerchange', saveOptions);
    }

    function saveOptions() {
    }

    function deleteTileServer(li, type) {
        var sname = li.attr('name');
        var req = {
            servername: sname,
            type: type
        };
        var url = OC.generateUrl('/apps/gpxmotion/deleteTileServer');
        $.ajax({
            type: 'POST',
            url: url,
            data: req,
            async: true
        }).done(function (response) {
            if (response.done) {
                li.fadeOut('slow', function() {
                    li.remove();
                });
                if (type === 'tile') {
                    var activeLayerName = gpxmotion.activeLayers.getActiveBaseLayer().name;
                    // if we delete the active layer, first select another
                    if (activeLayerName === sname) {
                        $('input.leaflet-control-layers-selector').first().click();
                    }
                    gpxmotion.activeLayers.removeLayer(gpxmotion.baseLayers[sname]);
                    delete gpxmotion.baseLayers[sname];
                }
                else {
                    gpxmotion.activeLayers.removeLayer(gpxmotion.overlayLayers[sname]);
                    delete gpxmotion.overlayLayers[sname];
                }
                OC.Notification.showTemporary(t('gpxmotion', 'Tile server "{ts}" has been deleted', {ts: sname}));
            }
            else{
                OC.Notification.showTemporary(t('gpxmotion', 'Failed to delete tile server "{ts}"', {ts: sname}));
            }
        }).always(function() {
        }).fail(function() {
            OC.Notification.showTemporary(t('gpxmotion', 'Failed to delete tile server "{ts}"', {ts: sname}));
        });
    }

    function addTileServer(type) {
        var sname = $('#'+type+'servername').val();
        var surl = $('#'+type+'serverurl').val();
        if (sname === '' || surl === '') {
            OC.dialogs.alert(t('gpxmotion', 'Server name or server url should not be empty'),
                             t('gpxmotion', 'Impossible to add tile server'));
            return;
        }
        if ($('#'+type+'serverlist ul li[name="' + sname + '"]').length > 0) {
            OC.dialogs.alert(t('gpxmotion', 'A server with this name already exists'),
                             t('gpxmotion', 'Impossible to add tile server'));
            return;
        }
        $('#'+type+'servername').val('');
        $('#'+type+'serverurl').val('');

        var req = {
            servername: sname,
            serverurl: surl,
			type: type
        };
        var url = OC.generateUrl('/apps/gpxmotion/addTileServer');
        $.ajax({
            type: 'POST',
            url: url,
            data: req,
            async: true
        }).done(function (response) {
            if (response.done) {
                $('#'+type+'serverlist ul').prepend(
                    '<li style="display:none;" name="' + escapeHTML(sname) +
                    '" title="' + escapeHTML(surl) + '">' +
                    escapeHTML(sname) + ' <button>' +
                    '<i class="fa fa-trash" aria-hidden="true" style="color:red;"></i> ' +
                    t('gpxmotion', 'Delete') +
                    '</button></li>'
                );
                $('#'+type+'serverlist ul li[name="' + sname + '"]').fadeIn('slow');

                if (type === 'tile') {
                    // add tile server in leaflet control
                    var newlayer = new L.TileLayer(surl,
                            {maxZoom: 18, attribution: 'custom '+type+' server'});
                    gpxmotion.activeLayers.addBaseLayer(newlayer, sname);
                    gpxmotion.baseLayers[sname] = newlayer;
                }
                else {
                    // add tile server in leaflet control
                    var newlayer = new L.TileLayer(surl,
                            {maxZoom: 18, attribution: 'custom '+type+' server'});
                    gpxmotion.activeLayers.addOverlay(newlayer, sname);
                    gpxmotion.overlayLayers[sname] = newlayer;
                }
                OC.Notification.showTemporary(t('gpxmotion', 'Tile server "{ts}" has been added', {ts: sname}));
            }
            else{
                OC.Notification.showTemporary(t('gpxmotion', 'Failed to add tile server "{ts}"', {ts: sname}));
            }
        }).always(function() {
        }).fail(function() {
            OC.Notification.showTemporary(t('gpxmotion', 'Failed to add tile server "{ts}"', {ts: sname}));
        });
    }

    $(document).ready(function() {
        load_map();

        // Custom tile server management
        $('body').on('click', '#tileserverlist button', function(e) {
            deleteTileServer($(this).parent(), 'tile');
        });
        $('#addtileserver').click(function() {
            addTileServer('tile');
        });
        $('body').on('click', '#overlayserverlist button', function(e) {
            deleteTileServer($(this).parent(), 'overlay');
        });
        $('#addoverlayserver').click(function() {
            addTileServer('overlay');
        });

    });
}(jQuery, OC));
