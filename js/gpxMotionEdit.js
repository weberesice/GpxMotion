(function ($, OC) {
    'use strict';

    var gpxmotion = {
        map: null,
        vehicule: null,
        vehicules: {'plane': '', 'car': '', 'hike': '', 'bike': '', 'train': '', 'bus': ''},
        currentAjax: null,
        featureGroup: new L.featureGroup(),
        lineList: [],
        currentGpxDom: null
    }

    var normalStyle = {
        weight: 6,
        opacity: 1,
        color: 'blue'
    };

    var zoomStyle = {
        weight: 6,
        opacity: 1,
        color: 'red'
    };

    function endsWith(str, suffix) {
        return str.indexOf(suffix, str.length - suffix.length) !== -1;
    }

    function xmlToString(xmlData) { 

        var xmlString;
        //IE
        if (window.ActiveXObject){
            xmlString = xmlData.xml;
        }
        // code for Mozilla, Firefox, Opera, etc.
        else{
            xmlString = (new XMLSerializer()).serializeToString(xmlData);
        }
        return xmlString;
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

    function showFailAnimation(message) {
        $('#failed').find('b#content').html(message);
        $('#failed').fadeIn();
        setTimeout(hideFailedAnimation, 4000);
    }

    function hideFailedAnimation() {
        $('#failed').fadeOut();
    }

    function showSaveSuccessAnimation(path) {
        $('#saved').find('b#content').html(
            t('gpxmotion', 'File successfully saved as') + '<br/>' + path
        );
        $('#saved').fadeIn();
        setTimeout(hideSaveSuccessAnimation, 4000);
    }

    function hideSaveSuccessAnimation() {
        $('#saved').fadeOut();
    }

    function showExportingAnimation() {
        $('#exporting').show();
    }

    function hideExportingAnimation() {
        $('#exporting').hide();
    }

    function showSavingAnimation() {
        $('#saving').show();
    }

    function hideSavingAnimation() {
        $('#saving').hide();
    }

    function loadAction(path) {
        if (!endsWith(path, '.gpx') && !endsWith(path, '.GPX')) { 
            OC.dialogs.alert( 
                t('gpxmotion', 'Impossible to load this file. ') + 
                t('gpxmotion', 'Supported format : gpx'), 
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
        $('div.step').each(function() {
            $(this).fadeOut('slow', function() {
                $(this).remove();
                updateStepNumbers();
            });
        });
    }

    function insertStepBefore(elem) {
        addStep(1, 'plane', 5000, '', '', '', '', '', '', '', '', false, elem);
    }

    function insertStepAfter(elem) {
        addStep(1, 'plane', 5000, '', '', '', '', '', '', '', '', true, elem);
    }

    function clearTrack() {
        gpxmotion.featureGroup.clearLayers();
    }

    function parseGpx(xml) {
        var l;
        var xxml = $.parseXML(xml);
        var dom = $(xxml).find('gpx');
        gpxmotion.currentGpxDom = xxml;
        var fileDesc = dom.find('>metadata>desc').text();
        parseDesc(fileDesc);
        gpxmotion.lineList = [];
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
            l = L.polyline(latlngs, normalStyle);
            gpxmotion.featureGroup.addLayer(l);
            gpxmotion.lineList.push(l);
        });
        dom.find('rte').each(function() {
            var latlngs = [];
            var name = $(this).find('>name').text();
            $(this).find('rtept').each(function() {
                var lat = $(this).attr('lat');
                var lon = $(this).attr('lon');
                latlngs.push([lat, lon]);
            });
            l = L.polyline(latlngs, normalStyle);
            gpxmotion.featureGroup.addLayer(l);
            gpxmotion.lineList.push(l);
        });
    }

    function parseDesc(desc) {
        var json = $.parseJSON(desc);
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
                        p.beginDetailUrl,
                        false,
                        $('#addStepButton')
                );
            }
        }
    }

    function addStep(nbElements=1,
                     vehicule="plane",
                     time=5000,
                     title='',
                     description='',
                     pictureUrl='',
                     detailUrl='',
                     beginTitle='',
                     beginDescription='',
                     beginPictureUrl='',
                     beginDetailUrl='',
                     after=false,
                     what=null
    ){
        var insertNextTo = what;
        if (!what) {
            insertNextTo = $('#addStepButton');
        }
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
        divtxt = divtxt + '<h3 step=""></h3>';
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
        divtxt = divtxt + '<label>' + t('gpxmotion', 'Step title') + ' :</label>';
        divtxt = divtxt + '<input role="title" type="text" value="' + escapeHTML(values.title) + '"></input>';
        divtxt = divtxt + '<p class="morebutton"><i class="fa fa-angle-double-down"></i> <b>more</b></p>';
        divtxt = divtxt + '<div class="stepmore">';
        divtxt = divtxt + '<label>' + t('gpxmotion', 'Description') + ' :</label>';
        divtxt = divtxt + '<textarea role="description" value="' + escapeHTML(values.description) + '"/>';
        divtxt = divtxt + '<label>' + t('gpxmotion', 'Picture URL') + ' :</label>';
        divtxt = divtxt + '<input role="pictureUrl" type="text" value="' + escapeHTML(values.pictureUrl) + '"></input>';
        divtxt = divtxt + '<label>' + t('gpxmotion', 'Starting point title') + ' :</label>';
        divtxt = divtxt + '<input role="beginTitle" type="text" value="' + escapeHTML(values.beginTitle) + '"></input>';
        divtxt = divtxt + '<label>' + t('gpxmotion', 'Starting point description') + ' :</label>';
        divtxt = divtxt + '<input role="beginDescription" type="text" value="' + escapeHTML(values.beginDescription) + '"></input>';
        divtxt = divtxt + '<label>' + t('gpxmotion', 'Starting point picture URL') + ' :</label>';
        divtxt = divtxt + '<input role="beginPictureUrl" type="text" value="' + escapeHTML(values.beginPictureUrl) + '"></input>';
        divtxt = divtxt + '<label>' + t('gpxmotion', 'Starting point detail URL') + ' :</label>';
        divtxt = divtxt + '<input role="beginDetailUrl" type="text" value="' + escapeHTML(values.beginDetailUrl) + '"></input>';
        divtxt = divtxt + '</div>';

        divtxt = divtxt + '<button class="removeStep"><i class="fa fa-trash" aria-hidden="true"></i> Remove step</button>';
        divtxt = divtxt + '<button class="zoom"><i class="fa fa-search" aria-hidden="true"></i> Zoom on step</button>';
        divtxt = divtxt + '<button class="insertStepBefore"><i class="fa fa-arrow-up" aria-hidden="true"></i> Insert step before</button>';
        divtxt = divtxt + '<button class="insertStepAfter"><i class="fa fa-arrow-down" aria-hidden="true"></i> Insert step after</button>';
        divtxt = divtxt + '</div>';
        if (after) {
            insertNextTo.after($(divtxt).fadeIn('slow').css('display', 'grid'));
        }
        else {
            insertNextTo.before($(divtxt).fadeIn('slow').css('display', 'grid'));
        }
        updateStepNumbers();
    }

    function updateStepNumbers() {
        var i = 1;
        $('div.step').each(function() {
            $(this).find('h3').text('Step ' + i).attr('step', i);
            i++;
        });
    }

    function saveAction(targetPath) {
        showExportingAnimation();
        var saveFilePath = targetPath + '/' + $('input#saveName').val();
        var gpxText = generateGpx();
        hideExportingAnimation();
        $('#savingpc').text('0');
        showSavingAnimation();
        var req = {
            path: saveFilePath,
            content: gpxText 
        };
        var url = OC.generateUrl('/apps/gpxmotion/savegpx');
        $.ajax({
            type: 'POST',
            async: true,
            url: url,
            data: req,
            xhr: function() {
                var xhr = new window.XMLHttpRequest();
                xhr.upload.addEventListener('progress', function(evt) {
                    if (evt.lengthComputable) {
                        var percentComplete = evt.loaded / evt.total * 100;
                        //Do something with upload progress here
                        $('#savingpc').text(parseInt(percentComplete));
                    }
                }, false);

                return xhr;
            }
        }).done(function (response) {
            hideSavingAnimation();
            if (response.status === 'fiw') {
                showSaveFailAnimation(
                    saveFilePath,
                    t('gpxmotion', 'Impossible to write file') + ' : ' +
                    t('gpxmotion', 'Write access denied')
                );
            }
            else if (response.status === 'fu') {
                showSaveFailAnimation(
                    saveFilePath,
                    t('gpxmotion', 'Impossible to write file') + ' : ' +
                    t('gpxmotion', 'Folder does not exist')
                );
            }
            else if (response.status === 'fw') {
                showSaveFailAnimation(
                    saveFilePath,
                    t('gpxmotion', 'Impossible to write file') + ' : ' +
                    t('gpxmotion', 'Folder write access denied')
                );
            }
            else if (response.status === 'bfn') {
                showSaveFailAnimation(
                    saveFilePath,
                    t('gpxmotion', 'Bad file name, must end with ".gpx"')
                );
            }
            else{
                showSaveSuccessAnimation(saveFilePath);
            }
        });
    }

    function generateGpx() {
        var desc;
        if (gpxmotion.currentGpxDom) {
            desc = generateJsonDescTxt();
            var xx = $(gpxmotion.currentGpxDom);
            xx.find('gpx>metadata>desc').html(desc);
            return xmlToString(gpxmotion.currentGpxDom);
        }
        else {
            return null;
        }
    }

    function generateJsonDescTxt() {
        var json = {};
        var nbElements,
            vehicule,
            time,
            title,
            description,
            pictureUrl,
            detailUrl,
            beginTitle,
            beginDescription,
            beginPictureUrl,
            beginDetailUrl;
        var steplist = [];
        $('div.step').each(function() {
            var step = {};
            step.nbElements = parseInt($(this).find('input[role=nbelem]').val());
            step.vehicule = $(this).find('select[role=vehicule]').val();
            step.time = parseInt($(this).find('input[role=time]').val());
            step.title = $(this).find('input[role=title]').val();
            step.description = $(this).find('input[role=description]').val();
            step.pictureUrl = $(this).find('input[role=pictureUrl]').val();
            step.detailUrl = $(this).find('input[role=detailUrl]').val();
            step.beginTitle = $(this).find('input[role=beginTitle]').val();
            step.beginDescription = $(this).find('input[role=beginDescription]').val();
            step.beginPictureUrl = $(this).find('input[role=beginPictureUrl]').val();
            step.beginDetailUrl = $(this).find('input[role=beginDetailUrl]').val();
            steplist.push(step);
        });
        json.elementUnit = 'track';
        json.plan = steplist;
        return JSON.stringify(json);
    }

    function zoomOnStep(stepdiv) {
        var stepnum = parseInt(stepdiv.find('h3').attr('step'));
        var nbelems = parseInt(stepdiv.find('input[role=nbelem]').val());
        var featgr = new L.featureGroup();
        // get the first line we need
        var i = 0;
        $('div.step').each(function() {
            if (stepnum > parseInt($(this).find('h3').attr('step'))) {
                i = i + parseInt($(this).find('input[role=nbelem]').val());
            }
        });
        var cpt = 0;
        while (i < gpxmotion.lineList.length && cpt < nbelems) {
            featgr.addLayer(gpxmotion.lineList[i]);
            i++;
            cpt++;
        }
        gpxmotion.map.fitBounds(featgr.getBounds(),
            {animate: true, paddingTopLeft: [parseInt($('#sidebar').css('width')),0]}
        );
        //for (i = 0; i < gpxmotion.lineList.length; i++) {
        //    gpxmotion.lineList[i].setStyle(normalStyle);
        //}
        gpxmotion.featureGroup.setStyle(normalStyle);
        gpxmotion.featureGroup.eachLayer(function(l) {
            l.unbindTooltip();
        });
        featgr.eachLayer(function(l) {
            l.setStyle(zoomStyle);
            l.bindTooltip('Step '+stepnum, {permanent: true});
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

        $('#clearButton').click(function(e) {
            clearSteps();
        });

        $('body').on('click', '.removeStep', function(e) {
            var p = $(this).parent();
            p.fadeOut('slow', function() {
                p.remove();
                updateStepNumbers();
            });
        });

        $('button#saveButton').click(function(e) {
            if (gpxmotion.lineList.length === 0 || $('div.step').length === 0) {
                showFailAnimation(t('gpxmotion', 'There is nothing to save'));
            }
            else{
                var filename = $('#saveName').val();
                OC.dialogs.filepicker(
                    t('gpxmotion', 'Where to save') +
                    ' <b>' + filename + '</b>',
                    function(targetPath) {
                        saveAction(targetPath);
                    },
                    false, "httpd/unix-directory", true
                );
            }
        });

        $('body').on('click', '.insertStepBefore', function(e) {
            insertStepBefore($(this).parent());
        });

        $('body').on('click', '.insertStepAfter', function(e) {
            insertStepAfter($(this).parent());
        });

        $('body').on('click', '.zoom', function(e) {
            zoomOnStep($(this).parent());
        });

        $('#viewButton').click(function() {
            var url = OC.generateUrl('apps/gpxmotion/view');
            window.open(url, '_blank');
        });

        $('body').on('click', '.morebutton', function(e) {
            var stepdiv = $(this).parent();
            var stepmore = stepdiv.find('.stepmore');
            if (stepmore.is(':visible')) {
                stepmore.slideUp('slow').css('display', 'grid');
                $(this).find('i').removeClass('fa-angle-double-up').addClass('fa-angle-double-down');
                $(this).find('b').text('more');
            }
            else {
                stepmore.slideDown('slow').css('display', 'grid');
                $(this).find('i').removeClass('fa-angle-double-down').addClass('fa-angle-double-up');
                $(this).find('b').text('less');
            }
        })

        $('#previewform').attr('action', OC.generateUrl('/apps/gpxmotion/preview'));
        $('#previewButton').click(function() {
            $('#previewform input[name=gpxContent]').val(generateGpx());
            $('#previewform').submit();
        });
    });
}(jQuery, OC));
