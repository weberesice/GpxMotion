(function ($, OC) {
    'use strict';

    var gpxmotion = {
        map: null,
        vehicule: null,
        vehicules: {'plane': '', 'car': '', 'hike': '', 'bike': '', 'train': '', 'bus': ''},
        currentAjax: null,
        featureGroup: new L.featureGroup()
    }

    function endsWith(str, suffix) {
        return str.indexOf(suffix, str.length - suffix.length) !== -1;
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

        gpxmotion.map.addLayer(gpxmotion.featureGroup);
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

    function showLoadingAnimation() {
        $('#loading').show();
    }

    function hideLoadingAnimation() {
        $('#loading').hide();
    }


    function loadAction(path) {
        if (!endsWith(path, '.gpx') && !endsWith(path, '.GPX')) { 
            OC.dialogs.alert( 
                t('gpxmotion', 'Impossible to load this file. ') + 
                t('gpxmotion', 'Supported formats is gpx'), 
                t('gpxmotion', 'Load error') 
            ); 
            return; 
        } 
 
        loadFile(path);
		// set save name
        var spl = path.split('/');
        var basename = spl[spl.length - 1];
        $('input#saveName').val(
            basename.replace(/\.jpg$/, '.gpx')
            .replace(/\.kml$/, '.gpx')
            .replace(/\.csv$/, '.gpx')
        );
    }

    function loadFile(file) {
        var req = {
            path: file
        };
        var url = OC.generateUrl('/apps/gpxmotion/getgpx');
        $('#loadingpc').text('0');
        showLoadingAnimation();
        gpxmotion.currentAjax = $.ajax({
            type: 'POST',
            async: true,
            url: url,
            data: req,
            xhr: function() {
                var xhr = new window.XMLHttpRequest();
                xhr.addEventListener('progress', function(evt) {
                    if (evt.lengthComputable) {
                        var percentComplete = evt.loaded / evt.total * 100;
                        $('#loadingpc').text(parseInt(percentComplete));
                    }
                }, false);

                return xhr;
            }
        }).done(function(response) {
            if ($('#clearstepsbeforeload').is(':checked')) {
                clearSteps();
            }
            if (response.gpx === '') {
                OC.dialogs.alert('The file does not exist or it is not supported',
                                 'Load error');
            }
            else {
                clearTrack();
                parseGpx(response.gpx);
                try {
                    var bounds = gpxmotion.featureGroup.getBounds();
                    gpxmotion.map.fitBounds(
                        bounds,
                        {
                            animate: true,
                            paddingTopLeft: [parseInt($('#sidebar').css('width')), 0]
                        }
                    );
                }
                catch (err) {
                    console.log('Impossible to fit to bounds \n'+err);
                }
            }
        }).fail(function() {
            OC.dialogs.alert('Failed to communicate with the server',
                             'Load error');
        }).always(function() {
            hideLoadingAnimation();
        });
    }

    function clearSteps() {
    }

    function clearTrack() {
        gpxmotion.featureGroup.clearLayers();
    }

    function parseGpx(xml) {
        var l;
        var dom = $(xml);
        var fileDesc = dom.find('>metadata>desc').text();
        parseDesc(fileDesc);
        dom.find('wpt').each(function() {
            var lat = $(this).attr('lat');
            var lon = $(this).attr('lon');
            var name = $(this).find('name').text();
            l = L.marker([lat, lon]);
            l.bindTooltip(name, {permanent: true});
            gpxmotion.featureGroup.addLayer(l);
        });
        dom.find('trk').each(function() {
            var latlngs = [];
            var name = $(this).find('>name').text();
            $(this).find('trkseg').each(function() {
                $(this).find('trkpt').each(function() {
                    var lat = $(this).attr('lat');
                    var lon = $(this).attr('lon');
                    latlngs.push([lat, lon]);
                });
            });
            l = L.polyline(latlngs);
            gpxmotion.featureGroup.addLayer(l);
        });
        dom.find('rte').each(function() {
            var latlngs = [];
            var name = $(this).find('>name').text();
            $(this).find('rtept').each(function() {
                var lat = $(this).attr('lat');
                var lon = $(this).attr('lon');
                latlngs.push([lat, lon]);
            });
            l = L.polyline(latlngs);
            gpxmotion.featureGroup.addLayer(l);
        });
    }

    function parseDesc(desc) {
        var json = $.parseJSON('{'+desc+'}');
        var i, p;
        if (json.plan) {
            for (i=0; i < json.plan.length; i++) {
                p = json.plan[i];
                addStep(p.nbElements,
                        p.vehicule,
                        p.time,
                        p.title,
                        p.description,
                        p.pictureUrl,
                        p.detailUrl,
                        p.beginTitle,
                        p.beginDescription,
                        p.beginPictureUrl,
                        p.beginDetailUrl
                );
            }
        }
    }

    function addStep(nbElements=1,
                     vehicule="plane",
                     time=5000,
                     title="",
                     description='',
                     pictureUrl='',
                     detailUrl='',
                     beginTitle='',
                     beginDescription='',
                     beginPictureUrl='',
                     beginDetailUrl=''
    ){
        var sel, v;
        var values = {
            nbElements: nbElements,
            vehicule: vehicule,
            time: time,
            title: title,
            description: description,
            pictureUrl: pictureUrl,
            detailUrl: detailUrl,
            beginTitle: beginTitle,
            beginDescription: beginDescription,
            beginPictureUrl: beginPictureUrl,
            beginDetailUrl: beginDetailUrl
        }
        for (v in values) {
            if (!values[v]) {
                values[v] = '';
            }
        }
        var divtxt = '<div class="step">';
        divtxt = divtxt + '<label>' + t('gpxmotion', 'Number of elements') + ' :</label>';
        divtxt = divtxt + '<input role="nbelem" type="text" value="' + escapeHTML(values.nbElements) + '"></input>';
        divtxt = divtxt + '<label>' + t('gpxmotion', 'Vehicule') + ' :</label>';
        divtxt = divtxt + '<select role="vehicule">';
        for (v in gpxmotion.vehicules) {
            if (v === vehicule) {
                sel = ' selected';
            }
            else {
                sel = '';
            }
            divtxt = divtxt +'<option value="' + escapeHTML(v) + '"' + sel + '>' + v + '</option>';
        }
        divtxt = divtxt + '</select>';
        divtxt = divtxt + '<label>' + t('gpxmotion', 'Duration') + ' :</label>';
        divtxt = divtxt + '<input role="time" type="text" value="' + escapeHTML(values.time) + '"></input>';
        divtxt = divtxt + '<label>' + t('gpxmotion', 'Description') + ' :</label>';
        divtxt = divtxt + '<textarea role="description" value="' + escapeHTML(values.description) + '"/>';
        divtxt = divtxt + '<label>' + t('gpxmotion', 'Picture URL') + ' :</label>';
        divtxt = divtxt + '<input role="pictureUrl" type="text" value="' + escapeHTML(values.pictureUrl) + '"></input>';
        divtxt = divtxt + '<label>' + t('gpxmotion', 'Begin title') + ' :</label>';
        divtxt = divtxt + '<input role="beginTitle" type="text" value="' + escapeHTML(values.beginTitle) + '"></input>';
        divtxt = divtxt + '<label>' + t('gpxmotion', 'Begin description') + ' :</label>';
        divtxt = divtxt + '<input role="beginDescription" type="text" value="' + escapeHTML(values.beginDescription) + '"></input>';
        divtxt = divtxt + '<label>' + t('gpxmotion', 'Begin picture URL') + ' :</label>';
        divtxt = divtxt + '<input role="beginPictureUrl" type="text" value="' + escapeHTML(values.beginPictureUrl) + '"></input>';
        divtxt = divtxt + '<label>' + t('gpxmotion', 'Begin detail URL') + ' :</label>';
        divtxt = divtxt + '<input role="beginDetailUrl" type="text" value="' + escapeHTML(values.beginDetailUrl) + '"></input>';

        divtxt = divtxt + '<button class="removeStep"><i class="fa fa-trash" aria-hidden="true"></i> Remove step</button>';
        divtxt = divtxt + '<button class="zoom"><i class="fa fa-search" aria-hidden="true"></i> Zoom on step</button>';
        divtxt = divtxt + '</div>';
        $('#addStepButton').before($(divtxt).fadeIn('slow'));
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

        $('#loadButton').click(function(e) {
            if (gpxmotion.currentAjax !== null) {
                gpxmotion.currentAjax.abort();
                hideLoadingAnimation();
            }
            OC.dialogs.filepicker(
                t('gpxmotion', 'Load file (gpx)'),
                function(targetPath) {
                    loadAction(targetPath);
                },
                false,
                null,
                true
            );
        });

        $('#addStepButton').click(function(e) {
            addStep();
        });

        $('body').on('click', '.removeStep', function(e) {
            var p = $(this).parent();
            p.fadeOut('slow', function() {
                p.remove();
            });
        });

    });
}(jQuery, OC));
