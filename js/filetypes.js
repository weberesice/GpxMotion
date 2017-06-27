$(document).ready(function() {

    if (OCA.Files && OCA.Files.fileActions) {

        var token = $('#sharingToken').val();

        function openViewFile(file, data){
            // if we are logged
            if (!token){
				var url = OC.generateUrl('apps/gpxmotion/view?path={filepath}&autoplay=1',{'filepath': data.dir+'/'+file});
            }
            // if we are in share browsing
            else{
                var url = OC.generateUrl('apps/gpxmotion/publicview?token={token}&path={path}&filename={filename}',
                        {'token': token, 'path': data.dir, 'filename': file});
            }
            window.open(url, '_blank');
        }

        OCA.Files.fileActions.registerAction({
            name: 'viewFileGpxMotion',
            displayName: t('gpxmotion', 'View in GpxMotion'),
            mime: 'application/gpx+xml',
            permissions: OC.PERMISSION_READ,
            icon: function () {return OC.imagePath('gpxmotion', 'app_black');},
            actionHandler: openViewFile
        });

        if (!token) {
            function openEditFile(file, data){
                var url = OC.generateUrl('apps/gpxmotion/?path={filepath}',{'filepath': data.dir+'/'+file});
                window.open(url, '_blank');
            }

            OCA.Files.fileActions.registerAction({
                name: 'editFileGpxMotion',
                displayName: t('gpxmotion', 'Edit with GpxMotion'),
                mime: 'application/gpx+xml',
                permissions: OC.PERMISSION_READ,
                icon: function () {return OC.imagePath('gpxmotion', 'app_black');},
                actionHandler: openEditFile
            });
        }
    }

});
