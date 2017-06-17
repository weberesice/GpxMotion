<?php
script('gpxmotion', 'leaflet');
script('gpxmotion', 'jquery-ui.min');
script('gpxmotion', 'moment-with-locales.min');
script('gpxmotion', 'L.Control.MousePosition');
script('gpxmotion', 'ActiveLayers');
script('gpxmotion', 'MovingMarker');
script('gpxmotion', 'Leaflet.Dialog');
script('gpxmotion', 'easy-button');
script('gpxmotion', 'gpxMotionView');

style('gpxmotion', 'leaflet');
style('gpxmotion', 'jquery-ui.min');
style('gpxmotion', 'L.Control.MousePosition');
style('gpxmotion', 'leaflet-sidebar');
style('gpxmotion', 'font-awesome.min');
style('gpxmotion', 'easy-button');
style('gpxmotion', 'Leaflet.Dialog');
style('gpxmotion', 'view');

?>

<div id="app">
    <div id="app-content">
        <div id="app-content-wrapper">
            <?php print_unescaped($this->inc('viewcontent')); ?>
        </div>
    </div>
</div>
