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

echo '<ul id="overlayserverlist" style="display:none">';
foreach($_['overlayservers'] as $name=>$url){
    echo '<li name="';
    p($name);
    echo '" title="';
    p($url);
    echo '">';
    echo '</li>';
}
echo '</ul>'."\n";

echo '<ul id="tileserverlist" style="display:none">';
foreach($_['tileservers'] as $name=>$url){
    echo '<li name="';
    p($name);
    echo '" title="';
    p($url);
    echo '">';
    echo '</li>';
}
echo '</ul>'."\n";

echo '<ul id="basetileservers" style="display:none">';
foreach($_['basetileservers'] as $ts){
    echo '<li name="';
    p($ts['name']);
    echo '" type="';
    p($ts['type']);
    echo '" url="';
    p($ts['url']);
    echo '" minzoom="';
    p($ts['minzoom']);
    echo '" maxzoom="';
    p($ts['maxzoom']);
    echo '" attribution="';
    p($ts['attribution']);
    echo '"></li>';
}
echo '</ul>'."\n";
?>

<div id="linkdialog" style="display:none;" title="Public link">
    <label id="linklabel" for="linkinput"></label>
    <br/>
    <input id="linkinput" type="text"></input>
</div>

<div id="map"></div>
