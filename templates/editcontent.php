<div id="sidebar" class="sidebar">
<!-- Nav tabs -->
<ul class="sidebar-tabs" role="tablist">
<li class="active" title="<?php p($l->t('Load and save files')); ?>"><a href="#ho" role="tab"><i class="fa fa-bars"></i></a></li>
<li title="<?php p($l->t('Options')); ?>"><a href="#gpxmotionsettings" role="tab"><i class="fa fa-gear"></i></a></li>
<li title="<?php p($l->t('About GpxMotion')); ?>"><a href="#help" role="tab"><i class="fa fa-question"></i></a></li>
</ul>
<!-- Tab panes -->
<div class="sidebar-content active">
<div class="sidebar-pane active" id="ho">
    <div id="loaddiv">
        <div id="logofolder">
            <div id="logo">
                <div>
                <p id="versionnumber">v
    <?php
    p($_['gpxmotion_version']);
    ?>
                </p>
                </div>
            </div>
        </div>
        <button id="viewButton"><i class="fa fa-eye"></i> <?php p($l->t('Go to view page'));?></button>
        <button id="loadButton"><i class="fa fa-file-o"></i> <?php p($l->t('Load file'));?></button>
    </div>
    <div style="clear:both"></div>
    <hr/>
    <h2 id="savetitle"><?php p($l->t('Save'));?></h2>
    <div>
        <label id="saveNameLabel"><?php p($l->t('File name'));?> :</label><br/>
        <input id="saveName" type="text"></input>
    </div>
    <div style="clear:both"></div>
    <button id="saveButton"><i class="fa fa-save"></i> <?php p($l->t('Choose directory and save'));?></button>
    <form method="post" action="" id="previewform" target="_blank">
        <input type="text" name="gpxContent" style="display:none;"/>
        <button id="previewButton">
            <i class="fa fa-caret-square-o-right"></i> <?php p($l->t('Preview current animation'));?>
        </button>
    </form>
    <div style="clear:both"></div>
    <hr/>
    <button id="clearButton"><i class="fa fa-bomb"></i> <?php p($l->t('Clear animation steps'));?></button>
    <button id="addStepButton"><i class="fa fa-plus-circle"></i> <?php p($l->t('Add animation step'));?></button>
    <div id="saved"><p>
        <i class="fa fa-save fa-spin fa-3x fa-fw"></i>
        <b id="content"></b></p>
    </div>
    <div id="failed"><p>
        <i class="fa fa-save fa-spin fa-3x fa-fw"></i>
        <b id="content"></b></p>
    </div>
	<div id="loading"><p>
		<i class="fa fa-spinner fa-pulse fa-3x fa-fw"></i>
		<?php p($l->t('loading file')); ?>&nbsp;(<i id="loadingpc"></i> %)</p>
	</div>
	<div id="exporting"><p>
		<i class="fa fa-spinner fa-pulse fa-3x fa-fw"></i>
		<?php p($l->t('exporting file to gpx')); ?>&nbsp;</p>
	</div>
	<div id="saving"><p>
		<i class="fa fa-spinner fa-pulse fa-3x fa-fw"></i>
		<?php p($l->t('saving file')); ?>&nbsp;(<i id="savingpc"></i> %)</p>
	</div>
<?php

echo '<p id="username" style="display:none">';
p($_['username']);
echo '</p>'."\n";
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
</div>
<div class="sidebar-pane" id="gpxmotionsettings">
<h1 class="sectiontitle"><?php p($l->t('Options')); ?></h1>
<hr/>
<div id="optiontop">
    <input type="checkbox" id="clearstepsbeforeload" checked></input>
    <label for="clearstepsbeforeload"><?php p($l->t('Clear steps before loading'));?></label>
</div>
<hr/>
    <h3 class="sectiontitle"><?php p($l->t('Custom tile servers')); ?></h3>
    <div id="tileserveradd">
        <?php p($l->t('Server name (for example \'my custom server\')')); ?> :
        <input type="text" id="tileservername"><br/>
        <?php p($l->t('Server url (\'http://tile.server.org/cycle/{z}/{x}/{y}.png\')')); ?> :
        <input type="text" id="tileserverurl"><br/>
        <button id="addtileserver"><i class="fa fa-plus-circle" aria-hidden="true" style="color:green;"></i> <?php p($l->t('Add')); ?></button>
    </div>
    <br/>
    <div id="tileserverlist">
        <h2><?php p($l->t('Your servers')); ?></h2>
        <ul class="disclist">
<?php
if (count($_['tileservers']) > 0){
    foreach($_['tileservers'] as $name=>$url){
        echo '<li name="';
        p($name);
        echo '" title="';
        p($url);
        echo '">';
        p($name);
        echo '<button><i class="fa fa-trash" aria-hidden="true" style="color:red;"></i> ';
        p($l->t('Delete'));
        echo '</button></li>';
    }
}
?>
        </ul>
    </div>
<hr/>
    <h3 class="sectiontitle"><?php p($l->t('Custom overlay servers')); ?></h3>
    <div id="overlayserveradd">
        <?php p($l->t('Server name (for example \'my custom server\')')); ?> :
        <input type="text" id="overlayservername"><br/>
        <?php p($l->t('Server url (\'http://overlay.server.org/cycle/{z}/{x}/{y}.png\')')); ?> :
        <input type="text" id="overlayserverurl"><br/>
        <button id="addoverlayserver"><i class="fa fa-plus-circle" aria-hidden="true" style="color:green;"></i> <?php p($l->t('Add')); ?></button>
    </div>
    <br/>
    <div id="overlayserverlist">
        <h2><?php p($l->t('Your servers')); ?></h2>
        <ul class="disclist">
<?php
if (count($_['overlayservers']) > 0){
    foreach($_['overlayservers'] as $name=>$url){
        echo '<li name="';
        p($name);
        echo '" title="';
        p($url);
        echo '">';
        p($name);
        echo '<button><i class="fa fa-trash" aria-hidden="true" style="color:red;"></i> ';
        p($l->t('Delete'));
        echo '</button></li>';
    }
}
?>
        </ul>
    </div>

</div>
<div class="sidebar-pane" id="help">
    <h1 class="sectiontitle"><?php p($l->t('About GpxMotion')); ?></h1>
    <hr/><br/>
    <h3 class="sectiontitle"><?php p($l->t('Features overview')); ?> :</h3>
    <br/><hr/><br/>
    <h3 class="sectiontitle"><?php p($l->t('Shortcuts')); ?> :</h3>
    <ul class="disclist">
        <li><b>&lt;</b> : <?php p($l->t('toggle sidebar')); ?></li>
        <li><b>!</b> : <?php p($l->t('toggle minimap')); ?></li>
    </ul>
    <br/><hr/><br/>
    <h3 class="sectiontitle"><?php p($l->t('Documentation')); ?></h3>
    <a class="toplink" target="_blank" href="https://gitlab.com/eneiluj/gpxmotion-oc/wikis/home">
    <i class="fa fa-gitlab" aria-hidden="true"></i>
    Project wiki
    </a>
    <br/>

    <br/><hr/><br/>
    <h3 class="sectiontitle"><?php p($l->t('Source management')); ?></h3>
    <ul class="disclist">
        <li><a class="toplink" target="_blank" href="https://gitlab.com/eneiluj/gpxmotion-oc">
        <i class="fa fa-gitlab" aria-hidden="true"></i>
        Gitlab project main page</a></li>
        <li><a class="toplink" target="_blank" href="https://gitlab.com/eneiluj/gpxmotion-oc/issues">
        <i class="fa fa-gitlab" aria-hidden="true"></i>
        Gitlab project issue tracker</a></li>
    </ul>

    <br/><hr/><br/>
    <h3 class="sectiontitle"><?php p($l->t('Authors')); ?> :</h3>
    <ul class="disclist">
        <li>Julien Veyssier</li>
    </ul>

</div>
</div>
</div>
<!-- ============= MAP DIV =============== -->
<div id="map" class="sidebar-map"></div>

