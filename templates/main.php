<?php
script('gpxmotion', 'leaflet');
script('gpxmotion', 'L.Control.MousePosition');
script('gpxmotion', 'ActiveLayers');
script('gpxmotion', 'leaflet-sidebar.min');
script('gpxmotion', 'gpxmotion');

style('gpxmotion', 'leaflet');
style('gpxmotion', 'L.Control.MousePosition');
style('gpxmotion', 'leaflet-sidebar');
style('gpxmotion', 'font-awesome.min');
style('gpxmotion', 'gpxmotion');

?>

<div id="app">
    <div id="app-content">
        <div id="app-content-wrapper">
            <?php print_unescaped($this->inc('editcontent')); ?>
        </div>
    </div>
</div>
