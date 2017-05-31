$(document).ready(function() {

    if (OCA.Files && OCA.Files.fileActions && !$('#sharingToken').val()) {

		var token = $('#sharingToken').val();

        function openFile(file, data){
            var url = OC.generateUrl('apps/gpxmotion/view?path={filepath}',{'filepath': data.dir+'/'+file});
            window.open(url, '_blank');
        }

        OCA.Files.fileActions.registerAction({
            name: 'viewFileGpxMotion',
            displayName: t('gpxmotion', 'View in GpxMotion'),
            mime: 'application/gpx+xml',
            permissions: OC.PERMISSION_READ,
            icon: function () {return OC.imagePath('gpxmotion', 'app_black');},
            actionHandler: openFile
        });
    }

});
