<?php
echo '<p id="publicgpx" style="display:none">';
p($_['publicgpx']);
echo '</p>'."\n";
echo '<p id="token" style="display:none">';
p($_['token']);
echo '</p>'."\n";
echo '<p id="gpxmotion_version" style="display:none">';
p($_['gpxmotion_version']);
echo '</p>'."\n";

echo '<ul id="tileserverlist" style="display:none">';
    foreach($_['usertileservers'] as $ts){
        echo '<li title="'.$ts['url'].'"';
        foreach (Array('servername', 'type', 'url', 'layers', 'version', 'format', 'opacity', 'transparent', 'minzoom', 'maxzoom', 'attribution') as $field) {
            if (array_key_exists($field, $ts)) {
                echo ' '.$field.'="';
                p($ts[$field]);
                echo '"';
            }
        }
        echo '>';
        echo '</li>';
    }
echo '</ul>'."\n";

echo '<ul id="overlayserverlist" style="display:none">';
    foreach($_['useroverlayservers'] as $ts){
        echo '<li title="'.$ts['url'].'"';
        foreach (Array('servername', 'type', 'url', 'layers', 'version', 'format', 'opacity', 'transparent', 'minzoom', 'maxzoom', 'attribution') as $field) {
            if (array_key_exists($field, $ts)) {
                echo ' '.$field.'="';
                p($ts[$field]);
                echo '"';
            }
        }
        echo '>';
        echo '</li>';
    }
echo '</ul>'."\n";

echo '<ul id="overlaywmsserverlist" style="display:none">';
    foreach($_['useroverlayserverswms'] as $ts){
        echo '<li title="'.$ts['url'].'"';
        foreach (Array('servername', 'type', 'url', 'layers', 'version', 'format', 'opacity', 'transparent', 'minzoom', 'maxzoom', 'attribution') as $field) {
            if (array_key_exists($field, $ts)) {
                echo ' '.$field.'="';
                p($ts[$field]);
                echo '"';
            }
        }
        echo '>';
        echo '</li>';
    }
echo '</ul>'."\n";
echo '<ul id="tilewmsserverlist" style="display:none">';
    foreach($_['usertileserverswms'] as $ts){
        echo '<li title="'.$ts['url'].'"';
        foreach (Array('servername', 'type', 'url', 'layers', 'version', 'format', 'opacity', 'transparent', 'minzoom', 'maxzoom', 'attribution') as $field) {
            if (array_key_exists($field, $ts)) {
                echo ' '.$field.'="';
                p($ts[$field]);
                echo '"';
            }
        }
        echo '>';
        echo '</li>';
    }
echo '</ul>'."\n";

echo '<ul id="basetileservers" style="display:none">';
foreach($_['basetileservers'] as $ts){
    echo '<li';
    foreach (Array('name', 'type', 'url', 'layers', 'version', 'format', 'opacity', 'transparent', 'minzoom', 'maxzoom', 'attribution') as $field) {
        if (array_key_exists($field, $ts)) {
            echo ' '.$field.'="';
            p($ts[$field]);
            echo '"';
        }
    }
    echo '></li>';
}
echo '</ul>'."\n";
?>

<div id="linkdialog" style="display:none;" title="Public link">
    <label id="linklabel" for="linkinput"></label>
    <br/>
    <input id="linkinput" type="text"></input>
</div>

<div id="map"></div>
